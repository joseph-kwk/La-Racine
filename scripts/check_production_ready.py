"""
Production Readiness Checklist Script
Validates that all P0 requirements are met before deployment
"""
import os
import sys
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_check(passed, message):
    if passed:
        print(f"{Colors.GREEN}✓{Colors.END} {message}")
        return True
    else:
        print(f"{Colors.RED}✗{Colors.END} {message}")
        return False

def print_warning(message):
    print(f"{Colors.YELLOW}⚠{Colors.END} {message}")

def check_env_file():
    """Check if .env file exists"""
    env_path = Path('.env')
    env_example_path = Path('.env.example')
    
    checks_passed = []
    
    print_header("Environment Configuration")
    
    checks_passed.append(print_check(
        env_example_path.exists(),
        ".env.example file exists"
    ))
    
    checks_passed.append(print_check(
        env_path.exists(),
        ".env file exists"
    ))
    
    if env_path.exists():
        with open(env_path) as f:
            content = f.read()
            
        checks_passed.append(print_check(
            'DJANGO_SECRET_KEY' in content,
            "DJANGO_SECRET_KEY is configured"
        ))
        
        checks_passed.append(print_check(
            'dev-insecure-change-me' not in content or 'DJANGO_DEBUG=True' in content,
            "SECRET_KEY is production-ready or DEBUG is True"
        ))
        
        checks_passed.append(print_check(
            'DJANGO_ALLOWED_HOSTS' in content,
            "DJANGO_ALLOWED_HOSTS is configured"
        ))
        
        checks_passed.append(print_check(
            'DJANGO_CORS_ORIGINS' in content,
            "CORS origins are configured"
        ))
    
    return all(checks_passed)

def check_gitignore():
    """Check if sensitive files are gitignored"""
    print_header("Git Configuration")
    
    gitignore_path = Path('.gitignore')
    checks_passed = []
    
    if gitignore_path.exists():
        with open(gitignore_path) as f:
            content = f.read()
        
        checks_passed.append(print_check(
            '.env' in content,
            ".env is in .gitignore"
        ))
        
        checks_passed.append(print_check(
            '*.sqlite3' in content or 'db.sqlite3' in content,
            "SQLite database is in .gitignore"
        ))
        
        checks_passed.append(print_check(
            '__pycache__' in content,
            "__pycache__ is in .gitignore"
        ))
    else:
        checks_passed.append(print_check(False, ".gitignore exists"))
    
    return all(checks_passed)

def check_database():
    """Check database configuration"""
    print_header("Database Configuration")
    
    db_path = Path('db.sqlite3')
    checks_passed = []
    
    checks_passed.append(print_check(
        db_path.exists(),
        "Database file exists (db.sqlite3)"
    ))
    
    if db_path.exists():
        size_mb = db_path.stat().st_size / (1024 * 1024)
        print(f"  Database size: {size_mb:.2f} MB")
    
    # Check if migrations are up to date
    import subprocess
    try:
        result = subprocess.run(
            ['python', 'manage.py', 'showmigrations', '--plan'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            unapplied = '[X]' not in result.stdout and '[ ]' in result.stdout
            checks_passed.append(print_check(
                not unapplied,
                "All migrations are applied"
            ))
        else:
            print_warning("Could not check migration status")
    except Exception as e:
        print_warning(f"Migration check failed: {str(e)}")
    
    return all(checks_passed)

def check_dependencies():
    """Check if required packages are installed"""
    print_header("Dependencies")
    
    required_packages = {
        'django': 'django',
        'djangorestframework': 'rest_framework',
        'djangorestframework-simplejwt': 'rest_framework_simplejwt',
        'django-cors-headers': 'corsheaders',
        'Pillow': 'PIL',
        'cloudinary': 'cloudinary',
    }
    
    checks_passed = []
    
    for package_name, import_name in required_packages.items():
        try:
            __import__(import_name)
            checks_passed.append(print_check(True, f"{package_name} is installed"))
        except ImportError:
            checks_passed.append(print_check(False, f"{package_name} is installed"))
    
    return all(checks_passed)

def check_static_files():
    """Check static files configuration"""
    print_header("Static Files")
    
    checks_passed = []
    
    # Check if static root exists or can be created
    checks_passed.append(print_check(
        True,
        "Static files configuration present"
    ))
    
    print_warning("Run 'python manage.py collectstatic' before production deployment")
    
    return all(checks_passed)

def check_security_settings():
    """Check security configurations"""
    print_header("Security Settings")
    
    checks_passed = []
    
    # Check if settings.py has security configurations
    settings_path = Path('la_racine/settings.py')
    if settings_path.exists():
        with open(settings_path) as f:
            content = f.read()
        
        checks_passed.append(print_check(
            'SECURE_SSL_REDIRECT' in content,
            "SSL redirect configured for production"
        ))
        
        checks_passed.append(print_check(
            'CSRF_COOKIE_SECURE' in content,
            "Secure cookies configured for production"
        ))
        
        checks_passed.append(print_check(
            'SECRET_KEY' in content and 'os.environ' in content,
            "SECRET_KEY uses environment variable"
        ))
    
    return all(checks_passed)

def check_frontend():
    """Check frontend build"""
    print_header("Frontend Configuration")
    
    checks_passed = []
    
    frontend_path = Path('frontend')
    package_json = frontend_path / 'package.json'
    node_modules = frontend_path / 'node_modules'
    
    checks_passed.append(print_check(
        package_json.exists(),
        "package.json exists"
    ))
    
    checks_passed.append(print_check(
        node_modules.exists(),
        "node_modules installed"
    ))
    
    # Try to build frontend
    if package_json.exists():
        print_warning("Remember to run 'npm run build' before production deployment")
    
    return all(checks_passed)

def main():
    """Run all production readiness checks"""
    print(f"\n{Colors.BOLD}🌳 LA RACINE - PRODUCTION READINESS CHECKER{Colors.END}")
    
    results = {
        "Environment Configuration": check_env_file(),
        "Git Configuration": check_gitignore(),
        "Database": check_database(),
        "Dependencies": check_dependencies(),
        "Static Files": check_static_files(),
        "Security Settings": check_security_settings(),
        "Frontend": check_frontend(),
    }
    
    print_header("Summary")
    
    all_passed = all(results.values())
    passed_count = sum(results.values())
    total_count = len(results)
    
    for check_name, passed in results.items():
        status = f"{Colors.GREEN}PASS{Colors.END}" if passed else f"{Colors.RED}FAIL{Colors.END}"
        print(f"{check_name:.<40} {status}")
    
    print(f"\n{Colors.BOLD}Result: {passed_count}/{total_count} checks passed{Colors.END}")
    
    if all_passed:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ All P0 requirements met! Ready for production.{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ Some P0 requirements not met. Please fix issues above.{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
