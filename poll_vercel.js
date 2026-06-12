const CryptoJS = require('crypto-js');

async function pollDeploy() {
  const fullEndpoint = 'transcoddedFiles/id/3087929';
  console.log("Fetching stream ref...");
  const res = await fetch(`https://alex-cinema.vercel.app/api/proxy?endpoint=${encodeURIComponent(fullEndpoint)}`);
  const data = await res.json();
  
  if (!data.payload) return;
  const bytes = CryptoJS.AES.decrypt(data.payload, 'vA$c1n_S3cr3t_K3y_!2024');
  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  const streamUrl = decryptedData[0]?.videoUrl;
  
  if (!streamUrl) return;
  const streamUrlAbsolute = new URL(streamUrl, 'https://alex-cinema.vercel.app').href;
  
  console.log("Polling Vercel to check if the redirect logic (302) is deployed...");
  
  for (let i = 0; i < 20; i++) {
    try {
      const checkRes = await fetch(streamUrlAbsolute, { redirect: 'manual' });
      if (checkRes.status === 302 || checkRes.status === 307 || checkRes.status === 308) {
        console.log(`\n[SUCCESS] Vercel deployed the code! Status: ${checkRes.status}`);
        console.log(`Redirect Location: ${checkRes.headers.get('location')}`);
        
        // Test fetching the tunnel location directly
        const tunnelRes = await fetch(checkRes.headers.get('location'), { headers: { 'Range': 'bytes=0-1000' } });
        console.log(`Tunnel Status: ${tunnelRes.status}`);
        console.log(`Tunnel Headers:`, Object.fromEntries(tunnelRes.headers.entries()));
        
        if (tunnelRes.status === 206) {
          console.log("\n>>> PERFECT STREAM RESPONSE OBTAINED! <<<");
          return;
        } else {
          console.log("\n>>> TUNNEL RETURNED ERROR! <<<");
        }
      } else {
        process.stdout.write(`.` ); // Still 200, wait
      }
    } catch(e) {
      console.error(e.message);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log("\nTimeout waiting for Vercel deploy.");
}

pollDeploy();
