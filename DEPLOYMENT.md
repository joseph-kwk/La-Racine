# 🚀 La Racine - Production Deployment Guide

## P0 Critical Items Checklist

### ✅ Completed P0 Items

- [x] **Environment Variables**: `.env` and `.env.example` files created
- [x] **Security Settings**: Production security headers configured
- [x] **Git Security**: Sensitive files properly gitignored
- [x] **Dependencies**: All required packages installed
- [x] **Database**: Migrations applied and working
- [x] **Build System**: Frontend builds successfully
- [x] **Code Quality**: No linting errors, all tests passing

### 🔄 Before Production Deployment

- [ ] Generate new SECRET_KEY for production
- [ ] Set DEBUG=False in production environment
- [ ] Configure production database (PostgreSQL recommended)
- [ ] Set up production ALLOWED_HOSTS
- [ ] Run end-to-end tests
- [ ] Configure static file serving
- [ ] Set up error monitoring (Sentry recommended)

---

## 📋 Pre-Deployment Steps

### 1. Generate Production Secret Key

Run this command to generate a new Django secret key:

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and add it to your production `.env` file.

### 2. Configure Production Environment

Update your production `.env` file:

```bash
# Production Settings
DJANGO_SECRET_KEY=<your-new-secret-key-here>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://user:password@host:5432/database

# CORS
DJANGO_CORS_ORIGINS=https://yourdomain.com

# Cloudinary (get from cloudinary.com dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

### 3. Run Production Readiness Check

```bash
python check_production_ready.py
```

All checks should pass before deployment.

### 4. Run End-to-End Tests

```bash
# Start backend
python manage.py runserver

# In another terminal, run tests
python test_e2e.py
```

### 5. Build Frontend for Production

```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/`.

---

## 🌐 Deployment Options

### Option 1: Railway (Recommended for Backend)

**Backend Deployment:**

1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`
4. Initialize: `railway init`
5. Add PostgreSQL: `railway add postgresql`
6. Deploy: `railway up`
7. Set environment variables in Railway dashboard

**Required Environment Variables in Railway:**
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CORS_ORIGINS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Post-deployment:**
```bash
railway run python manage.py migrate
railway run python manage.py createsuperuser
railway run python manage.py collectstatic --noinput
```

### Option 2: Vercel (Recommended for Frontend)

**Frontend Deployment:**

1. Create account at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm install -g vercel`
3. Navigate to frontend: `cd frontend`
4. Deploy: `vercel --prod`

**Environment Variables in Vercel:**
- `VITE_API_URL=https://your-backend-url.railway.app/api`

### Option 3: Render (Alternative for Both)

**Backend:**
1. Create account at [render.com](https://render.com)
2. Create New Web Service
3. Connect GitHub repository
4. Build Command: `pip install -r backend/requirements.txt`
5. Start Command: `gunicorn la_racine.wsgi:application`
6. Add PostgreSQL database
7. Set environment variables

**Frontend:**
1. Create New Static Site
2. Build Command: `cd frontend && npm install && npm run build`
3. Publish Directory: `frontend/dist`

---

## 🔧 Production Django Settings

Add to `backend/requirements.txt`:
```
gunicorn
dj-database-url
whitenoise
```

Install for production:
```bash
pip install -r backend/requirements.txt
```

Update `settings.py` for production database:
```python
import dj_database_url

# Database configuration
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600
        )
    }
else:
    # SQLite for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
```

---

## 📊 Post-Deployment Verification

### Backend Health Checks

```bash
# Check if backend is running
curl https://your-backend-url.com/api/

# Test authentication
curl -X POST https://your-backend-url.com/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### Frontend Health Checks

1. Open `https://your-frontend-url.com`
2. Try to register a new account
3. Login with the account
4. Create a new family tree
5. Add a family member
6. View the tree visualization

---

## 🔒 Security Checklist

Before going live:

- [ ] DEBUG is set to False
- [ ] SECRET_KEY is unique and not in version control
- [ ] ALLOWED_HOSTS is properly configured
- [ ] HTTPS is enabled (SSL certificate)
- [ ] CSRF protection is enabled
- [ ] Secure cookies are enabled (HTTPS only)
- [ ] SQL injection protection (Django ORM handles this)
- [ ] XSS protection enabled
- [ ] Rate limiting configured for API endpoints
- [ ] Error pages don't expose sensitive information
- [ ] Database backups are configured

---

## 📈 Monitoring & Maintenance

### Set Up Error Tracking

**Sentry (Recommended):**

1. Create account at [sentry.io](https://sentry.io)
2. Install: `pip install sentry-sdk`
3. Add to `settings.py`:

```python
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

if not DEBUG:
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=1.0,
        send_default_pii=False
    )
```

### Database Backups

**PostgreSQL Backups:**
```bash
# Manual backup
pg_dump -h host -U user -d database > backup.sql

# Restore
psql -h host -U user -d database < backup.sql
```

Most platforms (Railway, Render) provide automatic backups.

---

## 🐛 Troubleshooting

### Common Issues

**Static files not loading:**
```bash
python manage.py collectstatic --noinput
```

**Database migrations failed:**
```bash
python manage.py migrate --run-syncdb
```

**CORS errors:**
- Check `DJANGO_CORS_ORIGINS` includes your frontend URL
- Verify frontend is making requests to correct backend URL

**502 Bad Gateway:**
- Check backend server is running
- Verify gunicorn is configured correctly
- Check logs for errors

---

## 📞 Support Resources

- **Django Deployment**: https://docs.djangoproject.com/en/5.2/howto/deployment/
- **Railway Docs**: https://docs.railway.app/
- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs

---

## 🎉 You're Ready!

If all checks pass and you've completed the steps above, you're ready to deploy La Racine to production!

**Final Command to Run:**
```bash
python check_production_ready.py && echo "🚀 Ready for deployment!"
```

Good luck! 🌳
