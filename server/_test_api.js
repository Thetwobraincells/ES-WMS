const http = require('http');

// Get a driver token first
const loginPayload = JSON.stringify({ mobile: '9222000001' });
const loginReq = http.request({
  hostname: 'localhost',
  port: 5050,
  path: '/api/v1/auth/request-otp',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('OTP Response:', JSON.stringify(data, null, 2));

    if (data.data?.otp) {
      // Login with OTP
      const verifyPayload = JSON.stringify({ mobile: '9999900001', otp: data.data.otp });
      const verifyReq = http.request({
        hostname: 'localhost',
        port: 5050,
        path: '/api/v1/auth/verify-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res2) => {
        let body2 = '';
        res2.on('data', chunk => body2 += chunk);
        res2.on('end', () => {
          const auth = JSON.parse(body2);
          console.log('Login:', auth.data?.user?.name, auth.data?.user?.role);
          const token = auth.data?.token;
          
          if (token) {
            // Fetch my-route
            const routeReq = http.request({
              hostname: 'localhost',
              port: 5050,
              path: '/api/v1/routes/my-route',
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }, (res3) => {
              let body3 = '';
              res3.on('data', chunk => body3 += chunk);
              res3.on('end', () => {
                const routeData = JSON.parse(body3);
                if (routeData.data?.stops) {
                  console.log('\n=== MY ROUTE STOPS ===');
                  routeData.data.stops.forEach(s => {
                    console.log(`  #${s.sequence_order} ${s.society?.name || s.address} => STATUS: ${s.status}, skip_reason: ${s.skip_reason}`);
                  });
                  console.log('\nProgress:', JSON.stringify(routeData.data.progress));
                } else {
                  console.log('\nRoute response:', JSON.stringify(routeData, null, 2));
                }
              });
            });
            routeReq.end();
          }
        });
      });
      verifyReq.write(verifyPayload);
      verifyReq.end();
    }
  });
});
loginReq.write(loginPayload);
loginReq.end();
