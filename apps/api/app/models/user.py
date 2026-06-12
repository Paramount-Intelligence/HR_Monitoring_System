import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import UserRole, UserStatus
from app.models.mixins import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_manager_id", "manager_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    shift_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("shifts.id"), nullable=True
    )
    designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status", native_enum=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=UserStatus.ACTIVE
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True, default=None)
    avatar_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    avatar_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    avatar_size: Mapped[int | None] = mapped_column(nullable=True, default=None)
    avatar_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # Relationships
    manager = relationship("User", remote_side=[id], foreign_keys=[manager_id])
    shift = relationship("Shift", foreign_keys=[shift_id])
    dept = relationship("Department", foreign_keys=[department_id])

    @property
    def manager_name(self) -> str | None:
        return self.manager.full_name if self.manager else None

    @property
    def shift_name(self) -> str | None:
        return self.shift.name if self.shift else None

    @property
    def shift_timing(self) -> str | None:
        if not self.shift:
            return None
        return f"{self.shift.start_time.strftime('%I:%M %p')} - {self.shift.end_time.strftime('%I:%M %p')}"

    @property
    def department_name(self) -> str | None:
        return self.dept.name if self.dept else self.department
