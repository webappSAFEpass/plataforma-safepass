from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.plans.models import Plan


class PlanRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_active(self) -> Sequence[Plan]:
        stmt = select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.sort_order)
        return self._db.scalars(stmt).all()

    def list_all(self) -> Sequence[Plan]:
        stmt = select(Plan).order_by(Plan.sort_order, Plan.tier)
        return self._db.scalars(stmt).all()

    def get_by_code(self, code: str) -> Plan | None:
        return self._db.scalar(select(Plan).where(Plan.code == code))

    def update_fields(self, plan: Plan, fields: dict[str, Any]) -> Plan:
        for key, value in fields.items():
            if key == "features" and value is not None:
                value = [
                    feature.model_dump() if hasattr(feature, "model_dump") else feature
                    for feature in value
                ]
            setattr(plan, key, value)
        self._db.flush()
        return plan

    def upsert_by_code(self, data: dict[str, Any]) -> Plan:
        plan = self.get_by_code(data["code"])
        if plan is None:
            plan = Plan(**data)
            self._db.add(plan)
        else:
            for key, value in data.items():
                setattr(plan, key, value)
        self._db.flush()
        return plan
