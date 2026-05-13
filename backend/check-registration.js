const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'tiisgs_db',
  password: 'password',
  port: 5324
});

async function checkRegistration() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check if BUDU unit exists
    const unitRes = await client.query("SELECT id, code, name FROM units WHERE code = 'BUDU'");
    console.log('BUDU unit:', unitRes.rows);

    if (unitRes.rows.length === 0) {
      console.log('BUDU unit NOT found. All units in database:');
      const allUnits = await client.query('SELECT code, name FROM units');
      console.log(allUnits.rows);
    } else {
      console.log('BUDU unit found - unit_id:', unitRes.rows[0].id);
    }

    // Check if test user already exists
    const userRes = await client.query(
      "SELECT id, email, government_id, unit_id FROM users WHERE email = $1",
      ['kevohkevi110@gmail.com']
    );
    console.log('\nDemo user exists:', userRes.rows.length > 0);
    if (userRes.rows.length > 0) {
      console.log('User data:', userRes.rows[0]);
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkRegistration();
