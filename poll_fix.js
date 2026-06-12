const CryptoJS = require('crypto-js');

async function pollDeploy() {
  const fullEndpoint = 'transcoddedFiles/id/3087929';
  console.log("Polling Vercel to check if videoUrl is correctly sanitized...");
  
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`https://alex-cinema.vercel.app/api/proxy?endpoint=${encodeURIComponent(fullEndpoint)}`);
      const data = await res.json();
      
      if (data.payload) {
        const bytes = CryptoJS.AES.decrypt(data.payload, 'vA$c1n_S3cr3t_K3y_!2024');
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        const streamUrl = decryptedData[0]?.videoUrl;
        
        if (streamUrl && streamUrl.startsWith('/api/stream?ref=')) {
          console.log(`\n[SUCCESS] Vercel deployed the fix!`);
          console.log(`Sanitized URL: ${streamUrl}`);
          console.log("\n>>> READY FOR USER TESTING! <<<");
          return;
        } else {
          process.stdout.write(`.` ); // Still raw shabakaty url, wait
        }
      }
    } catch(e) {
      console.error(e.message);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log("\nTimeout waiting for Vercel deploy.");
}

pollDeploy();
