#!/bin/bash

# Backup script for HireIQ application
# Creates backups of database and media files

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "🗄️  Starting HireIQ backup process..."

# Backup MongoDB
echo "📊 Backing up MongoDB database..."
docker-compose exec -T mongodb mongodump \
    --archive=$BACKUP_DIR/mongodb_$DATE.gz \
    --gzip \
    --db=hireiq_db

if [ $? -eq 0 ]; then
    echo "✅ MongoDB backup completed: mongodb_$DATE.gz"
else
    echo "❌ MongoDB backup failed"
    exit 1
fi

# Backup media files
echo "📁 Backing up media files..."
docker-compose exec -T backend tar -czf /tmp/media_$DATE.tar.gz /app/media/
docker cp $(docker-compose ps -q backend):/tmp/media_$DATE.tar.gz $BACKUP_DIR/

if [ $? -eq 0 ]; then
    echo "✅ Media files backup completed: media_$DATE.tar.gz"
    # Clean up temporary file in container
    docker-compose exec -T backend rm /tmp/media_$DATE.tar.gz
else
    echo "❌ Media files backup failed"
fi

# Backup environment configuration
echo "⚙️  Backing up configuration files..."
cp .env $BACKUP_DIR/env_$DATE.bak
cp docker-compose.yml $BACKUP_DIR/docker-compose_$DATE.yml

echo "✅ Configuration backup completed"

# List current backups
echo ""
echo "📋 Available backups:"
ls -lh $BACKUP_DIR/ | grep $DATE

# Clean up old backups (keep last 7 days)
echo ""
echo "🧹 Cleaning up old backups (keeping last 7 days)..."
find $BACKUP_DIR -name "*.gz" -type f -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +7 -delete
find $BACKUP_DIR -name "*.bak" -type f -mtime +7 -delete

echo "🎉 Backup process completed successfully!"
echo "📁 Backup location: $BACKUP_DIR"
