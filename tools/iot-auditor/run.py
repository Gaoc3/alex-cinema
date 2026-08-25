#!/usr/bin/env python3
"""
Zero-Config One-Click Launcher for IoT & Camera/PA Security Auditor
Automates everything: dependency verification, network auto-discovery, CVE scanning, and HTML report generation.
"""

import sys
import subprocess
import os
import webbrowser
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Auto-install requirements if missing
try:
    import requests
    import urllib3
except ImportError:
    print("[*] Installing required libraries (requests, urllib3, rich)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "urllib3", "rich"])

from scanner import DeviceScanner
from cve_client import CVEClient
from reporter import AuditReporter
from discover import NetworkDiscovery
from wifi_scanner import WirelessSpectrumScanner
from html_report import generate_html_report


def main():
    reporter = AuditReporter()
    reporter.print_banner()

    print("\n" + "="*70)
    print(" 🚀 جاري بدء الفحص الذكي التلقائي الشامل للشبكة والموجات اللاسلكية")
    print("="*70)

    local_subnets = NetworkDiscovery.get_all_local_subnets()
    print(f"[*] النطاقات والسابنتات المتصلة ({len(local_subnets)} شبكات): {', '.join(local_subnets)}")

    # 1. Automatic Discovery
    discovered_records = []

    print("\n[1/4] 📡 جاري البحث التلقائي عن كاميرات المراقبة (ONVIF WS-Discovery)...")
    onvif_devices = NetworkDiscovery.discover_onvif_cameras(timeout=2.0)
    discovered_records.extend(onvif_devices)
    if onvif_devices:
        print(f"    ✔ تم اكتشاف {len(onvif_devices)} كاميرا ONVIF.")

    print("[2/4] 🔊 جاري البحث عن أنظمة الإذاعة الصوتية ومكبرات الصوت الذكية (SSDP/UPnP)...")
    ssdp_devices = NetworkDiscovery.discover_ssdp_devices(timeout=2.0)
    discovered_records.extend(ssdp_devices)
    if ssdp_devices:
        print(f"    ✔ تم اكتشاف {len(ssdp_devices)} جهاز صوت / وسائط.")

    print(f"[3/4] 🌐 جاري عمل مسح تفرعي شامل لجميع نطاقات السابنت ({len(local_subnets)} شبكات)...")
    subnet_hosts = []
    for s_cidr in local_subnets:
        hosts = NetworkDiscovery.sweep_local_subnet(subnet_cidr=s_cidr, timeout=0.6)
        subnet_hosts.extend(hosts)
    
    discovered_ips = {d["ip"] for d in discovered_records}
    for h in subnet_hosts:
        if h not in discovered_ips:
            discovered_records.append({
                "ip": h,
                "type": "Network Host (IoT Ports Active)",
                "endpoint": f"http://{h}",
                "details": "Active host responding on IoT/Media ports"
            })

    print("[4/4] 📶 جاري مسح طيف موجات الراديو والواي فاي في المحيط (Over-the-Air RF Scan)...")
    rf_networks = WirelessSpectrumScanner.scan_surrounding_wifi_rf()
    if rf_networks:
        print(f"    ✔ تم التقاط {len(rf_networks)} إشارة ومحطة لاسلكية في المحيط وتم تقييم ثغراتها بروتوكولياً.")
        for rfn in rf_networks[:6]:
            tag = " [كاميرا/IoT محتمل]" if rfn.get("is_iot") else ""
            sev = rfn.get("security_severity", "LOW")
            score = rfn.get("security_score", "")
            cve_str = ", ".join(rfn.get("cves", []))
            print(f"       ● [{score} {sev}] SSID: {rfn.get('ssid')} | BSSID: {rfn.get('bssid')} | Auth: {rfn.get('auth')}{tag}")
            print(f"         └─ الثغرات: {cve_str} - {rfn.get('risk_title')}")

    reporter.print_discovered_devices(discovered_records)

    targets_to_audit = [d["ip"] for d in discovered_records]

    if not targets_to_audit:
        print("\n[-] لم يتم العثور على أي أجهزة ذكية تستجيب لمنافذ الكاميرات أو أنظمة الصوت في هذه الشبكة.")
        sys.exit(0)

    # 2. Run Audit on each device
    print(f"\n[+] بدء فحص الترويسات ومطابقة الثغرات الأمنية (CVEs) لـ {len(targets_to_audit)} جهاز...")
    cve_client = CVEClient()
    all_reports = []

    for target_ip in targets_to_audit:
        scanner = DeviceScanner(target_ip=target_ip)
        open_ports = scanner.scan_open_ports()
        
        fingerprints = []
        keywords_to_search = set()

        for p in [80, 443, 8000, 8080]:
            if p in open_ports:
                b = scanner.grab_http_banner(p)
                if b:
                    fingerprints.append(b)
                    if b.get("server"): keywords_to_search.add(b["server"])
                    if b.get("title"): keywords_to_search.add(b["title"])
                    if b.get("realm"): keywords_to_search.add(b["realm"])

        if 554 in open_ports:
            rtsp_srv = scanner.grab_rtsp_banner(554)
            if rtsp_srv:
                fingerprints.append({"port": "554", "protocol": "RTSP", "server": rtsp_srv, "title": ""})
                keywords_to_search.add(rtsp_srv)

        if 5060 in open_ports:
            sip_srv = scanner.grab_sip_banner(5060)
            if sip_srv:
                fingerprints.append({"port": "5060", "protocol": "SIP", "server": sip_srv, "title": ""})
                keywords_to_search.add(sip_srv)

        all_cve_results = {}
        if not keywords_to_search:
            if 554 in open_ports or 8000 in open_ports:
                keywords_to_search.add("IP Camera")
            elif 5060 in open_ports:
                keywords_to_search.add("SIP Audio")

        for kw in keywords_to_search:
            clean_kw = kw.strip()
            if len(clean_kw) < 3 or clean_kw.lower() in ["index", "login", "welcome", "home", "document"]:
                continue
            cves = cve_client.search_cves(clean_kw, limit=3)
            all_cve_results[clean_kw] = cves

        all_reports.append({
            "ip": target_ip,
            "open_ports": {str(k): list(v) for k, v in open_ports.items()},
            "fingerprints": fingerprints,
            "cve_findings": all_cve_results
        })

    # 3. Generate HTML Dashboard Report
    report_filename = f"security_report_{time.strftime('%Y%m%d_%H%M%S')}.html"
    report_path = os.path.abspath(report_filename)
    generate_html_report(discovered_records, all_reports, report_path, rf_networks=rf_networks)

    print("\n" + "="*70)
    print(f"  ✨ اكتمل الفحص الأمني بنجاح! تم إنشاء تقرير الأمان التفاعلي:")
    print(f"  📄 الملف: {report_path}")
    print("="*70)

    # 4. Open in browser automatically
    try:
        webbrowser.open(f"file:///{report_path}")
        print("[✓] تم فتح التقرير تلقائياً في المتصفح الخاص بك.")
    except Exception:
        pass


if __name__ == "__main__":
    main()
