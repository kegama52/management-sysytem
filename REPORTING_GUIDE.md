# TIISGS Reporting & Analytics Guide

**Government Service Charter Compliant Reporting for Kenya National Treasury**

---

## 📊 Standard Reports

### 1. Directorate TTR Report

**Endpoint:** `GET /api/reports/ttr-report?start=YYYY-MM-DD&end=YYYY-MM-DD`

**Metrics per Directorate:**
| Column | Definition | Target |
|--------|------------|--------|
| `directorate` | Official 6 directorates | – |
| `totalTickets` | All tickets raised in period | – |
| `resolved` | Tickets resolved within period | – |
| `avgTTR` | Average Time to Resolution (minutes) | ≤ 480 (8h) for P3 |
| `minTTR` | Fastest resolution | – |
| `maxTTR` | Longest resolution | ≤ SLA for priority |

**Government Alignment:** Compare avg TTR against published service standards:
- User Support (P3-P4): ≤ 8 hours (target 30 min initial response)
- IFMIS Critical (P1): ≤ 1 hour
- Hardware Repair (P2-P3): ≤ 10 working days

### 2. ICT Officer Performance

**Endpoint:** `GET /api/reports/officer-performance?start=&end=`

**Columns:**
- Officer name & ID
- Role (`ict_officer`, `ict_supervisor`)
- Unit & Directorate
- `totalAssigned` – Tickets assigned
- `ticketsResolved` – Completed tickets
- `avgResolutionTime` – Average minutes to close
- `totalHours` – Time spent (from ticket `time_spent_minutes`)

**Use case:** 
- Identify officers consistently breaching SLAs (inform training)
- Recognize top performers for PS awards (aligned to performance management pillar of Vision 2030)

### 3. Service Charter Compliance Dashboard

**Custom SQL Query (for Power BI export):**

```sql
SELECT 
  tc.name AS service_category,
  COUNT(t.id) AS total_tickets,
  COUNT(CASE WHEN t.sla_breached = FALSE THEN 1 END) AS within_sla,
  COUNT(CASE WHEN t.sla_breached = TRUE THEN 1 END) AS sla_breaches,
  ROUND(
    COUNT(CASE WHEN t.sla_breached = FALSE THEN 1 END)::NUMERIC / 
    COUNT(t.id) * 100, 2
  ) AS compliance_percent
FROM tickets t
JOIN ticket_categories tc ON t.category_id = tc.id
WHERE t.created_at BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY tc.name
ORDER BY compliance_percent DESC;
```

**Charter Standards Reference:**
- User Support (ACC-AUTH): 30 min → if avg resolution > 60 min → **RED**
- Hardware Repair (HW-SYS, HW-PRINT): 10 working days = 2400 min → if > 10 days → **RED**
- Network (NET-CONN): Site-dependent → flag if > 4 hours for Tier A sites

### 4. Asset Maintenance Compliance

**Asset repair SLA report – identify chronic equipment:**

```sql
SELECT 
  a.asset_tag,
  at.name AS asset_type,
  u.unit_name,
  COUNT(aml.id) AS repair_events,
  AVG(EXTRACT(EPOCH FROM (aml.completion_at - aml.request_received_at))/3600) AS avg_hours,
  COUNT(CASE WHEN aml.sla_breached = TRUE THEN 1 END) AS breaches
FROM asset_maintenance_log aml
JOIN assets a ON aml.asset_id = a.id
JOIN asset_types at ON a.asset_type_id = at.id
JOIN units u ON a.unit_id = u.id
WHERE aml.request_received_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY a.asset_tag, at.name, u.unit_name
HAVING COUNT(CASE WHEN aml.sla_breached = TRUE THEN 1 END) > 2
ORDER BY breaches DESC;
```

**Action:** Flag assets with >3 breaches for replacement review (per 36-month lifecycle policy).

---

## 📈 Strategic Indicators for Senior Management

### Digital Economy Alignment Metrics

| KPI | Formula | Target 2025 | Source |
|-----|---------|-------------|--------|
| % tickets resolved via AI self-care | (AI-resolved / total) × 100 | ≥ 40 | `ai_interactions` |
| SLA compliance rate | (within-SLA / total) × 100 | ≥ 85 | ticket `sla_breached` |
| Digital hub uptime | (hours TIISGS available / total) × 100 | ≥ 99.5 | monitoring |
| eCitizen correlation readiness | # linked tickets / total tickets | – | `external_ref` field (future) |

### BETA Digital Economy Pillar Tracking

