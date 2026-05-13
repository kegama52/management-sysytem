const axios = require('axios');

async function testSignupFlow() {
  const baseUrl = 'http://localhost:5000';

  // Test case 1: Valid registration with all fields
  console.log('=== Test 1: Full registration ===');
  try {
    const res1 = await axios.post(`${baseUrl}/api/auth/register`, {
      firstName: 'Alice',
      lastName: 'Mwangi',
      email: 'alice.mwangi@test.go.ke',
      password: 'Password123',
      phoneNumber: '+254712345678',
      governmentId: 'GOV-ALICE-001'
    });
    console.log('✅ Success:', res1.status, res1.data.message);
    console.log('   User:', res1.data.user.email, '/ role:', res1.data.user.role);
  } catch (err) {
    console.log('❌ Failed:', err.response?.status, err.response?.data?.error || err.message);
  }

  // Test case 2: Minimal registration (only required fields)
  console.log('\n=== Test 2: Minimal registration (no optional fields) ===');
  try {
    const res2 = await axios.post(`${baseUrl}/api/auth/register`, {
      firstName: 'Bob',
      lastName: 'Ochieng',
      email: 'bob.ochieng@test.go.ke',
      password: 'Password123'
    });
    console.log('✅ Success:', res2.status, res2.data.message);
    console.log('   User:', res2.data.user.email, '/ governmentId:', res2.data.user.governmentId);
    console.log('   Token received:', !!res2.data.token);
  } catch (err) {
    console.log('❌ Failed:', err.response?.status, err.response?.data?.error || err.message);
  }

  // Test case 3: Duplicate email
  console.log('\n=== Test 3: Duplicate email (should fail) ===');
  try {
    await axios.post(`${baseUrl}/api/auth/register`, {
      firstName: 'Bob',
      lastName: 'Ochieng',
      email: 'bob.ochieng@test.go.ke',
      password: 'Password123'
    });
  } catch (err) {
    if (err.response?.status === 409) {
      console.log('✅ Correctly rejected duplicate:', err.response.data.error);
    } else {
      console.log('❌ Unexpected error:', err.response?.status, err.message);
    }
  }

  // Test case 4: Weak password
  console.log('\n=== Test 4: Weak password (should fail) ===');
  try {
    await axios.post(`${baseUrl}/api/auth/register`, {
      firstName: 'Charlie',
      lastName: 'Kiprop',
      email: 'charlie.kiprop@test.go.ke',
      password: 'short'
    });
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('✅ Correctly rejected weak password:', err.response.data.error);
    } else {
      console.log('❌ Unexpected error:', err.response?.status, err.message);
    }
  }

  console.log('\n=== All tests complete ===');
}

testSignupFlow();
