@echo off
echo Starting Tunnel to Next.js Server...
echo Make sure Next.js is running on port 3000!
:loop
npx localtunnel --port 3000 --local-host 127.0.0.1 --subdomain mtskycinemana
echo Tunnel crashed, restarting in 5 seconds...
timeout /t 5
goto loop
