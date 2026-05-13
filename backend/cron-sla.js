/**
 * SLA Breach Monitor - Scheduled Job
 * 
 * Runs hourly to check for:
 * - Overdue tickets (sla_breach_at passed, status not resolved/closed)
 * - Overdue maintenance (completion past SLA deadline)
 * 
 * Auto-generates notifications for supervisors.
 * 
 * To enable: uncomment require in server.js
 */

const { Pool } = require('pg');
const cron = require('node-cron');

// Database configuration (match server.js)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tiisgs_db',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT) || 5324,
});

async function checkTicketSLA() {
  try {
    const result = await pool.query('SELECT escalate_overdue_tickets() as breached_count');
    const count = parseInt(result.rows[0].breached_count) || 0;
    if (count > 0) {
      console.log(`[SLA Monitor] ${count} ticket(s) marked as breached & notifications sent`);
    }
  } catch (error) {
    console.error('[SLA Monitor] Ticket check failed:', error.message);
  }
}

async function checkMaintenanceSLA() {
  try {
    const result = await pool.query('SELECT escalate_maintenance_overdue() as escalated_count');
    const count = parseInt(result.rows[0].escalated_count) || 0;
    if (count > 0) {
      console.log(`[SLA Monitor] ${count} maintenance record(s) escalated`);
    }
  } catch (error) {
    console.error('[SLA Monitor] Maintenance check failed:', error.message);
  }
}

async function runMonitoring() {
  console.log(`[SLA Monitor] Running at ${new Date().toISOString()}`);
  await checkTicketSLA();
  await checkMaintenanceSLA();
  console.log('[SLA Monitor] Check complete');
}

// Schedule: Every hour at minute 0
const task = cron.schedule('0 * * * *', runMonitoring, {
  scheduled: true,
  timezone: "Africa/Nairobi"
});

console.log('[SLA Monitor] Scheduled (every hour, Africa/Nairobi timezone)');

// Allow manual run
if (process.argv.includes('--now')) {
  runMonitoring().then(() => {
    pool.end();
    process.exit(0);
  });
}

module.exports = { runMonitoring };
