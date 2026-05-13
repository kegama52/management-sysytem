const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testSystem() {
  console.log('🔍 Testing TIISGS System\n');

  try {
    // Test health
    console.log('1. Health check...');
    const health = await axios.get('http://localhost:5000/');
    console.log('   ✅ API:', health.data.message, '| DB:', health.data.database);

    // Test login with existing user (your email)
    console.log('\n2. Testing login for kevohkevi110@gmail.ccom...');
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'kevohkevi110@gmail.ccom',
      password: 'Password123'
    });
    console.log('   ✅ Logged in:', login.data.user.firstName, login.data.user.lastName);
    console.log('   Role:', login.data.user.role);
    console.log('   GovID:', login.data.user.governmentId);
    console.log('   Token:', login.data.token.substring(0, 20) + '...');

    // Test hierarchy
    console.log('\n3. Testing hierarchy...');
    const hier = await axios.get(`${BASE_URL}/users/hierarchy`);
    console.log(`   ✅ Directorates: ${hier.data.directorates.length} found`);
    hier.data.directorates.forEach(d => {
      console.log(`      - ${d.name} (${d.code})`);
      if (d.departments) {
        d.departments.forEach(dep => {
          console.log(`        ↳ ${dep.name} (${dep.code})`);
        });
      }
    });

    // Test registration of a new user
    console.log('\n4. Testing registration (new user)...');
    const reg = await axios.post(`${BASE_URL}/auth/register`, {
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo.user.' + Date.now() + '@example.com',
      password: 'Password123'
    });
    console.log('   ✅ Registered:', reg.data.user.email);
    console.log('   Token:', reg.data.token.substring(0, 20) + '...');

    console.log('\n✅ All tests passed! System is operational.\n');
    console.log('🌐 Open http://localhost:3000 in your browser');
    console.log('📧 Login with: kevohkevi110@gmail.ccom / Password123\n');

  } catch (err) {
    console.error('\n❌ Error:', err.response?.data?.error || err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data));
    }
  }
}

testSystem();