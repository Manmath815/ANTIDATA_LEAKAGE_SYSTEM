import random
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models.models import Experiment
from app.algorithms.allocation import (
    allocate_s_random,
    allocate_s_overlap,
    allocate_s_sum,
    allocate_s_max,
    allocate_e_random,
    allocate_e_optimal
)
from app.algorithms.guilt_model import calculate_delta_metrics, calculate_all_guilt_probabilities
from app.algorithms.fake_records import generate_fake_object_payload

def run_research_experiment(
    db: Session,
    name: str,
    guessing_probability_p: float = 0.2,
    dataset_size: int = 50,
    agent_count: int = 5,
    sample_size_min: int = 6,
    sample_size_max: int = 15,
    fake_objects_budget: int = 10,
    algorithms: List[str] = None
) -> Experiment:
    algos = algorithms or ["s-random", "s-overlap", "s-sum", "s-max", "e-random", "e-optimal"]
    master_keys = [f"EXP_OBJ_{i}" for i in range(dataset_size)]
    
    # 1. P vs Guilt Curve simulation (guessing probability sweep 0.05 to 0.95)
    p_values = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]
    p_curve_results = []
    
    # Scenario: 16 objects, U1 has all 16, U2 has 8 (Figure 1a of paper)
    scene_u1 = set(master_keys[:16])
    scene_u2 = set(master_keys[:8])
    scene_allocs = {1: scene_u1, 2: scene_u2}
    
    for p_val in p_values:
        res = calculate_all_guilt_probabilities(leaked_objects=scene_u1, agent_allocations=scene_allocs, p=p_val)
        p_curve_results.append({
            "p": p_val,
            "guilt_U1": round(res[1]["guilt_probability"], 4),
            "guilt_U2": round(res[2]["guilt_probability"], 4)
        })
        
    # 2. Load vs Delta_bar & min_delta simulation across requested algorithms (Figure 4a/4c of paper)
    # Varying load (sum m_i / |T|) by varying agent count
    load_curve = []
    agent_counts_sim = [2, 4, 6, 8, 10, 12, 15, 20]
    
    for num_a in agent_counts_sim:
        agent_reqs = {
            a_idx: random.randint(sample_size_min, sample_size_max)
            for a_idx in range(1, num_a + 1)
        }
        total_requested = sum(agent_reqs.values())
        load = round(total_requested / float(dataset_size), 2)
        
        load_entry = {"load": load, "agent_count": num_a}
        
        for algo in algos:
            if algo == "s-random":
                allocs = allocate_s_random(master_keys, agent_reqs)
            elif algo == "s-overlap":
                allocs = allocate_s_overlap(master_keys, agent_reqs)
            elif algo == "s-sum":
                allocs = allocate_s_sum(master_keys, agent_reqs)
            elif algo == "s-max":
                allocs = allocate_s_max(master_keys, agent_reqs)
            elif algo in ["e-random", "e-optimal"]:
                # Generate explicit request sets with ~80% overlap
                exp_sets = {a_id: set(master_keys[:int(dataset_size * 0.8)]) for a_id in agent_reqs.keys()}
                fake_budgets = {a_id: 2 for a_id in agent_reqs.keys()}
                dummy_gen = lambda a_id, curr_all, curr_fk: {"object_key": f"FAKE_{random.randint(1000,9999)}", "fake_payload": {}}
                if algo == "e-random":
                    allocs, _ = allocate_e_random(exp_sets, fake_budgets, fake_objects_budget, dummy_gen)
                else:
                    allocs, _ = allocate_e_optimal(exp_sets, fake_budgets, fake_objects_budget, dummy_gen)
            else:
                allocs = allocate_s_random(master_keys, agent_reqs)
                
            metrics = calculate_delta_metrics(allocs, p=guessing_probability_p)
            load_entry[f"{algo}_avg_delta"] = metrics["average_delta"]
            load_entry[f"{algo}_min_delta"] = metrics["min_delta"]
            
        load_curve.append(load_entry)
        
    results_payload = {
        "p_guilt_curve": p_curve_results,
        "load_curve": load_curve,
        "parameters_used": {
            "guessing_probability_p": guessing_probability_p,
            "dataset_size": dataset_size,
            "agent_count": agent_count,
            "fake_objects_budget": fake_objects_budget
        }
    }
    
    exp = Experiment(
        name=name,
        parameters={
            "p": guessing_probability_p,
            "dataset_size": dataset_size,
            "agent_count": agent_count,
            "algorithms": algos
        },
        results=results_payload
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp
