# Выкладка на сервер

Что нужно сделать на сервере, чтобы система бэкапов заработала как на рабочей
машине. Все команды — от администратора сервера.

## Шаг 1. Развернуть БД (Docker)

На сервере должен быть установлен Docker. Создать контейнер с тем же именем,
что и в скрипте, и с томом (том обязателен — данные переживут пересоздание
контейнера):

```bash
docker run -d --name meat_db --restart unless-stopped \
  -e POSTGRES_USER=meat -e POSTGRES_PASSWORD=meat -e POSTGRES_DB=meat \
  -p 127.0.0.1:5434:5432 \
  -v /var/lib/meat_db_data:/var/lib/postgresql/data \
  postgres:18-alpine
```

После этого развернуть схему и сид (миграции + `scripts/seed.py`), как описано
в корневом README. Проверка доступа:

```bash
docker exec -it meat_db psql -U meat -d meat -c "select 1;"
```

## Шаг 2. Перенести код и скрипт

```bash
git clone <репозиторий> /var/www/meat_accounting
chmod +x /var/www/meat_accounting/scripts/backup.sh
mkdir -p /var/backups/meat
```

## Шаг 3. Прогнать первый бэкап вручную

```bash
/var/www/meat_accounting/scripts/backup.sh
ls -lh /var/backups/meat/
cat /var/backups/meat/backup.log
```

Должен появиться файл `meat_<дата>_<время>.dump` и строка `OK:` в логе.

## Шаг 4. Поставить расписание

### Linux (рекомендуется)

```bash
crontab -e
# строка: каждый понедельник в 02:00
0 2 * * 1 /var/www/meat_accounting/scripts/backup.sh >> /var/backups/meat/cron.log 2>&1
```

Проверка: `crontab -l`. Первый автоматический бэкап — понедельник в 02:00.

### Если сервер Windows — Планировщик

```powershell
$script = "C:\путь\meat_accounting\scripts\backup.ps1"
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 2am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName "MeatAccounting_WeeklyBackup" -Action $action -Trigger $trigger -Settings $settings
```

Если бэкап должен работать при выключенной сессии пользователя — регистрировать
с паролем (нужны админ-права):

```powershell
Register-ScheduledTask -TaskName "MeatAccounting_WeeklyBackup" -User "Ibra" -Password "<пароль>" -Action $action -Trigger $trigger
```

## Шаг 5. Проверить восстановление сразу после выкладки

Тестовый restore на отдельной базе:

```bash
DUMP=$(ls -t /var/backups/meat/meat_*.dump | head -1)
docker exec -i meat_db createdb -U meat meat_restore_test
docker exec -i meat_db pg_restore -U meat -d meat_restore_test < $DUMP
docker exec -it meat_db psql -U meat -d meat_restore_test -c "select count(*) from operations;"
docker exec -i meat_db dropdb -U meat meat_restore_test
```

## Шаг 6. Резервная копия вне сервера (рекомендуется)

Бэкапы на том же диске не спасают от сбоя диска. Копировать в сетевую
папку/объектное хранилище после ротации:

```bash
# добавить строками в crontab (сервер-НСА хранит копии)
0 3 * * 1 rsync -a /var/backups/meat/ backup@nas:/srv/backups/meat/
```

## Чек-лист прода

- [ ] Контейнер `meat_db` с томом, переживает перезагрузку
- [ ] `backup.sh` выполняется и пишет `OK:` в лог
- [ ] Cron/Планировщик на понедельник 02:00
- [ ] Тестовый restore прошёл без ошибок
- [ ] Копия бэкапов уходит на внешнее хранилище