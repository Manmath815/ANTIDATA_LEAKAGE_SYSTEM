"""
Guilt Detection Model Implementation
Based on Section 4 and Section 8.1 of Papadimitriou & Garcia-Molina (2011).
"""
import math
from typing import Dict, List, Set, Tuple, Any

def calculate_agent_guilt(
    agent_id: int,
    leaked_objects: Set[str],
    agent_allocations: Dict[int, Set[str]],
    p: float
) -> Tuple[float, int, int]:
    """
    Calculates Pr(Gi | S) for a single agent Ui according to Equation (5) of the paper:
    Pr(Gi | S) = 1 - PROD_{t in S intersect Ri} (1 - (1-p) / |Vt|)
    
    Returns:
        (guilt_probability, matched_real_count, matched_fake_count)
    """
    R_i = agent_allocations.get(agent_id, set())
    S_intersect_Ri = leaked_objects.intersection(R_i)
    
    if not S_intersect_Ri:
        return 0.0, 0, 0
    
    product_term = 1.0
    for t in S_intersect_Ri:
        # Vt: set of agents that have object t in their allocation
        V_t_size = sum(1 for a_id, objects in agent_allocations.items() if t in objects)
        if V_t_size > 0:
            term = 1.0 - ((1.0 - p) / float(V_t_size))
            product_term *= term
            
    guilt_prob = 1.0 - product_term
    # Ensure numerical bounds
    guilt_prob = max(0.0, min(1.0, guilt_prob))
    return guilt_prob, len(S_intersect_Ri), 0

def calculate_all_guilt_probabilities(
    leaked_objects: Set[str],
    agent_allocations: Dict[int, Set[str]],
    p: float,
    fake_object_keys: Set[str] = None
) -> Dict[int, Dict[str, Any]]:
    """
    Calculates Pr(Gi | S) for all agents in agent_allocations.
    
    Args:
        leaked_objects: set of object keys in leaked set S
        agent_allocations: dict mapping agent_id -> set of object keys (real + fake)
        p: target guessing probability
        fake_object_keys: set of object keys that are fake objects
        
    Returns:
        Dict[agent_id, {guilt_probability, matched_count, fake_count}]
    """
    fake_keys = fake_object_keys or set()
    results = {}
    
    for agent_id, R_i in agent_allocations.items():
        S_intersect_Ri = leaked_objects.intersection(R_i)
        
        if not S_intersect_Ri:
            results[agent_id] = {
                "guilt_probability": 0.0,
                "matched_count": 0,
                "fake_count": 0
            }
            continue
            
        product_term = 1.0
        fake_count = 0
        real_count = 0
        
        for t in S_intersect_Ri:
            if t in fake_keys:
                fake_count += 1
            else:
                real_count += 1
                
            V_t_size = sum(1 for a_id, objects in agent_allocations.items() if t in objects)
            if V_t_size > 0:
                term = 1.0 - ((1.0 - p) / float(V_t_size))
                product_term *= term
                
        guilt_prob = 1.0 - product_term
        guilt_prob = max(0.0, min(1.0, guilt_prob))
        
        results[agent_id] = {
            "guilt_probability": guilt_prob,
            "matched_count": len(S_intersect_Ri),
            "real_count": real_count,
            "fake_count": fake_count
        }
        
    return results

def calculate_delta_metrics(
    agent_allocations: Dict[int, Set[str]],
    p: float
) -> Dict[str, float]:
    """
    Calculates Delta(i, j) = Pr(Gi | Ri) - Pr(Gj | Ri) for all i != j,
    and returns average_delta (Delta_bar) and min_delta (min Delta) according to Equation (12a, 12b).
    """
    agent_ids = list(agent_allocations.keys())
    n = len(agent_ids)
    
    if n < 2:
        return {"average_delta": 0.0, "min_delta": 0.0}
        
    deltas = []
    
    for i_idx, i_id in enumerate(agent_ids):
        R_i = agent_allocations[i_id]
        if not R_i:
            continue
        # Assuming S = R_i (Ui leaked all its objects)
        all_guilt = calculate_all_guilt_probabilities(
            leaked_objects=R_i,
            agent_allocations=agent_allocations,
            p=p
        )
        pr_Gi_given_Ri = all_guilt[i_id]["guilt_probability"]
        
        for j_idx, j_id in enumerate(agent_ids):
            if i_id == j_id:
                continue
            pr_Gj_given_Ri = all_guilt[j_id]["guilt_probability"]
            delta_ij = pr_Gi_given_Ri - pr_Gj_given_Ri
            deltas.append(delta_ij)
            
    if not deltas:
        return {"average_delta": 0.0, "min_delta": 0.0}
        
    avg_delta = sum(deltas) / float(len(deltas))
    min_delta = min(deltas)
    
    return {
        "average_delta": round(avg_delta, 4),
        "min_delta": round(min_delta, 4)
    }
