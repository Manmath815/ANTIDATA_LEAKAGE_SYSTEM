from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.models import Investigation, Allocation, Dataset, Agent, GuiltScore, LeakedObject

def generate_investigation_markdown_report(db: Session, investigation_id: int) -> str:
    investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not investigation:
        raise ValueError("Investigation not found")
        
    allocation = db.query(Allocation).filter(Allocation.id == investigation.allocation_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == allocation.dataset_id).first()
    guilt_scores = db.query(GuiltScore).filter(GuiltScore.investigation_id == investigation_id).all()
    
    agents = db.query(Agent).filter(Agent.id.in_([g.agent_id for g in guilt_scores])).all()
    agent_map = {a.id: a for a in agents}
    
    most_suspicious = agent_map.get(investigation.most_suspicious_agent_id) if investigation.most_suspicious_agent_id else None
    
    md = []
    md.append("# DATA LEAKAGE ATTRIBUTION REPORT")
    md.append(f"**Date Generated:** {investigation.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    md.append(f"**Investigation ID:** #{investigation.id}")
    md.append(f"**Target Dataset:** {dataset.name} (ID: #{dataset.id})")
    md.append(f"**Allocation Strategy:** {allocation.algorithm.upper()}")
    md.append("\n---")
    
    md.append("\n## Executive Summary")
    md.append(f"- **Total Discovered Leaked Records:** {investigation.matched_records_count + investigation.unmatched_records_count}")
    md.append(f"- **Matched Records:** {investigation.matched_records_count}")
    md.append(f"- **Unmatched Records:** {investigation.unmatched_records_count}")
    md.append(f"- **Fake Records Identified in Leak:** {investigation.fake_records_found_count}")
    md.append(f"- **Assumed Guessing Probability (p):** {investigation.guessing_probability_p}")
    
    if most_suspicious:
        top_score = next((g.guilt_probability for g in guilt_scores if g.agent_id == most_suspicious.id), 0.0)
        md.append(f"\n### ⚠️ Most Suspicious Agent: **{most_suspicious.name}**")
        md.append(f"**Guilt Probability Pr(G_i | S):** {top_score * 100:.1f}%")
        
    md.append("\n---")
    md.append("\n## Agent Suspicion & Guilt Breakdown")
    md.append("| Agent ID | Agent Name | Guilt Probability | Matched Records | Fake Records Found |")
    md.append("|---|---|---|---|---|")
    
    sorted_scores = sorted(guilt_scores, key=lambda g: g.guilt_probability, reverse=True)
    for g in sorted_scores:
        a = agent_map.get(g.agent_id)
        name = a.name if a else f"Agent {g.agent_id}"
        md.append(f"| #{g.agent_id} | {name} | **{g.guilt_probability * 100:.1f}%** | {g.matched_object_count} | {g.fake_object_count} |")
        
    md.append("\n---")
    md.append("\n## Methodology & Mathematical Model")
    md.append("This analysis applies the unobtrusive guilt detection model from *Papadimitriou & Garcia-Molina (IEEE TKDE 2011)*.")
    md.append("The probability that agent $U_i$ leaked the dataset given leaked evidence $S$ is calculated as:")
    md.append(r"$$\Pr(G_i \mid S) = 1 - \prod_{t \in S \cap R_i} \left( 1 - \frac{1-p}{|V_t|} \right)$$")
    md.append("where $|V_t|$ is the number of agents possessing record $t$, and $p$ is the guessing probability.")
    
    md.append("\n> **IMPORTANT LEGAL & TECHNICAL DISCLAIMER:**")
    md.append("> *This report presents a probabilistic attribution score derived from shared record set distribution dynamics and fake record detection. It provides quantitative suspicion metrics for data distributors but does not constitute definitive legal proof of wrongdoing.*")
    
    return "\n".join(md)
