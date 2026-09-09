from sqlalchemy.orm import Session
from app.models.models import AuditLog
from typing import Dict, Any, Optional

def log_action(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        details=details or {},
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.commit()
    return audit_entry
