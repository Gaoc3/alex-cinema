import paramiko

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    # We will fetch the video info for 3084827 from cinemana directly on port 8081
    cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -s -k -H \"Host: cinemana.shabakaty.com\" https://127.0.0.1:8081/api/android/videoInfo/id/3084827 | grep -o \"https://[^\"]*mp4[^\"]*\" | head -n 1'"
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore').strip()
    print("STDOUT:\n" + out)
    
    if out:
        # Extract the path from the URL
        from urllib.parse import urlparse
        parsed = urlparse(out)
        path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        print("Extracted Path:", path)
        
        # Test fetching the video headers directly from 8081 (cinemana)
        cmd2 = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -I -k -H \"Host: cinemana.shabakaty.com\" \"https://127.0.0.1:8081{path}\"'"
        stdin2, stdout2, stderr2 = c.exec_command(cmd2)
        print("HEAD Response from 8081:\n" + stdout2.read().decode('utf-8', errors='ignore'))
        
        # Test fetching the video headers from 8082 (cdn)
        cmd3 = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -I -k -H \"Host: cdn.shabakaty.com\" \"https://127.0.0.1:8082{path}\"'"
        stdin3, stdout3, stderr3 = c.exec_command(cmd3)
        print("HEAD Response from 8082:\n" + stdout3.read().decode('utf-8', errors='ignore'))

        # Test fetching the video headers from 8084 (cnth2)
        cmd4 = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -I -k -H \"Host: cnth2.shabakaty.com\" \"https://127.0.0.1:8084{path}\"'"
        stdin4, stdout4, stderr4 = c.exec_command(cmd4)
        print("HEAD Response from 8084:\n" + stdout4.read().decode('utf-8', errors='ignore'))
        
except Exception as e:
    print(f"Failed to connect or execute: {e}")
