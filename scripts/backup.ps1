# Еженедельный бэкап БД: pg_dump (custom, сжатие 9) в контейнере -> docker cp -> ротация 60 дней -> лог.
# Запускается Планировщиком Windows каждый понедельник в 02:00.
# Проверка целостности: магические байты PGDMP + минимальный размер + pg_restore -l (если есть).
# Восстановление: docker exec -i meat_db pg_restore -U meat -d --clean --if-exists meat < dump

param(
    [string]$Container  = "meat_db",
    [string]$DbUser     = "meat",
    [string]$DbName     = "meat",
    [string]$BackupDir  = "C:\backups\meat",
    [int]   $RetentionDays = 60,
    [string]$PGRestore  = "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
)

$ErrorActionPreference = "Stop"
$Stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$DumpFile = Join-Path $BackupDir "meat_$Stamp.dump"
$LogFile = Join-Path $BackupDir "backup.log"
$TmpInContainer = "/tmp/meat_$Stamp.dump"

function Write-Log([string]$Message) {
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $LogFile -Value $line
}

function Exit-Fail([string]$Message) {
    Write-Log "ERROR: $Message"
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

# Каталог бэкапов (логи живут рядом с дампами)
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Log "Backup start (db=$DbName user=$DbUser container=$Container)"

# 1. Контейнер должен быть запущен
try {
    $state = docker inspect -f "{{.State.Running}}" $Container 2>$null
} catch {
    $state = $null
}
if ($state -ne "true") {
    Exit-Fail "container $Container not running"
}

# 2. Дамп custom-формата прямо в контейнере (без гонок с кодировкой терминала)
docker exec $Container pg_dump -U $DbUser -Fc -Z 9 -f $TmpInContainer $DbName 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Exit-Fail "pg_dump failed (exit $LASTEXITCODE)"
}

# 3. Копирование дампа на хост
try {
    docker cp "${Container}:${TmpInContainer}" $DumpFile
    if ($LASTEXITCODE -ne 0) { throw "docker cp exit $LASTEXITCODE" }
} catch {
    Exit-Fail "docker cp failed: $($_.Exception.Message)"
} finally {
    docker exec $Container rm -f $TmpInContainer 2>&1 | Out-Null
}

# 4. Проверка целостности
$size = (Get-Item -LiteralPath $DumpFile).Length
if ($size -lt 1024) {
    Exit-Fail "dump too small ($size bytes): $DumpFile"
}
$magic = [System.Text.Encoding]::ASCII.GetString((Get-Content -LiteralPath $DumpFile -Encoding Byte -TotalCount 5))
if ($magic -ne "PGDMP") {
    Exit-Fail "dump has no PGDMP header: $DumpFile"
}
# Полная проверка списка объектов через pg_restore, если бинарь доступен
if (Test-Path -LiteralPath $PGRestore) {
    & $PGRestore -l $DumpFile 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Exit-Fail "pg_restore -l rejected dump: $DumpFile"
    }
}

# 5. Ротация: файлы старше RetentionDays (2 месяца) удаляем, оставляем только дампы
$kept = 0
Get-ChildItem -Path $BackupDir -Filter "meat_*.dump" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays)) {
        Remove-Item -LiteralPath $_.FullName -Force
        Write-Log "removed old backup: $($_.Name)"
    } else {
        $kept++
    }
}

Write-Log "OK: $DumpFile ($size bytes), backups kept: $kept"
Write-Host "OK: $DumpFile ($size bytes)" -ForegroundColor Green