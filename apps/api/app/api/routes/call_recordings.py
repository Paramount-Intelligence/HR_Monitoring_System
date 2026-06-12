"""Call recording upload (participants) and admin library routes."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_permission
from app.models.audit_log import AuditLog
from app.models.communication import CallParticipant, CallRecording, CallSession
from app.models.user import User
from app.schemas.call_recording import (
    CallRecordingListResponse,
    CallRecordingParticipantRead,
    CallRecordingRead,
    CallRecordingStatsRead,
    CallRecordingUploadResponse,
    CallRecordingUserRead,
)
from app.services.call_recording_storage import (
    CallRecordingStorageService,
    get_call_recording_storage,
    parse_range_header,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _storage() -> CallRecordingStorageService:
    return get_call_recording_storage()


def _write_audit(db: Session, actor_id: uuid.UUID, action: str, recording_id: uuid.UUID, call_id: uuid.UUID) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_id,
            action_type=action,
            entity_type="call_recording",
            entity_id=recording_id,
            new_value={"call_session_id": str(call_id), "recording_id": str(recording_id)},
        )
    )


def _participant_user_ids(db: Session, call_session_id: uuid.UUID) -> list[uuid.UUID]:
    rows = db.query(CallParticipant.user_id).filter(CallParticipant.call_session_id == call_session_id).all()
    return [r[0] for r in rows]


def _build_participants_snapshot(db: Session, call_session: CallSession) -> list[dict]:
    participants = []
    for part in call_session.participants:
        user = db.get(User, part.user_id)
        if not user:
            continue
        participants.append(
            {
                "id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "profile_picture_url": user.avatar_url,
            }
        )
    return participants


def _serialize_recording(db: Session, rec: CallRecording) -> CallRecordingRead:
    recorded_by = db.get(User, rec.recorded_by_user_id)
    participants: list[CallRecordingParticipantRead] = []
    if rec.participants_snapshot:
        try:
            raw = json.loads(rec.participants_snapshot)
            participants = [CallRecordingParticipantRead(**p) for p in raw]
        except (json.JSONDecodeError, TypeError, ValueError):
            participants = []
    if not participants:
        call_session = db.get(CallSession, rec.call_session_id)
        if call_session:
            participants = [
                CallRecordingParticipantRead(**p) for p in _build_participants_snapshot(db, call_session)
            ]

    return CallRecordingRead(
        id=rec.id,
        call_session_id=rec.call_session_id,
        conversation_id=rec.conversation_id,
        recorded_by=CallRecordingUserRead(
            id=str(recorded_by.id),
            full_name=recorded_by.full_name,
            email=recorded_by.email,
            profile_picture_url=recorded_by.avatar_url,
        )
        if recorded_by
        else CallRecordingUserRead(id="", full_name="Unknown", email=""),
        participants=participants,
        call_type=rec.call_type,
        recording_type=rec.recording_type,
        duration_seconds=rec.duration_seconds,
        file_size_bytes=rec.file_size_bytes,
        status=rec.status,
        mime_type=rec.mime_type,
        file_name=rec.file_name,
        storage_driver=rec.storage_driver,
        created_at=rec.created_at,
        started_at=rec.started_at,
        ended_at=rec.ended_at,
    )


def _ensure_call_participant(db: Session, call_id: uuid.UUID, user_id: uuid.UUID) -> CallSession:
    call_session = db.get(CallSession, call_id)
    if not call_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call session not found.")
    participant = db.query(CallParticipant).filter_by(call_session_id=call_id, user_id=user_id).first()
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this call.")
    return call_session


def _replacement_decision(
    existing: CallRecording,
    new_recording_type: str,
    new_size: int,
) -> tuple[bool, str]:
    if existing.file_size_bytes == 0 or existing.status == "failed":
        return True, "replace_failed_or_empty"
    if new_recording_type == "video" and existing.recording_type == "audio":
        return True, "replace_audio_with_video"
    if new_recording_type == "audio" and existing.recording_type == "video":
        return False, "keep_existing_video"
    if (
        new_recording_type == "video"
        and existing.recording_type == "video"
        and new_size > (existing.file_size_bytes or 0)
    ):
        return True, "replace_larger_video"
    if new_recording_type == "video" and existing.recording_type == "video":
        return False, "keep_existing_video"
    return False, "keep_existing"


@router.post("/{call_id}/recordings", response_model=CallRecordingUploadResponse)
async def upload_call_recording(
    call_id: uuid.UUID,
    file: UploadFile = File(...),
    recording_type: str = Form("audio"),
    call_type: str | None = Form(None),
    duration_seconds: int | None = Form(None),
    mime_type: str | None = Form(None),
    file_size_bytes: int | None = Form(None),
    started_at: str | None = Form(None),
    ended_at: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a browser-side call recording (call participants only)."""
    logger.info("[CALL_RECORDING_UPLOAD] received call_id=%s user_id=%s", call_id, current_user.id)
    try:
        call_session = _ensure_call_participant(db, call_id, current_user.id)
    except HTTPException as exc:
        logger.warning(
            "[CALL_RECORDING_UPLOAD] failed stage=auth reason=%s call_id=%s",
            exc.detail,
            call_id,
        )
        raise
    logger.info("[CALL_RECORDING_UPLOAD] participant_valid=True")

    data = await file.read()
    resolved_mime = (mime_type or file.content_type or "audio/webm").split(";")[0].strip().lower()
    resolved_recording_type = recording_type if recording_type in ("audio", "video") else "audio"
    resolved_call_type = (
        call_type if call_type in ("voice", "video") else call_session.call_type
    )

    logger.info(
        "[CALL_RECORDING_UPLOAD] call_type=%s recording_type=%s mime_type=%s file_size=%s",
        resolved_call_type,
        resolved_recording_type,
        resolved_mime,
        len(data),
    )

    existing = (
        db.query(CallRecording)
        .filter(
            CallRecording.call_session_id == call_id,
            CallRecording.status == "available",
            CallRecording.deleted_at.is_(None),
        )
        .first()
    )
    old_storage_key: str | None = None
    existing_to_retire: CallRecording | None = None

    if existing:
        logger.info(
            "[CALL_RECORDING_UPLOAD] duplicate_existing recording_type=%s file_size=%s storage_driver=%s",
            existing.recording_type,
            existing.file_size_bytes,
            existing.storage_driver,
        )
        should_replace, decision = _replacement_decision(existing, resolved_recording_type, len(data))
        logger.info("[CALL_RECORDING_UPLOAD] replacement_decision=%s", decision)
        if not should_replace:
            return CallRecordingUploadResponse(
                id=existing.id,
                call_session_id=existing.call_session_id,
                status=existing.status,
                message="Recording already exists for this call.",
            )
        old_storage_key = existing.storage_key
        existing_to_retire = existing

    safe_name = (file.filename or f"{call_id}.webm").replace("\\", "_").replace("/", "_")
    storage = _storage()
    storage.validate_upload(data, resolved_mime, safe_name)

    recording_id = uuid.uuid4()
    ext = "webm" if "webm" in resolved_mime else "ogg"
    storage_key = storage.build_storage_key(call_id, recording_id, ext)
    logger.info(
        "[CALL_RECORDING_UPLOAD] storage_driver=%s",
        storage.driver,
    )
    try:
        storage.save(storage_key, data, resolved_mime)
    except HTTPException as exc:
        logger.error(
            "[CALL_RECORDING_UPLOAD] failed stage=bucket_save reason=%s call_id=%s",
            exc.detail,
            call_id,
        )
        raise
    except Exception as exc:
        logger.exception(
            "[CALL_RECORDING_UPLOAD] failed stage=bucket_save reason=%s call_id=%s",
            exc,
            call_id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recording storage is temporarily unavailable.",
        ) from exc
    storage_driver = storage.driver
    logger.info(
        "[CALL_RECORDING_UPLOAD] storage_driver=%s saved storage_key=%s",
        storage_driver,
        storage_key,
    )

    participants = _build_participants_snapshot(db, call_session)
    caller_id = call_session.started_by_id
    receiver_id = next((p.user_id for p in call_session.participants if p.user_id != caller_id), None)

    def parse_dt(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    if existing_to_retire is not None:
        existing_to_retire.status = "deleted"
        existing_to_retire.deleted_at = datetime.now(timezone.utc)

    rec = CallRecording(
        id=recording_id,
        call_session_id=call_id,
        conversation_id=call_session.conversation_id,
        recorded_by_user_id=current_user.id,
        caller_id=caller_id,
        receiver_id=receiver_id,
        storage_key=storage_key,
        storage_driver=storage_driver,
        file_name=safe_name,
        mime_type=resolved_mime,
        file_size_bytes=file_size_bytes or len(data),
        duration_seconds=duration_seconds,
        recording_type=resolved_recording_type,
        call_type=resolved_call_type,
        status="available",
        participants_snapshot=json.dumps(participants),
        started_at=parse_dt(started_at),
        ended_at=parse_dt(ended_at),
    )
    db.add(rec)
    _write_audit(db, current_user.id, "call_recording_uploaded", recording_id, call_id)
    db.commit()
    db.refresh(rec)

    if old_storage_key and old_storage_key != storage_key:
        try:
            storage.delete(old_storage_key)
            logger.info("[CALL_RECORDING_UPLOAD] old_object_deleted key=%s", old_storage_key)
        except Exception as exc:
            logger.warning(
                "[CALL_RECORDING_UPLOAD] old_object_delete_failed key=%s reason=%s",
                old_storage_key,
                exc,
            )

    logger.info("[CALL_RECORDING_UPLOAD] db_row_created recording_id=%s call_id=%s", recording_id, call_id)
    return CallRecordingUploadResponse(id=rec.id, call_session_id=call_id, status=rec.status)


admin_router = APIRouter(prefix="/admin/call-recordings", tags=["admin-call-recordings"])


@admin_router.get("/stats", response_model=CallRecordingStatsRead)
def admin_call_recording_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("call_recordings.view")),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    base = db.query(CallRecording).filter(CallRecording.deleted_at.is_(None))
    return CallRecordingStatsRead(
        total_recordings=base.filter(CallRecording.status == "available").count(),
        today_recordings=base.filter(CallRecording.created_at >= today_start, CallRecording.status == "available").count(),
        voice_recordings=base.filter(CallRecording.call_type == "voice", CallRecording.status == "available").count(),
        video_recordings=base.filter(CallRecording.call_type == "video", CallRecording.status == "available").count(),
        failed_uploads=base.filter(CallRecording.status == "failed").count(),
        storage_used_bytes=int(
            db.query(func.coalesce(func.sum(CallRecording.file_size_bytes), 0))
            .filter(CallRecording.deleted_at.is_(None), CallRecording.status == "available")
            .scalar()
            or 0
        ),
    )


