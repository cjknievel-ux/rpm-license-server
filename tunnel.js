const http = require('http');
http.get('http://localhost:3000/health', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    if (JSON.parse(data).status !== 'ok') { console.log('server not ok'); process.exit(1); }
    require('child_process').exec('npx.cmd localtunnel --port 3000', (e, stdout) => {
      const m = stdout.match(/https:\/\/[^\s]+/);
      if (m) {
        const fs = require('fs');
        fs.writeFileSync('tunnel-url.txt', m[0]);
        console.log('Tunnel URL:', m[0]);
      } else {
        console.log('stdout:', stdout);
      }
    });
  });
}).on('error', () => { console.log('server not running'); });