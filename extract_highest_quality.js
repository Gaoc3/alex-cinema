const CryptoJS = require('crypto-js');

async function extractHighestQuality() {
    try {
        console.log("Fetching streams for movie 3084827 from API...");
        const res = await fetch('https://alex-cinema.vercel.app/api/proxy?endpoint=transcoddedFiles/id/3084827');
        const data = await res.json();
        const payload = data.payload;

        const SECRET_KEY = 'vA$c1n_S3cr3t_K3y_!2024';

        const bytes = CryptoJS.AES.decrypt(payload, SECRET_KEY);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        const streamsArray = JSON.parse(decryptedStr);
        
        if (!streamsArray || streamsArray.length === 0) {
            console.log("No streams found in API response.");
            return;
        }

        console.log("Found video streams:");
        let highestQualityStream = null;
        let maxResolution = 0;

        for (const s of streamsArray) {
            console.log(`- Resolution: ${s.resolution} | URL: ${s.videoUrl}`);
            
            const match = s.resolution.match(/(\d+)p/i) || s.resolution.match(/(\d+)/);
            if (match) {
                const res = parseInt(match[1]);
                if (res > maxResolution) {
                    maxResolution = res;
                    highestQualityStream = s;
                }
            }
        }

        if (highestQualityStream) {
            console.log("\n=================================");
            console.log(`🏆 Highest Quality Stream: ${highestQualityStream.resolution}`);
            console.log(`🔗 Proxy URL: ${highestQualityStream.videoUrl}`);
            console.log("=================================\n");
        }

    } catch(e) {
        console.error("Error:", e.message);
    }
}

extractHighestQuality();
