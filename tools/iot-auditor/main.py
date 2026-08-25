#!/usr/bin/env python3
"""
IoT & Network Camera/PA System Security Auditor
Main CLI Entry Point with Smart Network Auto-Discovery & CVE Correlation
"""

import argparse
import sys
from typing import List, Dict, Set

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from scanner import DeviceScanner
from cve_client import CVEClient
from reporter import AuditReporter
from discover import NetworkDiscovery


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Smart Defensive Security Auditor for IP Cameras, PA Systems, and IoT Devices."
    )
    parser.add_argument(
        "-t", "--target",
        help="Target IP address or hostname to audit (e.g. 192.168.1.50). If omitted, auto-discovery is used."
    )
    parser.add_argument(
        "--auto-discover", "-a",
        action="store_true",
        help="Automatically probe local network using ONVIF, SSDP, and Subnet Sweep to discover all devices"
    )
    parser.add_argument(
        "--subnet",
        help="Custom subnet CIDR to sweep (e.g. 192.168.1.0/24)"
    )
    parser.add_argument(
        "-p", "--ports",
        nargs="+",
        type=int,
        help="Custom port list to probe (e.g. -p 80 443 554 8000 5060)"
    )
    parser.add_argument(
        "--api-key",
        help="Optional NIST NVD API key for elevated rate limits"
    )
    parser.add_argument(
        "--cve-limit",
        type=int,
        default=3,
        help="Maximum CVEs to return per identified product (default: 3)"
    )
    parser.add_argument(
        "-o", "--output",
        help="Path to save full JSON audit report (e.g. -o audit_result.json)"
    )
    return parser.parse_args()


def audit_single_target(target_ip: str, scanner_ports: List[int], cve_client: CVEClient, reporter: AuditReporter, cve_limit: int) -> Dict:
    print(f"\n=======================================================")
    print(f"[*] Auditing Target Device: {target_ip}")
    print(f"=======================================================")

    scanner = DeviceScanner(target_ip=target_ip, custom_ports=scanner_ports)
    open_ports = scanner.scan_open_ports()
    reporter.print_ports_table(target_ip, open_ports)

    if not open_ports:
        return {"ip": target_ip, "open_ports": {}, "fingerprints": [], "cve_findings": {}}

    fingerprints = []
    keywords_to_search = set()

    # Web inspection
    for p in [80, 443, 8000, 8080]:
        if p in open_ports:
            b = scanner.grab_http_banner(p)
            if b:
                fingerprints.append(b)
                if b.get("server"): keywords_to_search.add(b["server"])
                if b.get("title"): keywords_to_search.add(b["title"])
                if b.get("realm"): keywords_to_search.add(b["realm"])

    # RTSP inspection (Cameras & Video Servers)
    if 554 in open_ports:
        rtsp_srv = scanner.grab_rtsp_banner(554)
        if rtsp_srv:
            fingerprints.append({"port": "554", "protocol": "RTSP", "server": rtsp_srv, "title": ""})
            keywords_to_search.add(rtsp_srv)

    # SIP inspection (PA Systems / Intercoms / Voice Gateways)
    if 5060 in open_ports:
        sip_srv = scanner.grab_sip_banner(5060)
        if sip_srv:
            fingerprints.append({"port": "5060", "protocol": "SIP", "server": sip_srv, "title": ""})
            keywords_to_search.add(sip_srv)

    reporter.print_banners(fingerprints)

    all_cve_results = {}
    if not keywords_to_search:
        # Generic fallback if services are open but banner is silent
        if 554 in open_ports or 8000 in open_ports:
            keywords_to_search.add("IP Camera")
        elif 5060 in open_ports:
            keywords_to_search.add("SIP Audio")

    for kw in keywords_to_search:
        clean_kw = kw.strip()
        if len(clean_kw) < 3 or clean_kw.lower() in ["index", "login", "welcome", "home", "document"]:
            continue

        cves = cve_client.search_cves(clean_kw, limit=cve_limit)
        all_cve_results[clean_kw] = cves
        reporter.print_cve_results(clean_kw, cves)

    return {
        "ip": target_ip,
        "open_ports": {str(k): list(v) for k, v in open_ports.items()},
        "fingerprints": fingerprints,
        "cve_findings": all_cve_results
    }


def main():
    args = parse_arguments()
    reporter = AuditReporter()
    reporter.print_banner()

    cve_client = CVEClient(api_key=args.api_key)
    targets_to_audit: List[str] = []
    discovered_records: List[Dict[str, str]] = []

    # 1. Target Resolution
    if args.target:
        targets_to_audit.append(args.target)
    else:
        print("[*] No target IP provided. Launching Smart Auto-Discovery across local environment...")
        local_ip = NetworkDiscovery.get_local_ip()
        print(f"[*] Local Network Interface: {local_ip}")

        # A. ONVIF WS-Discovery Probe (UDP 3702)
        print("[*] Probing for ONVIF IP Cameras (Multicast WS-Discovery)...")
        onvif_devices = NetworkDiscovery.discover_onvif_cameras(timeout=2.0)
        discovered_records.extend(onvif_devices)

        # B. SSDP / UPnP Discovery (UDP 1900)
        print("[*] Probing for Audio/PA Systems & Media Devices (SSDP/UPnP)...")
        ssdp_devices = NetworkDiscovery.discover_ssdp_devices(timeout=2.0)
        discovered_records.extend(ssdp_devices)

        # C. Local Subnet Sweep
        print(f"[*] Sweeping local subnet on common IoT/Camera/PA ports...")
        subnet_hosts = NetworkDiscovery.sweep_local_subnet(subnet_cidr=args.subnet, timeout=0.6)
        
        # Merge all unique discovered targets
        discovered_ips = {d["ip"] for d in discovered_records}
        for h in subnet_hosts:
            if h not in discovered_ips:
                discovered_records.append({
                    "ip": h,
                    "type": "Network Host (IoT Ports Open)",
                    "endpoint": f"http://{h}",
                    "details": "Active host responding on IoT/Media ports"
                })

        reporter.print_discovered_devices(discovered_records)

        targets_to_audit = [d["ip"] for d in discovered_records]

    if not targets_to_audit:
        print("[-] No active devices discovered to audit.")
        sys.exit(0)

    # 2. Run Audit across targets
    print(f"\n[+] Starting Vulnerability & CVE Audit on {len(targets_to_audit)} targets...")
    all_reports = []

    for target_ip in targets_to_audit:
        rep = audit_single_target(
            target_ip=target_ip,
            scanner_ports=args.ports,
            cve_client=cve_client,
            reporter=reporter,
            cve_limit=args.cve_limit
        )
        all_reports.append(rep)

    # 3. Export JSON Report if specified
    if args.output:
        full_export = {
            "discovered_devices": discovered_records,
            "audit_results": all_reports
        }
        reporter.export_json(args.output, full_export)

    print("\n[✓] All audits completed successfully.")


if __name__ == "__main__":
    main()
