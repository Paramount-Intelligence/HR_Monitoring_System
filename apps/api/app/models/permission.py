"""Permission model — static permission keys and role-permission mappings."""
import uuid

from sqlalchemy import String, Uuid, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.mixins import TimestampMixin


class Permission(Base):
    """Static permission key registry."""
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class RolePermission(Base):
    """Maps a role string to a permission key."""
    __tablename__ = "role_permissions"

    __table_args__ = (
        UniqueConstraint("role", "permission_key", name="uq_role_permission"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    permission_key: Mapped[str] = mapped_column(String(100), nullable=False)


class UserPermissionOverride(Base):
    """Per-user permission overrides (grant or revoke a specific permission)."""
    __tablename__ = "user_permission_overrides"

    __table_args__ = (
        UniqueConstraint("user_id", "permission_key", name="uq_user_permission"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    permission_key: Mapped[str] = mapped_column(String(100), nullable=False)
    granted: Mapped[bool] = mapped_column(default=True, nullable=False)  # True=grant, False=revoke
