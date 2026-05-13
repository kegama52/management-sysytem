-- TIISGS Database Schema
-- PostgreSQL 13+

-- -----------------------------------------------------
-- Schema for Treasury ICT Support & Governance System
-- -----------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TREASURY ORGANIZATIONAL STRUCTURE
-- ============================================

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
    resolution_notes TEXT,
    resolution_method VARCHAR(100),
    time_spent_minutes INTEGER DEFAULT 0,
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
    category VARCHAR(50) NOT NULL CHECK (category IN ('computing', 'peripheral', 'network', 'storage', 'other')),
    description TEXT,
    manufacturer VARCHAR(100),
    model_pattern VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
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
    purchase_date DATE,
    warranty_expiry DATE,
    specifications JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_maintenance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL,
    description TEXT,
    performed_by UUID REFERENCES users(id),
    cost DECIMAL(10,2),
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
-- SEED DATA - Treasury Hierarchy
-- ============================================

INSERT INTO directorates (code, name, description, hierarchy_level) VALUES
('TREAS', 'Office of the Treasury', 'Top-level Treasury administration', 0),
('ABS', 'Administrative Services', 'ICT Unit, HR, Procurement under this directorate', 1),
('BUD', 'Budget, Fiscal & Economic Affairs', 'Budget formulation and fiscal policy', 1),
('PDM', 'Public Debt Management', 'Domestic & external debt management', 1),
('GFS', 'Government Financial Services', 'IFMIS operations and oversight', 1),
('PPP', 'Public-Private Partnerships', 'PPP project approval and monitoring', 1),
('AUD', 'Internal Audit', 'Internal audit and compliance', 1);

INSERT INTO departments (code, name, directorate_id, description) VALUES
('ICTD', 'ICT Department', (SELECT id FROM directorates WHERE code = 'ABS'), 'ICT Unit responsible for systems support'),
('HRD', 'Human Resources', (SELECT id FROM directorates WHERE code = 'ABS'), 'HR and administration'),
('PROC', 'Procurement', (SELECT id FROM directorates WHERE code = 'ABS'), 'Procurement and supplies'),
('BFA', 'Budget & Fiscal Affairs', (SELECT id FROM directorates WHERE code = 'BUD'), 'Budget analysis and formulation'),
('DEB', 'Debt Management', (SELECT id FROM directorates WHERE code = 'PDM'), 'Debt recording and servicing'),
('GFS', 'Gov Financial Services', (SELECT id FROM directorates WHERE code = 'GFS'), 'IFMIS operations'),
('PPPD', 'PPP Department', (SELECT id FROM directorates WHERE code = 'PPP'), 'PPP project coordination');

INSERT INTO units (code, name, department_id, description) VALUES
('ICTSU', 'ICT Support Unit', (SELECT id FROM departments WHERE code = 'ICTD'), 'First-line technical support'),
('ICTSD', 'ICT Systems Dev', (SELECT id FROM departments WHERE code = 'ICTD'), 'Systems development team'),
('BUDU', 'Budget Unit', (SELECT id FROM departments WHERE code = 'BFA'), 'Budget formulation'),
('FISCU', 'Fiscal Policy Unit', (SELECT id FROM departments WHERE code = 'BFA'), 'Fiscal analysis'),
('DEBU', 'Debt Recording Unit', (SELECT id FROM departments WHERE code = 'DEB'), 'Debt management system');

-- ============================================
-- SEED DATA - Ticket Priorities
-- ============================================

INSERT INTO ticket_priorities (code, name, sla_minutes, escalation_threshold, color_code) VALUES
('P1-CRIT', 'Critical', 60, 15, '#dc3545'),
('P2-HIGH', 'High', 120, 30, '#fd7e14'),
('P3-MED', 'Medium', 240, 60, '#ffc107'),
('P4-LOW', 'Low', 480, 120, '#28a745');

-- ============================================
-- SEED DATA - Ticket Categories
-- ============================================

INSERT INTO ticket_categories (code, name, description, sla_minutes) VALUES
('HW-PRINT', 'Printer/Scanner', 'Hardware printing and scanning issues', 120),
('HW-SYS', 'System Hardware', 'Desktop, laptop, monitor issues', 180),
('SW-IFMIS', 'IFMIS', 'IFMIS application errors and connectivity', 60),
('SW-GPAY', 'G-Pay/E-Payment', 'G-Pay gateway and payment issues', 60),
('NET-CONN', 'Network/Internet', 'Wi-Fi, LAN, and connectivity', 90),
('SEC-CERT', 'Digital Certificate', 'PKI certificate and e-signature issues', 60),
('ACC-AUTH', 'Access/Auth', 'Login, password, access denied', 90),
('PERIPH', 'Peripherals', 'Biometric readers, UPS, VoIP phones', 120),
('SOFT-APP', 'Applications', 'Office suite, browsers, general software', 180);

-- ============================================
-- SEED DATA - Asset Types
-- ============================================

