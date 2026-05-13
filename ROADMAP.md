# TIISGS Strategic Roadmap

**Aligned to:** PS ICT Tanui's Vision, AU Agenda 2063, Vision 2030, BETA  
**Target:** National Treasury digital transformation 2024–2026

---

## Phase 1: Immediate – Konza National Data Centre Integration

**Timeline:** Q1 2025  
**Objective:** Host production TIISGS at Konza Technopolis (Phase 1 horizontal infrastructure)

**Deliverables:**
- Deploy backend to Konza cloud cluster (postgreSQL at Konza)
- Migrate demo database to production with full directorate hierarchy
- Enable production PKI integration with Communications Authority licensed E-CSP
- Configure disaster recovery replication (Konza primary, USF backup site)
- Ensure full data localization compliance per Government Circular

**Dependencies:** Konza Data Centre Phase 1 readiness, secure government fiber link

**Success Criteria:** System accessible via treasury.go.ke domain, <99.9% uptime SLA

---

## Phase 2: 6-Month Alignment – BETA Digital Economy Pillar

**Timeline:** Q2 2025  
**Objective:** Integrate TIISGS as support layer for eCitizen transaction monitoring

**Deliverables:**
- API bridge with eCitizen platform (17,668 services) – ticket auto-creation for failed transactions
- IFMIS module health monitoring dashboard
- Automated ticket categorization using NLP (AI) trained on 6-month log history
- Mobile PWA for field officers – offline mode with IndexedDB sync when reconnecting to government Wi-Fi
- Connect to 1,491 public Wi-Fi hotspots for remote access (splash page authentication integration)

**Dependencies:** eCitizen open API access, NG-CDF digital infrastructure funding (3% allocation)

**Success Criteria:** 80% of ICT support requests resolved without human intervention through AI self-care

---

## Phase 3: 12-Month Expansion – Digital Hub Nationwide Rollout

**Timeline:** Q3–Q4 2025  
**Objective:** Deploy TIISGS to all 1,450 planned Jitume Digital Hubs (274 operational)

**Deliverables:**
- Constituency-level TIISGS instances (lightweight) syncing to central Treasury DB
- Location tracking via `locations` table – every officer assigned to hub/constituency
- USF connectivity monitoring integration – automatically flag sites with poor bandwidth
- Hub health dashboard: ticket volume by region, resolution metrics, asset status
- Offline-first architecture tested with sync windows leveraging 25,000 km fiber backbone

**Dependencies:** Ministry of ICT finalizing hub connectivity (USF)

**Success Criteria:** All 274 operational hubs running TIISGS; <4-hour network response time as per charter

---

## Phase 4: 18-Month Consolidation – Konza Technopolis Horizontal Phase 1

**Timeline:** Q1–Q2 2026  
**Objective:** Leverage Konza's advanced infrastructure for AI & analytics

**Deliverables:**
- Host AI Knowledge Base and AI Assistant on Konza GPU cluster for faster inference
- Real-time TTR analytics with predictive breach alerts (using 6+ months historical data)
- Full integration with IFMIS vendor (Free Balance) API for automated ticketing of known bugs
- Multi-language rollout (Kiswahili UI) to support decentralized officers
- Integration with Government HR system for automatic user provisioning (when new hire, auto-create TIISGS account)

**Dependencies:** Konza horizontal Phase 1 operational; IFMIS vendor API documentation released

**Success Criteria:** 95% of ticket lifecycles automated; 90% user satisfaction score from Treasury staff survey

---

## Phase 5: 24-Month Horizon – AI Adoption & Cross-Border e-Government

**Timeline:** Q3–Q4 2026  
**Objective:** Position TIISGS as model for African digital government

**Deliverables (as per PS Tanui's rapid AI adoption guidance):**
- AI-powered ticket routing: auto-assign based on technician expertise and workload
- Predictive maintenance: AI forecasts asset failures from logs and suggests pre-emptive work
- Integration with East Africa Customs Union systems for cross-border ICT incidents
- Knowledge base auto-enrichment: AI suggests new articles from resolved tickets
- Publish TIISGS as open-source for other Kenyan ministries and African partner states

**Strategic Alignment:**
- Supports **AU Agenda 2063**, Goal 3: "Integrated continent through digital transformation"
- Contributes to **Vision 2030** target of 100% e-government service availability
- Demonstrates Kenya as regional ICT innovation leader

**Success Criteria:** TIISGS deployed in 3 other ministries; Kenya ranked top 3 in Africa for government digital maturity (UN e-Government Index)

---

## Ongoing: Monitoring & Compliance

### Daily
- Automated SLA breach checks (node-cron job)
- Ticket queue auto-assignment (30-second interval)

### Weekly
- Performance report emailed to Director, Administrative & Support Services
- Unresolved tickets > 3 days flagged for supervisor review

### Monthly
- Charter compliance report: % tickets resolved within published government timelines
- Asset inventory audit reconciliation

### Quarterly
- User satisfaction survey (per Service Charter requirement)
- System health review and capacity planning
- Security audit (PKI certificate expiry, access logs)

### Annual
- Strategic review with Principal Secretary, National Treasury
- Roadmap adjustment based on national ICT priorities
- Update KB with new IFMIS modules, policy changes

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Konza Data Centre delays | Phase 1 deferred | Deploy hybrid cloud (AWS Kenya + Konza later) |
| IFMIS vendor resistance to API integration | Limited auto-ticketing | Use webhook polling and email ingestion as fallback |
| USF connectivity gaps in remote hubs | Offline support critical | Ensure IndexedDB sync works; quarterly on-site visits |
| Staff capacity to use system | Low adoption | Comprehensive training; "champion" users in each directorate |
| Cyber threats to government data | Security breach | PKI enforcement, regular security audits, incident response plan |

---

## Contact

For queries about TIISGS implementation timeline, contact:
- **Project Lead:** ICT Department, National Treasury
- **Steering Committee:** Directorate of Administrative & Support Services
- **Vendor Coordination:** Free Balance (IFMIS) / Tata Chemicals Kenya

*Document version 1.0 – Last updated: May 2025*
