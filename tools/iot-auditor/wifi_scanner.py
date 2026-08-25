"""
Wi-Fi RF Protocol & Wireless Security Assessment Engine
Audits encryption protocols, ciphers, authentication mechanisms, and maps
known wireless CVEs (KRACK, FragAttacks, Dragonblood, WEP Flaws) to surrounding networks.
"""

import subprocess
import re
import platform
import time
from typing import List, Dict, Tuple

try:
    import ctypes
    from ctypes import wintypes
    HAS_CTYPES = True
except ImportError:
    HAS_CTYPES = False


class GUID(ctypes.Structure):
    _fields_ = [
        ('Data1', wintypes.DWORD),
        ('Data2', wintypes.WORD),
        ('Data3', wintypes.WORD),
        ('Data4', wintypes.BYTE * 8)
    ]

class WLAN_INTERFACE_INFO(ctypes.Structure):
    _fields_ = [
        ('InterfaceGuid', GUID),
        ('strInterfaceDescription', wintypes.WCHAR * 256),
        ('isState', wintypes.DWORD)
    ]

class WLAN_INTERFACE_INFO_LIST(ctypes.Structure):
    _fields_ = [
        ('dwNumberOfItems', wintypes.DWORD),
        ('dwIndex', wintypes.DWORD),
        ('InterfaceInfo', WLAN_INTERFACE_INFO * 1)
    ]


class WirelessSecurityEvaluator:
    """Evaluates protocol-level security vulnerabilities for wireless broadcasts"""

    # Protocol CVE mapping and architectural vulnerabilities
    PROTOCOL_VULNS = {
        "OPEN": {
            "score": "9.8",
            "severity": "CRITICAL",
            "risk_title": "شبكة مفتوحة غير مشفرة (Unencrypted Broadcast)",
            "cves": ["CWE-319", "CWE-287"],
            "description": "الشبكة تبث بدون أي تشفير. البيانات المنقولة وكلمات المرور عرضة للتنصت والاعتراض المباشر في الهواء."
        },
        "WEP": {
            "score": "9.3",
            "severity": "CRITICAL",
            "risk_title": "بروتوكول WEP المتقادم والمنهار أمنياً",
            "cves": ["CVE-2001-0518", "CVE-2005-0024"],
            "description": "بروتوكول WEP يعاني من ضعف تشفيري جذري في مفاتيح IV مما يجعله غير آمن نهائياً وسهل الفك."
        },
        "WPA-TKIP": {
            "score": "8.1",
            "severity": "HIGH",
            "risk_title": "تشفير TKIP الضعيف والمتقادم",
            "cves": ["CVE-2008-5827", "CVE-2009-0052"],
            "description": "خوارزمية TKIP تعتبر قديمة وعرضة لهجمات فك الحزم وحقن البيانات (Beck-Tews Attack)."
        },
        "WPA-PERSONAL": {
            "score": "7.5",
            "severity": "HIGH",
            "risk_title": "بروتوكول WPAv1 القديم",
            "cves": ["CVE-2008-5827", "CWE-326"],
            "description": "بروتوكول قديم تم استبداله بمعايير WPA2/WPA3. غير محمي ضد الهجمات الحديثة."
        },
        "WPA2-PERSONAL": {
            "score": "5.4",
            "severity": "MEDIUM",
            "risk_title": "WPA2-Personal (معيار قياسي - عرضة لهجمات القواميس في حال ضعف كلمة المرور)",
            "cves": ["CVE-2017-13077 (KRACK)", "CVE-2020-24586 (FragAttacks)"],
            "description": "بروتوكول آمن قياسياً إذا كانت كلمة المرور قوية ومعقدة ومحدث الفيرموير لحمايته من ثغرات إعادة تثبيت المفاتيح (KRACK)."
        },
        "WPA3-PERSONAL": {
            "score": "2.1",
            "severity": "LOW",
            "risk_title": "WPA3-Personal SAE (أعلى درجات الأمان اللاسلكي الحديث)",
            "cves": ["CVE-2019-9494 (Dragonblood - للأجهزة غير المحدثة)"],
            "description": "يستخدم خوارزمية تبادل المفاتيح المتزامنة (SAE) مع حماية ضد هجمات القواميس وتشفير إلزامي للحزم الإدارية (PMF)."
        }
    }

    @classmethod
    def evaluate_security(cls, auth: str, cipher: str) -> Dict:
        """Analyze authentication and cipher suite to produce security ratings and CVE findings"""
        auth_upper = auth.upper()
        cipher_upper = cipher.upper()

        if "OPEN" in auth_upper or "NONE" in auth_upper or "AUCUN" in auth_upper:
            return cls.PROTOCOL_VULNS["OPEN"]
        elif "WEP" in auth_upper or "WEP" in cipher_upper:
            return cls.PROTOCOL_VULNS["WEP"]
        elif "TKIP" in cipher_upper or ("WPA-" in auth_upper and "WPA2" not in auth_upper and "WPA3" not in auth_upper):
            return cls.PROTOCOL_VULNS["WPA-TKIP"]
        elif "WPA3" in auth_upper:
            return cls.PROTOCOL_VULNS["WPA3-PERSONAL"]
        elif "WPA2" in auth_upper:
            return cls.PROTOCOL_VULNS["WPA2-PERSONAL"]
        else:
            return cls.PROTOCOL_VULNS["WPA-PERSONAL"]


