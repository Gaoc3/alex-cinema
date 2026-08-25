"""
Audit Reporter Module
Renders visual security reports in terminal and exports structured JSON findings.
"""

import json
from typing import Dict, List, Any

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.text import Text
    HAS_RICH = True
except ImportError:
    HAS_RICH = False


class AuditReporter:
    """Generates visual CLI tables and exports JSON audit reports"""

    def __init__(self):
        self.console = Console() if HAS_RICH else None

    def print_banner(self):
        banner_text = """
======================================================================
     IoT & Network Camera/PA Vulnerability Security Auditor
     [Defensive Security Auditing & CVE Correlation Engine]
======================================================================
"""
        if HAS_RICH and self.console:
            self.console.print(Panel.fit(
                "[bold cyan]IoT & Camera/PA Vulnerability Security Auditor[/bold cyan]\n"
                "[dim]Defensive Assessment & Official CVE Correlation Tool[/dim]",
                border_style="cyan"
            ))
        else:
            print(banner_text)

    def print_discovered_devices(self, devices: List[Dict[str, str]]):
        if not devices:
            print("[-] No devices discovered on the network.")
            return

        if HAS_RICH and self.console:
            table = Table(title="Discovered Network IoT / Cameras / PA Systems", border_style="green")
            table.add_column("IP Address", style="bold cyan", no_wrap=True)
            table.add_column("Device Type", style="magenta")
            table.add_column("Endpoint", style="yellow")
            table.add_column("Fingerprint / Scope", style="white")

            for d in devices:
                table.add_row(d.get("ip", ""), d.get("type", ""), d.get("endpoint", ""), d.get("details", ""))

            self.console.print(table)
        else:
            print("\n[+] Discovered Devices on Network:")
            for d in devices:
                print(f"    - [{d.get('type')}] IP: {d.get('ip')} | Endpoint: {d.get('endpoint')} | Details: {d.get('details')}")

    def print_ports_table(self, target_ip: str, open_ports: Dict[int, Any]):
        if not open_ports:
            print(f"[-] No open ports identified on {target_ip}.")
            return

        if HAS_RICH and self.console:
            table = Table(title=f"Open Services on {target_ip}", border_style="blue")
            table.add_column("Port", justify="right", style="cyan", no_wrap=True)
            table.add_column("Protocol", style="magenta")
            table.add_column("Service Description", style="green")

            for port, (proto, desc) in open_ports.items():
                table.add_row(str(port), proto, desc)

            self.console.print(table)
        else:
            print(f"\n[+] Open Services on {target_ip}:")
            for port, (proto, desc) in open_ports.items():
                print(f"    - Port {port:<5} | {proto:<8} | {desc}")

    def print_banners(self, banners: List[Dict[str, str]]):
        if not banners:
            return

        print("\n[+] Service Fingerprints & Banners:")
        for b in banners:
            proto = b.get("protocol", "TCP")
            port = b.get("port", "")
            srv = b.get("server", "")
            title = b.get("title", "")
            print(f"    - [{proto}:{port}] Server: '{srv}' | Title: '{title}'")

    def print_cve_results(self, keyword: str, cves: List[Dict]):
        if not cves:
            print(f"\n[*] Keyword '{keyword}': No matching CVEs returned.")
            return

        if HAS_RICH and self.console:
            table = Table(title=f"CVE Matches for '[bold yellow]{keyword}[/bold yellow]'", border_style="red")
            table.add_column("CVE ID", style="bold white", no_wrap=True)
            table.add_column("Score", justify="center")
            table.add_column("Severity", justify="center")
            table.add_column("Published", style="dim")
            table.add_column("Description", style="white")

            for cve in cves:
                sev = cve.get("severity", "UNKNOWN").upper()
                score = str(cve.get("score", "N/A"))
                
                if sev == "CRITICAL":
                    sev_style = "[bold red]CRITICAL[/bold red]"
                    score_style = f"[bold red]{score}[/bold red]"
                elif sev == "HIGH":
                    sev_style = "[red]HIGH[/red]"
                    score_style = f"[red]{score}[/red]"
                elif sev == "MEDIUM":
                    sev_style = "[yellow]MEDIUM[/yellow]"
                    score_style = f"[yellow]{score}[/yellow]"
                else:
                    sev_style = "[green]LOW[/green]"
                    score_style = f"[green]{score}[/green]"

                desc = cve.get("description", "")
                if len(desc) > 120:
                    desc = desc[:120] + "..."

                table.add_row(
                    cve.get("id", "N/A"),
                    score_style,
                    sev_style,
                    cve.get("published", "N/A"),
                    desc
                )

            self.console.print(table)
        else:
            print(f"\n[!] CVE Matches for '{keyword}':")
            for cve in cves:
                print(f"    - {cve.get('id')} | CVSS: {cve.get('score')} ({cve.get('severity')}) | Date: {cve.get('published')}")
                print(f"      Desc: {cve.get('description')[:120]}...\n")

    def export_json(self, output_file: str, report_data: Dict[str, Any]):
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=4, ensure_ascii=False)
            print(f"\n[✓] Audit Report successfully exported to: {output_file}")
        except Exception as e:
            print(f"[!] Failed to export JSON report: {e}")
