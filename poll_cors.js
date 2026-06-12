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
  
  console.log("Polling Vercel to check if CORS headers are deployed on the 307 redirect...");
  
  for (let i = 0; i < 60; i++) {
    try {
      const checkRes = await fetch(streamUrlAbsolute, { redirect: 'manual' });
      if (checkRes.status === 302 || checkRes.status === 307 || checkRes.status === 308) {
        const hasCors = checkRes.headers.get('access-control-allow-origin');
        if (hasCors) {
          console.log(`\n[SUCCESS] Vercel deployed the CORS code! Status: ${checkRes.status}`);
          console.log(`Redirect Location: ${checkRes.headers.get('location')}`);
          console.log(`CORS Header: ${hasCors}`);
          console.log("\n>>> READY FOR USER TESTING! <<<");
          return;
        } else {
          process.stdout.write(`c` ); // Redirect is there but no CORS yet
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
