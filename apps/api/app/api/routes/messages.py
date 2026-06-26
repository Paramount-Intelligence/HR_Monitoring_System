import uuid
import os
import shutil
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy import and_, or_, func, cast, String
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db
from app.models.enums import ConversationType, ConversationParticipantRole, MessageType, NotificationType, UserRole, UserStatus
from app.models.user import User
from app.models.communication import Conversation, ConversationParticipant, Message, MessageMention, MessageReaction, MessageAttachment, CallSession, CallParticipant, CallSignal
from app.models.task import Task
from app.models.project import Project
from app.models.meetings import Meeting, MeetingParticipant
from app.models.support import SupportTicket
from app.models.eod_report import EODReport
from app.models.approval import Approval
from app.models.notifications import Notification

from app.services.realtime_service import RealtimeService
from app.services.notification_service import create_message_notifications
from app.services.websocket_manager import ws_manager
from app.services import message_receipt_service as receipt_svc
from app.services.message_html_service import prepare_message_content

logger = logging.getLogger(__name__)

from app.schemas.communication import (
    ConversationRead,
    ConversationCreate,
    MessageRead,
    MessageCreate,
    MessageEdit,
    UnreadCountResponse,
    ContextThreadCreate,
    UserMinimal,
    AddParticipantsRequest,
    AddParticipantsResponse,
    AddedParticipantSummary,
    AvailableMembersResponse,
    AvailableConversationMemberRead,
    UpdateParticipantRoleRequest,
    ConversationSettingsUpdate,
    ConversationParticipantRead,
    MessageAttachmentRead,
    MessageInfoRead,
    MessagingDirectoryEntryRead,
    MessagesDeliveredRequest,
    MessagesDeliveredResponse,
    MessagesSeenRequest,
    MessagesSeenResponse,
    CallSessionRead,
    CallStartRequest,
    CallSignalCreate,
    CallSignalRead,
)

router = APIRouter()
logger = logging.getLogger(__name__)

PLATFORM_PARTICIPANT_MANAGERS = frozenset(
    {UserRole.ADMIN, UserRole.HR_OPERATIONS, UserRole.MANAGER}
)
_CONVERSATION_ADMIN_ROLES = {
    ConversationParticipantRole.OWNER,
    ConversationParticipantRole.ADMIN,
}


def _can_manage_participants(
    conv: Conversation,
    caller_part: ConversationParticipant | None,
    current_user: User,
) -> bool:
    if conv.type == ConversationType.DIRECT:
        return False
    if current_user.role in PLATFORM_PARTICIPANT_MANAGERS:
        return True
    if caller_part and caller_part.role in _CONVERSATION_ADMIN_ROLES:
        return True
    return conv.who_can_add_members == "all_members"


def _require_participant_manage_access(
    db: Session,
    conversation_id: uuid.UUID,
    current_user: User,
) -> tuple[Conversation, ConversationParticipant]:
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.type == ConversationType.DIRECT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add participants to a direct conversation",
        )

    caller_part = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not caller_part:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant.")

    if not _can_manage_participants(conv, caller_part, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group/channel admins can add members.",
        )

    return conv, caller_part


def _populate_conversation_read(
    conv: Conversation,
    db: Session,
    current_user: User,
) -> Conversation:
    """Attach participants, preview, and display title for ConversationRead."""
    parts = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conv.id)
        .options(joinedload(ConversationParticipant.user))
        .all()
    )
    conv.participants = parts

    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.is_deleted == False)
        .order_by(Message.created_at.desc())
        .options(joinedload(Message.sender))
        .first()
    )
    if last_msg:
        conv.last_message = {
            "id": last_msg.id,
            "body": last_msg.body,
            "sender_id": last_msg.sender_id,
            "sender_name": last_msg.sender.full_name if last_msg.sender else "Unknown",
            "created_at": last_msg.created_at,
        }
    else:
        conv.last_message = None

    if conv.type == ConversationType.DIRECT and not conv.title:
        other_part = next((p for p in parts if p.user_id != current_user.id), None)
        if other_part and other_part.user:
            conv.title = other_part.user.full_name
        else:
            conv.title = "Direct Message"

    return conv


def check_thread_access(db: Session, user: User, relation_type: str, relation_id: uuid.UUID) -> bool:
    """Helper to verify context thread access based on user's role and relations."""
    # Admins and HR have broad access to context threads
    if user.role in [UserRole.ADMIN, UserRole.HR_OPERATIONS]:
        return True

    if relation_type == "task":
        task = db.get(Task, relation_id)
        if not task:
            return False
        # Assignee, creator, or project manager/owner
        project = db.get(Project, task.project_id)
        is_proj_manager = project and (project.manager_id == user.id or project.owner_id == user.id)
        # Checking manager hierarchy
        is_user_manager = False
        assignee = db.get(User, task.assigned_to)
        if assignee and assignee.manager_id == user.id:
            is_user_manager = True

        return (
            task.assigned_to == user.id
            or task.created_by == user.id
            or is_proj_manager
            or is_user_manager
        )

    elif relation_type == "project":
        project = db.get(Project, relation_id)
        if not project:
            return False
        return (
            project.owner_id == user.id
            or project.manager_id == user.id
            # Also managers in the system or assigned users can see it
            or user.role == UserRole.MANAGER
        )

    elif relation_type == "meeting":
        # Participants and Organizer
        meeting = db.get(Meeting, relation_id)
        if not meeting:
            return False
        if meeting.organizer_id == user.id:
            return True
        part = db.query(MeetingParticipant).filter_by(meeting_id=relation_id, user_id=user.id).first()
        return part is not None

    elif relation_type == "support":
        ticket = db.get(SupportTicket, relation_id)
        if not ticket:
            return False
        return (
            ticket.created_by_id == user.id
            or ticket.assigned_to_id == user.id
        )

    elif relation_type == "eod":
        report = db.get(EODReport, relation_id)
        if not report:
            return False
        if report.user_id == user.id:
            return True
        # Reporting employee's manager
        reporter = db.get(User, report.user_id)
        return reporter and reporter.manager_id == user.id

    elif relation_type == "approval":
        approval = db.get(Approval, relation_id)
        if not approval:
            return False
        return (
            approval.requested_by == user.id
            or approval.decided_by == user.id
        )

    return False


