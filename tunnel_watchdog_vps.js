const https = require("https");
const { exec } = require("child_process");

let failCount = 0;

function handleFailure(reason) {
  failCount += 1;
  console.log(`[Watchdog Fail #${failCount}]: ${reason} (${new Date().toISOString()})`);
}

function checkShabakaty() {
  const request = https.request(
    {
      hostname: "cinemana.shabakaty.com",
      path: "/api/android/banner/level/1",
      method: "GET",
      rejectUnauthorized: false,
      timeout: 6000,
    },
    (response) => {
      if (response.statusCode === 200) {
        failCount = 0;
        return;
      }

      handleFailure(`HTTP ${response.statusCode}`);
    },
  );

  request.on("error", (error) => handleFailure(error.message));
  request.on("timeout", () => {
    request.destroy();
    handleFailure("Timeout");
  });
  request.end();
}

console.log("Starting VPS Shabakaty Tunnel Watchdog (15s cycle)...");
setInterval(checkShabakaty, 15000);
checkShabakaty();
