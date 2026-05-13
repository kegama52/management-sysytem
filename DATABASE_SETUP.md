# Database Setup Options for TIISGS

## Quick Diagnosis

Your system currently has **no PostgreSQL installation detected**. Choose an option below:

---

## Option 1: Docker (Fastest if you have Docker Desktop)

**5-minute setup**

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Install and restart
3. Open PowerShell in this folder and run:
   ```powershell
   docker-compose up -d
   ```
4. Done! Database and app start automatically.

---

## Option 2: Install PostgreSQL Locally

### Step 1: Download & Install PostgreSQL

**Download:** https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

**Recommended version:** PostgreSQL 15 or 16 (Windows x86-64)

**Installation settings:**
- ✅ Check "Add PostgreSQL to PATH"
- ✅ Check "Stack Builder" (optional)
- Set password for `postgres` user: `password` (or note your own)
- Port: `5432` (default)
- Locale: `Default locale`

### Step 2: Verify Installation

Open **new** Command Prompt or PowerShell and run:
```powershell
psql --version
```
Expected output: `psql (PostgreSQL) 15.x` or similar.

If not found, restart your computer or re-login.

### Step 3: Initialize Database

**Method A: Double-click the batch file**
```powershell
setup-db.bat
```
(Enter password `password` if prompted)

**Method B: Manual PowerShell (run as Administrator recommended)**
```powershell
# Create database
psql -U postgres -c "DROP DATABASE IF EXISTS tiisgs_db;"
psql -U postgres -c "CREATE DATABASE tiisgs_db;"

# Load schema
psql -U postgres -d tiisgs_db -f "database\schema.sql"
```

**Method C: Using pgAdmin (GUI)**
1. Open pgAdmin from Start menu
2. Connect to server (password from install)
3. Right-click "Databases" → Create → Database
   - Database: `tiisgs_db`
   - Owner: `postgres`
4. Open Query Tool, paste contents of `database/schema.sql`, press F5

### Step 4: Test Connection

```powershell
psql -U postgres -d tiisgs_db -c "SELECT COUNT(*) FROM users;"
```
Should return `0` (or a number if seed data added).

---

## Option 3: Cloud PostgreSQL (No local install)

Use a free cloud database:

1. Sign up at https://www.elephantsql.com/ (Free Tiny Turtle plan)
2. Create new instance
3. Copy the connection URL: `postgres://user:pass@host:port/dbname`
4. Edit `backend\.env` and set:
   ```
   DATABASE_URL=postgres://user:pass@host:port/dbname
   ```
5. Run schema in their web-based SQL Tool (pgAdmin-like)
6. Start backend and frontend

---

## After Database is Running

1. **Start backend** (if not already):
   ```powershell
   cd backend
   npm run dev
   ```

2. **Start frontend** (if not already):
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Open browser:** http://localhost:3000

4. **Login** with test accounts (after running seed script):
   - **Your email:** `kevohkevi110@gmail.ccom`
   - **Password:** `Password123`
   - Role: Officer (Budget Unit)

---

## Troubleshooting PostgreSQL

### "psql is not recognized"
- Reinstall PostgreSQL and check "Add to PATH"
- Or manually add: `C:\Program Files\PostgreSQL\15\bin` to System PATH
- Restart terminal

### "Connection refused"
```powershell
# Start PostgreSQL service
net start postgresql-x64-15
# Or use Services (services.msc) and start "postgresql-x64-15"
```

### "Password authentication failed"
- Default password is what you set during installation
- If forgot, reset via pgAdmin or reinstall

### Port 5432 in use
Another PostgreSQL instance running. Stop it:
```powershell
# Find PID
netstat -ano | findstr :5432
# Kill process
taskkill /PID <PID> /F
```

### Database already exists error
That's fine - the script drops and recreates. To preserve data, comment out DROP line.

---

## Seeding Test Users

Once database is up, run:

```powershell
cd backend
node seed-users.js
```

This creates:
- `kevohkevi110@gmail.ccom` / `Password123` (Officer)
- `ict.officer@treasury.go.ke` / `Password123` (ICT Officer)
- `ict.supervisor@treasury.go.ke` / `Password123` (ICT Supervisor)
- `admin@treasury.go.ke` / `AdminPass123!` (Admin)
- `auditor@treasury.go.ke` / `AuditPass123!` (Auditor)

---

## What Each Option Gives You

| Option | Pros | Cons |
|--------|------|------|
| **Docker** | One command, isolated, easy cleanup | Requires Docker Desktop (~500MB) |
| **Local PostgreSQL** | Full control, production-like | Manual install, ~300MB |
| **Cloud Free** | No local install, always up | Internet required, limited resources |

---

## Still Stuck?

1. Screenshot the error
2. Check `SETUP_GUIDE.md` for detailed walkthrough
3. Verify PostgreSQL is running: `pg_ctl status`
4. Try connecting manually: `psql -U postgres -d tiisgs_db`

---

**Need PostgreSQL quickly?** Use Option 1 (Docker) if you can install Docker. Otherwise follow Option 2 step-by-step.