def get_mentionable_users_helper(db: Session, conversation: Conversation) -> list[User]:
    """Helper to resolve all allowed mentionable users based on conversation type and access."""
    user_ids = set()

    # 1. Direct Chat: Only participants of the direct chat
    if conversation.type == ConversationType.DIRECT:
        parts = db.query(ConversationParticipant).filter_by(conversation_id=conversation.id).all()
        user_ids.update({p.user_id for p in parts})

    # 2. Group or Channel Chat: Only current group/channel participants
    elif conversation.type in [ConversationType.GROUP, ConversationType.CHANNEL]:
        parts = db.query(ConversationParticipant).filter_by(conversation_id=conversation.id).all()
        user_ids.update({p.user_id for p in parts})

    # 3. Contextual threads (Task, Project, Meeting, Support, EOD, Approval)
    else:
        # Task thread
        if conversation.type == ConversationType.TASK_THREAD and conversation.related_entity_id:
            task = db.get(Task, conversation.related_entity_id)
            if task:
                user_ids.update({task.assigned_to, task.created_by})
                project = db.get(Project, task.project_id)
                if project:
                    user_ids.update({project.owner_id, project.manager_id})
                # Manager of the assignee
                assignee = db.get(User, task.assigned_to)
                if assignee and assignee.manager_id:
                    user_ids.add(assignee.manager_id)

        # Project thread
        elif conversation.type == ConversationType.PROJECT_THREAD and conversation.related_entity_id:
            project = db.get(Project, conversation.related_entity_id)
            if project:
                user_ids.update({project.owner_id, project.manager_id})

        # Meeting thread
        elif conversation.type == ConversationType.MEETING_THREAD and conversation.related_entity_id:
            meeting = db.get(Meeting, conversation.related_entity_id)
            if meeting:
                user_ids.add(meeting.organizer_id)
                parts = db.query(MeetingParticipant).filter_by(meeting_id=meeting.id).all()
                user_ids.update({p.user_id for p in parts})

        # Support thread
        elif conversation.type == ConversationType.SUPPORT_THREAD and conversation.related_entity_id:
            ticket = db.get(SupportTicket, conversation.related_entity_id)
            if ticket:
                user_ids.add(ticket.created_by_id)
                if ticket.assigned_to_id:
                    user_ids.add(ticket.assigned_to_id)

        # EOD thread
        elif conversation.type == ConversationType.EOD_THREAD and conversation.related_entity_id:
            report = db.get(EODReport, conversation.related_entity_id)
            if report:
                user_ids.add(report.user_id)
                reporter = db.get(User, report.user_id)
                if reporter and reporter.manager_id:
                    user_ids.add(reporter.manager_id)

        # Approval thread
        elif conversation.type == ConversationType.APPROVAL_THREAD and conversation.related_entity_id:
            approval = db.get(Approval, conversation.related_entity_id)
            if approval:
                user_ids.add(approval.requested_by)
                if approval.decided_by:
                    user_ids.add(approval.decided_by)

        # Globally, admins and HR operations always have access to contextual threads
        admin_hr = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.HR_OPERATIONS])).all()
        user_ids.update({u.id for u in admin_hr})

    # Filter out inactive or suspended users
    if not user_ids:
        return []

    return (
        db.query(User)
        .filter(and_(User.id.in_(list(user_ids)), User.status == "active"))
        .order_by(User.full_name.asc())
        .all()
    )


@router.get("/directory", response_model=list[MessagingDirectoryEntryRead])
def list_messaging_directory(
    search: str | None = Query(None, max_length=120),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessagingDirectoryEntryRead]:
    """Company-wide active user directory for Start Conversation modal."""
    from app.services.directory_service import DirectoryService

    entries = DirectoryService(db).list_messaging_directory(
        search=search,
        limit=limit,
        offset=offset,
    )
    return [MessagingDirectoryEntryRead.model_validate(entry) for entry in entries]


@router.get("/conversations/{conversation_id}/mentionable-users", response_model=list[UserMinimal])
def get_mentionable_users(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[User]:
    """Get active mentionable users for a specific conversation."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Verify visibility/participation
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not participate in this conversation."
        )

    return get_mentionable_users_helper(db, conv)


@router.get("/conversations", response_model=list[ConversationRead])
def get_conversations(
    type: ConversationType | None = Query(None),
    search: str | None = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationRead]:
    """Get conversations that the current user is part of."""
    # Base query for conversations user participates in
    query = (
        db.query(Conversation)
        .join(ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id == current_user.id)
        .filter(Conversation.is_archived == False)
    )

    if type:
        query = query.filter(Conversation.type == type)

    if search:
        query = query.filter(Conversation.title.ilike(f"%{search}%"))

    # Execute and populate unread counts
    conversations = query.order_by(Conversation.updated_at.desc()).offset(offset).limit(limit).all()

    results = []
    for conv in conversations:
        # Load participants
        parts = (
            db.query(ConversationParticipant)
            .filter(ConversationParticipant.conversation_id == conv.id)
            .options(joinedload(ConversationParticipant.user))
            .all()
        )
        conv.participants = parts

        # Find user's last_read_at
        user_part = next((p for p in parts if p.user_id == current_user.id), None)
        last_read = user_part.last_read_at if user_part else None
        
        # Calculate unread count
        msg_query = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id,
            Message.is_deleted == False
        )
        if last_read:
            msg_query = msg_query.filter(Message.created_at > last_read)
        
        unread_cnt = msg_query.count()
        conv.unread_count = unread_cnt

        if unread_only and unread_cnt == 0:
            continue

        # Populate last message
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id, Message.is_deleted == False)
            .order_by(Message.created_at.desc())
            .options(joinedload(Message.sender))
            .first()
        )
        if last_msg:
            conv.last_message = {
                "id": last_msg.id,
                "body": last_msg.body,
                "sender_id": last_msg.sender_id,
                "sender_name": last_msg.sender.full_name,
                "created_at": last_msg.created_at,
            }
        else:
            conv.last_message = None

        # If it is a direct DM, dynamically populate the title using the other participant's name
        if conv.type == ConversationType.DIRECT and not conv.title:
            other_part = next((p for p in parts if p.user_id != current_user.id), None)
            if other_part and other_part.user:
                conv.title = other_part.user.full_name
            else:
                conv.title = "Direct Message"

        results.append(conv)

    return results


@router.post("/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    """Create a new direct, group, or channel conversation."""
    from app.services.directory_service import DirectoryService

    directory = DirectoryService(db)
    if payload.type == ConversationType.DIRECT:
        if not payload.participant_ids or len(payload.participant_ids) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please specify at least one other participant for a direct message."
            )
        other_user_id = payload.participant_ids[0]
        if other_user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot start a direct message with yourself.",
            )
        directory.assert_active_user(other_user_id)

        # Check if direct message conversation already exists between these two users
        existing = (
            db.query(Conversation)
            .filter(Conversation.type == ConversationType.DIRECT)
            .join(ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == current_user.id)
            .all()
        )
        for c in existing:
            other_parts = db.query(ConversationParticipant).filter_by(conversation_id=c.id).all()
            part_ids = {p.user_id for p in other_parts}
            if part_ids == {current_user.id, other_user_id}:
                return _populate_conversation_read(c, db, current_user)

        participant_ids = [current_user.id, other_user_id]
        title = None

    else:
        for pid in payload.participant_ids:
            if pid == current_user.id:
                continue
            directory.assert_active_user(pid)
        participant_ids = list(set([current_user.id] + payload.participant_ids))
        if payload.type == ConversationType.CHANNEL:
            title = payload.title or f"Channel {datetime.now().strftime('%Y-%m-%d')}"
        else:
            title = payload.title or f"Group Discussion {datetime.now().strftime('%Y-%m-%d')}"

    new_conv = Conversation(
        type=payload.type,
        title=title,
        created_by_id=current_user.id,
    )
    db.add(new_conv)
    db.flush()

    for pid in participant_ids:
        part_user = db.get(User, pid)
        if not part_user or part_user.status in ["inactive", "suspended"]:
            continue
        role = ConversationParticipantRole.OWNER if pid == current_user.id else ConversationParticipantRole.MEMBER
        participant = ConversationParticipant(
            conversation_id=new_conv.id,
            user_id=pid,
            role=role,
            last_read_at=datetime.now(timezone.utc),
        )
        db.add(participant)

    db.commit()
    db.refresh(new_conv)

    return _populate_conversation_read(new_conv, db, current_user)


@router.get("/conversations/{conversation_id}", response_model=ConversationRead)
def get_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    """Get detail of a specific conversation."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Check participant visibility
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this conversation."
        )

    # Populate fields
    return _populate_conversation_read(conv, db, current_user)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
