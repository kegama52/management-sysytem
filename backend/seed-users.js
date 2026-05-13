const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DB_CONFIG = {
  user: 'postgres',
  host: 'localhost',
  database: 'tiisgs_db',
  password: 'password',
  port: 5324,
};

async function seedUsers() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('Connected to tiisgs_db\n');

    // Test users to add
    const testUsers = [
      {
        governmentId: 'GOV-001',
        email: 'kevohkevi110@gmail.com',
        password: 'Password123',
        firstName: 'Kevoh',
        lastName: 'Kevi',
        role: 'officer',
        unitCode: 'BUDU', // Budget Unit
        phoneNumber: '+254700000001'
      },
      {
        governmentId: 'GOV-002',
        email: 'ict.supervisor@treasury.go.ke',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Ochieng',
        role: 'ict_supervisor',
        unitCode: 'ICTSU', // ICT Support Unit
        phoneNumber: '+254700000002'
      },
      {
        governmentId: 'GOV-003',
        email: 'ict.officer@treasury.go.ke',
        password: 'Password123',
        firstName: 'Mary',
        lastName: 'Wangui',
        role: 'ict_officer',
        unitCode: 'ICTSU',
        phoneNumber: '+254700000003'
      },
      {
        governmentId: 'GOV-004',
        email: 'admin@treasury.go.ke',
        password: 'AdminPass123!',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        unitCode: 'ICTSU',
        phoneNumber: '+254700000004'
      },
      {
        governmentId: 'GOV-005',
        email: 'auditor@treasury.go.ke',
        password: 'AuditPass123!',
        firstName: 'Peter',
        lastName: 'Karanja',
        role: 'auditor',
        unitCode: 'BUDU',
        phoneNumber: '+254700000005'
      }
    ];

    for (const user of testUsers) {
      // Check if user exists
      const { rows: existing } = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (existing.length > 0) {
        console.log(`✓ User ${user.email} already exists (skipping)`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(user.password, 10);

      // Get unit_id from unit code
      const { rows: unitRows } = await client.query(
        'SELECT id FROM units WHERE code = $1',
        [user.unitCode]
      );

      if (unitRows.length === 0) {
        console.error(`✗ Unit code ${user.unitCode} not found for ${user.email}`);
        continue;
      }

      const unitId = unitRows[0].id;
      const userId = require('uuid').v4();

      // Generate government ID unique
      const { rows: govIdCheck } = await client.query(
        'SELECT id FROM users WHERE government_id = $1',
        [user.governmentId]
      );
      let finalGovId = user.governmentId;
      if (govIdCheck.length > 0) {
        finalGovId = `${user.governmentId}-${Math.random().toString(36).substr(2, 4)}`;
      }

      await client.query(`
        INSERT INTO users (
          id, government_id, email, password_hash,
          first_name, last_name, phone_number,
          role, unit_id, is_active, last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, CURRENT_TIMESTAMP)
      `, [
        userId,
        finalGovId,
        user.email,
        passwordHash,
        user.firstName,
        user.lastName,
        user.phoneNumber,
        user.role,
        unitId
      ]);

      console.log(`✓ Created ${user.role}: ${user.email} (${user.firstName} ${user.lastName})`);
    }

    console.log('\n========================================');
    console.log('✅ Test users seeded successfully!');
    console.log('========================================\n');

    console.log('Login credentials:');
    console.log('-------------------');
    testUsers.forEach(u => {
      console.log(`\n${u.role.toUpperCase()}: ${u.email}`);
      console.log(`  Password: ${u.password}`);
      console.log(`  Name: ${u.firstName} ${u.lastName}`);
    });

    console.log('\n');
    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === '28P01') {
      console.error('\nAuthentication failed. Check your PostgreSQL password in DB_CONFIG.');
    }
    process.exit(1);
  }
}

seedUsers();