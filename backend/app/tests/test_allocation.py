import pytest
from app.algorithms.allocation import (
    allocate_s_random,
    allocate_s_overlap,
    allocate_s_sum,
    allocate_s_max,
    allocate_e_optimal
)

def test_s_overlap_disjoint():
    """
    If total requested objects <= total master objects, s-overlap must yield disjoint sets.
    """
    master_keys = [f"obj_{i}" for i in range(20)]
    agent_requests = {1: 5, 2: 5, 3: 5} # Total 15 <= 20
    
    allocations = allocate_s_overlap(master_keys, agent_requests)
    
    set1 = allocations[1]
    set2 = allocations[2]
    set3 = allocations[3]
    
    assert len(set1) == 5
    assert len(set2) == 5
    assert len(set3) == 5
    
    # Check disjointness
    assert len(set1.intersection(set2)) == 0
    assert len(set2.intersection(set3)) == 0
    assert len(set1.intersection(set3)) == 0

def test_s_max_relative_overlap_minimization():
    master_keys = [f"obj_{i}" for i in range(10)]
    agent_requests = {1: 4, 2: 4, 3: 4}
    
    allocations = allocate_s_max(master_keys, agent_requests)
    
    for a_id, req_len in agent_requests.items():
        assert len(allocations[a_id]) == req_len