def get_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageRead]:
    """Retrieve messages in a conversation."""
    # Check permission
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access these messages."
        )

    query = db.query(Message).filter(
        Message.conversation_id == conversation_id,
    )

    if before:
        query = query.filter(Message.created_at < before)

    messages = (
        query.order_by(Message.created_at.desc())
        .options(
            joinedload(Message.sender),
            joinedload(Message.mentions).joinedload(MessageMention.mentioned_user),
            joinedload(Message.reactions).joinedload(MessageReaction.user),
            joinedload(Message.attachments),
        )
        .limit(limit)
        .all()
    )

    delivered_updates = receipt_svc.mark_delivered_for_conversation_fetch(
        db, conversation_id, current_user.id
    )
    if delivered_updates:
        db.commit()
        receipt_svc.emit_delivered_updates(db, conversation_id, delivered_updates)

    # Return in chronological order
    chronological = list(reversed(messages))
    return [receipt_svc.serialize_message(db, m, current_user.id) for m in chronological]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageRead:
    """Send a message to a conversation."""
    # Check participant visibility
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to send messages to this conversation."
        )

    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    admin_roles = {ConversationParticipantRole.OWNER, ConversationParticipantRole.ADMIN}

    # --- Channel posting rule: only owner/admin can post ---
    if conv.type == ConversationType.CHANNEL:
        if participant.role not in admin_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only channel admins can post in this channel."
            )

    # --- Group posting rule ---
    elif conv.type == ConversationType.GROUP:
        if conv.who_can_send_messages == "admins_only":
            if participant.role not in admin_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only group admins can send messages in this group."
                )
        else:
            # all_members: viewer cannot send
            if participant.role == ConversationParticipantRole.VIEWER:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to send messages here."
                )

    attachments = []
    if payload.attachment_ids:
        for aid in payload.attachment_ids:
            att = db.get(MessageAttachment, aid)
            if not att:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Attachment {aid} not found"
                )
            if att.uploader_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Attachment {aid} does not belong to you"
                )
            if att.conversation_id != conversation_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Attachment {aid} does not belong to this conversation"
                )
            if att.message_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Attachment {aid} is already attached to another message"
                )
            attachments.append(att)

    parent_message_id = payload.reply_to_message_id
    if parent_message_id:
        parent = db.get(Message, parent_message_id)
        if not parent or parent.conversation_id != conversation_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reply target must belong to this conversation.",
            )

    plain_body, sanitized_html = prepare_message_content(payload.body, payload.body_html)
    if not plain_body and not sanitized_html and not payload.attachment_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content or attachment is required.",
        )

    new_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        body=plain_body,
        body_html=sanitized_html,
        message_type=MessageType.TEXT,
        parent_message_id=parent_message_id,
    )
    db.add(new_msg)
    db.flush()

    for att in attachments:
        att.message_id = new_msg.id

    # Process mentions with scope validation
    mentionable_users = get_mentionable_users_helper(db, conv)
    mentionable_ids = {u.id for u in mentionable_users}

    mentioned_users = []
    for uid in payload.mentioned_user_ids:
        if uid not in mentionable_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can only mention users who have access to this conversation."
            )
        m_user = db.get(User, uid)
        if not m_user:
            continue
        mention = MessageMention(message_id=new_msg.id, mentioned_user_id=uid)
        db.add(mention)
        mentioned_users.append(m_user)

    # Update conversation updated_at for ordering
    conv.updated_at = datetime.now(timezone.utc)
    
    # Automatically mark conversation as read for the sender
    read_at = datetime.now(timezone.utc)
    participant.last_read_at = read_at

    receipt_svc.create_receipts_for_message(db, new_msg)

    seen_updates = receipt_svc.mark_seen_for_conversation_read(
        db, conversation_id, current_user.id, read_at
    )

    db.commit()
    db.refresh(new_msg)

    if seen_updates:
        receipt_svc.emit_seen_updates(db, conversation_id, seen_updates)

    # Send Notification/Alert System events
    other_participants = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id)
        .filter(ConversationParticipant.user_id != current_user.id)
        .all()
    )

    participant_ids = [op.user_id for op in other_participants]
    created_notifications = create_message_notifications(
        db,
        participants=participant_ids,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        conversation_id=conversation_id,
        conversation_title=conv.title,
        conversation_type=conv.type,
        body_preview=plain_body or "Sent an attachment",
        mentioned_user_ids=payload.mentioned_user_ids,
    )
    db.commit()
    for notif in created_notifications:
        db.refresh(notif)

    preview = payload.body or "Sent an attachment"
    try:
        RealtimeService.emit_new_message(
            db,
            conversation_id=conversation_id,
            message_id=new_msg.id,
            sender_id=current_user.id,
            sender_name=current_user.full_name,
            preview=preview,
            created_at=new_msg.created_at.isoformat() if new_msg.created_at else datetime.now(timezone.utc).isoformat(),
        )
        RealtimeService.emit_conversation_updated(db, conversation_id)
    except Exception:
        logger.exception("Failed to emit realtime events for new message %s", new_msg.id)

    # Reload message to populate sender details
    loaded = (
        db.query(Message)
        .filter(Message.id == new_msg.id)
        .options(
            joinedload(Message.sender),
            joinedload(Message.mentions).joinedload(MessageMention.mentioned_user),
            joinedload(Message.reactions).joinedload(MessageReaction.user),
            joinedload(Message.attachments),
        )
        .first()
    )
    return receipt_svc.serialize_message(db, loaded, current_user.id)


@router.patch("/{message_id}", response_model=MessageRead)
def edit_message(
    message_id: uuid.UUID,
    payload: MessageEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    """Edit own message."""
    msg = db.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    if msg.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this message."
        )

    plain_body, sanitized_html = prepare_message_content(payload.body, payload.body_html)
    msg.body = plain_body
    msg.body_html = sanitized_html
    msg.is_edited = True
    msg.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    RealtimeService.emit_message_updated(
        db,
        conversation_id=msg.conversation_id,
        message_id=msg.id,
        preview=plain_body or "",
    )

    return msg


