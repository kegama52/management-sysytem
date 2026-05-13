const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/src/main.jsx',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('First 300 chars:');
    console.log(data.substring(0, 300));
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();