from sqlalchemy.orm import Session
from app.models.models import User, Dataset, Agent, AgentRequest, Allocation, Leak, Investigation
from app.core.security import get_password_hash
from app.services.dataset_service import create_dataset_with_records
from app.services.agent_service import create_agent, create_agent_request
from app.services.allocation_service import run_dataset_allocation
from app.services.leak_service import investigate_leak
import random

CITIES_CA = ["San Francisco", "Los Angeles", "San Diego", "San Jose", "Sacramento"]
CITIES_OTHER = ["New York", "Chicago", "Houston", "Phoenix", "Seattle", "Austin", "Boston"]
NAMES = ["Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Evan Wright", "Fiona Gallagher", "George Clark", "Hannah Abbott", "Ian Malcolm", "Julia Roberts"]

def initialize_demo_data(db: Session) -> Dict[str, Any]:
    # 1. Create default admin user if not exists
    admin = db.query(User).filter(User.email == "admin@distributor.org").first()
    if not admin:
        admin = User(
            email="admin@distributor.org",
            name="Distributor Admin",
            hashed_password=get_password_hash("admin123"),
            role="distributor"
        )
        db.add(admin)
        db.commit()
        
    # Check if demo dataset already exists
    existing_dataset = db.query(Dataset).filter(Dataset.name == "Demo Customer Master Dataset").first()
    if existing_dataset:
        allocation = db.query(Allocation).filter(Allocation.dataset_id == existing_dataset.id).first()
        investigation = db.query(Investigation).filter(Investigation.allocation_id == allocation.id).first() if allocation else None
        return {
            "message": "Demo data already initialized",
            "dataset_id": existing_dataset.id,
            "allocation_id": allocation.id if allocation else None,
            "investigation_id": investigation.id if investigation else None
        }
        
    # 2. Synthesize 100 Customer Records
    records = []
    for i in range(1, 101):
        if i <= 35:
            city = random.choice(CITIES_CA)
            state = "CA"
        else:
            city = random.choice(CITIES_OTHER)
            state = random.choice(["NY", "TX", "IL", "WA", "MA"])
            
        records.append({
            "customer_id": f"CUST-{1000 + i}",
            "full_name": f"{random.choice(NAMES)} {i}",
            "email": f"customer{i}@example.com",
            "phone": f"+1-555-01{i:02d}",
            "city": city,
            "state": state,
            "annual_salary": round(random.uniform(50000, 150000), 2)
        })
        
    dataset = create_dataset_with_records(
        db=db,
        name="Demo Customer Master Dataset",
        description="100 confidential customer records used for third-party distributor sharing.",
        records=records,
        sensitive_fields=["email", "phone", "annual_salary"]
    )
    
    # 3. Create 3 Agents
    u1 = create_agent(db, name="Agent U1 (Marketing Agency)", organization="Apex Marketing Inc", contact_email="u1@apexmarket.com")
    u2 = create_agent(db, name="Agent U2 (Billing Subcontractor)", organization="Bay Area Billing Services", contact_email="u2@baybilling.com")
    u3 = create_agent(db, name="Agent U3 (Analytics Partner)", organization="Cloud Analytics Labs", contact_email="u3@cloudlabs.io")
    
    # 4. Define Agent Requests
    req1 = create_agent_request(db, agent_id=u1.id, dataset_id=dataset.id, request_type="SAMPLE", sample_size=40, max_fake_objects=3)
    req2 = create_agent_request(db, agent_id=u2.id, dataset_id=dataset.id, request_type="EXPLICIT", conditions={"state": "CA"}, max_fake_objects=2)
    req3 = create_agent_request(db, agent_id=u3.id, dataset_id=dataset.id, request_type="SAMPLE", sample_size=25, max_fake_objects=2)
    
    # 5. Execute Allocation Engine (s-max with fake objects)
    allocation = run_dataset_allocation(
        db=db,
        dataset_id=dataset.id,
        algorithm="s-max",
        allow_fake_objects=True,
        fake_objects_budget=6
    )
    
    # 6. Simulate a leak (25 records: 20 from U1's set, 1 fake record given to U1, and 4 unmatched external records)
    u1_fake_objs = db.query(FakeObject).filter(FakeObject.allocation_id == allocation.id, FakeObject.agent_id == u1.id).all()
    u1_real_objs = db.query(AgentDataObject).filter(AgentDataObject.allocation_id == allocation.id, AgentDataObject.agent_id == u1.id).limit(20).all()
    
    leaked_payloads = [ao.data_object.data_payload for ao in u1_real_objs]
    if u1_fake_objs:
        leaked_payloads.append(u1_fake_objs[0].fake_payload)
        
    # Add 4 unmatched external records
    for ext_i in range(1, 5):
        leaked_payloads.append({
            "customer_id": f"EXTERNAL-{9000 + ext_i}",
            "full_name": f"Unknown Leaked Person {ext_i}",
            "email": f"unknown{ext_i}@darkweb.org",
            "phone": "+1-800-000-0000",
            "city": "Unknown",
            "state": "XX",
            "annual_salary": 99999.0
        })
        
    investigation = investigate_leak(
        db=db,
        allocation_id=allocation.id,
        leaked_records=leaked_payloads,
        title="Simulated Dark Web Leak Investigation",
        source_description="Breached database drop discovered on unauthorized dark web forum.",
        guessing_probability_p=0.2
    )
    
    return {
        "message": "Demo data successfully initialized",
        "dataset_id": dataset.id,
        "allocation_id": allocation.id,
        "investigation_id": investigation.id,
        "most_suspicious_agent_id": investigation.most_suspicious_agent_id
    }