@router.delete("/{message_id}")
def delete_message(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Soft delete a message with permission checks."""
    msg = db.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    participant = (
        db.query(ConversationParticipant)
        .filter_by(conversation_id=msg.conversation_id, user_id=current_user.id)
        .first()
    )
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this message.",
        )

    if not receipt_svc.can_user_delete_message(msg, current_user, participant):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this message.",
        )

    if msg.is_deleted:
        return {"message": "Message already deleted."}

    msg.is_deleted = True
    msg.deleted_at = datetime.now(timezone.utc)
    msg.deleted_by_id = current_user.id
    conv_id = msg.conversation_id
    msg_id = msg.id
    db.commit()

    RealtimeService.emit_message_deleted(
        db,
        conversation_id=conv_id,
        message_id=msg_id,
        is_deleted=True,
    )

    return {"message": "Message deleted successfully."}


@router.get("/{message_id}/info", response_model=MessageInfoRead)
def get_message_info(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageInfoRead:
    """Get delivery and read receipt info for a message."""
    try:
        info = receipt_svc.get_message_info(db, message_id, current_user)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this message info.",
        )
    return MessageInfoRead.model_validate(info)


@router.post("/conversations/{conversation_id}/delivered", response_model=MessagesDeliveredResponse)
def mark_messages_delivered(
    conversation_id: uuid.UUID,
    payload: MessagesDeliveredRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessagesDeliveredResponse:
    """Mark incoming messages as delivered for the current user."""
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not participate in this conversation.",
        )

    updates = receipt_svc.mark_messages_delivered(
        db,
        conversation_id,
        current_user.id,
        payload.message_ids,
    )
    if updates:
        db.commit()
        receipt_svc.emit_delivered_updates(db, conversation_id, updates)

    return MessagesDeliveredResponse(
        marked_count=len(updates),
        message_ids=[message_id for message_id, _, _ in updates],
    )


@router.post("/conversations/{conversation_id}/seen", response_model=MessagesSeenResponse)
def mark_conversation_seen(
    conversation_id: uuid.UUID,
    payload: MessagesSeenRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessagesSeenResponse:
    """Mark incoming messages in a conversation as seen for the current user."""
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not participate in this conversation.",
        )

    read_at = datetime.now(timezone.utc)
    participant.last_read_at = read_at
    message_ids = payload.message_ids if payload else None

    seen_updates = receipt_svc.mark_seen_for_conversation_read(
        db,
        conversation_id,
        current_user.id,
        read_at,
        message_ids=message_ids,
    )
    db.commit()

    if seen_updates:
        receipt_svc.emit_seen_updates(db, conversation_id, seen_updates)
        RealtimeService.emit_conversation_read(
            db,
            conversation_id=conversation_id,
            user_id=current_user.id,
            read_at=read_at.isoformat(),
        )

    return MessagesSeenResponse(
        seen_count=len(seen_updates),
        seen_at=read_at,
        message_ids=[message_id for message_id, _, _ in seen_updates],
    )


@router.post("/conversations/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Mark conversation as read for current user."""
    result = mark_conversation_seen(
        conversation_id,
        MessagesSeenRequest(),
        db=db,
        current_user=current_user,
    )
    return {"message": f"Conversation marked as read ({result.seen_count} messages seen)."}


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Get current user's unread conversations and message count."""
    participants = db.query(ConversationParticipant).filter_by(user_id=current_user.id).all()
    
    unread_convs = 0
    unread_msgs = 0
    mentions_count = 0

    for p in participants:
        last_read = p.last_read_at
        
        # Unread messages query
        m_query = db.query(Message).filter(
            Message.conversation_id == p.conversation_id,
            Message.sender_id != current_user.id,
            Message.is_deleted == False
        )
        if last_read:
            m_query = m_query.filter(Message.created_at > last_read)
        
        conv_unread = m_query.count()
        if conv_unread > 0:
            unread_convs += 1
            unread_msgs += conv_unread

        # Mentions count
        men_query = (
            db.query(MessageMention)
            .join(Message, MessageMention.message_id == Message.id)
            .filter(MessageMention.mentioned_user_id == current_user.id)
            .filter(Message.conversation_id == p.conversation_id)
        )
        if last_read:
            men_query = men_query.filter(Message.created_at > last_read)
        mentions_count += men_query.count()

    return {
        "unread_conversations": unread_convs,
        "unread_messages": unread_msgs,
        "mentions": mentions_count,
    }


@router.post("/context/thread", response_model=ConversationRead)
def get_or_create_context_thread(
    payload: ContextThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    """Create or get a contextual discussion thread."""
    # 1. Enforce specific work access permission
    has_access = check_thread_access(
        db, current_user, payload.related_entity_type, payload.related_entity_id
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to discuss this item."
        )

    # 2. Check if thread already exists
    existing = db.query(Conversation).filter_by(
        related_entity_type=payload.related_entity_type,
        related_entity_id=payload.related_entity_id
    ).first()

    if existing:
        # Check/Add participant if not already present
        part = db.query(ConversationParticipant).filter_by(
            conversation_id=existing.id, user_id=current_user.id
        ).first()
        if not part:
            participant = ConversationParticipant(
                conversation_id=existing.id,
                user_id=current_user.id,
                role=ConversationParticipantRole.MEMBER,
                last_read_at=datetime.now(timezone.utc),
            )
            db.add(participant)
            db.commit()

        # Reload participants
        existing.participants = (
            db.query(ConversationParticipant)
            .filter(ConversationParticipant.conversation_id == existing.id)
            .options(joinedload(ConversationParticipant.user))
            .all()
        )
        return existing

    # 3. Create new conversation based on entity details
    c_type_map = {
        "task": ConversationType.TASK_THREAD,
        "project": ConversationType.PROJECT_THREAD,
        "meeting": ConversationType.MEETING_THREAD,
        "support": ConversationType.SUPPORT_THREAD,
        "eod": ConversationType.EOD_THREAD,
        "approval": ConversationType.APPROVAL_THREAD,
    }
    c_type = c_type_map.get(payload.related_entity_type, ConversationType.GROUP)

    # Determine default participants based on contextual entity
    participant_ids = [current_user.id]
    
    if payload.related_entity_type == "task":
        task = db.get(Task, payload.related_entity_id)
        if task:
            participant_ids.extend([task.assigned_to, task.created_by])
            default_title = f"Task: {task.title}"
    elif payload.related_entity_type == "project":
        project = db.get(Project, payload.related_entity_id)
        if project:
            participant_ids.extend([project.owner_id, project.manager_id])
            default_title = f"Project: {project.title}"
    elif payload.related_entity_type == "meeting":
        meeting = db.get(Meeting, payload.related_entity_id)
        if meeting:
            participant_ids.append(meeting.organizer_id)
            parts = db.query(MeetingParticipant).filter_by(meeting_id=meeting.id).all()
            participant_ids.extend([p.user_id for p in parts])
            default_title = f"Meeting: {meeting.title}"
    elif payload.related_entity_type == "support":
        ticket = db.get(SupportTicket, payload.related_entity_id)
        if ticket:
            participant_ids.append(ticket.created_by_id)
            if ticket.assigned_to_id:
                participant_ids.append(ticket.assigned_to_id)
            default_title = f"Ticket #{ticket.ticket_number}: {ticket.subject}"
    elif payload.related_entity_type == "eod":
        report = db.get(EODReport, payload.related_entity_id)
        if report:
            participant_ids.append(report.user_id)
            reporter = db.get(User, report.user_id)
            if reporter and reporter.manager_id:
                participant_ids.append(reporter.manager_id)
            default_title = f"EOD Feedback: {reporter.full_name} ({report.report_date})"
    elif payload.related_entity_type == "approval":
        approval = db.get(Approval, payload.related_entity_id)
        if approval:
            participant_ids.append(approval.requested_by)
            if approval.decided_by:
                participant_ids.append(approval.decided_by)
            default_title = f"Approval Clarification: {approval.entity_type.value.capitalize()}"
    else:
        default_title = payload.title or "Context Discussion"

    title = payload.title or default_title
    new_conv = Conversation(
        type=c_type,
        title=title,
        created_by_id=current_user.id,
        related_entity_type=payload.related_entity_type,
        related_entity_id=payload.related_entity_id,
    )
    db.add(new_conv)
    db.flush()

    # Unique list of participant IDs
    unique_pids = list(set(participant_ids))
    for pid in unique_pids:
        part_user = db.get(User, pid)
        if not part_user or part_user.status in ["inactive", "suspended"]:
            continue
        role = ConversationParticipantRole.OWNER if pid == current_user.id else ConversationParticipantRole.MEMBER
        participant = ConversationParticipant(
            conversation_id=new_conv.id,
            user_id=pid,
            role=role,
            last_read_at=datetime.now(timezone.utc),
        )
        db.add(participant)

    db.commit()
    db.refresh(new_conv)
    
    # Reload participants
    new_conv.participants = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == new_conv.id)
        .options(joinedload(ConversationParticipant.user))
        .all()
    )

    return new_conv


