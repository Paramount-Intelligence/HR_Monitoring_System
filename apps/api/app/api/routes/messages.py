import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db
from app.models.enums import ConversationType, ConversationParticipantRole, MessageType, NotificationType, UserRole
from app.models.user import User
from app.models.communication import Conversation, ConversationParticipant, Message, MessageMention, MessageReaction
from app.models.task import Task
from app.models.project import Project
from app.models.meetings import Meeting, MeetingParticipant
from app.models.support import SupportTicket
from app.models.eod_report import EODReport
from app.models.approval import Approval
from app.models.notifications import Notification

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
    UpdateParticipantRoleRequest,
    ConversationSettingsUpdate,
    ConversationParticipantRead,
)

router = APIRouter()


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
    if payload.type == ConversationType.DIRECT:
        if not payload.participant_ids or len(payload.participant_ids) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please specify at least one other participant for a direct message."
            )
        other_user_id = payload.participant_ids[0]
        other_user = db.get(User, other_user_id)
        if not other_user or other_user.status in ["inactive", "suspended"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specified participant is not active."
            )

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
                # Re-use existing conversation
                c.participants = db.query(ConversationParticipant).filter_by(conversation_id=c.id).all()
                return c

        participant_ids = [current_user.id, other_user_id]
        title = None

    else:
        # Group or Channel
        participant_ids = list(set([current_user.id] + payload.participant_ids))
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
    
    # Reload participants
    new_conv.participants = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == new_conv.id)
        .options(joinedload(ConversationParticipant.user))
        .all()
    )
    
    return new_conv


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
    parts = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conv.id)
        .options(joinedload(ConversationParticipant.user))
        .all()
    )
    conv.participants = parts

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

    if conv.type == ConversationType.DIRECT and not conv.title:
        other_part = next((p for p in parts if p.user_id != current_user.id), None)
        if other_part and other_part.user:
            conv.title = other_part.user.full_name
        else:
            conv.title = "Direct Message"

    return conv


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
def get_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Message]:
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
        Message.is_deleted == False
    )

    if before:
        query = query.filter(Message.created_at < before)

    messages = (
        query.order_by(Message.created_at.desc())
        .options(
            joinedload(Message.sender),
            joinedload(Message.mentions).joinedload(MessageMention.mentioned_user),
            joinedload(Message.reactions).joinedload(MessageReaction.user),
        )
        .limit(limit)
        .all()
    )

    # Return in chronological order
    return list(reversed(messages))


@router.post("/conversations/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
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

    new_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        body=payload.body,
        message_type=MessageType.TEXT,
    )
    db.add(new_msg)
    db.flush()

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
    participant.last_read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(new_msg)

    # Send Notification/Alert System events
    other_participants = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id)
        .filter(ConversationParticipant.user_id != current_user.id)
        .all()
    )

    # Determine standard notification title
    conv_title = conv.title or "Direct Message"
    if conv.type == ConversationType.DIRECT:
        notif_title = f"New message from {current_user.full_name}"
    else:
        notif_title = f"[{conv_title}] {current_user.full_name}"

    for op in other_participants:
        is_mentioned = op.user_id in payload.mentioned_user_ids
        n_type = NotificationType.MENTION if is_mentioned else NotificationType.MESSAGE
        n_title = f"You were mentioned by {current_user.full_name}" if is_mentioned else notif_title
        
        # Populate Notification
        db_notif = Notification(
            user_id=op.user_id,
            title=n_title,
            message=payload.body[:200],
            notification_type=n_type,
            related_entity_type="conversation",
            related_entity_id=conversation_id,
        )
        db.add(db_notif)

    db.commit()

    # Reload message to populate sender details
    return (
        db.query(Message)
        .filter(Message.id == new_msg.id)
        .options(
            joinedload(Message.sender),
            joinedload(Message.mentions).joinedload(MessageMention.mentioned_user),
            joinedload(Message.reactions).joinedload(MessageReaction.user),
        )
        .first()
    )


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

    msg.body = payload.body
    msg.is_edited = True
    msg.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    
    return msg


@router.delete("/{message_id}")
def delete_message(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Soft delete own message."""
    msg = db.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Admins can delete any message, others only their own
    if msg.sender_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this message."
        )

    msg.is_deleted = True
    msg.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Message deleted successfully."}


@router.post("/conversations/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Mark conversation as read for current user."""
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not participate in this conversation."
        )

    participant.last_read_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Conversation marked as read."}


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
    response_model=list[ConversationParticipantRead],
    status_code=status.HTTP_200_OK,
)
def add_participants(
    conversation_id: uuid.UUID,
    payload: AddParticipantsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationParticipant]:
    """Add members to an existing group or channel conversation."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Only groups and channels support adding members
    if conv.type == ConversationType.DIRECT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add members to a direct message. Create a group instead.",
        )

    # Caller must be a participant
    caller_part = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id, user_id=current_user.id
    ).first()
    if not caller_part:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant.")

    admin_roles = {ConversationParticipantRole.OWNER, ConversationParticipantRole.ADMIN}

    # Check add-member permission
    can_add = (
        caller_part.role in admin_roles
        or conv.who_can_add_members == "all_members"
    )
    if not can_add:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group/channel admins can add members.",
        )

    # Existing participant user_ids
    existing_ids = {
        p.user_id
        for p in db.query(ConversationParticipant)
        .filter_by(conversation_id=conversation_id)
        .all()
    }

    conv_title = conv.title or "the conversation"
    added = []
    for uid in payload.user_ids:
        if uid in existing_ids:
            continue  # Skip duplicates silently
        target_user = db.get(User, uid)
        if not target_user or target_user.status in ["inactive", "suspended"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {uid} is not active or does not exist.",
            )
        new_part = ConversationParticipant(
            conversation_id=conversation_id,
            user_id=uid,
            role=ConversationParticipantRole.MEMBER,
            last_read_at=datetime.now(timezone.utc),
        )
        db.add(new_part)
        added.append(uid)

    db.commit()

    # Notify newly added users
    for uid in added:
        _notify_user(
            db, uid,
            title=f"You were added to {conv_title}",
            message=f"{current_user.full_name} added you to {conv_title}.",
            conv_id=conversation_id,
        )
    if added:
        db.commit()

    return _get_participant_list(db, conversation_id)


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
