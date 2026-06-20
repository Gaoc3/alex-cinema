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
        except Exception as e:
            print("SMART PROXY Error:", e)

asyncio.run(main())
"""

stdin, stdout, stderr = c.exec_command(f"cat << 'EOF' > /root/test_smart_proxy.py\n{test_script}EOF\npython3 /root/test_smart_proxy.py\n", get_pty=True)
print("STDOUT:", stdout.read().decode('utf-8'))