class WirelessSpectrumScanner:
    """Active Over-the-Air Wi-Fi RF scanner with Security & Vulnerability Analysis"""

    IOT_PATTERNS = [
        r"camera", r"cam_", r"cam-", r"dahua", r"hikvision", r"ezviz", r"tuya",
        r"tapo", r"imou", r"ring", r"nest", r"vstarcam", r"sonoff", r"audio",
        r"speaker", r"broadcast", r"pa_", r"intercom", r"sip", r"cctv"
    ]

    KNOWN_IOT_MAC_PREFIXES = {
        "bc:54:51": "Hikvision Digital Technology",
        "4c:11:bf": "Dahua Technology",
        "ec:71:db": "Hangzhou Ezviz Software",
        "3c:6a:9d": "TP-Link Tapo / Smart IoT",
        "50:ec:50": "Tuya Smart IoT",
        "b0:4e:26": "TP-Link Smart Home",
        "d8:07:b6": "Sonoff / Itead",
        "00:0e:8f": "Axis Communications (Cameras/PA)",
        "00:0e:58": "Sonos Smart Audio",
        "00:20:91": "JVC Professional Video",
    }

    @classmethod
    def trigger_active_wlan_scan(cls):
        """Forces the Wi-Fi card to actively transmit probe requests on all 2.4/5GHz channels"""
        if not HAS_CTYPES or platform.system().lower() != "windows":
            return

        try:
            wlanapi = ctypes.windll.wlanapi
            handle = wintypes.HANDLE()
            negotiated_version = wintypes.DWORD()
            
            res = wlanapi.WlanOpenHandle(2, None, ctypes.byref(negotiated_version), ctypes.byref(handle))
            if res != 0:
                return

            info_list_ptr = ctypes.POINTER(WLAN_INTERFACE_INFO_LIST)()
            res = wlanapi.WlanEnumInterfaces(handle, None, ctypes.byref(info_list_ptr))
            
            if res == 0 and info_list_ptr.contents.dwNumberOfItems > 0:
                for i in range(info_list_ptr.contents.dwNumberOfItems):
                    guid = info_list_ptr.contents.InterfaceInfo[i].InterfaceGuid
                    wlanapi.WlanScan(handle, ctypes.byref(guid), None, None, None)

            wlanapi.WlanCloseHandle(handle, None)
            time.sleep(2.5)
        except Exception:
            pass

    @classmethod
    def scan_surrounding_wifi_rf(cls) -> List[Dict]:
        """Actively sweeps wireless channels and audits security for all visible broadcasters"""
        os_name = platform.system().lower()
        if "windows" in os_name:
            cls.trigger_active_wlan_scan()
            return cls._scan_windows_wlan()
        elif "linux" in os_name:
            return cls._scan_linux_wlan()
        return []

    @classmethod
    def _scan_windows_wlan(cls) -> List[Dict]:
        networks = []
        try:
            cmd = ["netsh", "wlan", "show", "networks", "mode=bssid"]
            out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, encoding="cp850", errors="ignore")
            
            current_ssid = ""
            current_auth = ""
            current_cipher = ""
            current_bssid = ""
            current_signal = ""
            current_radio = ""
            current_band = ""
            current_channel = ""

            for line in out.splitlines():
                line_str = line.strip()
                if line_str.startswith("SSID") and ":" in line_str and not line_str.startswith("BSSID"):
                    parts = line_str.split(":", 1)
                    current_ssid = parts[1].strip()
                elif line_str.startswith("Authentication") or line_str.startswith("Authentification"):
                    current_auth = line_str.split(":", 1)[1].strip()
                elif line_str.startswith("Encryption") or line_str.startswith("Chiffrement"):
                    current_cipher = line_str.split(":", 1)[1].strip()
                elif line_str.startswith("BSSID") and ":" in line_str:
                    if current_bssid:
                        networks.append(cls._build_network_entry(
                            current_ssid, current_bssid, current_auth, current_cipher,
                            current_signal, current_radio, current_band, current_channel
                        ))
                    current_bssid = line_str.split(":", 1)[1].strip()
                    current_signal = ""
                    current_radio = ""
                    current_band = ""
                    current_channel = ""
                elif line_str.startswith("Signal"):
                    current_signal = line_str.split(":", 1)[1].strip()
                elif line_str.startswith("Radio type"):
                    current_radio = line_str.split(":", 1)[1].strip()
                elif line_str.startswith("Band"):
                    current_band = line_str.split(":", 1)[1].strip()
                elif line_str.startswith("Channel"):
                    current_channel = line_str.split(":", 1)[1].strip()

            if current_bssid:
                networks.append(cls._build_network_entry(
                    current_ssid, current_bssid, current_auth, current_cipher,
                    current_signal, current_radio, current_band, current_channel
                ))
        except Exception:
            pass
        return networks

    @classmethod
    def _build_network_entry(cls, ssid, bssid, auth, cipher, signal, radio, band, channel) -> Dict:
        prefix = ":".join(bssid.lower().split(":")[:3]) if bssid else ""
        vendor_match = cls.KNOWN_IOT_MAC_PREFIXES.get(prefix, "")
        is_iot_flag = bool(vendor_match) or any(re.search(pat, ssid, re.IGNORECASE) for pat in cls.IOT_PATTERNS)
        
        dev_type = "Wireless Camera / Audio IoT" if is_iot_flag else "Wireless Access Point / Network"
        if vendor_match:
            dev_type = f"{vendor_match} Device"

        # Security & Vulnerability Evaluation
        sec_eval = WirelessSecurityEvaluator.evaluate_security(auth, cipher)

        return {
            "ssid": ssid or "<Hidden SSID>",
            "bssid": bssid,
            "auth": auth or "Unknown",
            "cipher": cipher or "N/A",
            "signal": signal or "N/A",
            "band": band or "2.4/5 GHz",
            "channel": channel or "Auto",
            "radio": radio or "802.11",
            "vendor": vendor_match or "Generic Wireless Host",
            "type": dev_type,
            "is_iot": is_iot_flag,
            "security_score": sec_eval["score"],
            "security_severity": sec_eval["severity"],
            "risk_title": sec_eval["risk_title"],
            "cves": sec_eval["cves"],
            "vuln_description": sec_eval["description"]
        }

    @classmethod
    def _scan_linux_wlan(cls) -> List[Dict]:
        networks = []
        try:
            cmd = ["nmcli", "-t", "-f", "SSID,BSSID,SECURITY,SIGNAL,CHAN", "dev", "wifi"]
            out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, errors="ignore")
            for line in out.splitlines():
                parts = line.strip().split(":")
                if len(parts) >= 4:
                    ssid, bssid, sec, sig = parts[0], parts[1], parts[2], parts[3]
                    chan = parts[4] if len(parts) > 4 else "N/A"
                    networks.append(cls._build_network_entry(
                        ssid, bssid, sec, "", sig, "802.11", "2.4/5 GHz", chan
                    ))
        except Exception:
            pass
        return networks
