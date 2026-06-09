# Docker Deployment on Hostinger VPS

## Overview

Run the monitoring system as Docker containers on your Hostinger VPS alongside Hermes:

```
┌─────────────────────────────────────┐
│     Hostinger VPS (Linux)           │
├─────────────────────────────────────┤
│  ┌───────────────┐                  │
│  │   Hermes      │  (Existing)      │
│  │   Container   │                  │
│  └───────────────┘                  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Fontana Monitoring Cluster  │  │
│  ├──────────────────────────────┤  │
│  │ • fontana-scraper (hourly)   │  │
│  │ • fontana-aggregate (daily)  │  │
│  │ • fontana-cleanup (daily)    │  │
│  │ • fontana-email (daily)      │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌───────────────┐                  │
│  │  Supabase     │  (External)      │
│  │  Database     │                  │
│  └───────────────┘                  │
└─────────────────────────────────────┘
```

---

## Prerequisites

On your VPS, verify you have:

```bash
# Check Docker
docker --version
# Expected: Docker version 20.10+

# Check Docker Compose
docker-compose --version
# Expected: docker-compose version 1.29+

# Check git
git --version
```

---

## Step 1: Clone the Repository

SSH into your VPS and clone the project:

```bash
# SSH to Hostinger VPS
ssh -i /path/to/key root@your-vps-ip

# Navigate to projects directory
cd /opt/projects  # or wherever Hermes is

# Clone monitoring-automation
git clone https://github.com/your-repo/monitoring-automation.git
cd monitoring-automation
```

---

## Step 2: Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
nano .env
```

Edit `.env` with your actual values:

```bash
# SolarWeb credentials
SOLARWEB_USERNAME=evert@greenspark.co.ke
SOLARWEB_PASSWORD=your_actual_password

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Email
ZOHO_RECIPIENT_EMAIL=evert@greenspark.co.ke
```

**Keep `.env` secure:**
```bash
chmod 600 .env  # Only owner can read
```

---

## Step 3: Build and Start Containers

```bash
# Build images (first time only, or after code changes)
docker-compose build

# Start all containers in background
docker-compose up -d

# Verify containers are running
docker-compose ps
```

**Expected output:**
```
NAME                  STATUS              PORTS
fontana-scraper       Up X minutes        
fontana-aggregate     Up X minutes        
fontana-cleanup       Up X minutes        
fontana-email         Up X minutes        
```

---

## Step 4: Verify Everything Works

### Check logs from hourly scraper:

```bash
# View scraper logs (last 50 lines)
docker-compose logs -f fontana-scraper --tail=50

# Expected output:
# ========================================
# Hourly Scraper Started
# Schedule: 6 AM - 6 PM East African Time (UTC+3)
# Frequency: Every hour (on the hour)
# ========================================
# 
# 📅 Scheduler is now running. Press Ctrl+C to stop.
```

### Check if scraping is working (wait until next hour):

```bash
# View logs in real-time
docker-compose logs -f fontana-scraper

# When the hour changes (e.g., 10:00), you should see:
# [HOURLY SCRAPE] 2026-06-09T07:00:00.000Z
# ⏳ [alisha] Starting...
# ⏳ [ayana] Starting...
# ⏳ [akina] Starting...
# ⏳ [bigflowers] Starting...
```

### Check database insertion:

```bash
# Test aggregation manually (run once)
docker-compose run --rm fontana-aggregate

# Or check Supabase dashboard for recent daily_scrape records
```

---

## Step 5: View Logs

### Real-time logs from all containers:

```bash
# All containers
docker-compose logs -f

# Single container
docker-compose logs -f fontana-scraper

# Last 100 lines of scraper
docker-compose logs fontana-scraper --tail=100

# Follow with timestamps
docker-compose logs -f --timestamps fontana-scraper
```

### Save logs to file:

```bash
# Dump all logs to file
docker-compose logs > /var/log/fontana/all.log

# Schedule daily log rotation
# (Add to crontab or use logrotate)
```

---

## Step 6: Monitor Health

### Check container status:

```bash
# Running containers
docker-compose ps

# Container stats (CPU, memory)
docker stats fontana-scraper fontana-email

# View container resource usage
docker-compose ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
```

### Health checks:

The `docker-compose.yml` includes healthchecks. View status:

```bash
docker-compose ps
# Look for "healthy" or "unhealthy" status
```

---

## Step 7: Setup Log Rotation

Logs can grow large over time. Setup rotation:

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/fontana > /dev/null << 'EOF'
/var/lib/docker/containers/*/fontana-*/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    copy
    copytruncate
}
EOF
```

