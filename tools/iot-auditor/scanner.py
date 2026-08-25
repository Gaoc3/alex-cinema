"""
Device Scanner & Banner Grabber Module
Non-intrusive port auditing and service identification for IP Cameras, PA systems, and IoT.
"""

import socket
import ssl
import re
import requests
import urllib3
from typing import Dict, List, Tuple, Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class DeviceScanner:
    """Non-intrusive network auditor for IoT, Cameras, and PA Systems"""

    DEFAULT_PORTS = {
        80: ("HTTP", "Web Interface / Admin Console"),
        443: ("HTTPS", "Secure Web Interface"),
        554: ("RTSP", "Real-Time Streaming Protocol (Video/Audio)"),
        5060: ("SIP", "Session Initiation Protocol (Voice/PA System)"),
        8000: ("HTTP-Alt", "DVR / NVR / Hikvision Management Port"),
        8080: ("HTTP-Alt", "Alternative Web Port / ONVIF"),
        8899: ("ONVIF", "ONVIF Device Service Port"),
        37777: ("Dahua-DVR", "Dahua Video Surveillance Protocol")
    }

    def __init__(self, target_ip: str, custom_ports: Optional[List[int]] = None, timeout: float = 1.5):
        self.target_ip = target_ip
        self.timeout = timeout
        self.ports = custom_ports if custom_ports else list(self.DEFAULT_PORTS.keys())

    def scan_open_ports(self) -> Dict[int, Tuple[str, str]]:
        """Probe for open TCP ports"""
        open_ports = {}
        for port in self.ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            try:
                if sock.connect_ex((self.target_ip, port)) == 0:
                    proto, desc = self.DEFAULT_PORTS.get(port, ("TCP", "Custom Port"))
                    open_ports[port] = (proto, desc)
            except Exception:
                pass
            finally:
                sock.close()
        return open_ports

    def grab_http_banner(self, port: int) -> Optional[Dict[str, str]]:
        """Inspect HTTP/HTTPS response headers, Server banner, and HTML title"""
        protocol = "https" if port in [443, 8443] else "http"
        url = f"{protocol}://{self.target_ip}:{port}"
        
        try:
            res = requests.get(url, timeout=3.0, verify=False, allow_redirects=True)
            server = res.headers.get("Server", "").strip()
            
            title = ""
            if "<title>" in res.text.lower():
                m = re.search(r'<title[^>]*>(.*?)</title>', res.text, re.IGNORECASE | re.DOTALL)
                if m:
                    title = m.group(1).strip()

            auth_header = res.headers.get("WWW-Authenticate", "")
            realm = ""
            if "realm=" in auth_header:
                m = re.search(r'realm="([^"]+)"', auth_header)
                if m: realm = m.group(1)

            return {
                "port": str(port),
                "protocol": protocol.upper(),
                "server": server,
                "title": title,
                "realm": realm,
                "combined": f"{server} {title} {realm}".strip()
            }
        except Exception:
            return None

    def grab_rtsp_banner(self, port: int = 554) -> Optional[str]:
        """Send RTSP OPTIONS packet to query streaming server version"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(self.timeout * 2)
            s.connect((self.target_ip, port))
            
            req = f"OPTIONS rtsp://{self.target_ip}:{port} RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: IoT-Auditor/1.0\r\n\r\n"
            s.sendall(req.encode('utf-8'))
            resp = s.recv(2048).decode('utf-8', errors='ignore')
            s.close()

            for line in resp.splitlines():
                if line.lower().startswith("server:"):
                    return line.split(":", 1)[1].strip()
        except Exception:
            pass
        return None

    def grab_sip_banner(self, port: int = 5060) -> Optional[str]:
        """Send SIP OPTIONS packet to identify Voice/PA systems"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(self.timeout * 2)
            s.connect((self.target_ip, port))
            
            req = (
                f"OPTIONS sip:{self.target_ip}:{port} SIP/2.0\r\n"
                f"Via: SIP/2.0/TCP 127.0.0.1:{port};branch=z9hG4bK-1234\r\n"
                f"From: <sip:auditor@127.0.0.1>;tag=auditor1\r\n"
                f"To: <sip:{self.target_ip}:{port}>\r\n"
                f"Call-ID: auditor-check-12345\r\n"
                f"CSeq: 1 OPTIONS\r\n"
                f"User-Agent: IoT-Auditor/1.0\r\n\r\n"
            )
            s.sendall(req.encode('utf-8'))
            resp = s.recv(2048).decode('utf-8', errors='ignore')
            s.close()

            for line in resp.splitlines():
                if line.lower().startswith("user-agent:") or line.lower().startswith("server:"):
                    return line.split(":", 1)[1].strip()
        except Exception:
            pass
        return None
