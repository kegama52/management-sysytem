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

        const cleanQuery = query.trim().toLowerCase();
        if (cleanQuery.length === 0) {
            return res.status(400).json({ error: 'Query cannot be empty' });
        }

        let message = '';
        let suggestions = [];
        let faqs = [];
        let shouldCreateTicket = false;
        let responseType = 'kb_search'; // 'greeting', 'help', 'kb_search', 'ticket_creation'

        // ==================== CONVERSATIONAL PATTERNS ====================
        // Greetings & social chat
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'habari', 'mambo', 'hujambo', 'salama'];
        const helpPatterns = ['help', 'assist', 'support', 'what can you do', 'how do you work', 'show me', 'guide me'];
        const thanks = ['thank', 'thanks', 'asanti', 'shukrani'];

        if (greetings.some(g => cleanQuery.includes(g))) {
            // Friendly greeting response
            const greetingResponses = [
                "Hello! I'm TIISGS, your ICT support assistant. How can I help you today? You can ask me about IFMIS, G-Pay, printer issues, or any ICT service.",
                "Habari! Karibu kwenye mfumo wa msaada wa ICT. Niko hapa kukusaidia. Unaweza kuniuliza kuhusu IFMIS, G-Pay, au matatizo mengine ya kiteknolojia.",
                "Hi there! I'm your virtual ICT officer. Tell me what issue you're facing, and I'll check the knowledge base for solutions."
            ];
            message = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
            responseType = 'greeting';
            shouldCreateTicket = false;
        }
        else if (helpPatterns.some(h => cleanQuery.includes(h))) {
            message = `I can help you with:\n\n• IFMIS errors and login issues\n• G-Pay payment problems\n• Printer and scanner troubleshooting\n• Network connectivity\n• Digital certificate renewal\n• Hardware repair requests\n\nJust describe your issue, and I'll search our knowledge base. If I can't resolve it, I'll help you create a ticket.`;
            responseType = 'help';
            shouldCreateTicket = false;
        }
        else if (thanks.some(t => cleanQuery.includes(t))) {
            message = "You're welcome! If you need further assistance, I'm here. Otherwise, feel free to create a ticket if your issue persists. Have a great day!";
            responseType = 'greeting';
            shouldCreateTicket = false;
        }
        else if (cleanQuery.includes('create ticket') || cleanQuery.includes('new ticket') || cleanQuery.includes('open ticket')) {
            message = "I'd be happy to help you create a support ticket. Click the 'New Ticket' button in the sidebar or say 'Open ticket' to start. Please provide:\n\n1. A clear title\n2. Detailed description of the issue\n3. Category selection\n\nOr simply say 'Open ticket' and I'll navigate you there.";
            responseType = 'ticket_creation';
            shouldCreateTicket = true;
        }
        else {
            // ==================== KNOWLEDGE BASE SEARCH ====================
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
                      OR LOWER(kb.tags::text) LIKE LOWER($1)
                  )
                ORDER BY 
                    CASE 
                        WHEN LOWER(kb.title) LIKE LOWER($1) THEN 1
                        WHEN LOWER(kb.content) LIKE LOWER($1) THEN 2
                        ELSE 3
                    END,
                    kb.priority_level ASC,
                    kb.view_count DESC
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

            suggestions = kbResults.map(kb => ({
                id: kb.id,
                title: kb.title,
                content: kb.content,
                category: kb.category_name,
                tags: kb.tags,
                priorityLevel: kb.priority_level,
                relevance: Math.min(100, (kb.view_count + kb.helpful_count + 1) * 2)
            }));

            faqs = faqResults.map(faq => ({
                id: faq.id,
                title: faq.title,
                issueType: faq.issue_type,
                category: faq.category_name
            }));

            shouldCreateTicket = suggestions.length === 0 ||
                (suggestions.length > 0 && suggestions[0].priorityLevel >= 4);

            // Build conversational response
            if (suggestions.length > 0) {
                const top = suggestions[0];
                message = `I found ${suggestions.length} relevant solution(s) in our knowledge base.\n\n**Top suggestion: ${top.title}**\n\n${top.content.substring(0, 300)}${top.content.length > 300 ? '...' : ''}\n\nWould you like me to:\n• Read more details aloud?\n• Create a ticket if this doesn't help?\n• Search for something else?`;
                responseType = 'kb_results';
            } else {
                // No KB match - try to understand intent
                if (cleanQuery.includes('ifmis') || cleanQuery.includes('login') || cleanQuery.includes('password')) {
                    message = "I couldn't find an exact match for your IFMIS issue. Since IFMIS is critical, I recommend creating a ticket immediately for the IFMIS Helpdesk (72-hour SLA). Would you like me to help you create a ticket?";
                } else if (cleanQuery.includes('printer') || cleanQuery.includes('print')) {
                    message = "For printer issues, try these self-help steps first:\n\n1. Check if printer is powered on and connected to network\n2. Clear print queue\n3. Restart Print Spooler service\n4. Verify IP address hasn't changed\n\nIf the problem persists after 10 minutes, create a ticket and we'll dispatch an ICT officer within 4 hours (response SLA).";
                } else if (cleanQuery.includes('network') || cleanQuery.includes('wifi') || cleanQuery.includes('internet')) {
                    message = "Network issues are prioritized based on impact:\n\n• IFMIS/G-Pay down → 15-minute response\n• Department systems → 30-minute response\n• General workstation → 2-hour response\n• Constituency office (via hotspot) → Next day\n\nPlease describe your location and which systems are affected.";
                } else {
                    message = "I'm sorry, I couldn't find a matching solution in our knowledge base. However, I can help you create a support ticket. Our ICT team will respond based on the service standards:\n\n• User support: within 30 minutes\n• Email account: within 30 minutes\n• Hardware repair: within 10 working days\n• Major escalation: within 6 weeks\n\nWould you like me to create a ticket for you?";
                }
                shouldCreateTicket = true;
                responseType = 'no_match';
            }
        }

        // Log interaction
        (async () => {
            try {
                const suggestedSolution = suggestions.length > 0 ? suggestions[0].content : null;
                const kbArticleId = suggestions.length > 0 ? suggestions[0].id : null;

                await req.pool.query(`
                    INSERT INTO ai_interactions (
                        id, user_id, query_text, suggested_solution,
                        kb_article_id, resolved, ticket_created, interaction_time, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
                `, [
                    require('uuid').v4(),
                    userId || null,
                    cleanQuery,
                    suggestedSolution,
                    kbArticleId,
                    false,
                    null,
                    JSON.stringify({ responseType, suggestionCount: suggestions.length })
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
            message,
            responseType,
            spokeResponse: true // Flag to indicate TTS should play
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