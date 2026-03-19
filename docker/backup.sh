#!/bin/bash
# Automated daily PostgreSQL backup to DigitalOcean Spaces
# Add to crontab: 0 2 * * * /path/to/backup.sh
# Requires: s3cmd configured with DO Spaces credentials

set -euo pipefail

BACKUP_DIR="/tmp/horeca1-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="horeca1_${TIMESTAMP}.sql.gz"
SPACES_BUCKET="s3://horeca1-backups"
RETAIN_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump PostgreSQL from Docker container
docker exec horeca1-db pg_dump -U horeca1 --format=custom horeca1 | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to DigitalOcean Spaces
s3cmd put "${BACKUP_DIR}/${BACKUP_FILE}" "${SPACES_BUCKET}/${BACKUP_FILE}"

# Clean up local backup
rm -f "${BACKUP_DIR}/${BACKUP_FILE}"

# Remove backups older than RETAIN_DAYS from Spaces
s3cmd ls "${SPACES_BUCKET}/" | while read -r line; do
  FILE_DATE=$(echo "$line" | awk '{print $1}')
  FILE_NAME=$(echo "$line" | awk '{print $4}')
  if [[ -n "$FILE_DATE" && -n "$FILE_NAME" ]]; then
    FILE_AGE=$(( ($(date +%s) - $(date -d "$FILE_DATE" +%s)) / 86400 ))
    if [[ $FILE_AGE -gt $RETAIN_DAYS ]]; then
      s3cmd del "$FILE_NAME"
      echo "[$(date)] Deleted old backup: $FILE_NAME"
    fi
  fi
done

echo "[$(date)] Backup completed: ${BACKUP_FILE}"