INSERT INTO asset_types (code, name, category, manufacturer, model_pattern) VALUES
('DESKTOP', 'Desktop Workstation', 'computing', 'Dell', 'OptiPlex%'),
('LAPTOP', 'Laptop', 'computing', 'Dell/HP', 'Latitude%/ProBook%'),
('TABLET', 'Tablet', 'computing', 'Samsung', 'Galaxy Tab%'),
('PRINTER', 'Network Printer', 'peripheral', 'HP', 'LaserJet%'),
('SCANNER', 'Network Scanner', 'peripheral', 'Fujitsu', 'fi%'),
('UPS', 'UPS Unit', 'peripheral', 'APC', 'Back-UPS%'),
('BIO', 'Biometric Reader', 'peripheral', 'SecuGen', 'Hamster%'),
('VOIP', 'VoIP Phone', 'network', 'Cisco', 'SPA%'),
('AP', 'Wi-Fi Access Point', 'network', 'Ubiquiti', 'UAP%'),
('MONITOR', 'Monitor', 'peripheral', 'Dell', 'P%');

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
-- ============================================

INSERT INTO knowledge_base (title, content, category_id, tags, issue_type, priority_level, created_by) VALUES
('IFMIS Login Failure - Clear Browser Cache', 'To resolve IFMIS login failures: 1. Clear browser cache and cookies for the IFMIS domain. 2. Close all browser windows. 3. Re-open browser and navigate to IFMIS. 4. Clear SSL state via Internet Options. 5. Try logging in again.', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis', 'login', 'cache', 'browser'], 'ifmis', 1, NULL),

('IFMIS Connection Timed Out', 'Check IFMIS connectivity: 1. Verify your internet connection is active. 2. Ping the IFMIS server (if known). 3. Check proxy settings in browser. 4. Ensure firewall rules allow IFMIS traffic. 5. Contact ICT if issue persists.', (SELECT id FROM kb_categories WHERE code = 'IFMIS'), ARRAY['ifmis', 'timeout', 'connectivity'], 'ifmis', 2, NULL),

('G-Pay Slow Performance', 'Optimize G-Pay performance: 1. Clear browser cache. 2. Close unused applications. 3. Check CPU and memory usage. 4. Restart the G-Pay service if accessible. 5. Verify network bandwidth is not saturated.', (SELECT id FROM kb_categories WHERE code = 'GPAY'), ARRAY['g-pay', 'slow', 'performance'], 'g-pay', 2, NULL),

('Expired Digital Certificate', 'Digital certificate troubleshooting: 1. Check certificate expiry date in browser. 2. Renew certificate through PKI portal. 3. Install renewed certificate. 4. Restart browser. 5. For urgent issues, contact ICT Security Unit.', (SELECT id FROM kb_categories WHERE code = 'SEC-CERT'), ARRAY['certificate', 'pki', 'expired', 'renew'], 'certificate', 1, NULL),

('Printer Offline or Not Responding', 'Printer troubleshooting: 1. Check printer power and network cable. 2. Verify IP address has not changed. 3. Clear print queue. 4. Restart Print Spooler service. 5. Re-add printer if needed. 6. Check toner levels.', (SELECT id FROM kb_categories WHERE code = 'HW-PRINT'), ARRAY['printer', 'offline', 'network', 'spooler'], 'printer', 2, NULL),

('Cannot Access Shared Folder - Access Denied', 'Resolve "Access Denied" errors: 1. Verify you have permissions to the folder. 2. Check that you are connected to the correct network. 3. Clear cached credentials (net use * /delete). 4. Re-map the network drive with correct credentials. 5. Contact ICT for permission review.', (SELECT id FROM kb_categories WHERE code = 'NET'), ARRAY['shared', 'folder', 'permission', 'access'], 'access', 2, NULL),

('Monitor Flickering or No Display', 'Monitor issues: 1. Check cable connections (VGA/HDMI/DP). 2. Try a different cable or port. 3. Adjust refresh rate in display settings. 4. Test with another monitor if available. 5. Update graphics drivers.', (SELECT id FROM kb_categories WHERE code = 'HW-SYS'), ARRAY['monitor', 'display', 'flicker', 'no signal'], 'monitor', 3, NULL),

('Biometric Reader Not Recognized', 'Biometric device troubleshooting: 1. Clean reader surface gently. 2. Reinstall biometric drivers. 3. Check USB connection. 4. Re-enroll fingerprints in Windows Settings. 5. Test with another USB port.', (SELECT id FROM kb_categories WHERE code = 'PERIPH'), ARRAY['biometric', 'fingerprint', 'reader', 'login'], 'biometric', 3, NULL),

('System Will Not Boot - No Power', 'System won''t boot: 1. Check power cable and outlet. 2. Test with a different power cable. 3. Check UPS/battery backup. 4. Listen for beep codes. 5. If no power, likely power supply failure - contact ICT.', (SELECT id FROM kb_categories WHERE code = 'HW-SYS'), ARRAY['boot', 'power', 'no start', 'psu'], 'power', 1, NULL),

('VPN Disconnects Frequently', 'VPN stability: 1. Check internet stability. 2. Update VPN client software. 3. Check for IP conflicts. 4. Disable sleep mode for network adapter. 5. Contact ICT for VPN server status.', (SELECT id FROM kb_categories WHERE code = 'NET'), ARRAY['vpn', 'disconnect', 'remote'], 'vpn', 2, NULL);

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
CREATE INDEX idx_pki_valid_to ON pki_certificates(valid_to);

COMMENT ON TABLE pki_certificates IS 'PKI certificate repository - integrates with Government CA';