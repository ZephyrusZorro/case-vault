"""HMAC-linked append-only application audit records."""
import hashlib
import hmac
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dms.models import AuditEvent, AuditHead, now
from app.dms.security import master_key


def _digest(previous: str, actor: str | None, case: str | None, action: str, target: str | None, details: dict, timestamp: str) -> str:
    payload = json.dumps({"previous": previous, "actor": actor, "case": case, "action": action, "target": target, "details": details, "time": timestamp}, sort_keys=True, separators=(",", ":"))
    return hmac.new(master_key(), payload.encode(), hashlib.sha256).hexdigest()


def record(db: Session, actor: str | None, case: str | None, action: str, target: str | None = None, details: dict | None = None) -> AuditEvent:
    head = db.scalar(select(AuditHead).where(AuditHead.id == 1).with_for_update())
    if head is None:
        head = AuditHead(id=1, event_hash="0" * 64)
        db.add(head)
        db.flush()
    previous = head.event_hash
    event = AuditEvent(actor_id=actor, case_id=case, action=action, target_id=target, details=details or {}, previous_hash=previous, created_at=now())
    event.event_hash = _digest(previous, actor, case, action, target, event.details, event.created_at.replace(tzinfo=None).isoformat())
    db.add(event)
    db.flush()
    head.event_hash = event.event_hash
    db.flush()
    return event


def verify(db: Session) -> dict:
    previous = "0" * 64
    checked = 0
    for event in db.scalars(select(AuditEvent).order_by(AuditEvent.id)):
        actual = _digest(event.previous_hash, event.actor_id, event.case_id, event.action, event.target_id, event.details, event.created_at.replace(tzinfo=None).isoformat())
        if event.previous_hash != previous or not hmac.compare_digest(event.event_hash, actual):
            return {"valid": False, "checked": checked, "broken_at": event.id}
        previous = event.event_hash
        checked += 1
    head = db.get(AuditHead, 1)
    if head is None or head.event_hash != previous:
        return {"valid": False, "checked": checked, "broken_at": "head"}
    return {"valid": True, "checked": checked, "head": previous}