# ─────────────────────────────────────────────────────────────────────────────
# PARTICIPANT MANAGEMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

def _get_participant_list(db: Session, conversation_id: uuid.UUID):
    """Helper to load participants with user data."""
    return (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id)
        .options(joinedload(ConversationParticipant.user))
        .all()
    )


def _notify_user(db: Session, user_id: uuid.UUID, title: str, message: str, conv_id: uuid.UUID):
    """Helper to create a notification for a user."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.SYSTEM,
        related_entity_type="conversation",
        related_entity_id=conv_id,
    )
    db.add(notif)


@router.post(
    "/conversations/{conversation_id}/participants",
    response_model=AddParticipantsResponse,
    status_code=status.HTTP_200_OK,
)
def add_participants(
    conversation_id: uuid.UUID,
    payload: AddParticipantsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AddParticipantsResponse:
    """Add members to an existing group, channel, or thread conversation."""
    conv, _caller_part = _require_participant_manage_access(db, conversation_id, current_user)

    existing_ids = {
        p.user_id
        for p in db.query(ConversationParticipant)
        .filter_by(conversation_id=conversation_id)
        .all()
    }

    conv_title = conv.title or "the conversation"
    added: list[tuple[ConversationParticipant, User]] = []
    now = datetime.now(timezone.utc)

    for uid in payload.user_ids:
        if uid in existing_ids:
            continue
        target_user = db.get(User, uid)
        if not target_user or target_user.status != UserStatus.ACTIVE:
            continue
        new_part = ConversationParticipant(
            conversation_id=conversation_id,
            user_id=uid,
            role=ConversationParticipantRole.MEMBER,
            last_read_at=now,
        )
        db.add(new_part)
        added.append((new_part, target_user))
        existing_ids.add(uid)

    if added:
        names = ", ".join(user.full_name for _part, user in added)
        system_body = f"{current_user.full_name} added {names} to {conv_title}"
        db.add(
            Message(
                id=uuid.uuid4(),
                conversation_id=conversation_id,
                sender_id=current_user.id,
                body=system_body,
                message_type=MessageType.SYSTEM,
                is_edited=False,
                is_deleted=False,
                created_at=now,
                updated_at=now,
            )
        )

    db.commit()

    added_user_ids = [user.id for _part, user in added]
    for uid in added_user_ids:
        _notify_user(
            db,
            uid,
            title=f"You were added to {conv_title}",
            message=f"{current_user.full_name} added you to {conv_title}.",
            conv_id=conversation_id,
        )
    if added_user_ids:
        db.commit()

    participant_summaries = [
        AddedParticipantSummary(
            user_id=user.id,
            name=user.full_name,
            email=user.email,
            role=ConversationParticipantRole.MEMBER.value,
            presence_status=getattr(user, "presence_status", None) or "active",
            avatar_url=user.avatar_url,
        )
        for _part, user in added
    ]

    if participant_summaries:
        try:
            RealtimeService.emit_conversation_participants_added(
                db,
                conversation_id,
                added_by_id=current_user.id,
                added_by_name=current_user.full_name,
                participants=[
                    {
                        "user_id": str(item.user_id),
                        "name": item.name,
                        "email": item.email,
                        "role": item.role,
                        "presence_status": item.presence_status,
                    }
                    for item in participant_summaries
                ],
            )
            RealtimeService.emit_conversation_updated(db, conversation_id)
        except Exception:
            logger.exception("Failed to emit participants-added realtime event")

    return AddParticipantsResponse(
        conversation_id=conversation_id,
        added_count=len(participant_summaries),
        participants=participant_summaries,
    )


@router.get(
    "/conversations/{conversation_id}/available-members",
    response_model=AvailableMembersResponse,
)
def get_available_conversation_members(
    conversation_id: uuid.UUID,
    search: str | None = Query(None, max_length=120),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AvailableMembersResponse:
    """Search active users who can be added to a conversation."""
    _conv, _caller_part = _require_participant_manage_access(db, conversation_id, current_user)

    from app.services.directory_service import DirectoryService

    existing_ids = {
        p.user_id
        for p in db.query(ConversationParticipant)
        .filter_by(conversation_id=conversation_id)
        .all()
    }

    query = db.query(User).filter(User.status == UserStatus.ACTIVE)
    if existing_ids:
        query = query.filter(~User.id.in_(existing_ids))

    if current_user.role not in PLATFORM_PARTICIPANT_MANAGERS:
        allowed_ids = DirectoryService(db).get_messageable_user_ids(current_user)
        allowed_ids -= existing_ids
        if not allowed_ids:
            return AvailableMembersResponse(users=[])
        query = query.filter(User.id.in_(allowed_ids))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                cast(User.role, String).ilike(term),
                User.department.ilike(term),
                User.designation.ilike(term),
            )
        )

    users = query.order_by(User.full_name.asc()).limit(limit).all()
    return AvailableMembersResponse(
        users=[
            AvailableConversationMemberRead(
                id=user.id,
                name=user.full_name,
                email=user.email,
                role=str(user.role.value if hasattr(user.role, "value") else user.role),
                department=user.department,
                designation=user.designation,
                avatar_url=user.avatar_url,
                presence_status=getattr(user, "presence_status", None) or "active",
            )
            for user in users
        ]
    )


@router.delete(
    "/conversations/{conversation_id}/participants/{user_id}",
    status_code=status.HTTP_200_OK,
)
def remove_participant(
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Remove a member from a group or channel."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.type == ConversationType.DIRECT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove participants from a direct message.",
        )

    caller_part = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not caller_part:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant.")

    target_part = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=user_id
    ).first()
    if not target_part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user is not in this conversation.")

    admin_roles = {ConversationParticipantRole.OWNER, ConversationParticipantRole.ADMIN}
    is_self_removal = user_id == current_user.id

    if not is_self_removal and caller_part.role not in admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove other members.",
        )

    # Cannot remove the owner
    if target_part.role == ConversationParticipantRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the conversation owner. Transfer ownership first.",
        )

    db.delete(target_part)
    db.commit()
    return {"message": "Member removed successfully."}


@router.patch(
    "/conversations/{conversation_id}/participants/{user_id}",
    response_model=ConversationParticipantRead,
)
def update_participant_role(
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: UpdateParticipantRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationParticipant:
    """Promote or demote a conversation participant's role."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    caller_part = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not caller_part:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant.")

    admin_roles = {ConversationParticipantRole.OWNER, ConversationParticipantRole.ADMIN}
    if caller_part.role not in admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change participant roles.",
        )

    target_part = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=user_id
    ).first()
    if not target_part:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user is not in this conversation.")

    # Cannot assign owner role via this endpoint
    if payload.role == ConversationParticipantRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign owner role via this endpoint.",
        )

    # Cannot change the owner's role
    if target_part.role == ConversationParticipantRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change the owner's role.",
        )

    # Only owner can demote admins
    if (
        target_part.role == ConversationParticipantRole.ADMIN
        and caller_part.role != ConversationParticipantRole.OWNER
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the conversation owner can demote admins.",
        )

    old_role = target_part.role
    target_part.role = payload.role
    db.commit()
    db.refresh(target_part)

    # Load user relation for notification
    db.refresh(target_part, ["user"])

    # Notify affected user
    conv_title = conv.title or "the conversation"
    _notify_user(
        db, user_id,
        title=f"Your role in {conv_title} was updated",
        message=f"Your role changed from {old_role.value} to {payload.role.value} in {conv_title}.",
        conv_id=conversation_id,
    )
    db.commit()

    return (
        db.query(ConversationParticipant)
        .filter_by(id=target_part.id)
        .options(joinedload(ConversationParticipant.user))
        .first()
    )


