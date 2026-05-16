const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const authSchema = Joi.object({
    email: Joi.string().pattern(/^[^\s@]+@[^\s@]+$/).required(),
    password: Joi.string().min(8).required()
});

const pkiAuthSchema = Joi.object({
    certificate_serial: Joi.string().required(),
    certificate_dn: Joi.string().required()
});

const registerSchema = Joi.object({
    email: Joi.string().pattern(/^[^\s@]+@[^\s@]+$/).required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    phoneNumber: Joi.string().optional(),
    governmentId: Joi.string().optional(),
    directorateCode: Joi.string().optional(),
    departmentCode: Joi.string().optional(),
    unitCode: Joi.string().optional()
});

router.post('/login', async (req, res) => {
    try {
        const { error } = authSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { email, password } = req.body;

        const { rows } = await req.pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'tiisgs-secret-key-2024',
            { expiresIn: '8h' }
        );

        await req.pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                governmentId: user.government_id
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login-pki', async (req, res) => {
    try {
        const { error } = pkiAuthSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { certificate_serial, certificate_dn } = req.body;

        const { rows } = await req.pool.query(`
            SELECT u.* FROM users u
            JOIN pki_certificates pc ON u.id = pc.user_id
            WHERE pc.serial_number = $1
            AND pc.certificate_dn = $2
            AND pc.valid_to > CURRENT_TIMESTAMP
            AND pc.revoked = false
            AND u.is_active = true
        `, [certificate_serial, certificate_dn]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired certificate' });
        }

        const user = rows[0];

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'tiisgs-secret-key-2024',
            { expiresIn: '8h' }
        );

        await req.pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        res.json({
            token,
            authMethod: 'pki',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                governmentId: user.government_id
            }
        });
    } catch (err) {
        console.error('PKI login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        const { rows } = await req.pool.query(`
            SELECT u.*,
                   d.name as directorate_name,
                   dep.name as department_name,
                   u2.name as unit_name
            FROM users u
            LEFT JOIN units u2 ON u.unit_id = u2.id
            LEFT JOIN departments dep ON u2.department_id = dep.id
            LEFT JOIN directorates d ON dep.directorate_id = d.id
            WHERE u.id = $1 AND u.is_active = true
        `, [decoded.userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            governmentId: user.government_id,
            phoneNumber: user.phone_number,
            pkiCertificate: user.pki_certificate_serial ? {
                serial: user.pki_certificate_serial,
                expiry: user.pki_certificate_expiry
            } : null,
            organization: {
                directorate: user.directorate_name,
                department: user.department_name,
                unit: user.unit_name
            }
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('Auth check error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

router.post('/register', async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const {
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            governmentId,
            unitCode
        } = req.body;

        // Check if user already exists
        const { rows: existingUsers } = await req.pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        if (governmentId) {
            const { rows: existingGov } = await req.pool.query(
                'SELECT id FROM users WHERE government_id = $1',
                [governmentId]
            );
            if (existingGov.length > 0) {
                return res.status(409).json({ error: 'Government ID already in use' });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Get unit_id - either specified or find a default unit
        let unit_id = null;
        if (unitCode) {
            const { rows: unitRows } = await req.pool.query(
                'SELECT id FROM units WHERE code = $1',
                [unitCode]
            );
            if (unitRows.length > 0) {
                unit_id = unitRows[0].id;
            }
        }

        // If no unit specified, assign to Budget Unit (BUDU) as default
        if (!unit_id) {
            const { rows: defaultUnit } = await req.pool.query(
                "SELECT id FROM units WHERE code = 'BUDU' LIMIT 1"
            );
            if (defaultUnit.length > 0) {
                unit_id = defaultUnit[0].id;
            }
        }

        // Generate UUIDs
        const userId = uuidv4();
        const finalGovernmentId = governmentId || `USER-${Date.now().toString(36).toUpperCase()}`;

        // Insert new user
        await req.pool.query(`
            INSERT INTO users (
                id, government_id, email, password_hash,
                first_name, last_name, phone_number,
                role, unit_id, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'officer', $8, true, CURRENT_TIMESTAMP)
        `, [
            userId,
            finalGovernmentId,
            email,
            passwordHash,
            firstName,
            lastName,
            phoneNumber || null,
            unit_id
        ]);

        // Generate JWT token for auto-login
        const token = jwt.sign(
            { userId, role: 'officer' },
            process.env.JWT_SECRET || 'tiisgs-secret-key-2024',
            { expiresIn: '8h' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: userId,
                email,
                firstName,
                lastName,
                role: 'officer',
                governmentId: finalGovernmentId
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const { rows } = await req.pool.query(
            'SELECT id, email FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const resetToken = uuidv4();
        const expiry = new Date(Date.now() + 3600000); // 1 hour from now

        await req.pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
            [resetToken, expiry, rows[0].id]
        );

        res.json({ message: 'Password reset instructions sent to your email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;