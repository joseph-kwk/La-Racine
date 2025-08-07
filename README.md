# 🌳 La Racine - Family Tree Application

A comprehensive family tree application that allows users to collaboratively build, view, and interact with their family history. Built with Django REST Framework backend and React frontend.

## 🎯 Project Overview

**La Racine** (meaning "The Root" in French) is a secure platform where authorized users can:

- 🔐 Register and manage family trees with role-based permissions
- 👥 Add/edit family members with detailed profiles, photos, and biographies
- 🌐 View interactive tree visualizations and timelines
- 🔔 Receive event-based notifications (birthdays, anniversaries, updates)
- 📍 Track family locations and migration histories
- 🎨 Celebrate shared heritage with customizable themes

## 🏗️ Architecture

### Backend (Django)
- **Framework**: Django 5.2.5 + Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT tokens via djangorestframework-simplejwt
- **Media Storage**: Cloudinary integration
- **API**: RESTful endpoints with filtering, search, and pagination

### Frontend (React)
- **Framework**: React 19 with Vite
- **Styling**: TailwindCSS v3
- **Routing**: React Router DOM
- **State Management**: Context API for authentication
- **HTTP Client**: Axios for API communication
- **Tree Visualization**: React Flow (planned)

## 📁 Project Structure

```
la_racine/
├── backend/
│   └── requirements.txt         # Backend dependencies
├── core/                        # User management & authentication
│   ├── models.py               # UserProfile model
│   ├── serializers.py          # API serializers
│   ├── views.py                # Authentication views
│   └── urls.py                 # Core URLs
├── tree/                       # Family tree models & logic
│   ├── models.py               # Tree, FamilyMember, Update models
│   ├── serializers.py          # Tree API serializers
│   ├── views.py                # Tree management views
│   └── urls.py                 # Tree URLs
├── profiles/                   # Member profiles & media
├── notifications/              # Birthday & event notifications
├── history/                    # Timeline & life events
├── frontend/
│   ├── src/
│   │   ├── components/         # Login, Register, TreeView, etc.
│   │   ├── context/            # AuthContext for global state
│   │   ├── services/           # API service layer
│   │   └── App.jsx             # Main application component
│   ├── package.json
│   └── vite.config.js
├── la_racine/                  # Django project configuration
│   ├── settings.py             # Django settings
│   └── urls.py                 # Main URL configuration
├── planning.txt                # Detailed project planning document
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

1. **Navigate to project root:**
   ```bash
   cd La-Racine
   ```

2. **Activate virtual environment:**
   ```bash
   # Windows
   .venv\Scripts\activate
   
   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

5. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server:**
   ```bash
   python manage.py runserver
   ```
   
   Backend will be available at: `http://127.0.0.1:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   
   Frontend will be available at: `http://localhost:5173`

## 📊 Database Models

### Core Models
- **UserProfile**: Extended user information (nickname, photo, location, birthday)
- **Tree**: Family tree container (name, creator, creation date)
- **FamilyMember**: Individual family member with relationships
- **Update**: Timeline updates and life events
- **Notification**: System notifications for birthdays and events

### Key Relationships
- Users can create multiple trees
- Family members belong to trees with parent/child/spouse relationships
- Updates track life events and changes
- Role-based permissions control access levels

## 🔐 User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Superuser** | Full access to all trees, users, audit logs, system settings |
| **Tree Admin** | Create/edit tree structure, invite/manage contributors |
| **Contributor** | Add/edit members, biographies, updates, media |
| **Viewer** | View tree, member info, comment if allowed |

## 🛣️ Roadmap

### Phase 1: MVP ✅
- [x] Authentication system with JWT
- [x] Basic tree structure with CRUD operations
- [x] Family member profiles with relationships
- [x] RESTful API with proper permissions
- [x] Frontend routing and authentication flow
- [ ] **CURRENT**: Fix TailwindCSS styling

### Phase 2: Enhanced Features
- [ ] Interactive tree visualization with React Flow
- [ ] Advanced search and filtering
- [ ] Notification system for birthdays/events
- [ ] Photo galleries and media management
- [ ] Export functionality (PDF, GEDCOM)

### Phase 3: Advanced Features
- [ ] Location mapping with migration paths
- [ ] Audio memories and voice notes
- [ ] Mobile PWA with offline support
- [ ] Multi-language support
- [ ] Advanced privacy controls

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Token refresh
- `POST /api/auth/logout/` - User logout

### Trees
- `GET /api/trees/` - List user's trees
- `POST /api/trees/` - Create new tree
- `GET /api/trees/{id}/` - Get tree details
- `PUT /api/trees/{id}/` - Update tree
- `DELETE /api/trees/{id}/` - Delete tree

### Family Members
- `GET /api/trees/{tree_id}/members/` - List tree members
- `POST /api/trees/{tree_id}/members/` - Add new member
- `GET /api/members/{id}/` - Get member details
- `PUT /api/members/{id}/` - Update member
- `DELETE /api/members/{id}/` - Delete member

## 🚨 Current Issues & Fixes Needed

### P0 - Critical Issues
1. **✅ RESOLVED**: TailwindCSS configuration - Downgraded to v3, added PostCSS config
2. **✅ RESOLVED**: Missing backend dependencies - Installed via pip
3. **🔄 IN PROGRESS**: Backend server startup errors

### P1 - High Priority
1. **Tree visualization**: Need to implement React Flow for interactive tree display
2. **API testing**: Need comprehensive API endpoint testing
3. **Error handling**: Frontend needs better error boundaries and validation
4. **Media upload**: Configure Cloudinary properly for image uploads

### P2 - Medium Priority
1. **Responsive design**: Mobile-first design improvements needed
2. **Performance**: API pagination and caching
3. **Testing**: Unit and integration tests for both frontend and backend
4. **Documentation**: API documentation with Swagger/OpenAPI

### P3 - Nice to Have
1. **Theme system**: Multiple color schemes and cultural themes
2. **Advanced search**: Full-text search across family members
3. **Data export**: GEDCOM and PDF export functionality
4. **Accessibility**: WCAG compliance improvements

## 🛠️ Development Guidelines

### Code Quality
- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript/React
- Write meaningful commit messages
- Add JSDoc comments for complex functions

### Security
- Never commit sensitive credentials
- Use environment variables for configuration
- Validate all user inputs
- Implement proper CORS policies

### Performance
- Optimize database queries with select_related/prefetch_related
- Implement proper caching strategies
- Use lazy loading for images and components
- Monitor bundle size and API response times

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Django and React communities for excellent documentation
- TailwindCSS for beautiful, utility-first styling
- React Flow for tree visualization capabilities
- Cloudinary for media storage solutions

---

**Status**: 🚧 In Development | **Last Updated**: August 6, 2025 | **Version**: 0.1.0-alpha
