# TIISGS - Treasury ICT Support & Governance System

A comprehensive ICT Service Management (ITSM) platform tailored for the Kenya National Treasury, integrating departmental hierarchy and PKI standards.

## System Overview

TIISGS is designed to streamline ICT support operations across all directorates of the National Treasury. The system provides:

- **AI Self-Care Module** - Immediate troubleshooting for common issues
- **Ticketed Queue System** - Automated dispatch to ICT officers
- **Asset Inventory Management** - Complete hardware tracking
- **PKI Authentication** - Secure government certificate-based login
- **Performance Analytics** - TTR metrics and officer productivity

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 13+ |
| Auth | JWT + PKI Certificate Integration |
| Realtime | (Optional) Socket.io for live updates |

### System Components

```
backend/
├── server.js              # Express application entry point
├── package.json           # Backend dependencies
└── routes/
    ├── auth.js            # Authentication & PKI routes
    ├── tickets.js         # Ticket lifecycle management
    ├── users.js           # User & hierarchy management
    ├── assets.js          # Asset inventory CRUD
    ├── aikb.js            # AI Knowledge Base
    └── reports.js         # Analytics & TTR reports

frontend/
├── src/
│   ├── pages/            # React page components
│   ├── components/        # Reusable UI components
│   ├── context/           # Auth context provider
│   ├── App.jsx            # Main router & layout
│   └── main.jsx           # React entry point
├── package.json
└── vite.config.js

database/
└── schema.sql            # Complete DB schema with seed data
```

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Git

### 1. Clone & Install

```bash
git clone <repo-url>
cd "ict project"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create database
createdb tiisgs_db

# Run schema (includes directorates, seed KB articles, etc.)
psql -U postgres -d tiisgs_db -f database/schema.sql
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/tiisgs_db
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 4. Start Development

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend
npm run dev
```

Open http://localhost:3000

## Treasury Organizational Structure

The system comes pre-configured with Kenya National Treasury hierarchy:

```
National Treasury
├── Administrative Services (ABS)
│   ├── ICT Department (ICTD)
│   │   ├── ICT Support Unit (ICTSU)
│   │   └── ICT Systems Dev (ICTSD)
│   ├── Human Resources (HRD)
│   └── Procurement (PROC)
├── Budget, Fiscal & Economic Affairs (BUD)
│   ├── Budget Unit (BUDU)
│   └── Fiscal Policy Unit (FISCU)
├── Public Debt Management (PDM)
│   └── Debt Recording Unit (DEBU)
├── Government Financial Services (GFS)
├── Public-Private Partnerships (PPP)
└── Internal Audit (AUD)
```

## User Roles

| Role | Description | Access |
|------|-------------|--------|
| `admin` | System administrator | Full access |
| `ict_supervisor` | ICT team lead | Queue management, reports, assignments |
| `ict_officer` | ICT technician | Assigned tickets, asset mgmt |
| `officer` | Regular Treasury staff | Create/view own tickets, KB |
| `auditor` | Compliance/audit | Read-only reports |

## Key Features

### 1. PKI Authentication

Users can authenticate with:
- Standard email/password (for demo)
- Government CA digital certificate (production mode)

```javascript
// PKI login flow
POST /api/auth/login-pki
{
  "certificate_serial": "ABC123...",
  "certificate_dn": "CN=John Doe, OU=ICT, O=National Treasury..."
}
```

### 2. AI Self-Care (Knowledge Base)

Pre-populated with 10+ troubleshooting articles for:
- IFMIS connectivity
- G-Pay performance
- Digital certificate errors
- Printer/network issues
- Biometric reader problems

Knowledge Base is searchable and includes priority-based article ranking.

### 3. Ticketed Queue & Dispatch

**Automated workflow:**
1. Officer creates ticket (with auto-categorization)
2. Ticket enters queue based on priority
3. System monitors queue every 30s
4. Next available ICT Officer gets auto-assigned
5. SLA countdown begins (configurable per category)

**Ticket Status Lifecycle:**
```
open → assigned → in_progress → resolved → closed
```

### 4. Asset Management

