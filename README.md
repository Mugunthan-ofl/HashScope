# HashScope 🔍

**HashScope** is a password policy audit tool that runs cracking engines (Hashcat, John the Ripper) against lab-generated password hashes and reports strength metrics and policy compliance results.

---

## 🏗️ Architecture & SOLID Principles

HashScope adheres strictly to SOLID design principles:

- **Single Responsibility Principle (SRP)**: Distinct core modules for hashing, cracking orchestration, strength scoring, policy verification, and report generation.
- **Open/Closed Principle (OCP)**: Abstract base interfaces (`CrackEngine`, `PolicyRule`, `Scorer`) allow adding new cracking engines or policy rules without modifying existing codebase.
- **Liskov Substitution Principle (LSP)**: All engine implementations (`HashcatEngine`, `JohnEngine`) strictly fulfill `CrackEngine` behavioral contracts and are interchangeable.
- **Interface Segregation Principle (ISP)**: Scoring interfaces (`Scorer`) and policy evaluation interfaces (`PolicyRule`) are kept separate.
- **Dependency Inversion Principle (DIP)**: Service and orchestration layers depend on abstract interfaces, with concrete dependencies wired at composition root (`main.py`).

---

## 📁 Repository Structure

```
hashscope/
├── backend/
│   ├── core/
│   │   ├── interfaces/          # Abstract base classes (CrackEngine, PolicyRule, Scorer)
│   │   ├── hashing/             # hash_generator.py
│   │   ├── cracking/            # hashcat_engine.py, john_engine.py (implement CrackEngine)
│   │   ├── scoring/             # strength_scorer.py, entropy_scorer.py (zxcvbn wrapper)
│   │   ├── policy/              # baseline_rules.py, advanced_rules.py, breach_check.py
│   │   └── reporting/           # report_service.py
│   ├── api/
│   │   ├── routes/              # audit.py (POST /audit, GET /audit/{id})
│   │   └── schemas/             # Pydantic request/response models
│   ├── config.yaml              # Configuration file
│   ├── main.py                  # FastAPI app entrypoint
│   └── requirements.txt         # Backend Python dependencies
├── frontend/                    # Vite + React + TypeScript + Tailwind CSS frontend shell
├── tests/
│   └── backend/                 # Pytest test suite
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Backend Setup

1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Create and activate virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   API health check available at `http://localhost:8000/health`.

### Frontend Setup

1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run Vite dev server:
   ```bash
   npm run dev
   ```
