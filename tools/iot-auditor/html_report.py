"""
HTML Security Report Generator
Produces a modern, responsive security dashboard with Arabic & English explanations.
Includes Over-the-Air Wireless RF Spectrum analysis and Connected IoT/Camera Audits.
"""

import os
import datetime
from typing import Dict, List, Any, Optional


def generate_html_report(discovered_devices: List[Dict], audit_results: List[Dict], output_path: str, rf_networks: Optional[List[Dict]] = None):
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    total_devices = len(discovered_devices)
    total_rf_signals = len(rf_networks) if rf_networks else 0
    total_cves = 0
    critical_count = 0
    high_count = 0
    medium_count = 0

    # Count LAN device CVEs
    for res in audit_results:
        cve_findings = res.get("cve_findings", {})
        for _, cve_list in cve_findings.items():
            for cve in cve_list:
                total_cves += 1
                sev = cve.get("severity", "").upper()
                if sev == "CRITICAL": critical_count += 1
                elif sev == "HIGH": high_count += 1
                elif sev == "MEDIUM": medium_count += 1

    # Count RF spectrum protocol risks
    if rf_networks:
        for rfn in rf_networks:
            r_sev = rfn.get("security_severity", "").upper()
            if r_sev == "CRITICAL": critical_count += 1
            elif r_sev == "HIGH": high_count += 1
            elif r_sev == "MEDIUM": medium_count += 1

    html_content = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير الفحص الأمني للأجهزة والموجات اللاسلكية | IoT & RF Security Audit Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #182234;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-blue: #38bdf8;
            --accent-purple: #c084fc;
            --accent-red: #ef4444;
            --accent-orange: #f97316;
            --accent-yellow: #eab308;
            --accent-green: #22c55e;
            --border-color: rgba(255, 255, 255, 0.08);
        }}
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            background-color: var(--bg-primary);
            color: var(--text-primary);
            font-family: 'Tajawal', sans-serif;
            padding: 2rem;
            line-height: 1.6;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 2.5rem;
            border-radius: 1.5rem;
            border: 1px solid var(--border-color);
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1.5rem;
        }}
        .header h1 {{
            font-size: 1.8rem;
            font-weight: 900;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }}
        .header .meta {{
            color: var(--text-secondary);
            font-size: 0.95rem;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.25rem;
            margin-bottom: 2rem;
        }}
        .stat-card {{
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: 1.25rem;
            border: 1px solid var(--border-color);
            text-align: center;
        }}
        .stat-card .num {{
            font-size: 2.2rem;
            font-weight: 900;
            font-family: 'Outfit', sans-serif;
            margin-bottom: 0.25rem;
        }}
        .stat-card .label {{
            color: var(--text-secondary);
            font-size: 0.95rem;
            font-weight: 500;
        }}
        .stat-total .num {{ color: var(--accent-blue); }}
        .stat-rf .num {{ color: var(--accent-purple); }}
        .stat-critical .num {{ color: var(--accent-red); }}
        .stat-high .num {{ color: var(--accent-orange); }}
        .stat-medium .num {{ color: var(--accent-yellow); }}
        
        .section-title {{
            font-size: 1.35rem;
            font-weight: 700;
            margin-bottom: 1rem;
            margin-top: 2rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #fff;
        }}
        .device-card {{
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 1.25rem;
            padding: 1.75rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }}
        .device-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1rem;
            margin-bottom: 1.25rem;
            flex-wrap: wrap;
            gap: 0.5rem;
        }}
        .device-ip {{
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--accent-blue);
            background: rgba(56, 189, 248, 0.1);
            padding: 0.25rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(56, 189, 248, 0.2);
        }}
        .device-type {{
            background: rgba(255,255,255,0.08);
            padding: 0.35rem 0.85rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            color: #e2e8f0;
        }}
        .ports-list {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1.25rem;
        }}
        .port-badge {{
            background: #0f172a;
            border: 1px solid rgba(255,255,255,0.1);
            padding: 0.35rem 0.75rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            font-family: 'Outfit', sans-serif;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }}
        .cve-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
            font-size: 0.9rem;
        }}
        .cve-table th, .cve-table td {{
            padding: 0.75rem 1rem;
            border: 1px solid var(--border-color);
            text-align: right;
        }}
        .cve-table th {{
            background: rgba(0,0,0,0.3);
            color: var(--text-secondary);
            font-weight: 700;
        }}
        .badge-severity {{
            padding: 0.2rem 0.6rem;
            border-radius: 0.35rem;
            font-weight: 700;
            font-size: 0.75rem;
            display: inline-block;
            font-family: 'Outfit', sans-serif;
        }}
        .badge-critical {{ background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }}
        .badge-high {{ background: rgba(249, 115, 22, 0.2); color: #f97316; border: 1px solid #f97316; }}
        .badge-medium {{ background: rgba(234, 179, 8, 0.2); color: #eab308; border: 1px solid #eab308; }}
        .badge-low {{ background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid #22c55e; }}

        .advice-box {{
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%);
            border: 1px solid rgba(56, 189, 248, 0.25);
            padding: 1.75rem;
            border-radius: 1.25rem;
            margin-top: 2.5rem;
        }}
        .advice-box h3 {{
            color: #38bdf8;
            margin-bottom: 0.75rem;
            font-size: 1.15rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}
        .advice-list {{
            list-style: none;
            padding-right: 0;
        }}
        .advice-list li {{
            margin-bottom: 0.6rem;
            position: relative;
            padding-right: 1.5rem;
            color: #e2e8f0;
            font-size: 0.95rem;
        }}
        .advice-list li::before {{
            content: "✔";
            color: #38bdf8;
            position: absolute;
            right: 0;
            font-weight: 900;
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div>
                <h1>🛡️ تقرير التدقيق الأمني الذكي للكاميرات والأنظمة الصوتية والمحيط اللاسلكي</h1>
                <p class="meta">تاريخ ووقت الفحص: {now_str}</p>
            </div>
            <div class="meta" style="text-align: left;" dir="ltr">
                <strong>Scope:</strong> Over-the-Air RF (2.4/5GHz) & LAN Subnet
            </div>
        </div>

        <!-- Stats Overview -->
        <div class="stats-grid">
            <div class="stat-card stat-total">
                <div class="num">{total_devices}</div>
                <div class="label">الأجهزة المفحوصة بالشبكة</div>
            </div>
            <div class="stat-card stat-rf">
                <div class="num">{total_rf_signals}</div>
                <div class="label">إشارات الراديو / الواي فاي في المحيط</div>
            </div>
            <div class="stat-card stat-critical">
                <div class="num">{critical_count}</div>
                <div class="label">ثغرات حرجة (Critical)</div>
            </div>
            <div class="stat-card stat-high">
                <div class="num">{high_count}</div>
                <div class="label">ثغرات عالية الخطورة (High)</div>
            </div>
            <div class="stat-card stat-medium">
                <div class="num">{medium_count}</div>
                <div class="label">ثغرات متوسطة (Medium)</div>
            </div>
        </div>

        <!-- Over-The-Air RF Spectrum Section -->
        <h2 class="section-title">📡 موجات الراديو والواي فاي الملتقطة في المحيط (Over-the-Air RF Survey):</h2>
    """

    if rf_networks:
        html_content += """
        <div class="device-card">
            <table class="cve-table">
                <thead>
                    <tr>
                        <th style="width: 170px;">اسم الإشارة / الشبكة (SSID)</th>
                        <th style="width: 140px;">العنوان الفيزيائي (BSSID)</th>
                        <th style="width: 110px;">التردد / القناة</th>
                        <th style="width: 75px;">الإشارة</th>
                        <th style="width: 130px;">التشفير والبروتوكول</th>
                        <th style="width: 120px;">مستوى الأمان</th>
                        <th>الثغرات والتقييم الأمني (CVEs / Risk)</th>
                    </tr>
                </thead>
                <tbody>
        """
        for rfn in rf_networks:
            is_iot = rfn.get("is_iot", False)
            sev = rfn.get("security_severity", "LOW").upper()
            score = rfn.get("security_score", "N/A")
            cve_tags = ", ".join(rfn.get("cves", []))
            
            sev_class = f"badge-{sev.lower()}" if sev.lower() in ["critical", "high", "medium", "low"] else "badge-low"
            row_style = "background: rgba(192, 132, 252, 0.08);" if is_iot else ""

            html_content += f"""
                <tr style="{row_style}">
                    <td style="font-weight: bold; color: #fff;">
                        {rfn.get('ssid')}
                        {"<span style='font-size: 0.75rem; display: block; color: var(--accent-purple);'>[كاميرا / IoT محتمل]</span>" if is_iot else ""}
                    </td>
                    <td style="font-family: 'Outfit', sans-serif; color: var(--accent-blue);">{rfn.get('bssid')}</td>
                    <td style="font-family: 'Outfit', sans-serif;">{rfn.get('band')} (Ch {rfn.get('channel')})</td>
                    <td style="font-family: 'Outfit', sans-serif;">{rfn.get('signal')}</td>
                    <td>{rfn.get('auth')}</td>
                    <td><span class="badge-severity {sev_class}">{score} {sev}</span></td>
                    <td>
                        <strong style="color: #f8fafc; font-size: 0.85rem;">{rfn.get('risk_title')}</strong>
                        <div style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.2rem;">{rfn.get('vuln_description')}</div>
                        <div style="font-family: 'Outfit', sans-serif; color: var(--accent-blue); font-size: 0.75rem; margin-top: 0.25rem;">
                            <strong>CVEs:</strong> {cve_tags}
                        </div>
                    </td>
                </tr>
            """
        html_content += """
                </tbody>
            </table>
        </div>
        """
    else:
        html_content += """
        <div class="device-card" style="text-align: center; color: var(--text-secondary);">
            <p>لم يتم العثور على إشارات راديو لاسلكية نشطة في المحيط الحالي.</p>
        </div>
        """

    # Connected Devices Section
    html_content += """
        <h2 class="section-title">🔍 الأجهزة المفحوصة على الشبكة ونتائج ثغرات الـ CVEs:</h2>
    """

    if not audit_results:
        html_content += """
        <div class="device-card" style="text-align: center; color: var(--text-secondary);">
            <p>لم يتم العثور على أجهزة تستجيب لمنافذ الـ IoT / الكاميرات في الشبكة الحالية.</p>
        </div>
        """
    else:
        for res in audit_results:
            ip = res.get("ip", "Unknown")
            open_ports = res.get("open_ports", {})
            fingerprints = res.get("fingerprints", [])
            cve_findings = res.get("cve_findings", {})

            dev_type = "IP Camera / Audio Host"
            for d in discovered_devices:
                if d.get("ip") == ip:
                    dev_type = d.get("type", dev_type)
                    break

            html_content += f"""
            <div class="device-card">
                <div class="device-header">
                    <div class="device-ip">{ip}</div>
                    <div class="device-type">{dev_type}</div>
                </div>

                <div class="ports-list">
            """
            for port, info in open_ports.items():
                proto = info[0] if isinstance(info, (list, tuple)) else "TCP"
                html_content += f"""
                    <div class="port-badge">
                        <span>●</span> <strong>{port}</strong> ({proto})
                    </div>
                """
            html_content += """
                </div>
            """

            if fingerprints:
                html_content += """<div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">"""
                for b in fingerprints:
                    srv = b.get("server") or b.get("title") or ""
                    if srv:
                        html_content += f"""<div>📌 <strong>بصمة الخدمة ({b.get('protocol')}:{b.get('port')}):</strong> {srv}</div>"""
                html_content += """</div>"""

            all_cves_for_dev = []
            for _, cves in cve_findings.items():
                all_cves_for_dev.extend(cves)

            if all_cves_for_dev:
                html_content += """
                <table class="cve-table">
                    <thead>
                        <tr>
                            <th style="width: 140px;">رمز الثغرة (CVE)</th>
                            <th style="width: 100px;">الخطورة (CVSS)</th>
                            <th style="width: 110px;">تاريخ النشر</th>
                            <th>الوصف الفني للثغرة</th>
                        </tr>
                    </thead>
                    <tbody>
                """
                for cve in all_cves_for_dev:
                    sev = cve.get("severity", "UNKNOWN").upper()
                    sev_class = f"badge-{sev.lower()}" if sev.lower() in ["critical", "high", "medium", "low"] else "badge-low"
                    html_content += f"""
                        <tr>
                            <td style="font-family: 'Outfit', sans-serif; font-weight: bold; color: #fff;">
                                <a href="https://nvd.nist.gov/vuln/detail/{cve.get('id')}" target="_blank" style="color: #38bdf8; text-decoration: none;">
                                    {cve.get('id')} ↗
                                </a>
                            </td>
                            <td><span class="badge-severity {sev_class}">{cve.get('score')} {sev}</span></td>
                            <td style="color: var(--text-secondary);">{cve.get('published')}</td>
                            <td>{cve.get('description')}</td>
                        </tr>
                    """
                html_content += """
                    </tbody>
                </table>
                """
            else:
                html_content += """
                <div style="background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); padding: 0.75rem 1rem; border-radius: 0.5rem; color: #86efac; font-size: 0.9rem;">
                    ✔ لم يتم العثور على ثغرات مسجلة معروفة مطابقة لبصمة هذا الجهاز.
                </div>
                """

            html_content += "</div>"

    html_content += """
        <!-- Recommendations -->
        <div class="advice-box">
            <h3>💡 إرشادات التدقيق الأمني الميداني للكاميرات والموجات اللاسلكية:</h3>
            <ul class="advice-list">
                <li><strong>الرصد اللاسلكي السلبي (Passive Monitoring):</strong> يتم رصد جميع المحطات وإشارات الراديو والواي فاي المحيطة لتحديد التردد والتشفير وقوة الإشارة دون الحاجة للاتصال بها.</li>
                <li><strong>الفحص النشط واستخراج الثغرات (Deep Vulnerability Audit):</strong> لفحص منافذ أي كاميرا أو جهاز صوتي تم رصد إشارته، يجب على مسؤول النظام الاتصال بالشبكة التابع لها الجهاز لتتمكن بروتوكولات TCP/IP من فحص المنافذ واستخراج أرقام الـ CVEs.</li>
                <li><strong>استخدام التشفير القوي:</strong> تجنب الشبكات المفتوحة (Open Networks) في أنظمة المراقبة والصوت واستخدم بروتوكولات WPA3 أو WPA2-Enterprise.</li>
                <li><strong>تحديث الفيرموير بانتظام:</strong> مراجعة تحديثات الشركات المصنعة لسد الثغرات المسجلة في قواعد بيانات NIST NVD.</li>
            </ul>
        </div>
    </div>
</body>
</html>
"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    return output_path
