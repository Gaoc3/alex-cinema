import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

test_script = """import asyncio
import aiohttp

async def main():
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get('http://127.0.0.1:8000/vascin-poster-images/BA8FD4D8-D049-458D-67F4-640DF9F0AC67_poster.png', headers={'Host': 'cinemana.shabakaty.com'}) as resp:
                data = await resp.read()
                print("SMART PROXY RESULT:", resp.status, len(data))
                if len(data) == 12241:
                    print("CONTENT:", data[:200])
        except Exception as e:
            print("SMART PROXY Error:", e)

asyncio.run(main())
"""

# Send to VPS
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'cat > /root/test_smart_proxy.py && python3 /root/test_smart_proxy.py'"
stdin, stdout, stderr = c.exec_command(cmd)
stdin.write(test_script + "\n")
stdin.flush()
stdin.channel.eof_received = True

print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
