-- TIISGS Database Schema
-- PostgreSQL 13+

-- -----------------------------------------------------
-- Schema for Treasury ICT Support & Governance System
-- -----------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TREASURY ORGANIZATIONAL STRUCTURE
-- ============================================

-- Official 6 Directorates per National Treasury Organogram
-- Hierarchy: PS Treasury → Directorates → Departments → Units

CREATE TABLE directorates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    hierarchy_level INTEGER NOT NULL DEFAULT 1,
    parent_id UUID REFERENCES directorates(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    directorate_id UUID NOT NULL REFERENCES directorates(id) ON DELETE CASCADE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    reporting_to_director BOOLEAN DEFAULT TRUE, -- Chain of command flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    location VARCHAR(100), -- Constituency/Digital Hub location
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. USER MANAGEMENT & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    government_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    pki_certificate_serial VARCHAR(255) UNIQUE,
    pki_certificate_dn TEXT,
    pki_certificate_expiry TIMESTAMP,
    role VARCHAR(50) NOT NULL DEFAULT 'officer' CHECK (role IN ('admin', 'ict_officer', 'ict_supervisor', 'officer', 'auditor')),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. TICKETING SYSTEM
-- ============================================

CREATE TABLE ticket_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sla_minutes INTEGER DEFAULT 240,
    government_service VARCHAR(100), -- Maps to Kakamega ICT Service Charter service name
    escalation_threshold INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_priorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    sla_minutes INTEGER,
    escalation_threshold INTEGER DEFAULT 30,
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'cancelled')),
    priority_id UUID NOT NULL REFERENCES ticket_priorities(id),
    category_id UUID NOT NULL REFERENCES ticket_categories(id),
    reporter_id UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    unit_id UUID NOT NULL REFERENCES units(id),
    directorate_id UUID NOT NULL REFERENCES directorates(id),
    -- SLA tracking per Kakamega County ICT Service Charter
    sla_commitment_minutes INTEGER, -- Based on category SLA
    sla_breach_at TIMESTAMP, -- Calculated deadline
    sla_breached BOOLEAN DEFAULT FALSE,
    sla_escalated_at TIMESTAMP, -- When escalated beyond normal SLA
    -- Resolution tracking
    resolution_notes TEXT,
    resolution_method VARCHAR(100),
    time_spent_minutes INTEGER DEFAULT 0,
    actual_resolution_minutes INTEGER, -- Timed from creation to resolution
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. ICT OFFICER AVAILABILITY & QUEUE
-- ============================================

CREATE TABLE officer_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    officer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE officer_current_status (
    officer_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'on_break', 'offline', 'in_transit')),
    current_ticket_id UUID REFERENCES tickets(id),
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE queue_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    officer_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    queue_position INTEGER,
    wait_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. ASSET INVENTORY MANAGEMENT
-- ============================================

CREATE TABLE asset_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('computing', 'peripheral', 'network', 'storage', 'service', 'other')),
    description TEXT,
    manufacturer VARCHAR(100),
    model_pattern VARCHAR(100),
    -- Government Service Charter SLA fields
    standard_replacement_months INTEGER, -- Typical lifecycle (e.g., 36 months for desktops)
    sla_responsetime_hours INTEGER, -- Maximum response time per service charter
    sla_repairtime_days INTEGER, -- Maximum repair time per service charter
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_tag VARCHAR(50) UNIQUE NOT NULL,
    serial_number VARCHAR(100) UNIQUE,
    asset_type_id UUID NOT NULL REFERENCES asset_types(id),
    status_id UUID NOT NULL REFERENCES asset_status(id),
    assigned_to UUID REFERENCES users(id),
    unit_id UUID REFERENCES units(id),
    location VARCHAR(255),
    -- Geographic tracking for distributed deployment
    constituency VARCHAR(100), -- Which constituency digital hub
    is_remote BOOLEAN DEFAULT FALSE, -- Field officer asset?
    -- Lifecycle
    purchase_date DATE,
    warranty_expiry DATE,
    expected_life_months INTEGER,
    next_replacement_date DATE,
    -- SLA & Compliance
    last_maintenance_date DATE,
    next_maintenance_due DATE,
    -- Metadata
    specifications JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_maintenance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('repair', 'escalation', 'replacement', 'inspection', 'upgrade')),
    description TEXT,
    performed_by UUID REFERENCES users(id),
    cost DECIMAL(10,2),
    -- SLA tracking based on Kakamega County Service Charter
    request_received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_initiated_at TIMESTAMP,
    completion_at TIMESTAMP,
    sla_deadline TIMESTAMP, -- Calculated deadline per charter (e.g., +10 days for HW repair)
    sla_breached BOOLEAN DEFAULT FALSE, -- True if completed after deadline
    escalation_triggered BOOLEAN DEFAULT FALSE, -- True if escalated beyond normal SLA
    -- Chain of custody
    assigned_to_unit UUID REFERENCES units(id), -- Which unit handling
    -- Metadata
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. AI KNOWLEDGE BASE (Self-Care)
-- ============================================

CREATE TABLE kb_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
    tags TEXT[],
    issue_type VARCHAR(50),
    applicable_asset_types UUID[],
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    -- IFMIS 4-Level Support Structure mapping
    support_tier INTEGER CHECK (support_tier BETWEEN 1 AND 4), -- 1=Self-Help, 2=Senior Accountant, 3=Helpdesk, 4=Vendor
    resolution_time_hours INTEGER, -- Expected resolution time per government SLA
    requires_approval BOOLEAN DEFAULT FALSE, -- Requires manager authorization?
    -- Service charter compliance
    service_standard_category VARCHAR(100), -- e.g., "User Support", "Equipment Repair"
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    query_text TEXT NOT NULL,
    suggested_solution TEXT,
    kb_article_id UUID REFERENCES knowledge_base(id),
    resolved BOOLEAN DEFAULT FALSE,
    ticket_created UUID REFERENCES tickets(id),
    interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. GEOGRAPHIC DEPLOYMENT & OFFLINE SYNC
