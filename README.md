# 🌳 La Racine — World-Class Family Tree Application

[![Django](https://img.shields.io/badge/Django-5.2-092E20?style=flat-square&logo=django)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**La Racine** ("The Root" in French) is a world-class, multi-lingual family genealogy platform designed for collaborative family tree building, history preservation, and change governance. Built with a robust Django REST Framework backend and a modern React frontend.

---

## 🎯 Key Features

- **🌳 Interactive Tree Visualization**: Dynamic, responsive family graph visualization with detailed member inspection, relationship links, search, filtering, and custom family themes.
- **🛡️ Governance & Change Requests**: Fine-grained change management workflow. Edits to critical fields (birth/death dates, relationships) generate Change Requests requiring review by tree owners or assigned validators.
- **🌐 5-Language Internationalization (i18n)**: Native multi-language support out-of-the-box:
  - 🇺🇸 English (`en`)
  - 🇫🇷 French (`fr`)
  - 🇪🇸 Spanish (`es`)
  - 🇮🇳 Hindi (`hi`)
  - 🇨🇳 Chinese (`zh`)
  - *Includes automatic browser locale/region detection and seamless language switching.*
- **👑 Custom Admin Content Management Panel**: Custom-branded Django Admin panel with dark-emerald styling, color-coded status badges, photo thumbnails, bulk approval/rejection actions, and interactive metrics.
- **🔔 Multi-Channel Notifications**: Real-time in-app notification center for birthdays, anniversaries, change approvals, member updates, and tree invitations.
- **🖼️ Media & Photo Tagging**: High-resolution photo gallery with percentage-coordinate tagging for family members.
- **📣 Social Updates & Feed**: Tree news, stories, and milestones feed with likes, comments, and member tagging.
- **🔒 Privacy & GDPR Consent**: Member-level and field-level privacy controls (Public, Family Only, Close Family, Private) with living person consent tracking.

---

## 🏗️ Technical Architecture

### Backend Stack
- **Framework**: Django 5.2 + Django REST Framework 3.16
- **Auth**: JWT Authentication (`djangorestframework-simplejwt`)
- **Database**: SQLite (development) / PostgreSQL compatible
- **Testing**: `pytest` + `pytest-django` test suite (47+ tests passing)
- **Static Assets**: Django Staticfiles with WhiteNoise support

### Frontend Stack
- **Framework**: React 19 + Vite 7
- **Styling**: TailwindCSS v3 (Emerald/Forest theme design system)
- **i18n**: i18next with browser language detection
- **State & Router**: React Router DOM v7 & Context API

---

## 📁 Repository Structure

```
La-Racine/
├── core/                        # Authentication, UserProfile & custom admin templates
│   ├── admin.py                # User & UserProfile admin configuration
│   ├── api.py                  # UserProfile ViewSets & claim member endpoint
│   ├── models.py               # UserProfile model with notification preferences
│   ├── serializers.py          # DRF serializers for user profiles
│   ├── static/core/admin.css   # Custom admin CSS styling
│   ├── templates/admin/        # Custom admin index & login templates
│   └── views.py                # Registration & /me endpoints
├── tree/                       # Core genealogy models & API
│   ├── admin.py                # Tree, FamilyMember, ChangeRequest & Photo admin
│   ├── api.py                  # ViewSets for Tree, Member, ChangeRequest & Invitations
│   ├── models.py               # FuzzyDate, Tree, FamilyMember, FamilyRelationship, etc.
│   ├── serializers.py          # Complete DRF serializers for tree data
│   └── theme_presets.py        # Color palette presets for family trees
├── notifications/              # Event-driven notification system
│   ├── admin.py                # Notification admin & delivery tracking
│   ├── api.py                  # Notification list, unread count & mark-as-read
│   ├── models.py               # Notification & NotificationBatch models
│   └── signals.py              # Signals for birthday/death/member events
├── history/                    # Life events & audit logging
│   ├── admin.py                # Audit log & LifeEvent admin
│   ├── api.py                  # LifeEvent & AuditLog ViewSets
│   └── models.py               # LifeEvent & immutable AuditLog models
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/         # TreeView, Dashboard, Admin, Profile, etc.
│   │   ├── context/            # AuthContext, LanguageContext, ThemeContext
│   │   ├── i18n/               # Translation dictionaries (en, fr, es, hi, zh)
│   │   ├── services/           # Axios API client services
│   │   └── App.jsx             # Main router component
│   └── package.json
├── la_racine/                  # Django project root settings & URLs
│   ├── settings.py             # Settings configuration
│   └── urls.py                 # Core routing
├── pytest.ini                  # Pytest configuration
├── manage.py                   # Django CLI
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+

### 1. Backend Setup

```bash
# Clone repository
git clone https://github.com/joseph-kwk/La-Racine.git
cd La-Racine

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start backend dev server
python manage.py runserver
```
Backend API will be live at `http://127.0.0.1:8000/`.

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend Web App will be live at `http://localhost:5173/`.

---

## 🧪 Testing & Verification

### Run Backend Tests

```bash
# Run pytest test suite (47+ tests)
pytest

# Run Django system check
python manage.py check
```

### Build Frontend Production Assets

```bash
cd frontend
npm run build
```

---

## 🔑 Key API Endpoints

### Authentication & Profile
- `POST /api/auth/register/` — Register new user
- `POST /api/auth/token/` — Obtain JWT access/refresh token
- `GET/PATCH /api/auth/me/` — Retrieve or update current user profile
- `GET/PATCH /api/userprofiles/me/` — Get/update user settings & language preference

### Tree & Family Members
- `GET/POST /api/trees/` — List or create family trees
- `GET/POST /api/members/` — List or create family members
- `POST /api/members/{id}/propose-change/` — Propose change request
- `POST /api/relationships/` — Create family relationship link

### Notifications & Change Governance
- `GET /api/notifications/` — User notifications list
- `GET /api/notifications/unread-count/` — Unread badge count
- `POST /api/notifications/mark-all-read/` — Mark all in-app notifications read
- `POST /api/change-requests/{id}/approve/` — Approve change request
- `POST /api/change-requests/{id}/reject/` — Reject change request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
