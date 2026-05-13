const axios = require('axios');

async function testAiChat() {
  try {
    const response = await axios.post('http://localhost:5000/api/ai/chat', {
      query: 'I need to create a ticket',
      userId: null
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testAiChat();
