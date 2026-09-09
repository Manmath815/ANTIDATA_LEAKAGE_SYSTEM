"""
Realistic Fake Object Synthesis Engine
Based on Section 6.1 of Papadimitriou & Garcia-Molina (2011).
"""
import uuid
import random
import hashlib
from typing import Dict, List, Any

FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
CITIES = ["San Francisco", "Los Angeles", "San Diego", "San Jose", "New York", "Chicago", "Houston", "Phoenix", "Seattle", "Austin", "Boston", "Denver"]
STATES = ["CA", "NY", "TX", "FL", "IL", "WA", "MA", "CO"]

def generate_fake_object_payload(
    schema_info: List[Dict[str, Any]],
    conditions: Dict[str, Any] = None,
    existing_records: List[Dict[str, Any]] = None
) -> Tuple[str, Dict[str, Any]]:
    """
    Synthesizes a realistic fake object record conforming to schema_info and satisfying conditions.
    
    Returns:
        (object_key, fake_payload_dict)
    """
    payload = {}
    conds = conditions or {}
    
    for col in schema_info:
        col_name = col.get("name")
        col_type = col.get("type", "string").lower()
        
        # If column value is specified in conditions (e.g. state == "CA"), enforce it!
        if col_name in conds:
            payload[col_name] = conds[col_name]
            continue
            
        # Generate realistic column values based on column name and type
        name_lower = col_name.lower()
        
        if "name" in name_lower or "first" in name_lower:
            payload[col_name] = random.choice(FIRST_NAMES) + " " + random.choice(LAST_NAMES)
        elif "email" in name_lower:
            fname = random.choice(FIRST_NAMES).lower()
            lname = random.choice(LAST_NAMES).lower()
            num = random.randint(100, 999)
            domain = random.choice(["gmail.com", "yahoo.com", "outlook.com", "acme-corp.org", "techcorp.io"])
            payload[col_name] = f"{fname}.{lname}{num}@{domain}"
        elif "phone" in name_lower:
            payload[col_name] = f"+1-{random.randint(200, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
        elif "city" in name_lower:
            payload[col_name] = random.choice(CITIES)
        elif "state" in name_lower:
            payload[col_name] = random.choice(STATES)
        elif "salary" in name_lower or "amount" in name_lower or "balance" in name_lower:
            payload[col_name] = round(random.uniform(40000, 180000), 2)
        elif "age" in name_lower:
            payload[col_name] = random.randint(22, 75)
        elif col_type in ["integer", "int"]:
            payload[col_name] = random.randint(1000, 99999)
        elif col_type in ["number", "float"]:
            payload[col_name] = round(random.uniform(10.0, 5000.0), 2)
        elif col_type in ["boolean", "bool"]:
            payload[col_name] = random.choice([True, False])
        else:
            payload[col_name] = f"TRACE-{random.choice(FIRST_NAMES)}-{random.randint(100, 999)}"
            
    # Generate unique object key with internal marker
    raw_str = f"FAKE_{uuid.uuid4()}_{payload}"
    object_key = "FAKE_" + hashlib.sha256(raw_str.encode("utf-8")).hexdigest()[:16]
    
    return object_key, payload
