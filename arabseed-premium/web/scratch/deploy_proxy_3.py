import paramiko

nph_proxy_content = """#!/bin/sh
RAW_URL=$(echo "$QUERY_STRING" | sed -n 's/^.*url=\\([^&]*\\).*$/\\1/p')
TARGET_URL=$(echo "$RAW_URL" | awk -v ORS="" '{ gsub(/\\+/, " "); gsub(/%/, "\\\\x"); print }')
TARGET_URL=$(echo -e "$TARGET_URL")

export LD_LIBRARY_PATH=/tmp/usr/lib
CMD="/tmp/usr/bin/curl --raw -s -k -i --http1.1"
if [ -n "$HTTP_RANGE" ]; then
    CMD="$CMD -H \\"Range: $HTTP_RANGE\\""
fi

eval $CMD \\"$TARGET_URL\\"
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

client.exec_command('rm -f /www/cgi-bin/nph-proxy')
for line in nph_proxy_content.splitlines():
    escaped_line = line.replace("'", "'\\''")
    client.exec_command(f"echo '{escaped_line}' >> /www/cgi-bin/nph-proxy")

client.exec_command('chmod +x /www/cgi-bin/nph-proxy')
print("Done")
