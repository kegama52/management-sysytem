require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const assetRoutes = require('./routes/assets');
const aikbRoutes = require('./routes/aikb');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Database pool with error handling
let pool;
try {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5324/tiisgs_db',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000
    });

    // Test connection on startup
    pool.connect((err, client, release) => {
        if (err) {
            console.warn('⚠️  Database connection failed:', err.message);
            console.warn('   API will start but database-dependent routes will return errors.');
            console.warn('   Run `node setup-db.js` to initialize the database.\n');
        } else {
            console.log('✅ Connected to PostgreSQL database');
            release();
        }
    });
} catch (err) {
    console.error('Failed to create database pool:', err.message);
    pool = null;
}

// Make pool available to routes (even if null)
app.use((req, res, next) => {
    req.pool = pool;
    next();
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'TIISGS API Running', 
        version: '1.0.0',
        database: pool ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Database check middleware for DB-dependent routes
const requireDB = (req, res, next) => {
    if (!req.pool) {
        return res.status(503).json({ 
            error: 'Database unavailable',
            message: 'Please set up PostgreSQL database first. See SETUP_GUIDE.md'
        });
    }
    next();
};

// Apply DB requirement to all API routes except auth (login/register still need DB for user lookup)
app.use('/api/auth', requireDB, authRoutes);
app.use('/api/tickets', requireDB, ticketRoutes);
app.use('/api/users', requireDB, userRoutes);
app.use('/api/assets', requireDB, assetRoutes);
app.use('/api/ai', requireDB, aikbRoutes);
app.use('/api/reports', requireDB, reportRoutes);

// Start SLA monitoring cron (runs hourly by default)
// Set RUN_SLA_MONITOR=false to disable in development
if (process.env.RUN_SLA_MONITOR !== 'false') {
  try {
    require('./cron-sla');
  } catch (err) {
    console.error('Failed to start SLA monitor:', err.message);
  }
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TIISGS API listening on port ${PORT}`);
  });
}

module.exports = app;