const { Client } = require('pg');

const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // connect to default db first
  port: 5324,
  password: 'password' // common default
};

async function testConnections() {
  const passwords = ['password', 'admin', 'postgres', 'Treasury2024!', ''];
  
  for (const pwd of passwords) {
    config.password = pwd;
    const client = new Client(config);
    try {
      await client.connect();
      console.log(`✅ SUCCESS with password: "${pwd}"`);
      await client.end();
      return pwd;
    } catch (err) {
      console.log(`❌ Failed with password: "${pwd}" - ${err.message}`);
      await client.end().catch(() => {});
    }
  }
  console.log('\n❌ No password worked.');
}

testConnections();