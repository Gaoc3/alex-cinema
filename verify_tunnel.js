const http = require('http');

// Get the tunnel base url from .env.local
require('dotenv').config({ path: '.env.local' });

async function verify() {
  console.log("1. Testing Next.js API /api/stream?ref=...");
  
  // We need to fetch an actual movie id and get its stream url.
  // Wait, I can just use a test string to see if the redirect returns 302 and the location!
  
  const testRefUrl = 'http://localhost:3000/api/stream?ref=ZtfXgC6Uyx2KkqvNW-JkVnt1Pr5TGKGhofZ6ZrddPUJWpdA1CXeAjghnpD4jyQFRNTq6xHfJiV1Eezo6Bui9trVSTYXgSvyZVXFM60HkHKu9Syb3sdpKWBfYXfPEBqz3XM_eCc8ZpUG9SqzQy_bQIP4l58OlvKOc49lZOZ4qA422hUIBP636OET9NnHQnfCpKRaVyFZBU5h2IyxKloxLtvwSOLy7lb7godfFRAuferrMvkiqPiD3wlW1gSa3g1G7iit6XyEz1M-sqedUOb2ebHMM8SE7XIWs2vHwjJU3248Yioj1bqxptQnkHfyrmD23rHOTkwfLYZnFtj2OLuM1sQ';
  
  try {
    const resRedirect = await fetch(testRefUrl, { redirect: 'manual' });
    console.log("Redirect Status:", resRedirect.status);
    console.log("Redirect Location:", resRedirect.headers.get('location'));
    
    if (resRedirect.status !== 302) {
      console.error("FAILED: Expected 302 redirect");
      return;
    }
    
    const location = resRedirect.headers.get('location');
    console.log("\n2. Testing the redirected Location (/tunnel/...) with a Range request...");
    
    // Convert to absolute URL if necessary
    const targetUrl = new URL(location, 'http://localhost:3000').href;
    
    const resStream = await fetch(targetUrl, { 
      headers: { 'Range': 'bytes=0-1000' }
    });
    
    console.log("Stream Status:", resStream.status);
    console.log("Stream Content-Type:", resStream.headers.get('content-type'));
    console.log("Stream Content-Length:", resStream.headers.get('content-length'));
    console.log("Stream Content-Range:", resStream.headers.get('content-range'));
    
    if (resStream.status === 206) {
      console.log("\nSUCCESS: Next.js rewrites correctly proxied the byte-range chunk from Serveo!");
    } else {
      console.error("\nFAILED: Expected 206 Partial Content, got", resStream.status);
      const errText = await resStream.text();
      console.error("Error body:", errText.substring(0, 200));
    }
    
  } catch (e) {
    console.error("Verification error:", e);
    console.log("\nIs the Next.js dev server running? Try restarting it.");
  }
}

verify();
