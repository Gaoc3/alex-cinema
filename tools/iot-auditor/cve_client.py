"""
CVE Database Client Module
Handles queries to NIST NVD API 2.0 and CIRCL CVE search engine.
"""

import time
import requests
from typing import Dict, List, Optional


class CVEClient:
    """Queries official vulnerability repositories (NVD & CIRCL)"""

    NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    CIRCL_API_URL = "https://cve.circl.lu/api/search"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "IoT-Defensive-Auditor/1.0"
        })
        if self.api_key:
            self.session.headers.update({"apiKey": self.api_key})
        self._cache: Dict[str, List[Dict]] = {}

    def search_cves(self, keyword: str, limit: int = 5) -> List[Dict]:
        """Search CVEs by product/firmware keyword with caching and fallback"""
        clean_kw = keyword.strip()
        if not clean_kw or len(clean_kw) < 2:
            return []

        if clean_kw in self._cache:
            return self._cache[clean_kw]

        # 1. Try NIST NVD API v2
        results = self._query_nvd(clean_kw, limit)

        # 2. Fallback to CIRCL CVE API if NVD fails or returns rate limit
        if not results:
            results = self._query_circl(clean_kw, limit)

        self._cache[clean_kw] = results
        return results

    def _query_nvd(self, keyword: str, limit: int) -> List[Dict]:
        params = {
            "keywordSearch": keyword,
            "resultsPerPage": limit
        }
        try:
            res = self.session.get(self.NVD_API_URL, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return self._parse_nvd_data(data)
            elif res.status_code == 403:
                # Rate limit reached
                return []
        except Exception:
            pass
        return []

    def _query_circl(self, keyword: str, limit: int) -> List[Dict]:
        try:
            url = f"{self.CIRCL_API_URL}/{keyword}"
            res = self.session.get(url, timeout=8)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list):
                    parsed = []
                    for item in data[:limit]:
                        cve_id = item.get("id", "N/A")
                        summary = item.get("summary", "No description")
                        cvss = str(item.get("cvss", "N/A"))
                        published = str(item.get("Published", ""))[:10]
                        
                        severity = "UNKNOWN"
                        try:
                            score_float = float(cvss)
                            if score_float >= 9.0: severity = "CRITICAL"
                            elif score_float >= 7.0: severity = "HIGH"
                            elif score_float >= 4.0: severity = "MEDIUM"
                            else: severity = "LOW"
                        except Exception:
                            pass

                        parsed.append({
                            "id": cve_id,
                            "score": cvss,
                            "severity": severity,
                            "published": published,
                            "description": summary
                        })
                    return parsed
        except Exception:
            pass
        return []

    def _parse_nvd_data(self, data: Dict) -> List[Dict]:
        parsed = []
        for item in data.get("vulnerabilities", []):
            cve = item.get("cve", {})
            cve_id = cve.get("id", "N/A")
            published = cve.get("published", "")[:10]

            desc = "No description available."
            for d in cve.get("descriptions", []):
                if d.get("lang") == "en":
                    desc = d.get("value", "")
                    break

            metrics = cve.get("metrics", {})
            score = "N/A"
            severity = "UNKNOWN"

            if "cvssMetricV31" in metrics:
                cvss_data = metrics["cvssMetricV31"][0]["cvssData"]
                score = str(cvss_data.get("baseScore", "N/A"))
                severity = cvss_data.get("baseSeverity", "UNKNOWN")
            elif "cvssMetricV30" in metrics:
                cvss_data = metrics["cvssMetricV30"][0]["cvssData"]
                score = str(cvss_data.get("baseScore", "N/A"))
                severity = cvss_data.get("baseSeverity", "UNKNOWN")
            elif "cvssMetricV2" in metrics:
                cvss_data = metrics["cvssMetricV2"][0]["cvssData"]
                score = str(cvss_data.get("baseScore", "N/A"))
                severity = metrics["cvssMetricV2"][0].get("baseSeverity", "UNKNOWN")

            parsed.append({
                "id": cve_id,
                "score": score,
                "severity": severity,
                "published": published,
                "description": desc
            })
        return parsed
