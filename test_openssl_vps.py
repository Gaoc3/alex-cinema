import subprocess

cmd = "echo -e 'GET / HTTP/1.1\\r\\nHost: cndw2.shabakaty.com\\r\\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\\r\\n\\r\\n' | openssl s_client -connect 127.0.0.1:8083 -servername cndw2.shabakaty.com -quiet 2>/dev/null"

process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = process.communicate()
print("STDOUT:\n", stdout.decode(errors='ignore')[:1000])
print("STDERR:\n", stderr.decode(errors='ignore')[:1000])
