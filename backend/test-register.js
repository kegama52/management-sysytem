const axios = require('axios');

const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test.user.' + Date.now() + '@test.go.ke',
  password: 'Password123',
  phoneNumber: '+254700000001',
  governmentId: 'TEST-GOV-' + Date.now()
};

console.log('Attempting registration with:', { ...testUser, password: '***' });

axios.post('http://localhost:5000/api/auth/register', testUser, {
  timeout: 10000
})
.then(res => {
  console.log('\n✅ SUCCESS!');
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
  console.error('\n❌ FAILED');
  if (err.response) {
    console.error('HTTP Status:', err.response.status);
    console.error('Response:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error('Error:', err.message);
  }
});