@admin_router.get("", response_model=CallRecordingListResponse)
def admin_list_call_recordings(
    search: str | None = None,
    participant_user_id: uuid.UUID | None = None,
    caller_id: uuid.UUID | None = None,
    receiver_id: uuid.UUID | None = None,
    conversation_id: uuid.UUID | None = None,
    call_type: str | None = None,
    recording_type: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("call_recordings.view")),
):
    q = db.query(CallRecording).filter(CallRecording.deleted_at.is_(None))
    if status_filter == "all":
        pass
    elif status_filter:
        q = q.filter(CallRecording.status == status_filter)
    else:
        q = q.filter(CallRecording.status == "available")
    if conversation_id:
        q = q.filter(CallRecording.conversation_id == conversation_id)
    if call_type:
        q = q.filter(CallRecording.call_type == call_type)
    if recording_type:
        q = q.filter(CallRecording.recording_type == recording_type)
    if caller_id:
        q = q.filter(CallRecording.caller_id == caller_id)
    if receiver_id:
        q = q.filter(CallRecording.receiver_id == receiver_id)
    if participant_user_id:
        q = q.filter(
            or_(
                CallRecording.caller_id == participant_user_id,
                CallRecording.receiver_id == participant_user_id,
                CallRecording.recorded_by_user_id == participant_user_id,
            )
        )
    if date_from:
        q = q.filter(CallRecording.created_at >= date_from)
    if date_to:
        q = q.filter(CallRecording.created_at <= date_to)
    if search:
        term = f"%{search.lower()}%"
        user_ids = [
            r[0]
            for r in db.query(User.id)
            .filter(or_(func.lower(User.full_name).like(term), func.lower(User.email).like(term)))
            .all()
        ]
        if user_ids:
            q = q.filter(
                or_(
                    CallRecording.caller_id.in_(user_ids),
                    CallRecording.receiver_id.in_(user_ids),
                    CallRecording.recorded_by_user_id.in_(user_ids),
                )
            )
        else:
            q = q.filter(CallRecording.id == uuid.UUID(int=0))

    total = q.count()
    rows = q.order_by(CallRecording.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return CallRecordingListResponse(
        items=[_serialize_recording(db, r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@admin_router.get("/{recording_id}", response_model=CallRecordingRead)
def admin_get_call_recording(
    recording_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("call_recordings.view")),
):
    rec = db.get(CallRecording, recording_id)
    if not rec or rec.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    _write_audit(db, current_user.id, "call_recording_viewed", recording_id, rec.call_session_id)
    db.commit()
    return _serialize_recording(db, rec)


def _recording_binary_response(
    rec: CallRecording,
    *,
    request: Request | None,
    as_attachment: bool,
) -> Response:
    byte_range = None
    if request and request.headers.get("range"):
        storage = _storage()
        try:
            total_size = storage.head_content_length(rec.storage_key)
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Storage head failed for %s: %s", rec.storage_key, exc)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording file not found.") from exc
        byte_range = parse_range_header(request.headers.get("range"), total_size)

    storage = _storage()
    content, _total_size, range_value = storage.read(rec.storage_key, byte_range)

    disposition = "attachment" if as_attachment else "inline"
    headers = {
        "Content-Disposition": f'{disposition}; filename="{rec.file_name}"',
        "Accept-Ranges": "bytes",
        "Content-Length": str(len(content)),
    }
    if range_value:
        headers["Content-Range"] = range_value
        return Response(content=content, media_type=rec.mime_type, headers=headers, status_code=206)
    return Response(content=content, media_type=rec.mime_type, headers=headers)


@admin_router.get("/{recording_id}/stream")
def admin_stream_call_recording(
    recording_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("call_recordings.view")),
):
    rec = db.get(CallRecording, recording_id)
    if not rec or rec.deleted_at is not None or rec.status != "available":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    storage = _storage()
    if not storage.exists(rec.storage_key):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording file not found.")
    _write_audit(db, current_user.id, "call_recording_viewed", recording_id, rec.call_session_id)
    db.commit()
    if not storage.is_s3:
        path = storage.resolve_local_path(rec.storage_key)
        return FileResponse(path, media_type=rec.mime_type, filename=rec.file_name)
    return _recording_binary_response(rec, request=request, as_attachment=False)


@admin_router.get("/{recording_id}/download")
def admin_download_call_recording(
    recording_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("call_recordings.download")),
):
    rec = db.get(CallRecording, recording_id)
    if not rec or rec.deleted_at is not None or rec.status != "available":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    storage = _storage()
    if not storage.exists(rec.storage_key):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording file not found.")
    _write_audit(db, current_user.id, "call_recording_downloaded", recording_id, rec.call_session_id)
    db.commit()
    if not storage.is_s3:
        path = storage.resolve_local_path(rec.storage_key)
        return FileResponse(path, media_type=rec.mime_type, filename=rec.file_name, content_disposition_type="attachment")
    return _recording_binary_response(rec, request=request, as_attachment=True)


@admin_router.delete("/{recording_id}", response_model=CallRecordingRead)
def admin_delete_call_recording(
    recording_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("call_recordings.delete")),
):
    rec = db.get(CallRecording, recording_id)
    if not rec or rec.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    rec.status = "deleted"
    rec.deleted_at = datetime.now(timezone.utc)
    try:
        _storage().delete(rec.storage_key)
    except Exception as exc:
        logger.warning("Recording object delete failed for %s: %s", rec.id, exc)
    _write_audit(db, current_user.id, "call_recording_deleted", recording_id, rec.call_session_id)
    db.commit()
    return _serialize_recording(db, rec)
