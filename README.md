# Data Leakage Detection & Agent Attribution Platform

[![IEEE TKDE Paper Implementation](https://img.shields.io/badge/Research-IEEE%20TKDE%202011-blue)](https://doi.org/10.1109/TKDE.2010.100)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20SQLAlchemy-009688)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Tailwind-61DAFB)](https://reactjs.org/)

A full-stack cybersecurity web application implementing the unobtrusive data leakage detection, fake record synthesis, and leaker guilt attribution models from the seminal paper *"Data Leakage Detection"* by **Panagiotis Papadimitriou** and **Hector Garcia-Molina** (IEEE Transactions on Knowledge and Data Engineering, Vol. 23, No. 1, January 2011).

---

## 🔬 Research Core & Mathematical Model

When sensitive data distributed to $n$ third-party agents ($U_1, U_2, \dots, U_n$) is discovered in an unauthorized place (leaked set $S$), the distributor must calculate the probability $\Pr(G_i \mid S)$ that agent $U_i$ leaked the data, versus the possibility that the target gathered objects independently (guessing probability $p$).

### 1. Guilt Probability Equation
$$ \Pr(G_i \mid S) = 1 - \prod_{t \in S \cap R_i} \left( 1 - \frac{1-p}{|V_t|} \right) $$

where:
- $R_i \subseteq T \cup F_i$: Set of records (real + fake) allocated to agent $U_i$.
- $S$: Set of discovered leaked objects.
- $V_t = \{ U_j \mid t \in R_j \}$: Set of agents that possessed object $t$.
- $p$: Probability that an object $t \in S$ can be guessed independently.

### 2. Allocation Optimization Metrics
- **Sum-Objective ($\overline{\Delta}$)**:
  $$ \overline{\Delta} = \frac{\sum_{i \neq j} (\Pr(G_i \mid R_i) - \Pr(G_j \mid R_i))}{n(n - 1)} $$
- **Worst-Case Objective ($\min \Delta$)**:
  $$ \min \Delta = \min_{i \neq j} (\Pr(G_i \mid R_i) - \Pr(G_j \mid R_i)) $$

---

## ⚡ Key Implemented Algorithms

| Algorithm | Category | Paper Section | Description |
| shadow | shadow | shadow | shadow |
| **`e-random`** | Explicit (EF) | Sec 7.1 (Alg 1+2) | Randomly distributes fake objects up to budget $B$ to eligible agents. |
| **`e-optimal`** | Explicit (EF) | Sec 7.1 (Alg 1+3) | Greedily allocates fake objects to agents that maximize sum-objective improvement. |
| **`s-random`** | Sample (SF) | Sec 7.2.1 (Alg 4+5) | Baseline round-robin random sample selection. |
| **`s-overlap`** | Sample (SF) | Sec 7.2.2 (Alg 4+6) | Allocates objects to agents assigned to the minimum number of recipients ($\text{argmin } a[k]$). |
| **`s-sum`** | Sample (SF) | Sec 7.2.3 | Minimizes total relative overlap sum across agents. |
| **`s-max`** | Sample (SF) | Sec 7.2.4 (Alg 4+7) | Minimizes maximum pairwise relative overlap $\max_{j \neq i} \frac{|R_i \cap R_j|}{\min(m_i, m_j)}$. |

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Python 3.11+ / FastAPI
- **Database**: PostgreSQL / SQLite (SQLAlchemy 2.0 ORM)
- **Validation & Auth**: Pydantic v2, PyJWT, Passlib (Bcrypt)
- **Scientific**: NumPy, Pandas
- **Testing**: Pytest & Pytest-Asyncio

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS (Modern Dark Cybersecurity Theme)
- **Visualizations**: Recharts (Guilt Bar Charts, Radar & Line Simulations)
- **Routing & HTTP**: React Router DOM v6, Axios

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m pytest app/tests # Run paper algorithm test suite
uvicorn app.main:app --reload --port 8000
```
Backend API interactive docs will be live at: `http://localhost:8000/api/v1/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend Web Console will be live at: `http://localhost:5173`

---

## 🐳 Docker Deployment

To launch the full stack (PostgreSQL + FastAPI + Nginx Frontend):
```bash
docker-compose up --build
```
- Web Application: `http://localhost`
- Backend API: `http://localhost:8000`

---

## 🧪 Testing & Verification

Run automated test suite:
```bash
python -m pytest backend/app/tests -v
```
Verified test cases include:
- `test_paper_section_4_example`: Tests Section 4 numerical example ($\Pr(G_1 \mid S) = 0.88$).
- `test_fake_record_guilt_boost`: Verifies exclusive fake record drives suspicion towards 100%.
- `test_s_overlap_disjoint`: Verifies disjoint set allocation when $\sum m_i \le |T|$.
- `test_s_max_relative_overlap_minimization`: Verifies min-max relative overlap bounds.

---

## 📜 Legal & Methodology Disclaimer
> *This platform presents probabilistic attribution results derived from shared record set distribution dynamics and fake record detection. It provides quantitative suspicion metrics for data distributors but does not constitute definitive legal proof of wrongdoing.*