@router.patch(
    "/conversations/{conversation_id}/settings",
    response_model=ConversationRead,
)
def update_conversation_settings(
    conversation_id: uuid.UUID,
    payload: ConversationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    """Update group or channel settings (title and permission policies)."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.type == ConversationType.DIRECT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct messages do not support group settings.",
        )

    caller_part = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not caller_part:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant.")

    admin_roles = {ConversationParticipantRole.OWNER, ConversationParticipantRole.ADMIN}

    # Who can edit info check
    can_edit = (
        caller_part.role in admin_roles
        or conv.who_can_edit_group_info == "all_members"
    )
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update group settings.",
        )

    if payload.title is not None:
        conv.title = payload.title

    if payload.who_can_send_messages is not None:
        # Channels are always admins_only for posting
        if conv.type == ConversationType.CHANNEL:
            conv.who_can_send_messages = "admins_only"
        else:
            conv.who_can_send_messages = payload.who_can_send_messages

    if payload.who_can_edit_group_info is not None:
        conv.who_can_edit_group_info = payload.who_can_edit_group_info

    if payload.who_can_add_members is not None:
        conv.who_can_add_members = payload.who_can_add_members

    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)

    # Reload participants for the response
    conv.participants = _get_participant_list(db, conversation_id)

    return conv


@router.post("/conversations/{conversation_id}/attachments", response_model=list[MessageAttachmentRead], status_code=status.HTTP_201_CREATED)
def upload_attachments(
    conversation_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageAttachment]:
    """Upload message attachments."""
    # Check participant visibility
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to send attachments to this conversation."
        )

    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    admin_roles = {ConversationParticipantRole.OWNER, ConversationParticipantRole.ADMIN}

    # --- Channel posting rule ---
    if conv.type == ConversationType.CHANNEL:
        if participant.role not in admin_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only channel admins can post in this channel."
            )

    # --- Group posting rule ---
    elif conv.type == ConversationType.GROUP:
        if conv.who_can_send_messages == "admins_only":
            if participant.role not in admin_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only group admins can send messages in this group."
                )
        else:
            if participant.role == ConversationParticipantRole.VIEWER:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to send messages here."
                )

    # Validate file count limit: max 5 files
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can attach up to 5 files."
        )

    ALLOWED_EXTENSIONS = {
        # Images
        "png", "jpg", "jpeg", "webp", "gif",
        # Documents
        "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "ppt", "pptx",
        # Audio / voice notes
        "m4a", "mp4", "aac", "mp3", "wav", "webm", "ogg", "caf", "3gp",
    }

    MAX_SIZE = 10 * 1024 * 1024  # 10 MB per file
    MAX_VOICE_NOTE_SIZE = 2 * 1024 * 1024  # 2 MB for audio attachments
    AUDIO_EXTENSIONS = {"m4a", "mp4", "aac", "mp3", "wav", "webm", "ogg", "caf", "3gp"}

    attachments = []
    # Make sure target storage directory exists
    storage_dir = "storage/message-attachments"
    os.makedirs(storage_dir, exist_ok=True)

    for file in files:
        # Determine extension and validate
        filename = file.filename or ""
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not supported: .{ext}"
            )

        # Validate file size
        if file.size is not None:
            size = file.size
        else:
            file.file.seek(0, os.SEEK_END)
            size = file.file.tell()
            file.file.seek(0)

        max_allowed = MAX_VOICE_NOTE_SIZE if ext in AUDIO_EXTENSIONS else MAX_SIZE
        if size > max_allowed:
            limit_label = "2 MB for audio" if ext in AUDIO_EXTENSIONS else "10 MB"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is too large. Maximum size is {limit_label}. Got {size / (1024*1024):.2f} MB."
            )

        # Secure file saving to prevent path traversal
        storage_name = f"{uuid.uuid4()}.{ext}"
        storage_path = os.path.join(storage_dir, storage_name)

        # Write to disk
        try:
            with open(storage_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to upload attachment. Error saving file: {str(e)}"
            )

        # Create record in DB
        new_att = MessageAttachment(
            conversation_id=conversation_id,
            uploader_id=current_user.id,
            file_name=storage_name,
            original_file_name=filename,
            mime_type=file.content_type or "application/octet-stream",
            file_size=size,
            storage_path=storage_path,
            storage_name=storage_name,
        )
        db.add(new_att)
        attachments.append(new_att)

    db.commit()
    for att in attachments:
        db.refresh(att)

    return attachments


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an attachment file safely."""
    att = db.get(MessageAttachment, attachment_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    # Check participant visibility
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=att.conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not participate in this conversation."
        )

    # Check if file exists on disk
    if not os.path.exists(att.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file not found on disk"
        )

    from fastapi.responses import FileResponse
    import urllib.parse

    # Safe content-disposition with RFC 5987 / URL-encoded filename
    encoded_filename = urllib.parse.quote(att.original_file_name)
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
    }

    return FileResponse(
        path=att.storage_path,
        media_type=att.mime_type,
        headers=headers
    )


