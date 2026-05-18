# Workforce Intelligence & Execution OS

A high-performance HR Monitoring and Workforce Management platform designed for real-time tracking, analytics, and operational excellence. Built as a monorepo, this system integrates a robust FastAPI backend with a dynamic Next.js frontend.

## 🚀 Key Features
- **Real-time Attendance Tracking**: Monitor clock-ins, clock-outs, and active sessions.
- **Dynamic Dashboards**: Role-based views for Admins, Managers, and Employees.
- **Leave Management**: Automated approval workflows and history tracking.
- **Operational Analytics**: Insights into workforce productivity and performance.
- **Background Tasks**: Asynchronous processing for alerts and report generation.

## 🛠 Tech Stack
- **Frontend**: [Next.js 15](https://nextjs.org/), TypeScript, Tailwind CSS, Shadcn UI
- **Backend API**: [FastAPI](https://fastapi.tiangolo.com/), Pydantic v2
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **Task Queue**: [Celery](https://docs.celeryq.dev/) with [Redis](https://redis.io/)
- **Documentation**: Markdown-based architectural and API specs

## 📂 Project Structure
```text
├── apps/
│   ├── web/          # Next.js Frontend
│   ├── api/          # FastAPI Backend
│   └── worker/       # Celery Background Workers
├── packages/
│   ├── ui/           # Shared React Components
│   ├── types/        # Shared TypeScript definitions
│   └── config/       # Shared configuration (Linting, TS, etc.)
├── docs/             # Technical Specifications & Documentation
└── infra/            # Docker & Deployment configurations
```

---

## ⚙️ Setup Instructions

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Redis** (Required for Celery tasks)
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/Paramount-Intelligence/HR_Monitoring_System.git
cd HR_Monitoring_System
```

### 3. Environment Configuration
Copy the example environment files and update them with your local settings.

**Root / API:**
```bash
cp .env.example .env
```

**Web:**
```bash
cp apps/web/.env.example apps/web/.env.local  # If applicable
```

### 4. Install Dependencies

#### Backend (API & Worker)
It is recommended to use a virtual environment.
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

#### Frontend (Web)
Install dependencies from the root using npm (workspaces are enabled).
```bash
npm install
```

### 5. Database Setup
Initialize the SQLite database and run migrations.
```bash
cd apps/api
alembic upgrade head
```

*(Optional)* Seed the database with initial data:
```bash
python seed.py
```

### 6. Running the Application

You will need multiple terminal windows to run the full stack.

#### Start the API:
```bash
cd apps/api
uvicorn app.main:app --reload --port 8000
```

#### Start the Worker (Requires Redis):
```bash
cd apps/api
celery -A app.worker.celery_app worker --loglevel=info
```

#### Start the Frontend:
```bash
# From the root directory
npm run dev:web
```

---

## 📖 Documentation
Detailed technical specifications can be found in the `docs/` directory:
- [System Architecture](./docs/02_SYSTEM_ARCHITECTURE.md)
- [API Specification](./docs/04_API_SPECIFICATION.md)
- [Database Schema](./docs/03_DATABASE_SCHEMA.md)

## 🤝 Contributing
Please read the [Project Index](./docs/00_PROJECT_INDEX.md) before making any major changes.


cd "D:\Paramount Intelligence\Paramount Intelligence\HR_Monitoring_System\apps\api"
.\venv\Scripts\Activate.ps1
python -m alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080



cd "D:\Paramount Intelligence\Paramount Intelligence\HR_Monitoring_System"
npm.cmd run dev:web