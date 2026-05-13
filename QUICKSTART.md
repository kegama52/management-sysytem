# TIISGS Quick Start Guide

## For Developers - Local Setup (5 minutes)

### 1. Database Setup

```bash
# Install PostgreSQL from https://www.postgresql.org/download/ or use Docker

# Create database
createdb tiisgs_db

# Run schema (creates tables and seed data)
psql -U postgres -d tiisgs_db -f database/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
# → API runs on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → Opens at http://localhost:3000
```

### 4. Login

- Email: `test@treasury.go.ke`
- Password: `Password123`
- OR click "Sign in with Digital Certificate" for instant demo login

---

## Using Docker (Fastest Way)

```bash
# Start everything with one command
docker-compose up -d

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Database: localhost:5432
```

---

## Demo Walkthrough

### As a Regular Officer

1. Login with any credentials
2. Click "New Ticket" to create an issue
3. Try IFMIS or G-Pay as category
4. After creation, view ticket details
5. Add comments, check status

### Using AI Self-Care (Before Creating Ticket)

1. Click "Knowledge Base" in sidebar
2. Search for "IFMIS" or "printer"
3. Click an article to read troubleshooting steps
4. Mark as helpful if it solved your issue

### As an ICT Officer

1. Login with `ict@treasury.go.ke` or any email
2. View "ICT Queue" in sidebar (only ICT staff see this)
3. See pending tickets with urgency countdown
4. Click "Assign to Me" to take ownership
5. Work through resolution

---

## Database Connection String Examples

### Local
```
postgresql://postgres:password@localhost:5432/tiisgs_db
```

### With SSL (Production)
```
postgresql://user:pass@host:5432/tiisgs_db?sslmode=require
```

---

## Useful Queries

### See all open tickets
```sql
SELECT t.ticket_number, t.title, u.first_name, u.last_name
FROM tickets t
JOIN users u ON t.reporter_id = u.id
WHERE t.status = 'open'
ORDER BY t.created_at DESC;
```

### Get ICT officer load
```sql
SELECT u.first_name, u.last_name, COUNT(t.id) as assigned_count
FROM users u
LEFT JOIN tickets t ON u.id = t.assigned_to AND t.status NOT IN ('resolved', 'closed')
WHERE u.role = 'ict_officer'
GROUP BY u.id
ORDER BY assigned_count DESC;
```

### Asset inventory by unit
```sql
SELECT u.name as unit, COUNT(a.id) as asset_count
FROM units u
LEFT JOIN assets a ON u.id = a.unit_id
GROUP BY u.id;
```

---

## Common Issues

### Port already in use
```bash
# Change PORT in backend/.env
# Or kill the process: 
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -ti:5000 | xargs kill
```

### Database connection refused
```bash
# Ensure PostgreSQL is running
# Windows: pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
# Or use Docker: docker-compose up postgres
```

### Frontend can't reach backend
```bash
# Check vite.config.js proxy matches backend URL
# Or set VITE_API_URL in frontend .env
```

---

## Next Steps for Production

1. Replace `JWT_SECRET` in `.env` with 256-bit random string
2. Remove demo mode authentication restrictions
3. Configure real PKI integration endpoint
4. Set up SMTP for email notifications
5. Enable SSL/TLS on both backend and frontend
6. Configure automated backups for PostgreSQL
7. Set up monitoring (Health check: GET /)
8. Add rate limiting to API endpoints
9. Configure log aggregation (Winston/Pino)
10. Deploy to government cloud/AWS/Azure

---

## Project Structure Recap

```
ict project/
├── backend/
│   ├── routes/          # API endpoints
│   ├── server.js        # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Tickets, KB, etc.
│   │   ├── components/  # Layout, navigation
│   │   └── context/     # Auth state
│   ├── public/
│   └── package.json
├── database/
│   └── schema.sql       # Tables + seed data
├── docs/                # Additional documentation
├── docker-compose.yml   # Full stack deployment
└── README.md           # Full documentation
```

---

**Need Help?** Check the main README.md for API documentation and schema details.