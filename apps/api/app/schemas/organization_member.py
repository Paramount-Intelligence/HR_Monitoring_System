"""Safe member summaries for organization detail views."""
from __future__ import annotations

import uuid

from pydantic import BaseModel


class OrganizationMemberRead(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str
    designation: str | None = None
    department_name: str | None = None
    shift_name: str | None = None
    manager_name: str | None = None
    status: str
