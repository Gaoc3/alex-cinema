"""
Smart Local Network & IoT Discovery Engine
Automatically discovers IP Cameras, Audio/PA Systems, and Smart Devices using:
1. WS-Discovery (ONVIF Probe for Cameras)
2. SSDP / UPnP Discovery (Media & Audio Devices)
3. Concurrent Local Subnet Scan
"""

import socket
import re
import uuid
import ipaddress
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Set, Optional

WS_DISCOVERY_PROBE = """<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:uuid:{uuid}</wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </Header>
  <Body>
    <Probe xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <Types>tds:Device</Types>
      <Scopes />
    </Probe>
  </Body>
</Envelope>"""

SSDP_SEARCH_PROBE = (
    "M-SEARCH * HTTP/1.1\r\n"
    "HOST: 239.255.255.250:1900\r\n"
    "MAN: \"ssdp:discover\"\r\n"
    "MX: 2\r\n"
    "ST: ssdp:all\r\n\r\n"
)


class NetworkDiscovery:
    """Automatic Discovery for Local IP Cameras and Audio/PA Systems"""

    @staticmethod
    def get_all_local_subnets() -> List[str]:
        """Find all active network interfaces and their respective /24 subnets"""
        detected_ips = set()
        
        # 1. Primary interface resolution
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            detected_ips.add(s.getsockname()[0])
            s.close()
        except Exception:
            pass

        # 2. Hostname resolution
        try:
            host = socket.gethostname()
            for info in socket.getaddrinfo(host, None):
                ip = info[4][0]
                if ':' not in ip and not ip.startswith('127.'):
                    detected_ips.add(ip)
        except Exception:
            pass

        # 3. System command parsing (ipconfig on Windows / ip addr on Linux)
        try:
            import subprocess
            out = subprocess.check_output(['ipconfig'], text=True, errors='ignore')
            for line in out.splitlines():
                m = re.search(r'IPv4 Address[^\:]*:\s*([0-9\.]+)', line)
                if m and not m.group(1).startswith('127.'):
                    detected_ips.add(m.group(1))
        except Exception:
            pass

        subnets = set()
        for ip in detected_ips:
            parts = ip.split(".")
            if len(parts) == 4:
                subnets.add(f"{parts[0]}.{parts[1]}.{parts[2]}.0/24")

        return sorted(list(subnets)) if subnets else ["192.168.1.0/24"]

    @staticmethod
    def get_local_ip() -> str:
        """Find the active local network IP address"""
        subnets = NetworkDiscovery.get_all_local_subnets()
        return subnets[0].replace(".0/24", ".1") if subnets else "127.0.0.1"

    @classmethod
    def discover_onvif_cameras(cls, timeout: float = 2.5) -> List[Dict[str, str]]:
        """
        Multicast WS-Discovery Probe to locate ONVIF Cameras on the local network.
        Listens on UDP port 3702 (239.255.255.250).
        """
        discovered = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.settimeout(timeout)

        probe_data = WS_DISCOVERY_PROBE.format(uuid=str(uuid.uuid4())).encode('utf-8')

        try:
            sock.sendto(probe_data, ("239.255.255.250", 3702))
            while True:
                try:
                    data, (src_ip, _) = sock.recvfrom(65535)
                    xml_text = data.decode('utf-8', errors='ignore')
                    
                    # Extract XAddrs (IP/Port endpoint)
                    xaddrs = re.findall(r'<[^:]*:?XAddrs[^>]*>([^<]+)</[^:]*:?XAddrs>', xml_text)
                    scopes = re.findall(r'<[^:]*:?Scopes[^>]*>([^<]+)</[^:]*:?Scopes>', xml_text)
                    
                    scope_info = scopes[0] if scopes else ""
                    xaddr_str = xaddrs[0] if xaddrs else f"http://{src_ip}:80/onvif/device_service"

                    discovered.append({
                        "ip": src_ip,
                        "type": "ONVIF Camera",
                        "endpoint": xaddr_str,
                        "details": scope_info[:80] if scope_info else "Standard ONVIF Device"
                    })
                except socket.timeout:
                    break
        except Exception:
            pass
        finally:
            sock.close()

        return discovered

    @classmethod
    def discover_ssdp_devices(cls, timeout: float = 2.5) -> List[Dict[str, str]]:
        """
        UPnP / SSDP Multicast Search to find Audio/PA systems and Media devices.
        Listens on UDP port 1900 (239.255.255.250).
        """
        discovered = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.settimeout(timeout)

        try:
            sock.sendto(SSDP_SEARCH_PROBE.encode('utf-8'), ("239.255.255.250", 1900))
            seen_ips = set()
            while True:
                try:
                    data, (src_ip, _) = sock.recvfrom(4096)
                    if src_ip in seen_ips:
                        continue

                    response_text = data.decode('utf-8', errors='ignore')
                    server = ""
                    st = ""
                    location = ""

                    for line in response_text.splitlines():
                        line_lower = line.lower()
                        if line_lower.startswith("server:"):
                            server = line.split(":", 1)[1].strip()
                        elif line_lower.startswith("st:"):
                            st = line.split(":", 1)[1].strip()
                        elif line_lower.startswith("location:"):
                            location = line.split(":", 1)[1].strip()

                    seen_ips.add(src_ip)
                    discovered.append({
                        "ip": src_ip,
                        "type": "UPnP / Media / PA Device",
                        "endpoint": location or f"http://{src_ip}",
                        "details": f"Server: {server} | Type: {st}"[:90]
                    })
                except socket.timeout:
                    break
        except Exception:
            pass
        finally:
            sock.close()

        return discovered

    @classmethod
    def sweep_local_subnet(cls, subnet_cidr: Optional[str] = None, timeout: float = 0.8) -> List[str]:
        """
        Concurrently probe the local /24 subnet for active devices on IoT ports.
        """
        if not subnet_cidr:
            local_ip = cls.get_local_ip()
            if local_ip == "127.0.0.1":
                return ["127.0.0.1"]
            parts = local_ip.split(".")
            subnet_cidr = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"

        net = ipaddress.ip_network(subnet_cidr, strict=False)
        active_hosts = []

        # Common ports to determine if an IoT/Camera/Audio host is alive
        probe_ports = [80, 443, 554, 8000, 8080, 5060]

        def _check_host(ip_str: str) -> Optional[str]:
            for p in probe_ports:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(timeout)
                try:
                    if s.connect_ex((ip_str, p)) == 0:
                        s.close()
                        return ip_str
                except Exception:
                    pass
                finally:
                    s.close()
            return None

        with ThreadPoolExecutor(max_workers=64) as executor:
            future_to_ip = {executor.submit(_check_host, str(host)): str(host) for host in net.hosts()}
            for f in as_completed(future_to_ip):
                res = f.result()
                if res:
                    active_hosts.append(res)

        return sorted(active_hosts, key=lambda x: [int(p) for p in x.split(".")])
