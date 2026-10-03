#!/usr/bin/env bash
set -euo pipefail

# Meat Accounting — Deploy Script
# Запуск: ./deploy.sh [production|staging]

ENV="${1:-production}"
PROJECT_DIR="/home/deploy/meat_accounting"
SERVICE_NAME="meat-backend"

echo "🚀 Deploying Meat Accounting ($ENV)..."

cd "$PROJECT_DIR"

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Backend dependencies
echo "📦 Installing backend dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. Run migrations
echo "🗄️ Running database migrations..."
alembic upgrade head

# 4. Seed data (идемпотентно)
echo "🌱 Seeding initial data..."
python scripts/seed.py

# 5. Frontend build (если нужен Next.js)
if [ -f "frontend/package.json" ]; then
    echo "🏗️ Building frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
fi

# 6. Restart service
echo "🔄 Restarting service..."
sudo systemctl restart "$SERVICE_NAME"

# 7. Reload nginx
echo "🌐 Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

# 8. Health check
echo "🏥 Checking health..."
sleep 2
curl -sf http://localhost:8000/health/live && echo "✅ Liveness OK"
curl -sf http://localhost:8000/health/ready && echo "✅ Readiness OK"

echo "✅ Deploy completed successfully!"