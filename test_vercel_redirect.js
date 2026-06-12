const CryptoJS = require('crypto-js');

async function test() {
  try {
    const fullEndpoint = 'transcoddedFiles/id/3087929';
    const res = await fetch(`https://alex-cinema.vercel.app/api/proxy?endpoint=${encodeURIComponent(fullEndpoint)}`);
    const data = await res.json();
    
    if (data.payload) {
      const bytes = CryptoJS.AES.decrypt(data.payload, 'vA$c1n_S3cr3t_K3y_!2024');
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      
      const streamUrl = decryptedData[0]?.videoUrl;
      console.log("Stream API Path:", streamUrl);
      
      if (streamUrl) {
        const streamUrlAbsolute = new URL(streamUrl, 'https://alex-cinema.vercel.app').href;
        
        console.log("Fetching from Vercel:", streamUrlAbsolute);
        
        // Use redirect: 'manual' to see the 302!
        const streamRes = await fetch(streamUrlAbsolute, { redirect: 'manual' });
        console.log("Vercel Stream Status:", streamRes.status);
        console.log("Vercel Stream Headers:", Object.fromEntries(streamRes.headers.entries()));
      }
    }
  } catch (e) {
    console.error(e);
  }
}
test();
