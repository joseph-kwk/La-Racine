# 🚀 Quick Start Guide - La Racine

Get La Racine running on your local machine in 5 minutes!

## Prerequisites

- Python 3.12+ installed
- Node.js 18+ installed
- Git installed

## Step 1: Clone and Setup (2 minutes)

```bash
# Clone the repository
git clone https://github.com/joseph-kwk/La-Racine.git
cd La-Racine

# Copy environment template
cp .env.example .env
```

## Step 2: Backend Setup (2 minutes)

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start backend server
python manage.py runserver
```

Backend will be running at: http://localhost:8000

## Step 3: Frontend Setup (1 minute)

Open a new terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be running at: http://localhost:5173

## Step 4: Verify Everything Works

Run the automated test:

```bash
# In another terminal, from project root:
python test_e2e.py
```

Or manually:
1. Open http://localhost:5173
2. Click "Register" and create an account
3. Create a new family tree
4. Add a family member
5. View the tree visualization

## ✅ You're Done!

The application is now running locally. Happy coding! 🌳

## 🆘 Troubleshooting

**Backend won't start:**
- Make sure virtual environment is activated
- Run `pip install -r backend/requirements.txt` again

**Frontend won't start:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**Database errors:**
- Delete `db.sqlite3`
- Run `python manage.py migrate` again

**Port already in use:**
- Backend: `python manage.py runserver 8001`
- Frontend: Change port in `vite.config.js`

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Run `python check_production_ready.py` to verify P0 requirements
- Explore [API_DESIGN.md](API_DESIGN.md) for API documentation
