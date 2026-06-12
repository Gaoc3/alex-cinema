const CryptoJS = require('crypto-js');

async function testVercel() {
  const fullEndpoint = 'transcoddedFiles/id/3087929';
  console.log("1. Fetching Proxy to get stream URL...");
  const res = await fetch(`https://alex-cinema.vercel.app/api/proxy?endpoint=${encodeURIComponent(fullEndpoint)}`);
  const data = await res.json();
  
  if (!data.payload) {
    console.error("No payload found!");
    return;
  }
  
  const bytes = CryptoJS.AES.decrypt(data.payload, 'vA$c1n_S3cr3t_K3y_!2024');
  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  
  const streamUrl = decryptedData[0]?.videoUrl;
  console.log("2. Decrypted Stream URL:", streamUrl);
  
  if (!streamUrl) return;
  
  const streamUrlAbsolute = new URL(streamUrl, 'https://alex-cinema.vercel.app').href;
  console.log("3. Fetching Stream URL directly to check redirect:", streamUrlAbsolute);
  
  const streamRes = await fetch(streamUrlAbsolute, { redirect: 'manual' });
  console.log("Redirect Status:", streamRes.status);
  console.log("Redirect Location:", streamRes.headers.get('location'));
  
  if (streamRes.status === 302 || streamRes.status === 307 || streamRes.status === 308) {
    const loc = streamRes.headers.get('location');
    console.log("4. Following redirect to:", loc);
    
    // Now fetch the location, simulating the browser's Range request
    const tunnelRes = await fetch(loc, { headers: { 'Range': 'bytes=0-1000' } });
    console.log("Tunnel Status:", tunnelRes.status);
    console.log("Tunnel Headers:", Object.fromEntries(tunnelRes.headers.entries()));
    
    if (tunnelRes.status !== 206) {
      console.log("Tunnel Error Body:", (await tunnelRes.text()).slice(0, 300));
    } else {
      console.log("SUCCESS! Vercel rewrite proxy works!");
    }
  } else {
    console.log("Expected redirect, but got:", streamRes.status);
    console.log("Headers:", Object.fromEntries(streamRes.headers.entries()));
  }
}

testVercel();
