const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const createTicketSchema = Joi.object({
    title: Joi.string().min(5).max(255).required(),
    description: Joi.string().min(10).required(),
    priority: Joi.string().required(),
    category: Joi.string().required(),
    attachments: Joi.array().items(Joi.string())
});

router.get('/', async (req, res) => {
    try {
        const { status, assigned_to, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT t.*,
                   p.name as priority_name,
                   p.color_code,
                   c.name as category_name,
                   r.first_name || ' ' || r.last_name as reporter_name,
                   a.first_name || ' ' || a.last_name as assigned_name,
                   d.name as directorate_name,
                   u.name as unit_name
            FROM tickets t
            JOIN ticket_priorities p ON t.priority_id = p.id
            JOIN ticket_categories c ON t.category_id = c.id
            JOIN users r ON t.reporter_id = r.id
            JOIN directorates d ON t.directorate_id = d.id
            JOIN units u ON t.unit_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND t.status = $${params.length + 1}`;
            params.push(status);
        }
        if (assigned_to) {
            query += ` AND t.assigned_to = $${params.length + 1}`;
            params.push(assigned_to);
        }

        query += ` ORDER BY 
            CASE 
                WHEN t.status IN ('open', 'assigned') THEN 1
                WHEN t.status = 'in_progress' THEN 2
                ELSE 3
            END,
            t.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await req.pool.query(query, params);

        const tickets = rows.map(t => ({
            id: t.id,
            ticketNumber: t.ticket_number,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: { id: t.priority_id, name: t.priority_name, color: t.color_code },
            category: { id: t.category_id, name: t.category_name },
            reporter: { id: t.reporter_id, name: t.reporter_name },
            assignedTo: t.assigned_to ? { id: t.assigned_to, name: t.assigned_name } : null,
            organization: {
                directorate: t.directorate_name,
                unit: t.unit_name
            },
            timeSpent: t.time_spent_minutes,
            createdAt: t.created_at,
            assignedAt: t.assigned_at,
            resolvedAt: t.resolved_at
        }));

        res.json({ tickets });
    } catch (err) {
        console.error('Get tickets error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows: ticketRows } = await req.pool.query(`
            SELECT t.*,
                   p.name as priority_name,
                   p.color_code,
                   c.name as category_name,
                   c.code as category_code,
                   r.first_name || ' ' || r.last_name as reporter_name,
                   r.email as reporter_email,
                   r.phone_number as reporter_phone,
                   a.first_name || ' ' || a.last_name as assigned_name,
                   a.email as assigned_email,
                   d.name as directorate_name,
                   u.name as unit_name
            FROM tickets t
            JOIN ticket_priorities p ON t.priority_id = p.id
            JOIN ticket_categories c ON t.category_id = c.id
            JOIN users r ON t.reporter_id = r.id
            JOIN directorates d ON t.directorate_id = d.id
            JOIN units u ON t.unit_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            WHERE t.id = $1
        `, [id]);

        if (ticketRows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = ticketRows[0];

        const { rows: comments } = await req.pool.query(`
            SELECT c.*,
                   u.first_name || ' ' || u.last_name as author_name,
                   u.role as author_role
            FROM ticket_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.ticket_id = $1
            ORDER BY c.created_at ASC
        `, [id]);

        const { rows: attachments } = await req.pool.query(`
            SELECT * FROM ticket_attachments WHERE ticket_id = $1
        `, [id]);

        const { rows: history } = await req.pool.query(`
            SELECT h.*,
                   u.first_name || ' ' || u.last_name as changed_by_name
            FROM ticket_history h
            JOIN users u ON h.changed_by = u.id
            WHERE h.ticket_id = $1
            ORDER BY h.changed_at DESC
        `, [id]);

        res.json({
            ticket: {
                id: ticket.id,
                ticketNumber: ticket.ticket_number,
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: { id: ticket.priority_id, name: ticket.priority_name, color: ticket.color_code },
                category: { id: ticket.category_id, name: ticket.category_name, code: ticket.category_code },
                reporter: {
                    id: ticket.reporter_id,
                    name: ticket.reporter_name,
                    email: ticket.reporter_email,
                    phone: ticket.reporter_phone
                },
                assignedTo: ticket.assigned_to ? {
                    id: ticket.assigned_to,
                    name: ticket.assigned_name,
                    email: ticket.assigned_email
                } : null,
                organization: {
                    directorate: ticket.directorate_name,
                    unit: ticket.unit_name
                },
                timeSpent: ticket.time_spent_minutes,
                resolutionNotes: ticket.resolution_notes,
                resolutionMethod: ticket.resolution_method,
                createdAt: ticket.created_at,
                assignedAt: ticket.assigned_at,
                resolvedAt: ticket.resolved_at,
                closedAt: ticket.closed_at
            },
            comments,
            attachments,
            history
        });
    } catch (err) {
        console.error('Get ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { error } = createTicketSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        const { title, description, priority, category, attachments } = req.body;

        const { rows: priorityRows } = await req.pool.query(
            'SELECT id, sla_minutes FROM ticket_priorities WHERE code = $1',
            [priority]
        );
        if (priorityRows.length === 0) {
            return res.status(400).json({ error: 'Invalid priority' });
        }
        const priority_id = priorityRows[0].id;

        const { rows: categoryRows } = await req.pool.query(
            'SELECT id FROM ticket_categories WHERE code = $1',
            [category]
        );
        if (categoryRows.length === 0) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        const category_id = categoryRows[0].id;

        const { rows: userRows } = await req.pool.query(
            'SELECT unit_id, id as user_id FROM users WHERE id = $1',
            [decoded.userId]
        );
        const user = userRows[0];
        const unit_id = user.unit_id;

        const { rows: unitRows } = await req.pool.query(
            'SELECT department_id FROM units WHERE id = $1',
            [unit_id]
        );
        const { rows: deptRows } = await req.pool.query(
            'SELECT directorate_id FROM departments WHERE id = $1',
            [unitRows[0].department_id]
        );
        const directorate_id = deptRows[0].directorate_id;

        const ticketNumber = `TREQ-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 4)}`;
        const ticketId = uuidv4();

        const client = await req.pool.connect();
        try {
            await client.query('BEGIN');

            const insertTicket = `
                INSERT INTO tickets (
                    id, ticket_number, title, description, priority_id,
                    category_id, reporter_id, assigned_to, unit_id,
                    directorate_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const { rows: ticketResult } = await client.query(insertTicket, [
                ticketId, ticketNumber, title, description, priority_id,
                category_id, decoded.userId, null, unit_id,
                directorate_id
            ]);

            await client.query(
                'INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
                [ticketId, decoded.userId, 'status', null, 'open']
            );

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Ticket created successfully',
                ticket: {
                    id: ticketResult[0].id,
                    ticketNumber: ticketResult[0].ticket_number,
                    title: ticketResult[0].title,
                    status: ticketResult[0].status,
                    createdAt: ticketResult[0].created_at
                }
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Create ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { officerId } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        const { rows: ticketRows } = await req.pool.query(
            'SELECT * FROM tickets WHERE id = $1',
            [id]
        );
        if (ticketRows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = ticketRows[0];

        await req.pool.query(
            'UPDATE tickets SET assigned_to = $1, status = $2, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [officerId, 'assigned', id]
        );

        await req.pool.query(
            'INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
            [id, decoded.userId, 'assigned_to', ticket.assigned_to || null, officerId]
        );

        await req.pool.query(
            'INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
            [id, decoded.userId, 'status', ticket.status, 'assigned']
        );

        res.json({ message: 'Ticket assigned successfully' });
    } catch (err) {
        console.error('Assign ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { resolutionNotes, resolutionMethod } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        await req.pool.query(
            `UPDATE tickets 
             SET status = 'resolved', 
                 resolved_at = CURRENT_TIMESTAMP,
                 closed_at = CURRENT_TIMESTAMP,
                 resolution_notes = $1,
                 resolution_method = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [resolutionNotes, resolutionMethod, id]
        );

        await req.pool.query(
            'INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
            [id, decoded.userId, 'status', 'in_progress', 'resolved']
        );

        res.json({ message: 'Ticket resolved successfully' });
    } catch (err) {
        console.error('Resolve ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/comment', async (req, res) => {
    try {
        const { id } = req.params;
        const { comment, isInternal } = req.body;

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        const commentId = uuidv4();

        await req.pool.query(
            `INSERT INTO ticket_comments (id, ticket_id, author_id, comment, is_internal, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [commentId, id, decoded.userId, comment, isInternal || false]
        );

        res.status(201).json({ message: 'Comment added', commentId });
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/queue/pending', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tiisgs-secret-key-2024');

        const { rows } = await req.pool.query(`
            SELECT t.*, p.sla_minutes,
                   EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at))/60 as wait_minutes
            FROM tickets t
            JOIN ticket_priorities p ON t.priority_id = p.id
            WHERE t.status IN ('open', 'assigned')
              AND t.unit_id IN (
                  SELECT unit_id FROM users WHERE id = $1
              )
            ORDER BY 
                CASE t.status WHEN 'open' THEN 1 ELSE 2 END,
                p.sla_minutes ASC,
                t.created_at ASC
        `, [decoded.userId]);

        res.json({
            pendingCount: rows.length,
            tickets: rows.map(t => ({
                id: t.id,
                ticketNumber: t.ticket_number,
                title: t.title,
                status: t.status,
                prioritySLA: t.sla_minutes,
                waitMinutes: Math.floor(t.wait_minutes),
                urgency: t.sla_minutes - Math.floor(t.wait_minutes)
            }))
        });
    } catch (err) {
        console.error('Get queue error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const { rows } = await req.pool.query(
            'SELECT * FROM ticket_categories WHERE is_active = true ORDER BY name'
        );
        res.json({ categories: rows });
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/priorities', async (req, res) => {
    try {
        const { rows } = await req.pool.query(
            'SELECT * FROM ticket_priorities ORDER BY sla_minutes'
        );
        res.json({ priorities: rows });
    } catch (err) {
        console.error('Get priorities error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;