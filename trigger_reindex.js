const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4008,
  path: '/reindex',
  method: 'POST',
  headers: {
    'x-assistant-reindex-token': 'dev_assistant_reindex_change_me',
    'x-tenant-id': 'public',
    'Content-Length': 0
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
