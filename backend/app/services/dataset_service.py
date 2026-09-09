import json
import hashlib
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.models import Dataset, DataObject

def infer_schema_from_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not records:
        return []
    first_row = records[0]
    schema_info = []
    for col_name, val in first_row.items():
        val_type = "string"
        if isinstance(val, bool):
            val_type = "boolean"
        elif isinstance(val, int):
            val_type = "integer"
        elif isinstance(val, float):
            val_type = "number"
        elif isinstance(val, (dict, list)):
            val_type = "json"
            
        sensitive = any(kw in col_name.lower() for kw in ["ssn", "salary", "password", "bank", "account", "credit", "card", "tax", "email", "phone"])
        schema_info.append({
            "name": col_name,
            "type": val_type,
            "sensitive": sensitive
        })
    return schema_info

def compute_record_key(record: Dict[str, Any]) -> str:
    # Compute deterministic SHA-256 hash key of record payload
    sorted_json = json.dumps(record, sort_keys=True)
    return "OBJ_" + hashlib.sha256(sorted_json.encode("utf-8")).hexdigest()[:16]

def create_dataset_with_records(
    db: Session,
    name: str,
    description: Optional[str],
    records: List[Dict[str, Any]],
    sensitive_fields: List[str] = None
) -> Dataset:
    schema_info = infer_schema_from_records(records)
    sens_fields = sensitive_fields or [col["name"] for col in schema_info if col["sensitive"]]
    
    dataset = Dataset(
        name=name,
        description=description,
        record_count=len(records),
        schema_info=schema_info,
        sensitive_fields=sens_fields
    )
    db.add(dataset)
    db.flush()
    
    # Add DataObject records
    data_objs = []
    for rec in records:
        key = compute_record_key(rec)
        obj = DataObject(
            dataset_id=dataset.id,
            object_key=key,
            data_payload=rec
        )
        data_objs.append(obj)
        
    db.add_all(data_objs)
    db.commit()
    db.refresh(dataset)
    return dataset

def parse_uploaded_file(file_contents: bytes, filename: str) -> List[Dict[str, Any]]:
    fn_lower = filename.lower()
    if fn_lower.endswith(".json"):
        records = json.loads(file_contents.decode("utf-8"))
        if isinstance(records, dict):
            records = [records]
        return records
    elif fn_lower.endswith(".csv"):
        import io
        df = pd.read_csv(io.BytesIO(file_contents))
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    else:
        # Fallback text/CSV parse
        import io
        df = pd.read_csv(io.BytesIO(file_contents))
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
