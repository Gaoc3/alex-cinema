# -*- coding: utf-8 -*-
import sys
import os
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from app import resolve_fasel_stream
from fasel_scraper import FaselAPI

api = FaselAPI()
ep_url = "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-sopranos-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%a7%d9%88%d9%84-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1-gft"

print(f"📡 Resolving streams for: {ep_url}")
servers = resolve_fasel_stream(ep_url)
print("\nResolved streams:")
print(json.dumps(servers, indent=2, ensure_ascii=False))
