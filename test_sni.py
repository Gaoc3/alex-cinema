import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    
    script = """import aiohttp
import asyncio
import ssl

async def test():
    # Attempt 1: naive ssl=False
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get('https://127.0.0.1:8081/', ssl=False, timeout=3) as resp:
                print("Naive Success:", resp.status)
    except Exception as e:
        print("Naive Error:", type(e).__name__, e)

    # Attempt 2: custom ssl context with SNI
    try:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        
        # aiohttp allows passing server_hostname to TCPConnector? 
        # Actually, if we use curl --resolve it's easier to see if SNI is the issue.
    except Exception as e:
        pass

asyncio.run(test())
"""
    
    # Run the curl test first
    stdin, stdout, stderr = client.exec_command('dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -v -k -H \\"Host: cinemana.shabakaty.com\\" https://127.0.0.1:8081/"')
    print("CURL LOGS:\n", stderr.read().decode('utf-8', 'ignore'))
    
except Exception as e:
    print(e)
finally:
    client.close()
