"""
Allocation Algorithms Implementation
Based on Section 7 of Papadimitriou & Garcia-Molina (2011).

Includes:
1. e-random: Explicit requests + Random fake objects
2. e-optimal: Explicit requests + Greedy sum-objective fake object selection
3. s-random: Sample requests + Random selection
4. s-overlap: Sample requests + Minimum overlap count selection
5. s-sum: Sample requests + Approximate sum-objective optimization
6. s-max: Sample requests + Minimized max relative overlap selection (Algorithm 7)
"""
import random
from typing import Dict, List, Set, Tuple, Any

# --- Helper Functions ---
def compute_relative_overlap_matrix(
    agent_allocations: Dict[int, Set[str]],
    request_sizes: Dict[int, int] = None
) -> Tuple[List[int], List[List[int]], List[List[float]]]:
    """
    Computes pairwise absolute overlap |Ri intersect Rj| and relative overlap |Ri intersect Rj| / min(mi, mj).
    """
    agent_ids = list(agent_allocations.keys())
    n = len(agent_ids)
    abs_matrix = [[0] * n for _ in range(n)]
    rel_matrix = [[0.0] * n for _ in range(n)]
    
    for i in range(n):
        id_i = agent_ids[i]
        set_i = agent_allocations[id_i]
        size_i = request_sizes[id_i] if (request_sizes and id_i in request_sizes) else len(set_i)
        
        for j in range(n):
            if i == j:
                abs_matrix[i][j] = len(set_i)
                rel_matrix[i][j] = 1.0
                continue
                
            id_j = agent_ids[j]
            set_j = agent_allocations[id_j]
            size_j = request_sizes[id_j] if (request_sizes and id_j in request_sizes) else len(set_j)
            
            overlap_len = len(set_i.intersection(set_j))
            abs_matrix[i][j] = overlap_len
            
            denom = min(size_i, size_j) if min(size_i, size_j) > 0 else 1
            rel_matrix[i][j] = round(overlap_len / float(denom), 4)
            
    return agent_ids, abs_matrix, rel_matrix

# --- Explicit Requests Algorithms (EF) ---

def allocate_e_random(
    explicit_allocations: Dict[int, Set[str]],
    agent_fake_budgets: Dict[int, int],
    total_fake_budget: int,
    fake_generator_func
) -> Tuple[Dict[int, Set[str]], Dict[int, List[Dict[str, Any]]]]:
    """
    Algorithm 1 + Algorithm 2: e-random
    Allocates fake objects to random eligible agents up to B total fake objects.
    """
    allocations = {a_id: set(objs) for a_id, objs in explicit_allocations.items()}
    fake_objects_map = {a_id: [] for a_id in explicit_allocations.keys()}
    
    eligible_agents = [a_id for a_id, b_i in agent_fake_budgets.items() if b_i > 0]
    remaining_b = dict(agent_fake_budgets)
    B = total_fake_budget
    
    while B > 0 and eligible_agents:
        chosen_agent = random.choice(eligible_agents)
        
        # Generate a fake object for chosen_agent
        fake_obj = fake_generator_func(chosen_agent, allocations[chosen_agent], fake_objects_map[chosen_agent])
        allocations[chosen_agent].add(fake_obj["object_key"])
        fake_objects_map[chosen_agent].append(fake_obj)
        
        remaining_b[chosen_agent] -= 1
        if remaining_b[chosen_agent] <= 0:
            eligible_agents.remove(chosen_agent)
        B -= 1
        
    return allocations, fake_objects_map

def allocate_e_optimal(
    explicit_allocations: Dict[int, Set[str]],
    agent_fake_budgets: Dict[int, int],
    total_fake_budget: int,
    fake_generator_func
) -> Tuple[Dict[int, Set[str]], Dict[int, List[Dict[str, Any]]]]:
    """
    Algorithm 1 + Algorithm 3: e-optimal
    Greedily selects the agent that yields maximum sum-objective improvement per fake object.
    
    Improvement formula for agent i:
    ( 1/|Ri| - 1/(|Ri|+1) ) * SUM_{j != i} |Ri intersect Rj|
    """
    allocations = {a_id: set(objs) for a_id, objs in explicit_allocations.items()}
    fake_objects_map = {a_id: [] for a_id in explicit_allocations.keys()}
    
    remaining_b = dict(agent_fake_budgets)
    B = total_fake_budget
    
    while B > 0:
        eligible_agents = [a_id for a_id, b_i in remaining_b.items() if b_i > 0]
        if not eligible_agents:
            break
            
        best_agent = None
        max_improvement = -1.0
        
        for a_id in eligible_agents:
            R_i = allocations[a_id]
            len_Ri = len(R_i)
            if len_Ri == 0:
                coeff = 1.0
            else:
                coeff = (1.0 / float(len_Ri)) - (1.0 / float(len_Ri + 1))
                
            overlap_sum = sum(
                len(R_i.intersection(allocations[other_id]))
                for other_id in allocations.keys() if other_id != a_id
            )
            
            improvement = coeff * overlap_sum
            if improvement > max_improvement or best_agent is None:
                max_improvement = improvement
                best_agent = a_id
                
        # Allocate one fake object to best_agent
        fake_obj = fake_generator_func(best_agent, allocations[best_agent], fake_objects_map[best_agent])
        allocations[best_agent].add(fake_obj["object_key"])
        fake_objects_map[best_agent].append(fake_obj)
        
        remaining_b[best_agent] -= 1
        B -= 1
        
    return allocations, fake_objects_map


