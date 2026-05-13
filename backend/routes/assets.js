const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const createAssetSchema = Joi.object({
    assetTag: Joi.string().required(),
    serialNumber: Joi.string().optional(),
    assetTypeCode: Joi.string().required(),
    statusCode: Joi.string().required(),
    unitCode: Joi.string().optional(),
    location: Joi.string().optional(),
    purchaseDate: Joi.date().optional(),
    warrantyExpiry: Joi.date().optional(),
    specifications: Joi.object().optional(),
    notes: Joi.string().optional()
});

router.get('/', async (req, res) => {
    try {
        const { status, type, assigned_to, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT a.*,
                   at.code as asset_type_code,
                   at.name as asset_type_name,
                   at.category as asset_category,
                   ast.code as status_code,
                   ast.name as status_name,
                   u.code as unit_code,
                   u.name as unit_name,
                   usr.first_name || ' ' || usr.last_name as assigned_to_name
            FROM assets a
            JOIN asset_types at ON a.asset_type_id = at.id
            JOIN asset_status ast ON a.status_id = ast.id
            LEFT JOIN units u ON a.unit_id = u.id
            LEFT JOIN users usr ON a.assigned_to = usr.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND ast.code = $${params.length + 1}`;
            params.push(status);
        }
        if (type) {
            query += ` AND at.code = $${params.length + 1}`;
            params.push(type);
        }
        if (assigned_to) {
            query += ` AND a.assigned_to = $${params.length + 1}`;
            params.push(assigned_to);
        }

        query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await req.pool.query(query, params);

        const assets = rows.map(a => ({
            id: a.id,
            assetTag: a.asset_tag,
            serialNumber: a.serial_number,
            type: {
                code: a.asset_type_code,
                name: a.asset_type_name,
                category: a.asset_category
            },
            status: {
                code: a.status_code,
                name: a.status_name
            },
            unit: a.unit_code ? { code: a.unit_code, name: a.unit_name } : null,
            assignedTo: a.assigned_to ? { name: a.assigned_to_name } : null,
            location: a.location,
            purchaseDate: a.purchase_date,
            warrantyExpiry: a.warranty_expiry,
            specifications: a.specifications,
            notes: a.notes,
            createdAt: a.created_at
        }));

        res.json({ assets });
    } catch (err) {
        console.error('Get assets error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/types', async (req, res) => {
    try {
        const { rows } = await req.pool.query(
            'SELECT * FROM asset_types ORDER BY category, name'
        );
        res.json({ types: rows });
    } catch (err) {
        console.error('Get asset types error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/statuses', async (req, res) => {
    try {
        const { rows } = await req.pool.query(
            'SELECT * FROM asset_status ORDER BY name'
        );
        res.json({ statuses: rows });
    } catch (err) {
        console.error('Get asset statuses error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { error } = createAssetSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        const {
            assetTag,
            serialNumber,
            assetTypeCode,
            statusCode,
            unitCode,
            location,
            purchaseDate,
            warrantyExpiry,
            specifications,
            notes
        } = req.body;

        const { rows: typeRows } = await req.pool.query(
            'SELECT id FROM asset_types WHERE code = $1',
            [assetTypeCode]
        );
        if (typeRows.length === 0) {
            return res.status(400).json({ error: 'Invalid asset type' });
        }
        const asset_type_id = typeRows[0].id;

        const { rows: statusRows } = await req.pool.query(
            'SELECT id FROM asset_status WHERE code = $1',
            [statusCode]
        );
        if (statusRows.length === 0) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const status_id = statusRows[0].id;

        let unit_id = null;
        if (unitCode) {
            const { rows: unitRows } = await req.pool.query(
                'SELECT id FROM units WHERE code = $1',
                [unitCode]
            );
            if (unitRows.length === 0) {
                return res.status(400).json({ error: 'Invalid unit' });
            }
            unit_id = unitRows[0].id;
        }

        const assetId = uuidv4();
        await req.pool.query(`
            INSERT INTO assets (
                id, asset_tag, serial_number, asset_type_id, status_id,
                unit_id, location, purchase_date, warranty_expiry, specifications, notes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        `, [
            assetId, assetTag, serialNumber, asset_type_id, status_id,
            unit_id, location, purchaseDate, warrantyExpiry,
            specifications ? JSON.stringify(specifications) : null, notes
        ]);

        res.status(201).json({
            message: 'Asset created successfully',
            assetId
        });
    } catch (err) {
        console.error('Create asset error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        const allowedFields = ['status_id', 'unit_id', 'assigned_to', 'location', 'warranty_expiry', 'notes'];

        const setClause = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (!allowedFields.includes(key)) continue;

            if (key === 'status_id' || key === 'unit_id') {
                if (value) {
                    const table = key === 'status_id' ? 'asset_status' : 'units';
                    const { rows } = await req.pool.query(
                        `SELECT id FROM ${table} WHERE id = $1`,
                        [value]
                    );
                    if (rows.length === 0) {
                        return res.status(400).json({ error: `Invalid ${key}` });
                    }
                }
            }

            setClause.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }

        if (setClause.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        setClause.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        await req.pool.query(
            `UPDATE assets SET ${setClause.join(', ')} WHERE id = $${paramCount}`,
            values
        );

        res.json({ message: 'Asset updated successfully' });
    } catch (err) {
        console.error('Update asset error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await req.pool.query(`
            SELECT m.*,
                   u.first_name || ' ' || u.last_name as performed_by_name
            FROM asset_maintenance_log m
            LEFT JOIN users u ON m.performed_by = u.id
            WHERE m.asset_id = $1
            ORDER BY m.performed_at DESC
        `, [id]);

        res.json({ maintenance: rows });
    } catch (err) {
        console.error('Get maintenance error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;
        const { maintenanceType, description, cost } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        await req.pool.query(`
            INSERT INTO asset_maintenance_log (asset_id, maintenance_type, description, performed_by, cost, performed_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [id, maintenanceType, description, decoded.userId, cost]);

        res.status(201).json({ message: 'Maintenance record added' });
    } catch (err) {
        console.error('Add maintenance error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;