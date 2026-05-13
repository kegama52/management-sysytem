const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');

const router = express.Router();

const createUserSchema = Joi.object({
    governmentId: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    role: Joi.string().valid('admin', 'ict_officer', 'ict_supervisor', 'officer', 'auditor').required(),
    unitCode: Joi.string().required(),
    phoneNumber: Joi.string().optional()
});

router.get('/', async (req, res) => {
    try {
        const { role, unit, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT u.id, u.government_id, u.email, u.first_name, u.last_name,
                   u.role, u.phone_number, u.is_active, u.last_login,
                   u2.code as unit_code, u2.name as unit_name,
                   d.name as directorate_name
            FROM users u
            LEFT JOIN units u2 ON u.unit_id = u2.id
            LEFT JOIN departments dep ON u2.department_id = dep.id
            LEFT JOIN directorates d ON dep.directorate_id = d.id
            WHERE 1=1
        `;
        const params = [];

        if (role) {
            query += ` AND u.role = $${params.length + 1}`;
            params.push(role);
        }
        if (unit) {
            query += ` AND u2.code = $${params.length + 1}`;
            params.push(unit);
        }

        query += ` ORDER BY u.last_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await req.pool.query(query, params);

        res.json({
            users: rows.map(u => ({
                id: u.id,
                governmentId: u.government_id,
                email: u.email,
                firstName: u.first_name,
                lastName: u.last_name,
                role: u.role,
                phoneNumber: u.phone_number,
                isActive: u.is_active,
                lastLogin: u.last_login,
                unit: {
                    code: u.unit_code,
                    name: u.unit_name
                },
                directorate: u.directorate_name
            }))
        });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/hierarchy', async (req, res) => {
    try {
        const { rows: directorates } = await req.pool.query(`
            SELECT d.*,
                   (SELECT json_agg(dep.*) FROM departments dep WHERE dep.directorate_id = d.id AND dep.is_active = true) as departments
            FROM directorates d
            WHERE d.is_active = true
            ORDER BY d.hierarchy_level, d.name
        `);

        res.json({ directorates });
    } catch (err) {
        console.error('Get hierarchy error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/ict-officers', async (req, res) => {
    try {
        const { rows } = await req.pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number,
                   u2.code as unit_code, u2.name as unit_name,
                   os.status as current_status,
                   os.current_ticket_id
            FROM users u
            JOIN units u2 ON u.unit_id = u2.id
            LEFT JOIN officer_current_status os ON u.id = os.officer_id
            WHERE u.role = 'ict_officer' AND u.is_active = true
            ORDER BY u.last_name
        `);

        res.json({
            officers: rows.map(o => ({
                id: o.id,
                firstName: o.first_name,
                lastName: o.last_name,
                email: o.email,
                phoneNumber: o.phone_number,
                unit: { code: o.unit_code, name: o.unit_name },
                status: o.current_status || 'offline',
                currentTicket: o.current_ticket_id
            }))
        });
    } catch (err) {
        console.error('Get ICT officers error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/hierarchy-full', async (req, res) => {
    try {
        const { rows: directorates } = await req.pool.query(`
            SELECT d.id, d.code, d.name, d.description,
                   json_agg(
                       json_build_object(
                           'id', dep.id,
                           'code', dep.code,
                           'name', dep.name,
                           'description', dep.description,
                           'units', (
                               SELECT json_agg(
                                   json_build_object(
                                       'id', u.id,
                                       'code', u.code,
                                       'name', u.name,
                                       'description', u.description
                                   )
                               )
                               FROM units u
                               WHERE u.department_id = dep.id AND u.is_active = true
                           )
                       )
                   ) FILTER (WHERE dep.id IS NOT NULL) as departments
            FROM directorates d
            LEFT JOIN departments dep ON d.id = dep.directorate_id AND dep.is_active = true
            WHERE d.is_active = true
            GROUP BY d.id, d.code, d.name, d.description
            ORDER BY d.hierarchy_level, d.name
        `);

        res.json({ directorates });
    } catch (err) {
        console.error('Get full hierarchy error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/pki-register', async (req, res) => {
    try {
        const { certificate_serial, certificate_dn, email } = req.body;

        if (!certificate_serial || !certificate_dn || !email) {
            return res.status(400).json({ error: 'Certificate serial, DN, and email required' });
        }

        const { rows: userRows } = await req.pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found with this email' });
        }

        const userId = userRows[0].id;

        const { rows: certRows } = await req.pool.query(
            'SELECT * FROM pki_certificates WHERE serial_number = $1',
            [certificate_serial]
        );

        if (certRows.length > 0) {
            return res.status(409).json({ error: 'Certificate already registered' });
        }

        const certId = require('uuid').v4();
        await req.pool.query(`
            INSERT INTO pki_certificates (
                id, user_id, certificate_dn, serial_number,
                valid_from, valid_to, certificate_data
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 
                     CURRENT_TIMESTAMP + INTERVAL '2 years', $5)
        `, [certId, userId, certificate_dn, certificate_serial, '{}']);

        await req.pool.query(
            'UPDATE users SET pki_certificate_serial = $1, pki_certificate_dn = $2 WHERE id = $3',
            [certificate_serial, certificate_dn, userId]
        );

        res.json({
            message: 'PKI certificate registered successfully',
            userId,
            certificateSerial: certificate_serial
        });
    } catch (err) {
        console.error('PKI register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/pki-certificates', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await req.pool.query(`
            SELECT * FROM pki_certificates 
            WHERE user_id = $1 
            ORDER BY valid_to DESC
        `, [id]);

        res.json({ certificates: rows });
    } catch (err) {
        console.error('Get PKI certificates error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;