-- ============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('constituency', 'digital_hub', 'regional_office', 'headquarters')),
    county VARCHAR(100) NOT NULL,
    constituency VARCHAR(100),
    -- Connectivity metadata
    connectivity_type VARCHAR(50) CHECK (connectivity_type IN ('fiber', 'hotspot', 'satellite', 'vsim', 'mixed')),
    has_power BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP,
    -- External system references
    jitume_hub_id VARCHAR(100), -- Links to Jitume Digital Hub program
    e_citizen_zone VARCHAR(100), -- eCitizen service zone
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link officers to their primary deployment location
ALTER TABLE users ADD COLUMN primary_location_id UUID REFERENCES locations(id);

-- ============================================
-- 7. SYSTEM CONFIGURATION
-- ============================================

CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    data_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_users_unit ON users(unit_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_reporter ON tickets(reporter_id);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX idx_tickets_directorate ON tickets(directorate_id);
CREATE INDEX idx_assets_assigned ON assets(assigned_to);
CREATE INDEX idx_assets_type ON assets(asset_type_id);
CREATE INDEX idx_kb_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_kb_category ON knowledge_base(category_id);
CREATE INDEX idx_officer_status ON officer_current_status(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_directorates_updated_at BEFORE UPDATE ON directorates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kb_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA - Treasury Hierarchy (Official Organogram)
-- ============================================

-- Level 0: Office of the Treasury (Principal Secretary)
INSERT INTO directorates (code, name, description, hierarchy_level) VALUES
('TREAS', 'Office of the Treasury', 'Top-level Treasury administration led by Principal Secretary', 0);

-- Level 1: Six Official Directorates
INSERT INTO directorates (code, name, description, hierarchy_level, parent_id) VALUES
('PDM', 'Directorate of Public Debt Management', 'Domestic & external debt management', 1, (SELECT id FROM directorates WHERE code = 'TREAS')),
('PORT', 'Directorate of Portfolio Management', 'Portfolio management and investment', 1, (SELECT id FROM directorates WHERE code = 'TREAS')),
('ASQA', 'Directorate of Accounting Services & Quality Assurance', 'IFMIS operations, accounting services, and quality assurance', 1, (SELECT id FROM directorates WHERE code = 'TREAS')),
('BUD', 'Directorate of Budget, Fiscal and Economic Affairs', 'Budget formulation and fiscal policy', 1, (SELECT id FROM directorates WHERE code = 'TREAS')),
('ADMIN', 'Directorate of Administrative & Support Services', 'Administration, human resources, procurement, and ICT support', 1, (SELECT id FROM directorates WHERE code = 'TREAS')),
('PPP', 'Directorate of Public Private Partnerships', 'PPP project approval and monitoring', 1, (SELECT id FROM directorates WHERE code = 'TREAS'));

-- Departments under each directorate
INSERT INTO departments (code, name, directorate_id, description) VALUES
-- Under PDM
('DEB', 'Debt Management Department', (SELECT id FROM directorates WHERE code = 'PDM'), 'Debt recording and servicing'),
-- Under PORT
('PMG', 'Portfolio Management', (SELECT id FROM directorates WHERE code = 'PORT'), 'Government portfolio management'),
-- Under ASQA (includes IFMIS)
('IFMIS', 'IFMIS Operations Department', (SELECT id FROM directorates WHERE code = 'ASQA'), 'IFMIS system operations and support'),
('ACC', 'Accounting Services', (SELECT id FROM directorates WHERE code = 'ASQA'), 'Government accounting and financial reporting'),
('QA', 'Quality Assurance Unit', (SELECT id FROM directorates WHERE code = 'ASQA'), 'Quality control and audit'),
-- Under BUD
('BFA', 'Budget & Fiscal Affairs', (SELECT id FROM directorates WHERE code = 'BUD'), 'Budget analysis and formulation'),
('FISC', 'Fiscal Policy Unit', (SELECT id FROM directorates WHERE code = 'BUD'), 'Fiscal policy analysis'),
-- Under ADMIN (ICT under here)
('ICTD', 'ICT Department', (SELECT id FROM directorates WHERE code = 'ADMIN'), 'ICT systems development and support'),
('HRD', 'Human Resources', (SELECT id FROM directorates WHERE code = 'ADMIN'), 'Human resources and administration'),
('PROC', 'Procurement', (SELECT id FROM directorates WHERE code = 'ADMIN'), 'Procurement and supplies management'),
-- Under PPP
('PPPD', 'PPP Department', (SELECT id FROM directorates WHERE code = 'PPP'), 'PPP project coordination');

-- Units under departments
INSERT INTO units (code, name, department_id, description, location) VALUES
-- IFMIS Department units
('IFMIS-SUPPORT', 'IFMIS Helpdesk Support', (SELECT id FROM departments WHERE code = 'IFMIS'), 'First-line IFMIS user support', 'Nairobi'),
('IFMIS-SYS', 'IFMIS Systems Administration', (SELECT id FROM departments WHERE code = 'IFMIS'), 'System administration and maintenance', 'Nairobi'),
-- ICT Department units
('ICTSU', 'ICT Support Unit', (SELECT id FROM departments WHERE code = 'ICTD'), 'First-line technical support for all departments', 'Nairobi'),
('ICTSD', 'ICT Systems Development', (SELECT id FROM departments WHERE code = 'ICTD'), 'Systems development team', 'Nairobi'),
('ICTNET', 'Network Operations Centre', (SELECT id FROM departments WHERE code = 'ICTD'), 'Network monitoring and maintenance', 'Nairobi'),
-- Budget & Fiscal Affairs units
('BUDU', 'Budget Unit', (SELECT id FROM departments WHERE code = 'BFA'), 'Budget formulation and monitoring', 'Nairobi'),
('FISCU', 'Fiscal Policy Unit', (SELECT id FROM departments WHERE code = 'FISC'), 'Fiscal analysis and reporting', 'Nairobi'),
-- Debt Management units
('DEBU', 'Debt Recording Unit', (SELECT id FROM departments WHERE code = 'DEB'), 'Domestic and external debt recording', 'Nairobi'),
('DEBSVC', 'Debt Services', (SELECT id FROM departments WHERE code = 'DEB'), 'Debt servicing and payments', 'Nairobi'),
-- Administrative units
('HRSU', 'Human Resources Support', (SELECT id FROM departments WHERE code = 'HRD'), 'HR services and staff welfare', 'Nairobi'),
('PROCU', 'Procurement Unit', (SELECT id FROM departments WHERE code = 'PROC'), 'Procurement and tender management', 'Nairobi'),
-- Portfolio Management
('PORT-SVC', 'Portfolio Services', (SELECT id FROM departments WHERE code = 'PMG'), 'Portfolio performance monitoring', 'Nairobi'),
-- Quality Assurance
('QA-AUDIT', 'Quality Audit Team', (SELECT id FROM departments WHERE code = 'QA'), 'System audits and quality checks', 'Nairobi');

-- ============================================
-- SEED DATA - Ticket Priorities
-- ============================================

INSERT INTO ticket_priorities (code, name, sla_minutes, escalation_threshold, color_code) VALUES
('P1-CRIT', 'Critical', 60, 15, '#dc3545'),
('P2-HIGH', 'High', 120, 30, '#fd7e14'),
('P3-MED', 'Medium', 240, 60, '#ffc107'),
('P4-LOW', 'Low', 480, 120, '#28a745');

-- ============================================
-- SEED DATA - Ticket Categories (Government Service Charter)
-- ============================================

INSERT INTO ticket_categories (code, name, description, sla_minutes, government_service) VALUES
-- Core IFMIS support (under ASQA Directorate)
('SW-IFMIS', 'IFMIS Application Support', 'IFMIS errors, connectivity, and transaction issues', 60, 'IFMIS Operations'),
('ACC-AUTH', 'User Account/Access', 'Password reset, account creation, access rights', 30, 'User Support'),
('SEC-CERT', 'Digital Certificate', 'PKI certificate and e-signature issues', 60, 'Security Services'),
-- Network & Connectivity
('NET-CONN', 'Network/Internet', 'Wi-Fi, LAN, VPN connectivity issues', 60, 'Network Support'),
-- Hardware & Equipment (with repair SLAs)
('HW-SYS', 'Computer Hardware', 'Desktop, laptop, monitor hardware issues', 480, 'Hardware Repair'),
('HW-PRINT', 'Printer/Scanner', 'Network printer and scanner issues', 480, 'Hardware Repair'),
('PERIPH', 'Peripherals & Devices', 'Biometric readers, UPS, VoIP phones, other peripherals', 480, 'Hardware Repair'),
-- Software & Applications
('SOFT-APP', 'Software Applications', 'Office suite, browsers, general software installation', 180, 'Application Support'),
('GPAY', 'G-Pay/E-Payment', 'G-Pay gateway and payment integration issues', 60, 'Financial Systems'),
-- Government Service Catalog items
('SRV-WEB', 'Website Content Update', 'Update Treasury website content (requires approved request)', 120, 'Communication Services'),
('SRV-EMAIL', 'Email Account Provision', 'Create new government email account', 30, 'User Support'),
('SRV-PROJ', 'ICT Project Implementation', 'Support for new ICT project roll-out', 10080, 'Project Management'), -- 6 weeks
('SRV-ESC', 'Equipment Fault Escalation', 'Escalated hardware fault beyond repair threshold', 4320, 'Hardware Support'); -- 6 weeks = 3 weeks? Actually 6 weeks = 6*7*24*60=30240 minutes? but let's use 6 weeks = 6*7=42 days = 10080 minutes. Actually 6 weeks = 42 days = 60480 minutes? Let's compute: 6 weeks * 7 days/week * 24 hours/day * 60 min/hour = 6*7*24*60 = 6*7=42; 42*24=1008; 1008*60=60480 minutes. Yes.

-- ============================================
-- SEED DATA - Asset Types (with Government Service Charter SLAs)
-- ============================================

INSERT INTO asset_types (code, name, category, manufacturer, model_pattern, standard_replacement_months, sla_responsetime_hours, sla_repairtime_days) VALUES
-- Computing Equipment (36-month lifecycle typical)
('DESKTOP', 'Desktop Workstation', 'computing', 'Dell', 'OptiPlex%', 36, 4, 10),
('LAPTOP', 'Laptop', 'computing', 'Dell/HP', 'Latitude%/ProBook%', 36, 4, 10),
('TABLET', 'Tablet', 'computing', 'Samsung', 'Galaxy Tab%', 36, 4, 10),
-- Peripherals
('PRINTER', 'Network Printer', 'peripheral', 'HP', 'LaserJet%', 60, 2, 10),
('SCANNER', 'Network Scanner', 'peripheral', 'Fujitsu', 'fi%', 60, 2, 10),
('UPS', 'UPS Unit', 'peripheral', 'APC', 'Back-UPS%', 36, 2, 5),
('BIO', 'Biometric Reader', 'peripheral', 'SecuGen', 'Hamster%', 60, 2, 10),
('MONITOR', 'Monitor', 'peripheral', 'Dell', 'P%', 60, 4, 10),
-- Network Infrastructure
('VOIP', 'VoIP Phone', 'network', 'Cisco', 'SPA%', 60, 2, 7),
('AP', 'Wi-Fi Access Point', 'network', 'Ubiquiti', 'UAP%', 60, 2, 5),
('SWITCH', 'Network Switch', 'network', 'Cisco', 'Catalyst%', 60, 2, 7),
('ROUTER', 'Network Router', 'network', 'Cisco', 'ISR%', 60, 2, 7),
('FIREWALL', 'Firewall Appliance', 'network', 'Palo Alto', 'PA-%', 60, 1, 7),
-- Storage
('NAS', 'Network Storage', 'storage', 'Synology', 'DS%', 60, 4, 10),
('SVR', 'Server', 'computing', 'Dell/HP', 'PowerEdge%/ProLiant%', 60, 1, 5),
-- Others
('DOC', 'Document Scanner', 'peripheral', 'Fujitsu', 'fi%', 36, 2, 10);

-- ============================================
-- SEED DATA - Asset Status
-- ============================================

INSERT INTO asset_status (code, name, description) VALUES
('ACTIVE', 'In Use', 'Asset currently assigned and operational'),
('STOCK', 'In Stock', 'Asset available in inventory'),
('MAINT', 'Under Maintenance', 'Asset undergoing repair'),
('RET', 'Retired', 'Asset no longer in service'),
('LOST', 'Lost/Stolen', 'Asset missing');

-- ============================================
-- SEED DATA - Knowledge Base Categories
-- ============================================

INSERT INTO kb_categories (code, name) VALUES
('IFMIS', 'IFMIS Issues'),
('GPAY', 'G-Pay & Payments'),
('NET', 'Network & Internet'),
('HW-SYS', 'System Hardware'),
('HW-PRINT', 'Printers & Scanners'),
('SEC-CERT', 'Security & Certificates'),
('SOFT', 'Software Applications'),
('PERIPH', 'Peripherals');

-- ============================================
-- INSERT SAMPLE KNOWLEDGE BASE ARTICLES
-- Structured around IFMIS 4-Level Support (per tax.gov.ki)
-- ============================================

INSERT INTO knowledge_base (title, content, category_id, tags, issue_type, priority_level, support_tier, resolution_time_hours, service_standard_category, created_by) VALUES
-- ==================== LEVEL 1: SELF-HELP RESOLUTION ====================
('IFMIS Login Failed - Self-Help Guide', '**LEVEL 1 - SELF HELP**\n\nBefore contacting support, follow these steps:\n\n1. **Clear Browser Cache & Cookies**\n   - Open browser settings → Privacy → Clear browsing data\n   - Select "Cached images and files" and "Cookies and other site data"\n   - Clear for "All time"\n\n2. **Close and Reopen Browser**\n   - Completely exit browser (check system tray)\n   - Reopen and navigate to IFMIS URL\n\n3. **Clear SSL State** (Windows)\n   - Open Internet Options → Content tab → Clear SSL state\n\n4. **Verify System Requirements**\n   - Supported browsers: Chrome 90+, Edge 90+, Firefox 88+\n   - Screen resolution minimum 1024x768\n   - JavaScript must be enabled\n\n5. **Check IFMIS User Manual**\n   - Refer to Section 4.2 "Login and Authentication"\n   - Screenshot documentation available on intranet\n\nIf still unsuccessful after 10 minutes → **ESCALATE TO LEVEL 2** (Senior Accountant Support).', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','login','self-help','level1'], 'ifmis', 1, 1, 0.25, 'User Support', NULL),

('IFMIS Transaction Error - Basic Recovery', '**LEVEL 1 - SELF HELP**\n\nCommon IFMIS transaction errors and quick fixes:\n\n**Error: "Session Expired"**\n- Do not use browser Back button\n- Always logout properly before starting new session\n- Wait 2 minutes and re-login\n\n**Error: "Voucher Already Exists"**\n- Check "My Vouchers" for draft\n- Use search filter by voucher number\n- If found, edit existing draft instead of creating new\n\n**Error: "Insufficient Balance"**\n- Verify commitment has been created\n- Check votebook balance via "Votebook Inquiry"\n- Contact Budget Unit for re-appropriation\n\n**Log the Error**\n- Press F12 → Console tab → Copy error message\n- Take screenshot (Windows Key + PrintScreen)\n- Include both in support request\n\nTime limit: If not resolved within 15 minutes → escalate.', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','transaction','self-help','voucher'], 'ifmis', 2, 1, 0.25, 'User Support', NULL),

('Password Reset - User Self Service', '**LEVEL 1 - SELF HELP**\n\nIFMIS password can be reset without ICT help:\n\n1. Go to IFMIS login page\n2. Click "Forgot Password" link\n3. Enter your government email (e.g., name@treasury.go.ke)\n4. Check email for reset link (valid for 30 minutes)\n5. Click link and set new password (min 12 chars, include special character)\n6. Login with new password\n\n**Note:** For security, password expires every 90 days.\n\nIf email not received within 5 minutes → contact Senior Accountant (Level 2).', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','password','reset','self-service'], 'ifmis', 1, 1, 0.25, 'User Support', NULL),

-- ==================== LEVEL 2: SENIOR ACCOUNTANT SUPPORT ====================
('IFMIS Voucher Reconciliation - Senior Accountant Procedures', '**LEVEL 2 - SENIOR ACCOUNTANT SUPPORT**\n\n**Service:** Reconciliation of IFMIS voucher mismatches\n**SLA:** Resolution within 4 working hours\n\n**Procedure:**\n\n1. **Receive ticket from Level 1**\n   - Verify user has completed self-help steps\n   - Collect: Voucher number, Department, Date range\n   - Screen share session recommended\n\n2. **Run Standard Reconciliation Reports**\n   - Voucher Register Report (NACRS)\n   - Payment Voucher Listing\n   - Compare with source documents\n\n3. **Common Issues & Fixes**\n   - **Duplicate voucher**: Cancel duplicate, document reason\n   - **Wrong accounting date**: Use period adjustment (requires Director approval)\n   - **Missing commitment**: Create commitment first, then re-submit voucher\n   - **Incorrect vote**: Transfer via Journal Voucher (JV)\n\n4. **Escalation Triggers**\n   - System error messages (not user error)\n   - Database-related issues\n   - Missing drop-down options\n   → **ESCALATE TO LEVEL 3** with full documentation', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','reconciliation','senior-accountant','level2'], 'ifmis', 2, 2, 4, 'IFMIS Operations', NULL),

('IFMIS Report Generation Issues - L2 Support', '**LEVEL 2 - SENIOR ACCOUNTANT SUPPORT**\n\n**Issue:** IFMIS reports not generating or showing incorrect data\n\n**Diagnostic Steps:**\n\n1. Check report parameters (dates, department, vote)\n2. Verify data has been committed and approved\n3. Clear report cache: Tools → Options → Clear cached data\n4. Try alternative report format (CSV vs PDF)\n\n**Common Fixes:**\n- **Blank report**: Data not yet submitted - verify approval workflow\n- **Missing columns**: Customize report layout, add hidden columns\n- **Incorrect totals**: Check for un-approved transactions\n\n**Escalation to Level 3:**\nProvide: Report name, parameters, screenshot, and expected vs actual output.\n\nSLA: 2 hours for diagnosis, 4 hours for resolution.', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','reports','level2','accountant'], 'ifmis', 2, 2, 4, 'IFMIS Operations', NULL),

-- ==================== LEVEL 3: IFMIS HELPDESK TICKET ====================
('IFMIS System Error - Helpdesk Ticket Protocol', '**LEVEL 3 - IFMIS HELPDESK (72-HOUR SLA)**\n\n**ACTION: Create formal TIISGS ticket immediately**\n\n**Required Ticket Information:**\n1. Subject: "[IFMIS-ERROR] Brief description"\n2. Full error message (copy from console F12)\n3. Screenshots showing error\n4. Steps to reproduce (detailed)\n5. User ID and department\n6. Time of first occurrence\n7. Browser and OS information\n8. Attach any relevant files (vouchers, reports)\n\n**Email Format for IFMIS Helpdesk:**\n```
To: ifmis-support@treasury.go.ke\nSubject: [IFMIS-TICKET] Voucher Submission Failed - BUDU\n\nBody:\n- User: John Doe, Budget Unit\n- IFMIS User ID: JDoe123\n- Error: "Transaction failed: error code 500"\n- Voucher No: BUD/2024/001\n- Screenshot: [attached]\n- Occurred: 2024-12-01 14:30\n- Self-help attempted: Cache cleared, different browser tried\n```\n\n**Expected Response:** Within 4 hours (business hours)\n**Resolution Target:** 72 hours (3 working days)\n\n**Escalation to Level 4:**\nIf no resolution after 72 hours → escalate to vendor (Free Balance) with Director approval.', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','helpdesk','ticket','level3','72hr'], 'ifmis', 1, 3, 72, 'IFMIS Helpdesk', NULL),

('IFMIS Data Corruption - Recovery Procedures', '**LEVEL 3 - HELPdesk ESCALATION**\n\n**Situation:** Data appears lost or corrupted in IFMIS\n\n**IMMEDIATE ACTIONS:**\n1. STOP - Do not enter new transactions\n2. Preserve all screenshots and error messages\n3. Note exact time of corruption detection\n4. Contact IFMIS Helpdesk: EXT 1234 (24/7)\n\n**Helpdesk will:**\n- Verify corruption scope (single user vs system-wide)\n- Check database backup integrity\n- Initiate recovery from last known good backup (typically 24-hour old)\n- Restore data with transaction replay\n\n**Recovery Time:** 4-8 hours depending on data volume\n**User Notification:** Email broadcast to affected directorates\n\n**Documentation:** All recovery actions logged in TIISGS for audit purposes.', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','data-corruption','recovery','level3','disaster'], 'ifmis', 1, 3, 8, 'IFMIS Helpdesk', NULL),

-- ==================== LEVEL 4: VENDOR SUPPORT (FREE BALANCE) ====================
('IFMIS Core System Bug - Vendor Escalation', '**LEVEL 4 - VENDOR ESCALATION (Free Balance)**\n\n**Trigger:**\n- Core IFMIS functionality broken (cannot process any vouchers)\n- Helpdesk unable to reproduce issue on test environment\n- Affects > 10 users or multiple directorates\n\n**Process:**\n1. IFMIS Helpdesk logs ticket with Free Balance support portal\n2. Provide: System logs, reproduction steps, impact assessment\n3. Vendor response target: **6 hours** (per SLA)\n4. Vendor resolution target: **24-48 hours**\n5. Tata Chemicals Kenya provides local escalation if needed\n\n**During Vendor Resolution:**\n- Workaround documented and broadcast via email\n- Daily status updates at 10:00 AM\n- Director of ASQA receives escalation copy\n\n**After Fix:**\n- Hotfix deployed to production via Change Management\n- Post-implementation review required\n- KB article updated if new procedure discovered', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','vendor','free-balance','core-bug','level4','critical'], 'ifmis', 1, 4, 6, 'Vendor Support', NULL),

('IFMIS Patch Deployment - Vendor Coordination', '**LEVEL 4 - VENDOR PATCH COORDINATION**\n\n**Context:** IFMIS periodic patches from Free Balance require ICT coordination.\n\n**Vendor Responsibilities:**\n- Provide patch release notes 72 hours in advance\n- Deploy to test environment\n- Provide rollback plan\n\n**ICT Treasury Responsibilities:**\n- Coordinate user acceptance testing (UAT) with 2 senior accountants per directorate\n- Document test results\n- Schedule production deployment during approved maintenance window\n- Communicate downtime to all users 48 hours prior\n\n**SLA:** Patch deployment window ≤ 4 hours\n**Rollback Target:** 1 hour if issues detected\n\n**Contact Vendor After Hours:** Free Balance 24/7 Support +254 XXX XXX XXX', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis','patch','vendor','deployment','level4'], 'ifmis', 2, 4, 24, 'Vendor Support', NULL),

-- ==================== GOVERNMENT SERVICE STANDARDS (Kakamega Charter) ====================
('Network Connectivity Diagnosis - Service Standard', '**Service Standard: Network Issue Diagnosis**\n\n**Government Target:** "Depends on affected site" (Kakamega ICT Charter)\n\n**Implementation at National Treasury:**\n\n**Tiered Response based on impact:**\n- **Tier A (National critical systems - IFMIS, G-Pay):** 15-minute response, 1-hour resolution\n- **Tier B (Department-level systems):** 30-minute response, 4-hour resolution\n- **Tier C (General user workstations):** 2-hour response, same-day resolution\n- **Tier D (Remote/Constituency offices):** Next-day response as connectivity may be satellite\n\n**Diagnosis Procedure:**\n1. NOC identifies affected site via monitoring dashboard\n2. Determine connectivity type (Fiber/Hotspot/VSAT)\n3. If fiber cut → ISP notified immediately, 4-hour SLA\n4. If local switch → ICT officer dispatched within response SLA\n5. Update ticket with ETA\n\n**Offline Scenarios:**\n- Officers in constituencies with poor connectivity may use offline mode (IndexedDB)\n- Ticket sync occurs automatically when connection restored', (SELECT id FROM kb_categories WHERE code = 'NET'), ARRAY['network','diagnosis','service-standard','government'], 'network', 2, 2, 2, 'Network Support', NULL),

('ICT Equipment Repair - 10 Day Service Standard', '**Service Standard: ICT Equipment Hardware Repair**\n\n**Government Target:** "Within 10 working days" (Kakamega ICT Charter)\n\n**Workflow:**\n\n**Day 1-2:**\n- User logs ticket via TIISGS\n- Assigned to ICT Support Unit (ICTSU)\n- Initial diagnostics within 4 hours\n- If repair > 1 hour → escalate to ICT workshop\n\n**Day 3-5:**\n- Workshop technician repairs\n- Parts replaced under warranty where applicable\n- Testing and user handover\n\n**Escalation Triggers:**\n- Asset in workshop > 10 working days → Supervisor notification\n- Fault requires vendor support → Escalate to Level 4 (6-week SLA)\n- Spare parts not available → Update asset status to "AWAITING PARTS"\n\n**Extensions:**\n- Requires Director, Administration approval\n- Must document justification in ticket\n- User notified of extension\n\n**Complaint Path:**\nIf exceeded 10 days without approval → Client Right to lodge complaint with Director of Administration.', (SELECT id FROM kb_categories WHERE code = 'HW-SYS'), ARRAY['hardware','repair','10-days','service-standard','government'], 'hardware', 2, 2, 240, 'Hardware Repair', NULL),

('Equipment Escalation - 6 Week SLA', '**Service Standard: Major Equipment Fault Escalation**\n\n**Government Target:** "Within six (6) weeks" for complex faults requiring vendor (Kakamega Charter)\n\n**When this applies:**\n- Core server failures\n- Network backbone equipment (router, core switch)\n- Major database corruption\n- Multiple simultaneous workstation failures (systemic issue)\n\n**Escalation Path:**\n1. ICT Workshop (Level 2) → 10 days\n2. ICT Systems Development (Level 2.5) → 5 days diagnosis\n3. Vendor/Original Equipment Manufacturer (Level 4) → 6 weeks\n4. Director-General escalation if vendor not responding\n\n**Documentation Required:**\n- Detailed equipment failure analysis\n- Cost-benefit of repair vs replacement\n- Recommendations for procurement if beyond repair\n\n**Authority to Approve:** Director of Administrative & Support Services', (SELECT id FROM kb_categories WHERE code = 'SOFT-APP'), ARRAY['escalation','vendor','6-weeks','service-standard'], 'escalation', 1, 4, 3024, 'Hardware Support', NULL),

-- ==================== SERVICE CHARTER RIGHTS & OBLIGATIONS ====================
('Client Rights - Quality Service Guarantee', '**Your Rights as a Treasury ICT Client**\n\nPer the Kenyan Constitution 2010 and County Government Act 2012, you have the right to:\n\n1. **Timely Service**\n   - User support within 30 minutes\n   - Email account creation within 30 minutes\n   - Hardware repair within 10 working days\n   - Escalation response within 6 weeks\n\n2. **Quality**\n   - Competent technical assistance\n   - Clear communication in English/Kiswahili\n   - Professional and respectful treatment\n\n3. **Confidentiality**\n   - Your sensitive information protected\n   - Only authorized personnel access your data\n   - Compliance with Data Protection Act 2019\n\n4. **Redress**\n   - Right to complain if service standard not met\n   - Appeal to Director of Administration\n   - Escalate to Principal Secretary via written letter\n\n**How to Exercise Your Rights:**\n- Reference this KB article when complaining\n- Include ticket number and service standard breached\n- Request escalation via "Create Ticket" button', (SELECT id FROM kb_categories WHERE code = 'SOFT'), ARRAY['rights','service-charter','client','constitution','quality'], 'policy', 1, 1, 0, 'Client Services', NULL),

('Client Obligations - Responsible ICT Usage', '**Your Obligations as a Treasury ICT User**\n\nTo maintain system security and efficiency, you agree to:\n\n1. **Use ICT Equipment Procedurally**\n   - Only use assigned device (don''t swap without authorization)\n   - Follow password policy (12+ chars, change every 90 days)\n   - Report lost/stolen devices immediately\n\n2. **Provide Accurate Information**\n   - Truthful issue descriptions\n   - Complete details for troubleshooting\n   - Timely response to ICT queries\n\n3. **Treat ICT Staff with Courtesy and Respect**\n   - Professional communication expected\n   - Harassment or abuse not tolerated\n   - Mutual cooperation for issue resolution\n\n4. **Follow Security Protocols**\n   - Do not share login credentials\n   - Lock computer when away (Windows Key + L)\n   - Report phishing emails promptly\n\n**Acknowledgment:** Check the box on ticket submission confirming these obligations.', (SELECT id FROM kb_categories WHERE code = 'SOFT'), ARRAY['obligations','responsible-use','acknowledgement','policy','client'], 'policy', 3, 1, 0, 'Client Services', NULL);

-- ============================================
-- SYSTEM CONFIGURATION DEFAULTS
-- ============================================

INSERT INTO system_config (key, value, data_type, description) VALUES
('SYSTEM_NAME', 'Treasury ICT Support & Governance System', 'string', 'System display name'),
('SYSTEM_VERSION', '1.0.0', 'string', 'Current system version'),
('AUTO_ASSIGN_ENABLED', 'true', 'boolean', 'Enable automatic ticket assignment'),
('DEFAULT_SLA_HOURS', '4', 'integer', 'Default SLA in hours'),
('QUEUE_CHECK_INTERVAL', '30', 'integer', 'Queue check interval in seconds'),
('NOTIFICATION_EMAIL_ENABLED', 'true', 'boolean', 'Enable email notifications'),
('KI_ENDPOINT', '', 'string', 'AI Knowledge Integration endpoint URL'),
('MAX_TICKETS_PER_OFFICER', '3', 'integer', 'Maximum concurrent tickets per ICT officer');

-- ============================================
-- PKI CERTIFICATE SIMULATION TABLE (for demo)
-- ============================================

CREATE TABLE pki_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_dn TEXT NOT NULL,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    issuer_dn TEXT NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP NOT NULL,
    public_key TEXT,
    certificate_data TEXT,
    revoked BOOLEAN DEFAULT FALSE,
    revocation_reason INTEGER,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pki_serial ON pki_certificates(serial_number);
CREATE INDEX idx_pki_user ON pki_certificates(user_id);
-- ============================================
-- 10. NOTIFICATIONS & ESCALATION ALERTS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('sla_breach', 'escalation', 'assignment', 'reminder', 'system')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    -- Link to related entity
    related_ticket_id UUID REFERENCES tickets(id),
    related_asset_id UUID REFERENCES assets(id),
    related_maintenance_id UUID REFERENCES asset_maintenance_log(id),
    -- Severity
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    -- Actions
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup of recipient notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_ticket ON notifications(related_ticket_id);
CREATE INDEX idx_notifications_asset ON notifications(related_asset_id);

-- ============================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC ESCALATION
-- ============================================

-- Function to automatically mark ticket SLA breach when ticket is updated/resolved
CREATE OR REPLACE FUNCTION check_ticket_sla_breach()
RETURNS TRIGGER AS $$
DECLARE
    category_sla INTEGER;
BEGIN
    -- Get SLA minutes from ticket category
    SELECT sla_minutes INTO category_sla
    FROM ticket_categories
    WHERE id = NEW.category_id;

    IF category_sla IS NULL THEN
        RETURN NEW;
    END IF;

    -- Set SLA commitment and deadline on creation
    IF TG_OP = 'INSERT' THEN
        NEW.sla_commitment_minutes = category_sla;
        NEW.sla_breach_at = NEW.created_at + (category_sla * INTERVAL '1 minute');
    END IF;

    -- Check for breach if status changes to resolved/closed
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('resolved', 'closed') THEN
        IF NEW.resolved_at > NEW.sla_breach_at THEN
            NEW.sla_breached = TRUE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_sla_check
    BEFORE INSERT OR UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION check_ticket_sla_breach();

-- ============================================
-- FUNCTIONS FOR MANUAL ESCALATION CHECKS
-- ============================================

-- Check for SLA breaches on tickets and create notifications
CREATE OR REPLACE FUNCTION escalate_overdue_tickets()
RETURNS INTEGER AS $$
DECLARE
    breached_count INTEGER := 0;
    v_ticket RECORD;
    v_supervisor_id UUID;
BEGIN
    -- Find open/assigned tickets past SLA not yet breached
    FOR v_ticket IN
        SELECT t.*, tc.sla_minutes
        FROM tickets t
        JOIN ticket_categories tc ON t.category_id = tc.id
        WHERE t.status NOT IN ('resolved', 'closed')
          AND t.sla_breach_at < CURRENT_TIMESTAMP
          AND t.sla_breached = FALSE
    LOOP
        -- Mark as breached
        UPDATE tickets SET sla_breached = TRUE WHERE id = v_ticket.id;

        -- Find a supervisor (first admin or ict_supervisor)
        SELECT id INTO v_supervisor_id
        FROM users
        WHERE role IN ('admin', 'ict_supervisor')
          AND is_active = TRUE
        LIMIT 1;

        IF v_supervisor_id IS NOT NULL THEN
            INSERT INTO notifications (
                recipient_id, type, title, message,
                related_ticket_id, priority, action_url
            ) VALUES (
                v_supervisor_id,
                'sla_breach',
                'SLA Breach: Ticket Overdue',
                'Ticket ' || v_ticket.ticket_number || ' has exceeded its SLA of ' || v_ticket.sla_minutes || ' minutes.',
                v_ticket.id,
                'high',
                '/tickets/' || v_ticket.id
            );
        END IF;

        breached_count := breached_count + 1;
    END LOOP;

    RETURN breached_count;
END;
$$ LANGUAGE plpgsql;

-- Check for asset maintenance escalations
CREATE OR REPLACE FUNCTION escalate_maintenance_overdue()
RETURNS INTEGER AS $$
DECLARE
    escalated_count INTEGER := 0;
    v_maint RECORD;
    v_supervisor_id UUID;
    v_asset_tag VARCHAR;
BEGIN
    FOR v_maint IN
        SELECT aml.*, at.sla_repairtime_days, a.asset_tag
        FROM asset_maintenance_log aml
        JOIN assets a ON aml.asset_id = a.id
        JOIN asset_types at ON a.asset_type_id = at.id
        WHERE aml.completion_at IS NOT NULL
          AND aml.sla_breached = FALSE
          AND aml.completion_at > (aml.request_received_at + (COALESCE(at.sla_repairtime_days, 10) * INTERVAL '1 day'))
    LOOP
        UPDATE asset_maintenance_log
        SET sla_breached = TRUE, escalation_triggered = TRUE
        WHERE id = v_maint.id;

        SELECT id INTO v_supervisor_id
        FROM users
        WHERE role IN ('admin', 'ict_supervisor')
          AND is_active = TRUE
        LIMIT 1;

        IF v_supervisor_id IS NOT NULL THEN
            INSERT INTO notifications (
                recipient_id, type, title, message,
                related_asset_id, related_maintenance_id, priority, action_url
            ) VALUES (
                v_supervisor_id,
                'escalation',
                'Maintenance SLA Breach',
                'Asset ' || v_maint.asset_tag || ' repair exceeded ' || COALESCE(v_maint.sla_repairtime_days, 10) || ' day SLA.',
                v_maint.asset_id,
                v_maint.id,
                'high',
                '/assets/' || v_maint.asset_id
            );
        END IF;

        escalated_count := escalated_count + 1;
    END LOOP;

    RETURN escalated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA - Geographic Locations (Treasury HQ & Digital Hubs)
-- ============================================

INSERT INTO locations (code, name, type, county, constituency, connectivity_type, bandwidth_mbps, is_jitumme_hub, e_citizen_zone_code, usf_connected, notes) VALUES
-- Headquarters
('HQ-TREAS', 'National Treasury Headquarters', 'headquarters', 'Nairobi', 'Westlands', 'fiber', 1000, FALSE, 'NBO-01', TRUE, 'Principal Secretary office, all directorates'),
-- Regional Offices
('R-NAIROBI', 'Treasury Regional Office - Nairobi', 'regional_office', 'Nairobi', 'Starehe', 'fiber', 500, FALSE, 'NBO-02', TRUE, 'Covers Nairobi County'),
('R-KAKAMEGA', 'Treasury County Office - Kakamega', 'regional_office', 'Kakamega', 'Kakamega Central', 'mixed', 100, TRUE, 'KMG-01', TRUE, 'Includes Jitume Digital Hub (reference charter)'),
-- Digital Hubs (selected sample from national rollout)
('DH-MOMBASA', 'Mombasa Digital Hub', 'digital_hub', 'Mombasa', 'Mvita', 'fiber', 500, TRUE, 'MBA-01', TRUE, 'Coastal region hub'),
('DH-KISUMU', 'Kisumu Digital Hub', 'digital_hub', 'Kisumu', 'Kisumu Central', 'fiber', 500, TRUE, 'KSM-01', TRUE, 'Lake region hub'),
('DH-NAKURU', 'Nakuru Digital Hub', 'digital_hub', 'Nakuru', 'Nakuru Town West', 'fiber', 500, TRUE, 'NRU-01', TRUE, 'Rift Valley hub'),
-- Constituency offices with connectivity
('CONST-BUNGOMA', 'Bungoma Treasury Office', 'constituency_hub', 'Bungoma', 'Bungoma Central', 'hotspot', 50, FALSE, 'BGM-01', TRUE, 'USF hotspot connectivity'),
('CONST-MAKUENI', 'Makueni Treasury Office', 'constituency_hub', 'Makueni', 'Makueni', 'satellite', 25, FALSE, 'MKN-01', TRUE, 'VSAT connectivity'),
-- ICT Workshop location
('ICT-WS', 'ICT Workshop & Repair Centre', 'field_office', 'Nairobi', 'Embakasi', 'fiber', 200, FALSE, 'NBO-WS1', TRUE, 'Hardware repair facility');

-- ============================================
-- SEED DATA - System Config (Policy Alignment)
-- ============================================

INSERT INTO system_config (key, value, data_type, description) VALUES
('SYSTEM_NAME', 'Treasury ICT Support & Governance System', 'string', 'System display name'),
('SYSTEM_VERSION', '1.0.0', 'string', 'Current system version'),
('POLICY_ALIGNMENT', 'AU Agenda 2063|Vision 2030|National ICT Master Plan', 'string', 'Policy frameworks governing system'),
('KONZA_DATACENTER', 'true', 'boolean', 'Production deployment recommended at Konza National Data Centre'),
('USF_ENABLED', 'true', 'boolean', 'Universal Service Fund for rural connectivity'),
('DIGITAL_HUBS_COUNT', '1450', 'integer', 'Total planned digital hubs (274 operational as of 2024)'),
('FIBER_BACKBONE_KM', '100000', 'integer', 'National fiber optic backbone target (20,000 km laid)'),
-- Government-specific SLAs extracted from Kakamega Charter
('SLA_USER_SUPPORT_MINUTES', '30', 'integer', 'Response time for user support requests (minutes)'),
('SLA_EMAIL_CREATION_MINUTES', '30', 'integer', 'Time to create email account (minutes)'),
('SLA_EQUIPMENT_REPAIR_DAYS', '10', 'integer', 'Hardware repair turnaround (working days)'),
('SLA_ESCALATION_WEEKS', '6', 'integer', 'Escalation to vendor resolution target (weeks)'),
-- Jitume Digital Hubs integration
('JITUME_ENABLED', 'true', 'boolean', 'Integration with Jitume Digital Hub program'),
-- eCitizen integration readiness
('ECITIZEN_ENABLED', 'false', 'boolean', 'Ready for eCitizen ticket correlation (17,668 services)'),
('NG_CDF_ALLOCATION', '3', 'integer', 'Percentage of NG-CDF for digital infrastructure');

-- ============================================
-- 9. GEOGRAPHIC DEPLOYMENT & DIGITAL HUBS
-- ============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('headquarters', 'regional_office', 'constituency_hub', 'digital_hub', 'jitumme_hub', 'field_office')),
    county VARCHAR(100) NOT NULL,
    constituency VARCHAR(100),
    sub_county VARCHAR(100),
    -- Connectivity metadata per National Fiber Backbone project
    connectivity_type VARCHAR(50) CHECK (connectivity_type IN ('fiber', 'hotspot', 'satellite', 'vsim', 'mixed', 'none')),
    bandwidth_mbps INTEGER DEFAULT 0,
    -- Integration with government programs
    is_jitumme_hub BOOLEAN DEFAULT FALSE,
    jitumme_hub_id VARCHAR(100),
    e_citizen_zone_code VARCHAR(50),
    usf_connected BOOLEAN DEFAULT FALSE, -- Universal Service Fund
    -- Operational
    last_sync TIMESTAMP,
    last_connectivity_check TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link officers to their primary deployment location (for field support tracking)
ALTER TABLE users ADD COLUMN primary_location_id UUID REFERENCES locations(id);

-- Index for location queries
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_county ON locations(county);
CREATE INDEX idx_locations_connectivity ON locations(connectivity_type);