Or use Docker's built-in log rotation in `docker-compose.yml` (already configured):

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "10"
```

This keeps max 10 files × 100 MB = ~1 GB of logs max.

---

## Step 8: Daily Backups (Optional)

Backup database data periodically:

```bash
# Daily backup script
cat > /usr/local/bin/fontana-backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/fontana"
mkdir -p $BACKUP_DIR

# Backup via Supabase dashboard or pg_dump
# (Supabase manages backups automatically)

# Or sync data locally:
echo "Fontana backup completed: $DATE" >> /var/log/fontana/backups.log
EOF

chmod +x /usr/local/bin/fontana-backup.sh

# Add to crontab (daily at 2 AM)
# 0 2 * * * /usr/local/bin/fontana-backup.sh >> /var/log/fontana/backup.log 2>&1
```

---

## Maintenance Commands

### Stop containers:

```bash
docker-compose stop
```

### Restart containers:

```bash
docker-compose restart
```

### Full restart (pull latest code):

```bash
# Stop
docker-compose down

# Pull latest code
git pull origin main

# Rebuild and start
docker-compose build
docker-compose up -d
```

### Remove containers (clean slate):

```bash
# Remove all containers and networks
docker-compose down

# Also remove images
docker-compose down --rmi all
```

---

## Troubleshooting

### Containers not starting?

```bash
# Check Docker daemon
docker ps

# Check logs
docker-compose logs fontana-scraper

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Scraper not finding farms?

```bash
# Check environment variables
docker-compose config | grep SOLARWEB

# Verify credentials in .env
cat .env

# Test manually
docker-compose run --rm fontana-scraper node dist/scheduler/scrape-all-farms.js
```

### Database connection fails?

```bash
# Check Supabase credentials
docker-compose config | grep SUPABASE

# Test connection
docker-compose run --rm fontana-scraper node -e "
const { supabase } = require('./dist/database/supabase-client.js');
(async () => {
  const ok = await supabase.healthCheck();
  console.log('Supabase healthy:', ok);
})();
"
```

### Container runs and exits immediately?

```bash
# Check exit code
docker-compose logs fontana-scraper

# If "error: Cannot find module", rebuild:
docker-compose build --no-cache
```

---

## Integration with Hermes

Both Hermes and Fontana run on the same VPS, independent networks:

```bash
# Check Hermes
docker ps | grep hermes

# Check Fontana
docker ps | grep fontana

# Both can access external Supabase
```

If you need them to communicate:
1. Create a shared Docker network
2. Use container names as hostnames (e.g., `http://fontana-scraper:3000`)

---

## Production Checklist

- [ ] `.env` file created with real credentials
- [ ] `.env` file has correct permissions (`chmod 600`)
- [ ] Supabase tables created (recipient_preferences, daily_scrape_aggregated)
- [ ] Containers running: `docker-compose ps`
- [ ] Logs checked: `docker-compose logs`
- [ ] Health check passing: `docker-compose ps` shows "healthy"
- [ ] Next hourly scrape confirmed in logs
- [ ] Email delivery tested at 12 noon
- [ ] Data appeared in Supabase dashboard
- [ ] Logs rotating properly (`max-size`, `max-file` set)

---

## Emergency Restart

If something goes wrong:

```bash
# Complete restart
docker-compose down -v
docker-compose up -d

# Or keep data
docker-compose down
docker-compose up -d
```

---

## Next Steps

1. **Push code to Git** (for version control)
2. **Setup monitoring/alerting** (check logs daily or via email)
3. **Document server access** (IP, keys, credentials store)
4. **Test failover** (what happens if scraper crashes?)

---

## Reference: Daily Schedule (All in UTC+3 = EAT)

| Time | Container | Action |
|------|-----------|--------|
| 6:00 AM | fontana-scraper | Scrape (Hour 1) |
| 7:00 AM | fontana-scraper | Scrape (Hour 2) |
| ... | ... | ... |
| 12:00 PM | fontana-email | **Send email** |
| ... | fontana-scraper | Scrape (Hours 7-12) |
| 6:00 PM | fontana-scraper | Last scrape (Hour 12) |
| 12:00 AM | fontana-aggregate | Aggregate yesterday's data |
| 1:00 AM | fontana-cleanup | Delete data > 365 days old |