Report quarterly to PS office:
- Number of Treasury staff served through digital hubs vs physical offices
- Average time saved by AI self-care (estimated 15 min/ticket × 40% tickets)
- Fiscal impact: reduced ICT officer overtime due to efficient queue management

---

## 📤 Export Formats

All reports support:
- **CSV** for Excel/Power BI
- **PDF** (via Puppeteer) for PS briefing packages
- **JSON API** for integration with Treasury executive dashboard

**Example export:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/reports/ttr-report?format=csv&start=2025-01-01" \
  -o ttr_report_2025.csv
```

---

## 🔔 Alert Subscriptions

### Level 1: Supervisor Alerts (daily email)

- Tickets overdue > 4 hours (priority P1-P3)
- Assets in workshop > 10 working days
- Daily summary of SLA breaches per directorate

### Level 2: Directorium Escalations (immediate SMS/email)

- Critical system outage (IFMIS down) → Director ASQA
- Hardware escalation beyond 6 weeks → Director of Administration
- Multiple concurrent breaches (>5 directorates) → Principal Secretary

Configuration: `backend/routes/notifications.js` (to be implemented)

---

## 📋 Compliance Checklist

### Monthly
- [ ] Run `escalate_overdue_tickets()` and `escalate_maintenance_overdue()` functions
- [ ] Reconcile `notifications` table – ensure all alerts delivered
- [ ] Audit log review: check for unauthorized access attempts

### Quarterly
- [ ] Service Charter compliance report presented to PS office
- [ ] Asset inventory reconciliation with physical count
- [ ] Review `ai_interactions` to identify KB gaps (add new articles)

### Annually
- [ ] Update `system_config` with new government SLA targets (if revised)
- [ ] Archive resolved tickets > 2 years old to cold storage
- [ ] Validate PKI certificate integration against CA license renewal

---

## 📊 Dashboard Widgets (Frontend)

On **Dashboard**, display these tiles:

1. **SLA Compliance Rate** (e.g., 94.2% → green if >85%, yellow 70-85%, red <70%)
2. **Avg Resolution Time** vs Target (e.g., 3h 12m vs 4h target)
3. **Current Breaches** (count of tickets currently past SLA)
4. **Asset Health** – % of assets in maintenance backlog (>10 days)
5. **Knowledge Base Coverage** – % of ticket categories with ≥3 KB articles

Colors:
- **Green** = Within standard
- **Yellow** = Approaching deadline (80% of SLA used)
- **Red** = Exceeded SLA

---

## 🗂️ Data Retention & Archival

| Data Type | Retention Period | Archive Method |
|-----------|-----------------|----------------|
| Resolved tickets | 2 years active, then archive | `tickets_archive` table (partitioned) |
| AI interactions | 3 years (analytics) | Aggregate monthly counts |
| Maintenance logs | 5 years (audit requirement) | Export to Parquet quarterly |
| PKI certificates | 7 years (legal) | Secure cold storage |
| Notifications | 1 year | Delete after read + 30 days |

Scripts located in `backend/scripts/archival.js` (to be created).

---

## 📧 Report Distribution List

| Report | Audience | Frequency | Method |
|--------|----------|-----------|--------|
| Daily SLA Breach Summary | ICT Supervisor, On-duty Officer | Daily @ 8 AM | Email + in-app notification |
| Weekly Charter Compliance | Director, Administrative & Support Services | Weekly @ Monday 9 AM | PDF attachment |
| Monthly TTR Analytics | Principal Secretary, All Directorates | Monthly @ 5th of month | Power BI embedded link |
| Quarterly Digital Hub Status | Ministry of ICT, USF | Quarterly @ end of quarter | Secure upload to shared drive |
| Annual Asset Audit | Auditor General | Annually @ March | Hard copy + encrypted digital |

---

## 🛠️ Custom Query Library

Store these in `backend/queries/` as re-usable modules:

```sql
-- Tickets by directorate with SLA status
-- Most common KB articles referenced
-- Officer response time distribution
-- Ticket volume trend (30-day rolling)
-- Asset lifecycle forecast (replacement due in next 6 months)
-- Digital hub connectivity health
```

---

## 🔗 External Data Sources

Future integration points for reporting:
- **eCitizen transaction failures** (via eCitizen API)
- **IFMIS system health indicators** (via Free Balance monitoring)
- **NG-CDF project funding allocation** (to correlate ICT investment vs tickets)
- **Jitume Hub utilization logs** (to measure citizen engagement)

---

*Reference: Kakamega County ICT Service Charter, IFMIS Helpdesk Process (tax.gov.ki), PS ICT speeches (kenyanews.go.ke), National Treasury Organogram.*