# --- Sample Requests Algorithms (SF) ---

def allocate_s_random(
    master_objects: List[str],
    agent_requests: Dict[int, int]
) -> Dict[int, Set[str]]:
    """
    Algorithm 4 + Algorithm 5: s-random
    Round-robin random allocation from master objects.
    """
    allocations = {a_id: set() for a_id in agent_requests.keys()}
    T = set(master_objects)
    
    for a_id, m_i in agent_requests.items():
        needed = m_i
        available = list(T - allocations[a_id])
        if len(available) >= needed:
            chosen = random.sample(available, needed)
        else:
            chosen = available
        allocations[a_id].update(chosen)
        
    return allocations

def allocate_s_overlap(
    master_objects: List[str],
    agent_requests: Dict[int, int]
) -> Dict[int, Set[str]]:
    """
    Algorithm 4 + Algorithm 6: s-overlap
    Minimizes total object sharing count by picking objects assigned to fewest agents (argmin a[k]).
    """
    allocations = {a_id: set() for a_id in agent_requests.keys()}
    # a[k] stores number of agents that received object tk
    sharing_counts = {t_k: 0 for t_k in master_objects}
    
    remaining = sum(agent_requests.values())
    
    while remaining > 0:
        allocated_in_round = False
        for a_id, m_i in agent_requests.items():
            if len(allocations[a_id]) < m_i:
                # Find candidate objects not yet in allocations[a_id]
                candidates = [t_k for t_k in master_objects if t_k not in allocations[a_id]]
                if candidates:
                    min_val = min(sharing_counts[t_k] for t_k in candidates)
                    best_candidates = [t_k for t_k in candidates if sharing_counts[t_k] == min_val]
                    chosen = random.choice(best_candidates)
                    
                    allocations[a_id].add(chosen)
                    sharing_counts[chosen] += 1
                    remaining -= 1
                    allocated_in_round = True
                    
        if not allocated_in_round:
            break
            
    return allocations

def allocate_s_sum(
    master_objects: List[str],
    agent_requests: Dict[int, int]
) -> Dict[int, Set[str]]:
    """
    Approximate Sum-Objective Minimization: s-sum (Section 7.2.3)
    Prioritizes assigning rare/unshared objects to agents with smaller sample request sizes,
    minimizing total sum relative overlap across all agents.
    """
    allocations = {a_id: set() for a_id in agent_requests.keys()}
    sharing_counts = {t_k: 0 for t_k in master_objects}
    
    # Sort agents by sample size ascending (smallest requests first)
    sorted_agents = sorted(agent_requests.keys(), key=lambda a_id: agent_requests[a_id])
    
    remaining = sum(agent_requests.values())
    
    while remaining > 0:
        allocated_in_round = False
        for a_id in sorted_agents:
            m_i = agent_requests[a_id]
            if len(allocations[a_id]) < m_i:
                candidates = [t_k for t_k in master_objects if t_k not in allocations[a_id]]
                if candidates:
                    min_val = min(sharing_counts[t_k] for t_k in candidates)
                    best_candidates = [t_k for t_k in candidates if sharing_counts[t_k] == min_val]
                    chosen = random.choice(best_candidates)
                    
                    allocations[a_id].add(chosen)
                    sharing_counts[chosen] += 1
                    remaining -= 1
                    allocated_in_round = True
                    
        if not allocated_in_round:
            break
            
    return allocations

def allocate_s_max(
    master_objects: List[str],
    agent_requests: Dict[int, int]
) -> Dict[int, Set[str]]:
    """
    Algorithm 4 + Algorithm 7: s-max
    Minimizes the maximum pairwise relative overlap among any pair of agents.
    In each step for agent Ui, chooses object tk not in Ri that yields the minimum maximum relative overlap.
    """
    allocations = {a_id: set() for a_id in agent_requests.keys()}
    agent_ids = list(agent_requests.keys())
    remaining = sum(agent_requests.values())
    
    while remaining > 0:
        allocated_in_round = False
        for a_id in agent_ids:
            m_i = agent_requests[a_id]
            if len(allocations[a_id]) < m_i:
                candidates = [t_k for t_k in master_objects if t_k not in allocations[a_id]]
                if not candidates:
                    continue
                    
                best_candidate = None
                min_overall_max_rel_ov = float('inf')
                
                for t_k in candidates:
                    # Simulate adding t_k to allocations[a_id]
                    max_rel_ov_for_tk = 0.0
                    for j_id in agent_ids:
                        if j_id == a_id:
                            continue
                        m_j = agent_requests[j_id]
                        denom = min(m_i, m_j) if min(m_i, m_j) > 0 else 1
                        
                        existing_overlap = len(allocations[a_id].intersection(allocations[j_id]))
                        if t_k in allocations[j_id]:
                            existing_overlap += 1
                            
                        rel_ov = existing_overlap / float(denom)
                        if rel_ov > max_rel_ov_for_tk:
                            max_rel_ov_for_tk = rel_ov
                            
                    if max_rel_ov_for_tk < min_overall_max_rel_ov:
                        min_overall_max_rel_ov = max_rel_ov_for_tk
                        best_candidate = t_k
                        
                if best_candidate is None:
                    best_candidate = random.choice(candidates)
                    
                allocations[a_id].add(best_candidate)
                remaining -= 1
                allocated_in_round = True
                
        if not allocated_in_round:
            break
            
    return allocations
