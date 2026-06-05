require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const assetRoutes = require('./routes/assets');
const aikbRoutes = require('./routes/aikb');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || '/api/v1';

// Security headers with enhanced protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.treasury.go.ke"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS configuration with specific origins
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tiisgs.treasury.go.ke', 'https://treasury.go.ke'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP parameter pollution
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // limit each IP
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all API routes
app.use(`${API_VERSION}/`, limiter);

// Database pool with enhanced configuration
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5324/tiisgs_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: process.env.NODE_ENV === 'production' ? 20 : 10,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000, // 5 seconds
    query_timeout: 10000 // 10 seconds
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

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: pool ? 'connected' : 'disconnected',
      api: 'running'
    }
  };
  
  res.status(pool ? 200 : 503).json(healthCheck);
});

// API info endpoint
app.get(`${API_VERSION}/info`, (req, res) => {
  res.json({
    name: 'TIISGS API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Treasury ICT Support & Governance System API',
    endpoints: {
      auth: `${API_VERSION}/auth`,
      tickets: `${API_VERSION}/tickets`,
      users: `${API_VERSION}/users`,
      assets: `${API_VERSION}/assets`,
      ai: `${API_VERSION}/ai`,
      reports: `${API_VERSION}/reports`
    },
    documentation: 'https://docs.treasury.go.ke/tiisgs'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'TIISGS API Running', 
    version: process.env.npm_package_version || '1.0.0',
    documentation: `${API_VERSION}/info`,
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// Database check middleware for DB-dependent routes
const requireDB = (req, res, next) => {
  if (!req.pool) {
    return res.status(503).json({ 
      error: 'Service Unavailable',
      message: 'Database unavailable',
      suggestion: 'Please set up PostgreSQL database first. See SETUP_GUIDE.md'
    });
  }
  next();
};

// Apply DB requirement to all API routes
app.use(`${API_VERSION}/auth`, requireDB, authRoutes);
app.use(`${API_VERSION}/tickets`, requireDB, ticketRoutes);
app.use(`${API_VERSION}/users`, requireDB, userRoutes);
app.use(`${API_VERSION}/assets`, requireDB, assetRoutes);
app.use(`${API_VERSION}/ai`, requireDB, aikbRoutes);
app.use(`${API_VERSION}/reports`, requireDB, reportRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    suggestion: 'Check the API documentation at /api/v1/info'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  
  // Handle JWT errors specifically
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid Token',
      message: 'Please provide a valid authentication token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token Expired',
      message: 'Your authentication token has expired'
    });
  }
  
  // Handle validation errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'Payload Too Large',
      message: 'Request payload exceeds the limit of 10kb'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 TIISGS API listening on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}${API_VERSION}/info`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;