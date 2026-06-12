const CryptoJS = require('crypto-js');

async function test() {
  try {
    const res = await fetch('https://alex-cinema.vercel.app/api/video/3087929');
    const data = await res.json();
    console.log("Payload:", data.payload ? 'Yes' : 'No');
    
    // Decrypt payload
    if (data.payload) {
      const bytes = CryptoJS.AES.decrypt(data.payload, 'vA$c1n_S3cr3t_K3y_!2024');
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      
      const streamUrl = decryptedData.data?.streams?.[0]?.videoUrl;
      console.log("Stream URL:", streamUrl);
      
      if (streamUrl) {
        console.log("Fetching Stream URL from Vercel...");
        const streamUrlAbsolute = new URL(streamUrl, 'https://alex-cinema.vercel.app').href;
        console.log("Absolute:", streamUrlAbsolute);
        
        const streamRes = await fetch(streamUrlAbsolute, { headers: { 'Range': 'bytes=0-1000' } });
        console.log("Stream Status:", streamRes.status);
        console.log("Stream Headers:", Object.fromEntries(streamRes.headers.entries()));
        
        if (streamRes.status !== 206) {
          console.log("Stream Body snippet:", (await streamRes.text()).slice(0, 500));
        } else {
          console.log("SUCCESS!");
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}
test();
