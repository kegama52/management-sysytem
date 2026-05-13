const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Connect to default db first
  password: 'password',
  port: 5324,
};

async function setupDatabase() {
  const client = new Client(DB_CONFIG);

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected successfully\n');

    // Drop existing database if exists
    console.log('Dropping existing tiisgs_db (if exists)...');
    await client.query('DROP DATABASE IF EXISTS tiisgs_db;');
    console.log('Database dropped\n');

    // Create fresh database
    console.log('Creating database tiisgs_db...');
    await client.query('CREATE DATABASE tiisgs_db;');
    console.log('Database created\n');

    // Close connection to postgres db
    await client.end();

    // Reconnect to new database
    const dbConfig = { ...DB_CONFIG, database: 'tiisgs_db' };
    const dbClient = new Client(dbConfig);
    await dbClient.connect();
    console.log('Connected to tiisgs_db\n');

    // Read and execute schema
    console.log('Loading schema.sql...');
    const projectRoot = path.join(__dirname, '..');
    const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    await dbClient.query(schemaSQL);
    console.log('Schema executed successfully\n');

    await dbClient.end();
    console.log('========================================');
    console.log('✅ Database setup complete!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Ensure backend is running: npm run dev (in backend/ folder)');
    console.log('2. Ensure frontend is running: npm run dev (in frontend/ folder)');
    console.log('3. Open http://localhost:3000');
    console.log('4. Login with any email + password (min 8 chars) or PKI button\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Is PostgreSQL running? Try: pg_ctl start');
    console.error('- Correct password in this script? (line 6)');
    console.error('- PostgreSQL in PATH? Use full path to node if needed\n');
    process.exit(1);
  }
}

setupDatabase();