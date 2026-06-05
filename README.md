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

The system reflects the official **6 Directorates** under the National Treasury (per treasury.go.ke organogram):

```
Office of the Principal Secretary
├── Directorate of Public Debt Management (PDM)
│   └── Debt Management Department (DEB)
├── Directorate of Portfolio Management (PORT)
│   └── Portfolio Management (PMG)
├── Directorate of Accounting Services & Quality Assurance (ASQA)
│   ├── IFMIS Operations Department
│   ├── Accounting Services (ACC)
│   └── Quality Assurance Unit (QA)
├── Directorate of Budget, Fiscal & Economic Affairs (BUD)
│   ├── Budget & Fiscal Affairs (BFA)
│   └── Fiscal Policy Unit (FISC)
├── Directorate of Administrative & Support Services (ADMIN)
│   ├── ICT Department (ICTD) ← ICT Support Unit (ICTSU) reports here
│   ├── Human Resources (HRD)
│   └── Procurement (PROC)
└── Directorate of Public Private Partnerships (PPP)
    └── PPP Department (PPPD)
```

> **Note:** All directorates fall under the **Office of the Treasury**, led by the Principal Secretary. The ICT Department is a support function under the Directorate of Administrative & Support Services, not an independent directorate.

## Policy Alignment

TIISGS is designed to support Kenya's national digital transformation agenda:

- **AU Agenda 2063** – Continental digital marketplace integration and cross-border e-government services
- **Vision 2030** – Pillar 2: Economic & Social Transformation through e-government digitization
- **National ICT Master Plan** – Guides Treasury ICT modernization in line with national standards
- **Bottom-Up Economic Transformation Agenda (BETA)** – Digital economy pillar, aligning with 17,668 eCitizen services
- **Data Protection Act 2019** – All user data handled with strict confidentiality

## Government Service Standards (Kakamega County ICT Charter)

TIISGS enforces published government SLAs:

| Service | Target Time | Article Reference |
|---------|-------------|-------------------|
| User Support Request | 30 minutes | KB: Client Rights |
| Email Account Creation | 30 minutes | KB: Email Provision |
| Network Issue Diagnosis | Site-dependent (Tier A–D) | KB: Network Diagnosis |
| Hardware Repair | 10 working days | KB: Equipment Repair |
| Equipment Escalation (vendor) | 6 weeks | KB: Escalation SLA |
| IFMIS Helpdesk (72-hr) | 72 hours (3 days) | KB: IFMIS Helpdesk |

> These standards are embedded in ticket categories, AI knowledge base articles, and the notification engine.

## External Dependencies & National Infrastructure

Deployment considerations for distributed Treasury operations:
- **Konza National Data Centre** – Recommended hosting for disaster recovery and data sovereignty
- **Universal Service Fund (USF)** – Ensures connectivity for underserved areas
- **100,000 km fiber backbone** – 20,000+ km already laid; Treasury offices prioritized
- **1,491 public Wi-Fi hotspots** – Already installed nationwide; field officers can access TIISGS remotely
- **1,450 digital hubs** – Planned across constituencies (274 operational as of 2024); Jitume Digital Hub integration ready
- **eCitizen Platform** – 17,668 government services onboarded; future ticket correlation possible

## AI Self-Care (Knowledge Base)

Pre-loaded with **4-Level IFMIS Support Structure** (per IFMIS Helpdesk Process):
- **Level 1:** Self-Help (clear cache, password reset, user manual)
- **Level 2:** Senior Accountant Support (reconciliation, approvals)
- **Level 3:** Helpdesk Ticket (72-hour SLA, email escalation)
- **Level 4:** Vendor Support (Free Balance – 6-hour response for core system bugs)

Covers real-world scenarios: IFMIS login, voucher reconciliation, certificate renewal, G-Pay issues, hardware repair walkthroughs, network diagnosis, digital hub connectivity, plus policy/legal context (Constitution, Vision 2030, Charter rights & obligations).

## Security & Compliance (Government Context)

- **PKI Integration:** Ready for Communications Authority of Kenya licensed Electronic Certification Service Providers (E-CSPs) for Critical Information Infrastructure
- **Data Localization:** All government data must reside within Kenya; Konza Data Centre recommended
- **Audit Readiness:** Immutable ticket and interaction logs for Auditor General compliance
- **Confidentiality Pledge:** All ICT staff must adhere to government confidentiality standards per the ICT Service Charter

