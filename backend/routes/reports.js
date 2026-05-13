const express = require('express');
const router = express.Router();

router.get('/ttr-report', async (req, res) => {
    try {
        const { startDate, endDate, directorate } = req.query;

        let query = `
            SELECT 
                d.id as directorate_id,
                d.name as directorate_name,
                COUNT(t.id) as total_tickets,
                COUNT(CASE WHEN t.status = 'resolved' OR t.status = 'closed' THEN 1 END) as resolved_count,
                ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)))/60, 2) as avg_ttr_minutes,
                MIN(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)))/60 as min_ttr,
                MAX(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)))/60 as max_ttr
            FROM tickets t
            JOIN directorates d ON t.directorate_id = d.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ` AND t.created_at >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND t.created_at <= $${params.length + 1}`;
            params.push(endDate);
        }
        if (directorate) {
            query += ` AND d.code = $${params.length + 1}`;
            params.push(directorate);
        }

        query += ` GROUP BY d.id, d.name ORDER BY avg_ttr_minutes DESC`;

        const { rows } = await req.pool.query(query, params);

        res.json({
            report: rows.map(r => ({
                directorate: r.directorate_name,
                totalTickets: r.total_tickets,
                resolved: r.resolved_count,
                avgTTR: Math.round(r.avg_ttr_minutes),
                minTTR: Math.round(r.min_ttr),
                maxTTR: Math.round(r.max_ttr)
            }))
        });
    } catch (err) {
        console.error('TTR report error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/officer-performance', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                u.id,
                u.first_name || ' ' || u.last_name as officer_name,
                u.role,
                COUNT(t.id) as total_assigned,
                COUNT(CASE WHEN t.status = 'resolved' OR t.status = 'closed' THEN 1 END) as tickets_resolved,
                ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.assigned_at)))/60, 2) as avg_resolution_time,
                ROUND(SUM(t.time_spent_minutes)/60, 2) as total_hours_logged
            FROM users u
            LEFT JOIN tickets t ON u.id = t.assigned_to
            WHERE u.role IN ('ict_officer', 'ict_supervisor')
        `;
        const params = [];

        if (startDate) {
            query += ` AND (t.assigned_at >= $1 OR t.assigned_at IS NULL)`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND (t.resolved_at <= $${params.length + 1} OR t.resolved_at IS NULL)`;
            params.push(endDate);
        }

        query += ` GROUP BY u.id, u.first_name, u.last_name, u.role ORDER BY avg_resolution_time`;

        const { rows } = await req.pool.query(query, params);

        res.json({
            officers: rows.map(o => ({
                id: o.id,
                name: o.officer_name,
                role: o.role,
                totalAssigned: o.total_assigned || 0,
                ticketsResolved: o.tickets_resolved || 0,
                avgResolutionTime: o.avg_resolution_time ? Math.round(o.avg_resolution_time) : null,
                totalHours: o.total_hours_logged || 0
            }))
        });
    } catch (err) {
        console.error('Officer performance error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/system-stats', async (req, res) => {
    try {
        const { rows } = await req.pool.query(`
            SELECT 
                COUNT(*) as total_tickets,
                COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
                COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
                COUNT(CASE WHEN created_at > CURRENT_DATE THEN 1 END) as today_tickets,
                COUNT(CASE WHEN resolved_at > CURRENT_DATE THEN 1 END) as today_resolved
            FROM tickets
        `);

        const stats = rows[0];

        res.json({
            stats: {
                total: stats.total_tickets,
                open: stats.open,
                assigned: stats.assigned,
                inProgress: stats.in_progress,
                resolved: stats.resolved,
                closed: stats.closed,
                today: {
                    created: stats.today_tickets,
                    resolved: stats.today_resolved
                }
            }
        });
    } catch (err) {
        console.error('System stats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;