const { Client } = require('pg');

const DB_CONFIG = {
  user: 'postgres',
  host: 'localhost',
  database: 'tiisgs_db',
  password: 'password',
  port: 5324,
};

async function fixDemoUser() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('Connected to tiisgs_db\n');

    // Fix the typo in demo user email
    const result = await client.query(
      "UPDATE users SET email = 'kevohkevi110@gmail.com' WHERE email = 'kevohkevi110@gmail.ccom'",
    );

    if (result.rowCount > 0) {
      console.log('✅ Fixed demo user email: kevohkevi110@gmail.ccom → kevohkevi110@gmail.com');
    } else {
      console.log('⚠️  No user found with email kevohkevi110@gmail.ccom');
      console.log('   You may need to run: node seed-users.js');
    }

    // Verify the user exists and show credentials
    const { rows } = await client.query(
      "SELECT email, first_name, last_name, role FROM users WHERE email = 'kevohkevi110@gmail.com'",
    );

    if (rows.length > 0) {
      const user = rows[0];
      console.log('\n✓ Demo user ready for login:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.first_name} ${user.last_name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Password: Password123`);
    } else {
      console.log('\n✗ Demo user not found. Run seed-users.js to create test users.');
    }

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === '28P01') {
      console.error('\nAuthentication failed. Check PostgreSQL password in DB_CONFIG.');
    }
    process.exit(1);
  }
}

fixDemoUser();
