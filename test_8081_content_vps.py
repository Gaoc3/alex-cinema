import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

test_script = """import asyncio
import aiohttp
import ssl

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

async def main():
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ssl_ctx)) as session:
        try:
            async with session.get('https://127.0.0.1:8081/vascin-poster-images/BA8FD4D8-D049-458D-67F4-640DF9F0AC67_poster.png', headers={'Host': 'cinemana.shabakaty.com'}, server_hostname='cinemana.shabakaty.com') as resp:
                data = await resp.read()
                print("HTTPS 8081 SNI RESULT:", resp.status, len(data))
                print("CONTENT:", data[:200])
        except Exception as e:
            print("HTTPS 8081 SNI Error:", e)

asyncio.run(main())
"""

# Send to VPS
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'cat > /root/test_8081_content.py && python3 /root/test_8081_content.py'"
stdin, stdout, stderr = c.exec_command(cmd)
stdin.write(test_script + "\n")
stdin.flush()
stdin.channel.eof_received = True

print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
