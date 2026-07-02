# Run this script from the project root: .\scripts\setup_backend.ps1
Write-Host "Creating venv..."
python -m venv .venv
Write-Host "Activating venv..."
. .venv\Scripts\Activate.ps1
Write-Host "Installing requirements..."
pip install -r requirements.txt
Write-Host "Migrating..."
python manage.py migrate
Write-Host "Done."