Track hardware across departments:
- Desktops, laptops, tablets
- Printers, scanners, biometric readers
- Network equipment (APs, VoIP phones)
- UPS and power backup

Maintenance logs and warranty tracking included.

### 5. Reporting & Analytics

Generate TTR reports by directorate:
- Average resolution time
- Open vs resolved tickets
- Officer productivity metrics
- SLA compliance tracking

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Standard login |
| POST | `/api/auth/login-pki` | PKI certificate login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Invalidate session |

### Ticket Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets (filterable) |
| GET | `/api/tickets/:id` | Ticket details |
| POST | `/api/tickets` | Create new ticket |
| POST | `/api/tickets/:id/assign` | Assign to officer |
| POST | `/api/tickets/:id/resolve` | Resolve ticket |
| POST | `/api/tickets/:id/comment` | Add comment |
| GET | `/api/tickets/queue/pending` | Queue for ICT officers |

### Asset Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| GET | `/api/assets/types` | Asset type catalog |
| POST | `/api/assets/:id/maintenance` | Add maintenance record |

### AI Knowledge Base

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/search?q=...` | Search KB |
| GET | `/api/ai/articles` | List all articles |
| GET | `/api/ai/article/:id` | Article detail |
| POST | `/api/ai/feedback/:id` | Rate helpfulness |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/ttr-report` | TTR by directorate |
| GET | `/api/reports/officer-performance` | ICT officer metrics |
| GET | `/api/reports/system-stats` | Overall system stats |

## Security

- All API routes protected by JWT middleware
- Role-based access control (RBAC)
- PKI certificate validation against Government CA
- Helmet.js security headers
- SQL injection prevention via parameterized queries
- Password hashing with bcrypt

## Extending the System

### Adding Knowledge Base Articles

```sql
INSERT INTO knowledge_base (title, content, category_id, tags, issue_type, priority_level)
VALUES (
  'New article title',
  'Step-by-step resolution content...',
  (SELECT id FROM kb_categories WHERE code = 'IFMIS'),
  ARRAY['keyword1', 'keyword2'],
  'hardware',
  2
);
```

### Adding Asset Types

```sql
INSERT INTO asset_types (code, name, category, manufacturer, model_pattern)
VALUES ('NEWTYPE', 'New Device', 'peripheral', 'Vendor', 'Model%');
```

### Adding Ticket Categories

```sql
INSERT INTO ticket_categories (code, name, description, sla_minutes)
VALUES ('NEW-CAT', 'New Category', 'Description', 180);
```

## Demo Mode

The system includes demo functionality:

- Login: Any email + password (minimum 8 characters) works
- PKI: Click "Sign in with Digital Certificate" for instant auth
- Sample data: Pre-loaded directorates, categories, and KB articles

For production:
- Replace JWT_SECRET with strong random value
- Configure real PKI integration with Government CA
- Set up SMTP for email notifications
- Enable SSL/TLS on database connection

## Monitoring & Maintenance

### Health Check

```bash
curl http://localhost:5000/
# Returns: {"message":"TIISGS API Running","version":"1.0.0"}
```

### Database Maintenance

```sql
-- Clean old resolved tickets (archival)
DELETE FROM tickets 
WHERE status = 'closed' 
  AND closed_at < CURRENT_DATE - INTERVAL '2 years';

-- Clean expired PKI certificates
UPDATE users 
SET pki_certificate_serial = NULL, pki_certificate_dn = NULL 
WHERE id IN (
  SELECT user_id FROM pki_certificates 
  WHERE valid_to < CURRENT_TIMESTAMP
);

-- Update ticket statistics (nightly)
-- Consider creating materialized views for heavy reports
```

## Roadmap

- [ ] Real-time notifications via WebSocket
- [ ] Automated AI ticket categorization
- [ ] Mobile-responsive PWA
- [ ] Integration with IFMIS API for auto-resolution
- [ ] Government HR system user sync
- [ ] SLA breach email alerts
- [ ] Multi-language support (Swahili)

## Support

For issues or questions, contact the ICT Unit, National Treasury.

---

**Version**: 1.0.0  
**License**: Government of Kenya Internal Use