# ===========================================
# Meat Accounting — Быстрый старт (meat-uchet.ru)
# ===========================================
# На сервере выполните по порядку:

# 1. Клонирование
git clone https://github.com/ВАШ_НИК/meat_accounting.git
cd meat_accounting

# 2. Python окружение
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. PostgreSQL — создайте БД и пароль
sudo -u postgres psql <<'SQL'
CREATE DATABASE meat_accounting;
CREATE USER meat_user WITH ENCRYPTED PASSWORD 'ВАШ_СЛОЖНЫЙ_ПАРОЛЬ_БД';
GRANT ALL PRIVILEGES ON DATABASE meat_accounting TO meat_user;
SQL

# 4. .env — заполните 3 поля
cp .env.example .env
nano .env
# ВНУТРИ .env ПОМЕНЯТЬ ТОЛЬКО ЭТО:
# DATABASE_URL=postgresql+asyncpg://meat_user:ВАШ_СЛОЖНЫЙ_ПАРОЛЬ_БД@localhost:5432/meat_accounting
# SECRET_KEY=ВАШ_КЛЮЧ_ИЗ_OPENSSL_RAND_HEX_32
# ALLOWED_ORIGINS=https://meat-uchet.ru,https://www.meat-uchet.ru

# 5. Сгенерируйте SECRET_KEY (запустите и скопируйте вывод в .env)
openssl rand -hex 32

# 6. Миграции и сиды
alembic upgrade head
python scripts/seed.py

# 7. Фронтенд (если нужен Next.js билд)
cd frontend && npm ci && npm run build && cd ..

# 8. Systemd сервис
sudo cp deploy/meat-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now meat-backend

# 9. Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/meat-accounting
sudo ln -sf /etc/nginx/sites-available/meat-accounting /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 10. SSL (Let's Encrypt)
sudo certbot --nginx -d meat-uchet.ru -d www.meat-uchet.ru
# Выберите пункт 2 (Redirect)

# 11. Проверка
curl https://meat-uchet.ru/health/live
curl https://meat-uchet.ru/health/ready
curl -I https://meat-uchet.ru/

# Логи
sudo journalctl -u meat-backend -f