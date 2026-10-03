#!/usr/bin/env bash
set -euo pipefail

# Meat Accounting — Backup Script
# Добавьте в cron: 0 3 * * * /home/deploy/meat_accounting/deploy/backup.sh

BACKUP_DIR="/home/deploy/backups"
DB_NAME="meat_accounting"
DB_USER="meat_user"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

DATE=$(date +%F_%H-%M)
BACKUP_FILE="$BACKUP_DIR/meat_${DATE}.sql.gz"

echo "🗄️ Backing up database to $BACKUP_FILE..."

# Дамп БД
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"

# Удаляем старые бэкапы
find "$BACKUP_DIR" -name "meat_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "✅ Backup completed: $BACKUP_FILE"
ls -lh "$BACKUP_DIR"/meat_*.sql.gz | tail -5