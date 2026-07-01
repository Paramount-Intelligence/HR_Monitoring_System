from __future__ import annotations

from pydantic import BaseModel


class DashboardAlertCard(BaseModel):
    key: str
    title: str
    count: int
    href: str
    severity: str = "normal"
    empty_text: str = "No action needed."


class DashboardAlertsResponse(BaseModel):
    cards: list[DashboardAlertCard]
