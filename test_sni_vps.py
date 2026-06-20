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
                print("WITH SNI:", resp.status, len(data))
        except Exception as e:
            print("WITH SNI Error:", e)

        try:
            async with session.get('https://127.0.0.1:8081/vascin-poster-images/BA8FD4D8-D049-458D-67F4-640DF9F0AC67_poster.png', headers={'Host': 'cinemana.shabakaty.com'}) as resp:
                data = await resp.read()
                print("WITHOUT SNI:", resp.status, len(data))
        except Exception as e:
            print("WITHOUT SNI Error:", e)

asyncio.run(main())
"""

stdin, stdout, stderr = c.exec_command(f"cat << 'EOF' > /root/test_sni_aiohttp.py\n{test_script}EOF\npython3 /root/test_sni_aiohttp.py\n", get_pty=True)
print("STDOUT:", stdout.read().decode('utf-8'))
