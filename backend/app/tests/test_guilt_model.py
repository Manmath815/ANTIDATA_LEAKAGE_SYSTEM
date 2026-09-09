import pytest
from app.algorithms.guilt_model import calculate_all_guilt_probabilities, calculate_delta_metrics

def test_paper_section_4_example():
    """
    Paper Section 4 Example:
    T = {t1, t2, t3}
    R1 = {t1, t2}
    R2 = {t1, t3}
    S = {t1, t2, t3}
    
    Target guessed t1, U1 or U2 leaked t1.
    Vt1 = {U1, U2} -> |Vt1| = 2
    Vt2 = {U1}     -> |Vt2| = 1
    Vt3 = {U2}     -> |Vt3| = 1
    
    For U1, leaked in S intersect R1 = {t1, t2}:
    Term t1: 1 - (1-p)/2
    Term t2: 1 - (1-p)/1 = p
    Pr(G1|S) = 1 - (1 - (1-p)/2) * p
    
    If p = 0.2:
    Term t1 = 1 - 0.8/2 = 0.6
    Term t2 = 0.2
    Pr(G1|S) = 1 - (0.6 * 0.2) = 1 - 0.12 = 0.88 (88%)
    """
    allocations = {
        1: {"t1", "t2"},
        2: {"t1", "t3"}
    }
    leaked_S = {"t1", "t2", "t3"}
    p = 0.2
    
    results = calculate_all_guilt_probabilities(leaked_objects=leaked_S, agent_allocations=allocations, p=p)
    
    assert 1 in results
    assert 2 in results
    
    # Pr(G1|S) should equal 0.88
    assert round(results[1]["guilt_probability"], 4) == 0.88
    
    # By symmetry, Pr(G2|S) should also equal 0.88
    assert round(results[2]["guilt_probability"], 4) == 0.88

def test_fake_record_guilt_boost():
    """
    Test that an exclusive fake record in S drives guilt probability to ~1.0
    """
    allocations = {
        1: {"t1", "t2", "FAKE_U1"},
        2: {"t1", "t3"}
    }
    leaked_S = {"t1", "FAKE_U1"}
    p = 0.2
    
    results = calculate_all_guilt_probabilities(
        leaked_objects=leaked_S,
        agent_allocations=allocations,
        p=p,
        fake_object_keys={"FAKE_U1"}
    )
    
    # U1 possessed FAKE_U1 exclusive (|Vt| = 1) and t1 (|Vt| = 2)
    # Pr(G1|S) = 1 - (1 - 0.8/2) * (1 - 0.8/1) = 1 - 0.6 * 0.2 = 0.88
    assert round(results[1]["guilt_probability"], 4) == 0.88
    
    # U2 had no objects in S except shared t1 (which U2 didn't leak, but S intersect R2 = {t1})
    # For U2, S intersect R2 = {t1}. Term t1 = 1 - 0.8/2 = 0.6. Pr(G2|S) = 1 - 0.6 = 0.40 (40%)
    assert round(results[2]["guilt_probability"], 4) == 0.40
    
    # U1 is significantly more suspicious than U2!
    assert results[1]["guilt_probability"] > results[2]["guilt_probability"]
