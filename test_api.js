const http = require('http');

const postData = JSON.stringify({
  transcript: "أبغى أساعد ولدي يدرس في الصين بس ما أعرف من وين أبدأ"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/process',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();