# ─── WebRTC Call and Signaling Routes ─────────────────────────────────────────

@router.post("/conversations/{conversation_id}/calls/start", response_model=CallSessionRead)
def start_call(
    conversation_id: uuid.UUID,
    req: CallStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new 1-to-1 Voice/Video call session in a direct conversation."""
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Check that current user is a participant of the conversation
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation."
        )

    # Enforce that calls are restricted to 1-to-1 direct chats
    if conversation.type != ConversationType.DIRECT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Calls are only supported in 1-to-1 direct chats in the free version."
        )

    # Transition any orphaned active or ringing call sessions in this conversation to ended
    stale_calls = db.query(CallSession).filter(
        CallSession.conversation_id == conversation_id,
        CallSession.status.in_(["ringing", "active"])
    ).all()
    for sc in stale_calls:
        sc.status = "ended"
        sc.ended_at = datetime.now(timezone.utc)

    # Create the call session
    call_session = CallSession(
        id=uuid.uuid4(),
        conversation_id=conversation_id,
        started_by_id=current_user.id,
        call_type=req.call_type,
        status="ringing",
        created_at=datetime.now(timezone.utc)
    )
    db.add(call_session)

    # Add all participants of the conversation to the CallParticipant table
    other_participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id
    ).all()

    for p in other_participants:
        part_status = "joined" if p.user_id == current_user.id else "invited"
        joined_at = datetime.now(timezone.utc) if p.user_id == current_user.id else None
        call_part = CallParticipant(
            id=uuid.uuid4(),
            call_session_id=call_session.id,
            user_id=p.user_id,
            status=part_status,
            joined_at=joined_at
        )
        db.add(call_part)

    # Find the recipient (the participant who is not the current user)
    recipient = next((p for p in other_participants if p.user_id != current_user.id), None)
    call_notification = None
    if recipient:
        call_notification = Notification(
            id=uuid.uuid4(),
            user_id=recipient.user_id,
            title="Incoming Call",
            message=f"{current_user.full_name} is calling you ({req.call_type}).",
            notification_type=NotificationType.CALL_INCOMING,
            related_entity_type="call_session",
            related_entity_id=call_session.id,
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )
        db.add(call_notification)

    db.commit()
    db.refresh(call_session)

    if recipient:
        receiver_connected = ws_manager.connection_count(str(recipient.user_id)) > 0
        logger.info(
            "[CALL] start call_id=%s caller=%s receiver=%s receiver_connected=%s",
            call_session.id,
            current_user.id,
            recipient.user_id,
            receiver_connected,
        )
        RealtimeService.emit_call_event(
            "call_incoming",
            call_session_id=call_session.id,
            conversation_id=conversation_id,
            call_type=req.call_type,
            target_user_ids=[recipient.user_id],
            actor_id=current_user.id,
            extra={"started_by_name": current_user.full_name},
        )
        if call_notification:
            db.refresh(call_notification)
            RealtimeService.emit_notification_created(call_notification)
        try:
            from app.services.push_notification_service import PushNotificationService

            PushNotificationService.send_incoming_call_push(
                db,
                recipient_user_id=recipient.user_id,
                call_session_id=call_session.id,
                conversation_id=conversation_id,
                caller_id=current_user.id,
                caller_name=current_user.full_name or "Someone",
                call_type=req.call_type,
            )
        except Exception:
            logger.exception(
                "[CALL] incoming_call_push_failed call_id=%s receiver=%s",
                call_session.id,
                recipient.user_id,
            )
        logger.info(
            "[CALL] sent call_incoming to user_id=%s call_id=%s",
            recipient.user_id,
            call_session.id,
        )

    return call_session


@router.post("/calls/{call_id}/accept", response_model=CallSessionRead)
def accept_call(
    call_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept an incoming call session."""
    call_session = db.get(CallSession, call_id)
    if not call_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify participant
    participant = db.query(CallParticipant).filter_by(
        call_session_id=call_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call session."
        )

    if call_session.status != "ringing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept call session in status '{call_session.status}'."
        )

    # Update participant status if receiver
    if call_session.started_by_id != current_user.id:
        participant.status = "joined"
        participant.joined_at = datetime.now(timezone.utc)

    # Transition call session to active
    call_session.status = "active"
    call_session.started_at = datetime.now(timezone.utc)
    call_session.accepted_at = datetime.now(timezone.utc)

    # Mark incoming notification as read
    incoming_notifs = db.query(Notification).filter_by(
        user_id=current_user.id,
        notification_type=NotificationType.CALL_INCOMING,
        related_entity_id=call_session.started_by_id,
        is_read=False
    ).all()
    for n in incoming_notifs:
        n.is_read = True
        n.read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(call_session)

    logger.info(
        "[CALL] accepted call_id=%s receiver=%s caller=%s",
        call_session.id,
        current_user.id,
        call_session.started_by_id,
    )
    RealtimeService.emit_call_event(
        "call_accepted",
        call_session_id=call_session.id,
        conversation_id=call_session.conversation_id,
        call_type=call_session.call_type,
        target_user_ids=[call_session.started_by_id],
        actor_id=current_user.id,
    )
    logger.info(
        "[CALL] sent call_accepted to caller=%s call_id=%s",
        call_session.started_by_id,
        call_session.id,
    )

    return call_session


