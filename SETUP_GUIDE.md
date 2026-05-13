# TIISGS Setup Guide - Complete Installation

## Option 1: Docker (Easiest - Recommended)

**Requirements:** Docker Desktop installed

```bash
# Start all services with one command
docker-compose up -d

# Services start:
# - PostgreSQL on localhost:5432
# - Backend API on http://localhost:5000
# - Frontend on http://localhost:3000

# Stop:
docker-compose down
```

**Note:** First startup will take 2-3 minutes to pull images and initialize database.

---

## Option 2: Local PostgreSQL

### Step 1: Install PostgreSQL

Download and install from: https://www.postgresql.org/download/windows/

During installation:
- Remember the password you set for the `postgres` user
- Keep default port 5432
- Complete installation

### Step 2: Add PostgreSQL to PATH (Optional but helpful)

1. Search "Environment Variables" in Windows Start
2. Edit "Path" under System variables
3. Add: `C:\Program Files\PostgreSQL\15\bin` (adjust version number)
4. Click OK

Open a **new** terminal window and verify:
```bash
psql --version
# Should output: psql (PostgreSQL) 15.x
```

### Step 3: Run Setup Script

Double-click: `setup-db.bat`

Or manually:
```bash
# Create database
psql -U postgres -c "DROP DATABASE IF EXISTS tiisgs_db;"
psql -U postgres -c "CREATE DATABASE tiisgs_db;"

# Load schema
psql -U postgres -d tiisgs_db -f database/schema.sql
```

If password is required, replace `-U postgres` with `-U postgres -W` and enter password when prompted.

### Step 4: Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` if your database password differs from default (`password`):
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/tiisgs_db
JWT_SECRET=your-random-secret-key-here
```

### Step 5: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

Expected output:
```
TIISGS API listening on port 5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
VITE v5.0.8  ready in 450 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

---

## Option 3: Using pgAdmin (GUI Alternative)

1. Install pgAdmin 4 (bundled with PostgreSQL or separate)
2. Connect to server with password from installation
3. Open Query Tool
4. Load `database/schema.sql` and execute (F5)
5. Database `tiisgs_db` will be created

---

## Troubleshooting

### "psql is not recognized"
PostgreSQL bin directory not in PATH. Either:
- Reinstall PostgreSQL and check "Add to PATH" option
- Use full path: `"C:\Program Files\PostgreSQL\15\bin\psql" -U postgres ...`
- Use Option 1 (Docker) instead

### Port 5432 already in use
Another PostgreSQL instance running. Stop it via Services:
- `Win + R` → `services.msc`
- Find "postgresql-x64-15"
- Right-click → Stop

Or change port in `postgresql.conf` (advanced).

### Port 3000 or 5000 already in use
Kill the process:
```bash
# Find process
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Kill (replace PID)
taskkill /PID <PID> /F
```

### Backend can't connect to database
Check:
- PostgreSQL is running (`pg_ctl status`)
- Database exists: `psql -U postgres -l`
- Connection string in `.env` matches your setup
- Try: `psql -U postgres -d tiisgs_db` to verify connectivity

### Frontend shows "Network Error"
Backend may not be running or CORS misconfigured. Check:
- Backend console for errors
- Browser DevTools → Network tab for failed requests
- Backend is on port 5000, frontend proxies `/api` to it

### "2 high severity vulnerabilities" warning
These are in `tar` package (transitive dependency of `bcrypt`). For production:
- Consider using `bcryptjs` instead
- Or upgrade to Node.js 20+ and bcrypt 5.1.1+
- For demo/internal use, this is acceptable

---

## Verification Steps

After startup, verify:

1. **Backend Health**
   ```bash
   curl http://localhost:5000/
   # Expected: {"message":"TIISGS API Running","version":"1.0.0"}
   ```

2. **Frontend Loads**
   - Open http://localhost:3000
   - Login page should appear

3. **Test Login**
   - Email: `test@treasury.go.ke`
   - Password: `Password123`
   - OR click "Sign in with Digital Certificate"

4. **Create Ticket**
   - Click "New Ticket"
   - Fill form, submit
   - Should see ticket in list

5. **View ICT Queue** (if logged in as ICT officer)
   - Sidebar → ICT Queue
   - Should show pending tickets

---

## Uninstallation

```bash
# Stop services
docker-compose down  # if using Docker

# Delete database
psql -U postgres -c "DROP DATABASE IF EXISTS tiisgs_db;"

# Remove node_modules
rd /s /q backend\node_modules
rd /s /q frontend\node_modules

# Delete database files (if not using Docker)
# PostgreSQL data directory: C:\Program Files\PostgreSQL\15\data\
```

---

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 5000 | http://localhost:5000 |
| Database | 5432 | postgresql://localhost:5432/tiisgs_db |

**Default DB Credentials:**
- User: `postgres`
- Password: `password` (or what you set during PostgreSQL install)
- Database: `tiisgs_db`

---

## Next After Setup

1. **Add real users** via `/api/users` endpoints or directly in DB
2. **Configure PKI** by setting `PKI_CA_URL` in `.env`
3. **Set up email** notifications (SMTP settings)
4. **Deploy** to production server with SSL certificates
5. **Import** existing asset inventory if available

---

**Still stuck?** Check:
- Console output for error messages
- `README.md` for API documentation
- `SYSTEM_SUMMARY.md` for architecture overview