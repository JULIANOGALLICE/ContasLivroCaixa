const http = require('http');

const data = JSON.stringify({
  id: require('crypto').randomUUID(),
  title: 'Test Bill',
  amount: 100,
  dueDate: '2026-07-20',
  recurrence: 'none'
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/bills',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
