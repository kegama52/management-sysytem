const express = require('express');
const Joi = require('joi');

const router = express.Router();

router.get('/search', async (req, res) => {
    try {
        const { q, category, tags, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        let query = `
            SELECT kb.*,
                   kbc.name as category_name
            FROM knowledge_base kb
            LEFT JOIN kb_categories kbc ON kb.category_id = kbc.id
            WHERE kb.is_active = true
              AND (
                  to_tsvector('english', kb.title || ' ' || kb.content) @@ plainto_tsquery('english', $1)
                  OR kb.title ILIKE $2
                  OR kb.content ILIKE $2
              )
        `;
        const params = [q, `%${q}%`];

        if (category) {
            query += ` AND kbc.code = $${params.length + 1}`;
            params.push(category);
        }

        query += ` ORDER BY 
            CASE 
                WHEN kb.title ILIKE $${params.length + 1} THEN 1
                WHEN kb.content ILIKE $${params.length + 1} THEN 2
                ELSE 3
            END,
            kb.view_count DESC,
            kb.helpful_count DESC
            LIMIT $${params.length + 2}`;
        params.push(`%${q}%`, limit);

        const { rows } = await req.pool.query(query, params);

        for (const row of rows) {
            await req.pool.query(
                'UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = $1',
                [row.id]
            );
        }

        res.json({
            query: q,
            results: rows.map(kb => ({
                id: kb.id,
                title: kb.title,
                content: kb.content,
                category: kb.category_name,
                tags: kb.tags,
                issueType: kb.issue_type,
                priorityLevel: kb.priority_level,
                helpfulCount: kb.helpful_count,
                viewCount: kb.view_count
            }))
        });
    } catch (err) {
        console.error('KB search error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/articles', async (req, res) => {
    try {
        const { category, issueType, limit = 50 } = req.query;

        let query = `
            SELECT kb.*,
                   kbc.name as category_name
            FROM knowledge_base kb
            LEFT JOIN kb_categories kbc ON kb.category_id = kbc.id
            WHERE kb.is_active = true
        `;
        const params = [];

        if (category) {
            query += ` AND kbc.code = $${params.length + 1}`;
            params.push(category);
        }
        if (issueType) {
            query += ` AND kb.issue_type = $${params.length + 1}`;
            params.push(issueType);
        }

        query += ` ORDER BY kb.priority_level ASC, kb.view_count DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const { rows } = await req.pool.query(query, params);

        res.json({
            articles: rows.map(kb => ({
                id: kb.id,
                title: kb.title,
                content: kb.content,
                category: kb.category_name,
                tags: kb.tags,
                issueType: kb.issue_type,
                priorityLevel: kb.priority_level,
                viewCount: kb.view_count
            }))
        });
    } catch (err) {
        console.error('Get articles error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/article/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await req.pool.query(`
            SELECT kb.*,
                   kbc.name as category_name,
                   kbc.code as category_code
            FROM knowledge_base kb
            LEFT JOIN kb_categories kbc ON kb.category_id = kbc.id
            WHERE kb.id = $1 AND kb.is_active = true
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const kb = rows[0];

        await req.pool.query(
            'UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = $1',
            [id]
        );

        res.json({
            article: {
                id: kb.id,
                title: kb.title,
                content: kb.content,
                category: { name: kb.category_name, code: kb.category_code },
                tags: kb.tags,
                issueType: kb.issue_type,
                applicableAssetTypes: kb.applicable_asset_types,
                priorityLevel: kb.priority_level,
                viewCount: kb.view_count + 1,
                helpfulCount: kb.helpful_count,
                createdAt: kb.created_at
            }
        });
    } catch (err) {
        console.error('Get article error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/interaction', async (req, res) => {
    try {
        const { userId, queryText, suggestedSolution, kbArticleId, resolved, ticketCreated } = req.body;

        const { rows } = await req.pool.query(`
            INSERT INTO ai_interactions (
                id, user_id, query_text, suggested_solution,
                kb_article_id, resolved, ticket_created, interaction_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            RETURNING *
        `, [
            require('uuid').v4(),
            userId || null,
            queryText,
            suggestedSolution,
            kbArticleId || null,
            resolved || false,
            ticketCreated || null
        ]);

        res.status(201).json({
            message: 'Interaction logged',
            interactionId: rows[0].id
        });
    } catch (err) {
        console.error('Log interaction error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/faq', async (req, res) => {
    try {
        const { rows } = await req.pool.query(`
            SELECT id, title, issue_type, category_id,
                   kbc.name as category_name
            FROM knowledge_base kb
            LEFT JOIN kb_categories kbc ON kb.category_id = kbc.id
            WHERE kb.is_active = true
              AND kb.priority_level <= 2
            ORDER BY kb.view_count DESC
            LIMIT 20
        `);

        res.json({
            faq: rows.map(r => ({
                id: r.id,
                title: r.title,
                issueType: r.issue_type,
                category: r.category_name
            }))
        });
    } catch (err) {
        console.error('Get FAQ error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/feedback/:articleId', async (req, res) => {
    try {
        const { articleId } = req.params;
        const { helpful } = req.body;

        if (typeof helpful !== 'boolean') {
            return res.status(400).json({ error: 'Helpful must be boolean' });
        }

        const updateField = helpful ? 'helpful_count' : 'view_count';
        await req.pool.query(
            `UPDATE knowledge_base SET ${updateField} = ${updateField} + 1 WHERE id = $1`,
            [articleId]
        );

        res.json({ message: helpful ? 'Marked helpful' : 'Marked not helpful' });
    } catch (err) {
        console.error('Feedback error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/chat', async (req, res) => {
    try {
        const { query, userId } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }

        const cleanQuery = query.trim();
        if (cleanQuery.length === 0) {
            return res.status(400).json({ error: 'Query cannot be empty' });
        }

        const searchTerm = `%${cleanQuery}%`;

        const { rows: kbResults } = await req.pool.query(`
            SELECT kb.id, kb.title, kb.content, kbc.name as category_name,
                   kb.tags, kb.priority_level, kb.view_count, kb.helpful_count
            FROM knowledge_base kb
            LEFT JOIN kb_categories kbc ON kb.category_id = kbc.id
            WHERE kb.is_active = true
              AND (
                  LOWER(kb.title) LIKE LOWER($1)
                  OR LOWER(kb.content) LIKE LOWER($1)
              )
            ORDER BY kb.priority_level ASC, kb.view_count DESC
            LIMIT 5
        `, [searchTerm]);

        const { rows: faqResults } = await req.pool.query(`
            SELECT kb.id, kb.title, kb.issue_type, kbc.name as category_name
            FROM knowledge_base kb
            LEFT JOIN kb_categories kbc ON kb.category_id = kbc.id
            WHERE kb.is_active = true
              AND kb.priority_level <= 2
              AND (LOWER(kb.title) LIKE LOWER($1) OR LOWER(kb.content) LIKE LOWER($1))
            ORDER BY kb.view_count DESC
            LIMIT 3
        `, [searchTerm]);

        const suggestions = kbResults.map(kb => ({
            id: kb.id,
            title: kb.title,
            content: kb.content,
            category: kb.category_name,
            tags: kb.tags,
            priorityLevel: kb.priority_level,
            relevance: Math.min(100, (kb.view_count + kb.helpful_count + 1) * 2)
        }));

        const faqs = faqResults.map(faq => ({
            id: faq.id,
            title: faq.title,
            issueType: faq.issue_type,
            category: faq.category_name
        }));

        const shouldCreateTicket = suggestions.length === 0 ||
            (suggestions.length > 0 && suggestions[0].priorityLevel >= 4);

        (async () => {
            try {
                const suggestedSolution = suggestions.length > 0 ? suggestions[0].content : null;
                const kbArticleId = suggestions.length > 0 ? suggestions[0].id : null;

                await req.pool.query(`
                    INSERT INTO ai_interactions (
                        id, user_id, query_text, suggested_solution,
                        kb_article_id, resolved, ticket_created, interaction_time
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                `, [
                    require('uuid').v4(),
                    userId || null,
                    cleanQuery,
                    suggestedSolution,
                    kbArticleId,
                    false,
                    null
                ]);
            } catch (logErr) {
                console.error('Failed to log interaction:', logErr.message);
            }
        })();

        res.json({
            query: cleanQuery,
            suggestions,
            faqs,
            shouldCreateTicket,
            message: shouldCreateTicket
                ? 'No exact match found. Consider creating a ticket for further assistance.'
                : `Found ${suggestions.length} relevant solution(s). Review them below.`
        });
    } catch (err) {
        console.error('AI chat error:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: err.message
        });
    }
});

module.exports = router;