@router.post("/calls/{call_id}/decline", response_model=CallSessionRead)
def decline_call(
    call_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Decline an incoming call session."""
    call_session = db.get(CallSession, call_id)
    if not call_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify participant
    participant = db.query(CallParticipant).filter_by(
        call_session_id=call_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call session."
        )

    if call_session.status != "ringing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot decline call session in status '{call_session.status}'."
        )

    # Decline participant and session
    participant.status = "declined"
    participant.left_at = datetime.now(timezone.utc)
    
    call_session.status = "declined"
    call_session.ended_at = datetime.now(timezone.utc)

    # Mark incoming notification as read
    incoming_notifs = db.query(Notification).filter_by(
        user_id=current_user.id,
        notification_type=NotificationType.CALL_INCOMING,
        related_entity_id=call_session.started_by_id,
        is_read=False
    ).all()
    for n in incoming_notifs:
        n.is_read = True
        n.read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(call_session)

    RealtimeService.emit_call_event(
        "call_declined",
        call_session_id=call_session.id,
        conversation_id=call_session.conversation_id,
        call_type=call_session.call_type,
        target_user_ids=[call_session.started_by_id],
        actor_id=current_user.id,
    )

    return call_session


@router.post("/calls/{call_id}/end", response_model=CallSessionRead)
def end_call(
    call_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """End a call session (or cancel ringing call, triggering missed call notifications)."""
    call_session = db.get(CallSession, call_id)
    if not call_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify participant
    participant = db.query(CallParticipant).filter_by(
        call_session_id=call_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call session."
        )

    if call_session.status in ["ended", "declined", "missed"]:
        return call_session

    if call_session.status == "ringing":
        # Call is cancelled before accepted
        call_session.status = "missed"
        call_session.ended_at = datetime.now(timezone.utc)

        # Set caller participant status to left
        caller_part = db.query(CallParticipant).filter_by(
            call_session_id=call_id, user_id=call_session.started_by_id
        ).first()
        if caller_part:
            caller_part.status = "left"
            caller_part.left_at = datetime.now(timezone.utc)

        # Set receiver participant status to missed and write a missed call notification
        receiver_part = db.query(CallParticipant).filter(
            CallParticipant.call_session_id == call_id,
            CallParticipant.user_id != call_session.started_by_id
        ).first()
        if receiver_part:
            receiver_part.status = "missed"

            # Dismiss incoming notification
            incoming_notifs = db.query(Notification).filter_by(
                user_id=receiver_part.user_id,
                notification_type=NotificationType.CALL_INCOMING,
                is_read=False
            ).all()
            for n in incoming_notifs:
                n.is_read = True
                n.read_at = datetime.now(timezone.utc)

            # Create missed call notification
            missed_notif = Notification(
                id=uuid.uuid4(),
                user_id=receiver_part.user_id,
                title="Missed Call",
                message=f"You missed a {call_session.call_type} call from {current_user.full_name}.",
                notification_type=NotificationType.CALL_MISSED,
                related_entity_type="user",
                related_entity_id=current_user.id,
                is_read=False,
                created_at=datetime.now(timezone.utc)
            )
            db.add(missed_notif)

            RealtimeService.emit_call_event(
                "call_missed",
                call_session_id=call_session.id,
                conversation_id=call_session.conversation_id,
                call_type=call_session.call_type,
                target_user_ids=[call_session.started_by_id, receiver_part.user_id],
                actor_id=current_user.id,
            )
            if missed_notif:
                db.flush()
                RealtimeService.emit_notification_created(missed_notif)

    elif call_session.status == "active":
        # Call was active and is being ended
        call_session.status = "ended"
        call_session.ended_at = datetime.now(timezone.utc)

        # Set participant status to left
        participants = db.query(CallParticipant).filter_by(call_session_id=call_id).all()
        for p in participants:
            if p.status == "joined" or p.user_id == current_user.id:
                p.status = "left"
                p.left_at = datetime.now(timezone.utc)

        # Create system message inside conversation
        system_body = "Voice call ended" if call_session.call_type == "voice" else "Video call ended"
        system_msg = Message(
            id=uuid.uuid4(),
            conversation_id=call_session.conversation_id,
            sender_id=current_user.id,
            body=system_body,
            message_type=MessageType.SYSTEM,
            is_edited=False,
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(system_msg)

    db.commit()
    db.refresh(call_session)

    call_participant_ids = [
        p.user_id
        for p in db.query(CallParticipant).filter_by(call_session_id=call_id).all()
    ]
    RealtimeService.emit_call_event(
        "call_ended",
        call_session_id=call_session.id,
        conversation_id=call_session.conversation_id,
        call_type=call_session.call_type,
        target_user_ids=call_participant_ids,
        actor_id=current_user.id,
        extra={"status": call_session.status},
    )

    return call_session


@router.post("/calls/{call_id}/signal", response_model=CallSignalRead)
def send_call_signal(
    call_id: uuid.UUID,
    req: CallSignalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Write offer/answer/ice_candidate signals for a calling session."""
    call_session = db.get(CallSession, call_id)
    if not call_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify sender is a participant
    sender_participant = db.query(CallParticipant).filter_by(
        call_session_id=call_id, user_id=current_user.id
    ).first()
    if not sender_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call session."
        )

    # Verify recipient is a participant
    recipient_participant = db.query(CallParticipant).filter_by(
        call_session_id=call_id, user_id=req.recipient_id
    ).first()
    if not recipient_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recipient is not a participant in this call session."
        )

    import json
    signal = CallSignal(
        id=uuid.uuid4(),
        call_session_id=call_id,
        sender_id=current_user.id,
        recipient_id=req.recipient_id,
        signal_type=req.signal_type,
        payload_json=json.dumps(req.payload),
        created_at=datetime.now(timezone.utc)
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)

    recipient_connected = ws_manager.connection_count(str(req.recipient_id)) > 0
    logger.info(
        "[CALL] ICE/signal from=%s to=%s call_id=%s type=%s delivered_target_connected=%s",
        current_user.id,
        req.recipient_id,
        call_id,
        req.signal_type,
        recipient_connected,
    )

    RealtimeService.emit_to_user(
        req.recipient_id,
        RealtimeService.event(
            "call_signal",
            {
                "call_session_id": str(call_id),
                "signal_type": req.signal_type,
                "signal_id": str(signal.id),
                "sender_id": str(current_user.id),
                "payload": req.payload,
            },
            actor_id=current_user.id,
            conversation_id=call_session.conversation_id,
            entity_type="call",
            entity_id=call_session.id,
        ),
    )

    return signal


@router.get("/calls/{call_id}/signals", response_model=list[CallSignalRead])
def get_call_signals(
    call_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pull unconsumed calling signals for the current user."""
    call_session = db.get(CallSession, call_id)
    if not call_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )

    # Verify participant
    participant = db.query(CallParticipant).filter_by(
        call_session_id=call_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call session."
        )

    # Pull unconsumed signals for current user
    signals = db.query(CallSignal).filter(
        CallSignal.call_session_id == call_id,
        CallSignal.recipient_id == current_user.id,
        CallSignal.consumed_at.is_(None)
    ).order_by(CallSignal.created_at.asc()).all()

    # Mark consumed
    now = datetime.now(timezone.utc)
    for s in signals:
        s.consumed_at = now

    db.commit()
    return signals


@router.get("/calls/incoming", response_model=CallSessionRead | None)
def get_incoming_call(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check for active ringing call sessions inviting the current user."""
    session = db.query(CallSession).join(
        CallParticipant,
        CallParticipant.call_session_id == CallSession.id
    ).filter(
        CallSession.status == "ringing",
        CallParticipant.user_id == current_user.id,
        CallParticipant.status == "invited"
    ).order_by(CallSession.created_at.desc()).first()
    return session