## Installation & Setup

| Role | Description | Access |
|------|-------------|--------|
| `admin` | System administrator | Full access |
| `ict_supervisor` | ICT team lead | Queue management, reports, assignments |
| `ict_officer` | ICT technician | Assigned tickets, asset mgmt |
| `officer` | Regular Treasury staff | Create/view own tickets, KB |
| `auditor` | Compliance/audit | Read-only reports |

## Testing & CI/CD

- Automated E2E testing with Cypress for the frontend application.
- CI pipeline uses GitHub Actions to lint, build, and run Cypress tests on every push and pull request.
- A `Jenkinsfile` is included for Jenkins-based automation and deployment validation.
- Defects are tracked through GitHub Issues and test results are surfaced via CI status checks.

## Key Features

### 1. PKI Authentication

Users can authenticate with:
- Standard email/password (for demo)
- Government CA digital certificate (production mode)

Supports two-factor via certificate + password.

```javascript
POST /api/auth/login-pki
{
  "certificate_serial": "ABC123...",
  "certificate_dn": "CN=John Doe, OU=ICT, O=National Treasury..."
}
```

### 2. AI Self-Care (Knowledge Base)

**4-Level IFMIS Support Structure** – built from official IFMIS Helpdesk process:
- **Level 1** – Self-Help resolution (clear cache, password reset, user manual)
- **Level 2** – Senior Accountant Support (reconciliation, approvals)
- **Level 3** – Helpdesk ticket protocol (72-hour SLA, required screenshot + error log)
- **Level 4** – Vendor escalation (Free Balance, 6-hour response target)

Plus government-aligned KB: network diagnosis, hardware repair (10-day SLA), escalation procedures, constitutional rights, policy alignment (Vision 2030, AU Agenda 2063, BETA).

**AI Assistant** on Dashboard consults the KB before creating tickets.

### 3. Ticketed Queue & Automatic Dispatch

- Automatic SLA calculation based on ticket category government standards
- Queue monitoring every 30 seconds
- Auto-assignment to next available ICT officer
- Breach detection with escalation to supervisors

### 4. Asset Management with Service Charter Compliance

Asset types seeded with government hardware repair timelines:
- Desktops/Laptops: 36-month lifecycle, 10-day repair SLA
- Printers/Peripherals: 60-month lifecycle, 10-day repair
- Network equipment: priority response based on tier (critical: 15 min)

Maintenance logs track request → response → completion times against `sla_deadline`. Escalation triggers:
- Workshop repair > 10 working days → Supervisor notification
- Vendor escalation > 6 weeks → Director of Administration alert

### 5. Geographic Deployment & Offline Support

**Locations table** tracks Treasury offices, regional centers, and Jitume Digital Hubs:
- Connectivity type (Fiber/Hotspot/VSAT)
- USF-funded sites prioritized
- Offline sync via IndexedDB for field officers in areas with poor connectivity
- Sync timestamp tracking per location

### 6. Reporting & Analytics

Built-in reports:
- **TTR by Directorate** – Against SLA targets
- **ICT Officer Performance** – Tickets resolved, hours logged
- **System Stats** – Open/closed ratios, priority breakdown
- **Service Charter Compliance** – Green/Yellow/Red status vs published government standards

### 7. Notifications & Escalation Engine

Automatic notifications for:
- SLA breaches (ticket overdue, maintenance delay)
- Supervisor alerts when repair exceeds 10 days
- Director escalation at 6-week mark
- All stored in `notifications` table with read/unread state

### 8. Client Rights & Obligations

Every ticket creation page displays:
- **Your Rights:** Timely service (per Constitution Art 47), confidentiality, redress
- **Your Obligations:** Use equipment carefully, provide accurate info, treat staff courteously

Required acknowledgment checkbox before submission (Government Service Charter principle).

### 9. Strategic Alignment

Roadmap mapped to national initiatives:
- **Phase 1:** Konza National Data Centre deployment
- **Phase 2:** BETA digital economy alignment
- **Phase 3:** Connect to 1,491 Wi-Fi hotspots for field access
- **Phase 4:** Leverage Konza Technopolis infrastructure
- **Phase 5:** AI adoption per PS Tanui guidance

## Installation & Setup

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