import subprocess
import threading
import time

def reader(p):
    with open(r'C:\Users\secon\localhostrun_out.txt', 'w', encoding='utf-8') as f:
        for line in iter(p.stdout.readline, b''):
            f.write(line.decode('utf-8'))
            f.flush()

p = subprocess.Popen(['ssh', '-R', '80:192.168.1.1:80', 'nokey@localhost.run', '-o', 'StrictHostKeyChecking=no', '-T'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
threading.Thread(target=reader, args=(p,), daemon=True).start()
time.sleep(8)
