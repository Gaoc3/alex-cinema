# -*- coding: utf-8 -*-
"""
AleX CINEMA - Premium Ad-Free Web Portal Backend
------------------------------------------------
A Flask server that integrates the Shabakaty Cinemana scraping engine.
Acts as a transparent Range-compliant HLS/MP4 video stream proxy to bypass 403 blocks and popups.
"""

import os
import sys
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from flask import Flask, request, Response, render_template, jsonify

# Force UTF-8 output to support Arabic characters in all terminals
sys.stdout.reconfigure(encoding='utf-8')

# Import Fasel Scraper and Subprocess
import subprocess
import json
from fasel_scraper import FaselAPI

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/')
def index():
    return render_template('index.html')

# Initialize Scrapers
fasel_api = FaselAPI("https://web616x.faselhdx.bid")

# Arabic numbers mapping to digits for robust season/episode matching
ARABIC_NUMBERS = {
    "الاول": 1, "الأول": 1, "الأولى": 1, "الاولى": 1, "الاولي": 1, "اول": 1, "أول": 1,
    "الثاني": 2, "الثانية": 2, "ثاني": 2, "ثانية": 2,
    "الثالث": 3, "الثالثة": 3, "ثالث": 3, "ثالثة": 3,
    "الرابع": 4, "الرابعة": 4, "رابع": 4, "رابعة": 4,
    "الخامس": 5, "الخامسة": 5, "خامس": 5, "خامسة": 5,
    "السادس": 6, "السادسة": 6, "سادس": 6, "سادسة": 6,
    "السابع": 7, "السابعة": 7, "سابع": 7, "سابعة": 7,
    "الثامن": 8, "الثامنة": 8, "ثامن": 8, "ثامنة": 8,
    "التاسع": 9, "التاسعة": 9, "تاسع": 9, "تاسعة": 9,
    "العاشر": 10, "العاشرة": 10, "عاشر": 10, "عاشرة": 10,
    "الحادي عشر": 11, "الحادية عشر": 11, "الثاني عشر": 12, "الثانية عشر": 12, 
    "الثالث عشر": 13, "الثالثة عشر": 13, "الرابع عشر": 14, "الرابعة عشر": 14, 
    "الخامس عشر": 15, "الخامسة عشر": 15, "السادس عشر": 16, "السادسة عشر": 16, 
    "السابع عشر": 17, "السابعة عشر": 17, "الثامن عشر": 18, "الثامنة عشر": 18, 
    "التاسع عشر": 19, "التاسعة عشر": 19, 
    "العشرون": 20, "العشرين": 20, "الحادي والعشرون": 21, "الثاني والعشرون": 22, 
    "الثالث والعشرون": 23, "الرابع والعشرون": 24, "الخامس والعشرون": 25, 
    "السادس والعشرون": 26, "السابع والعشرون": 27, "الثامن والعشرون": 28, 
    "التاسع والعشرون": 29, "الثلاثون": 30, "الثلاثين": 30
}

def parse_season_num(title: str) -> int:
    """Parses season number from Arabic/English title string using context scanning."""
    t_clean = re.sub(r'\s+', ' ', title)
    
    # 1. Search for Season/S in English
    m = re.search(r'\b(?:season|s)\s*(\d+)\b', t_clean, re.IGNORECASE)
    if m:
        return int(m.group(1))
    
    m = re.search(r'\b(\d+)(?:st|nd|rd|th)?\s+season\b', t_clean, re.IGNORECASE)
    if m:
        return int(m.group(1))
        
    # 2. Search for موسم/الموسم in Arabic
    m = re.search(r'(?:موسم|الموسم)\s+([\u0600-\u06FF0-9\s]+)', t_clean)
    if m:
        season_chunk = m.group(1).strip()
        digit_match = re.match(r'^(\d+)', season_chunk)
        if digit_match:
            return int(digit_match.group(1))
        for arabic_word in sorted(ARABIC_NUMBERS.keys(), key=lambda x: len(x), reverse=True):
            if arabic_word in season_chunk:
                return ARABIC_NUMBERS[arabic_word]
                
    # Fallback to checking any Arabic number word strictly preceded by موسم/الموسم
    for arabic_word in sorted(ARABIC_NUMBERS.keys(), key=lambda x: len(x), reverse=True):
        if re.search(r'(?:موسم|الموسم)\s+' + re.escape(arabic_word), t_clean):
            return ARABIC_NUMBERS[arabic_word]
            
    # Last fallback: search for season number anywhere as a plain digit after 'موسم'
    m = re.search(r'(?:موسم|الموسم)\s+(\d+)', t_clean)
    if m:
        return int(m.group(1))
        
    return 1 # Default to Season 1

def parse_episode_num(title: str) -> int:
    """Parses episode number from Arabic/English title string using context scanning."""
    t_clean = re.sub(r'\s+', ' ', title)
    
    # 1. Look for compact S01E02 or 1x02 patterns
    m = re.search(r'\b(?:s\s*\d+\s*e\s*(\d+)|\d+\s*x\s*(\d+))\b', t_clean, re.IGNORECASE)
    if m:
        return int(m.group(1) or m.group(2))
        
    # 2. Look for explicit digits in episode context
    m = re.search(r'(?:الحلقة|الحلقه|حلقة|حلقه|ep|episode)\s*(\d+)', t_clean, re.IGNORECASE)
    if m:
        return int(m.group(1))
        
    # 3. Look for Arabic word digits in episode context
    m = re.search(r'(?:الحلقة|الحلقه|حلقة|حلقه)\s+([\u0600-\u06FF\s]+)', t_clean)
    if m:
        ep_chunk = m.group(1).strip()
        for arabic_word in sorted(ARABIC_NUMBERS.keys(), key=lambda x: len(x), reverse=True):
            if arabic_word in ep_chunk:
                return ARABIC_NUMBERS[arabic_word]
                
    # 4. Fallback to check for any Arabic word digit strictly preceded by الحلقة/حلقة
    for arabic_word in sorted(ARABIC_NUMBERS.keys(), key=lambda x: len(x), reverse=True):
        if re.search(r'(?:الحلقة|الحلقه|حلقة|حلقه)\s+' + re.escape(arabic_word), t_clean):
            return ARABIC_NUMBERS[arabic_word]
            
    # 5. Fallback to general last resort: look for lonely digits that are NOT standard release years
    for m in re.finditer(r'\b(\d+)\b', t_clean):
        val = int(m.group(1))
        if not (1900 <= val <= 2030):
            return val
            
    return 1 # Default to Episode 1


def is_black_and_white_version(title: str) -> bool:
    t = title.lower()
    bw_keywords = [
        "الأبيض والأسود", "الابيض والاسود", "الأبيض والاسود", "الابيض والأسود",
        "ابيض واسود", "أبيض وأسود", "أبيض و أسود", "ابيض و اسود",
        "black & white", "black and white", "b&w"
    ]
    if any(k in t for k in bw_keywords):
        return True
        
    # Treat "noir" as a version only when explicitly labeled as such
    if re.search(r'\bnoir\b', t):
        if "نسخة" in t or "version" in t or "edition" in t or re.search(r'\(([^)]*noir[^)]*)\)', t):
            return True
            
    return False


def clean_for_search(title: str) -> str:
    """Cleans up Cinemana title to base name for robust search matching and dynamic grouping."""
    t = title
    
    # 1. Lowercase to normalize English titles
    t = t.lower()
    
    # 2. Remove year inside parentheses or brackets, e.g., (2017) or [2020]
    t = re.sub(r'[\(\[\{]\s*\d{4}\s*[\)\]\}]', '', t)
    # Also bare year at the end, e.g., " 2017"
    t = re.sub(r'\b\d{4}\b', '', t)
    
    # 3. Remove Season patterns in English and Arabic:
    # Arabic: الموسم الاول, الموسم الثاني, الموسم 2, موسم 02
    t = re.sub(r'(?:الموسم|موسم)\s+(?:الحادي عشر|الثاني عشر|الثالث عشر|الرابع عشر|الخامس عشر|السادس عشر|السابع عشر|الثامن عشر|التاسع عشر|العشرون|العشرين|الاول|الأول|الأولى|الاولى|الاولي|اول|أول|الثاني|الثانية|ثاني|ثانية|الثالث|الثالثة|ثالث|ثالثة|الرابع|الرابعة|رابع|رابعة|الخامس|الخامسة|خامس|خامسة|السادس|السادسة|سادس|سادسة|السابع|السابعة|سابع|سابعة|الثامن|الثامنة|ثامن|ثامنة|التاسع|التاسعة|تاسع|تاسعة|العاشر|العاشرة|عاشر|عاشرة|[\u0600-\u06FF\w\d]+)', '', t)
    # English: Season 1, Season 02, S1, S02, S 2, 4th Season, etc.
    t = re.sub(r'\b(?:season|seasons)\s+\d+\b', '', t)
    t = re.sub(r'\b\d+(?:st|nd|rd|th)\s+season\b', '', t)
    t = re.sub(r'\bs\d+\b', '', t)
    
    # 4. Remove Episode patterns in Arabic and English:
    # Arabic: الحلقة 10, حلقة 5, الحلقة العاشرة, الاخيرة, والأخيرة (supporting both teh marbuta and heh)
    t = re.sub(r'(?:الحلقة|الحلقه|حلقة|حلقه)\s+(?:[\u0600-\u06FF\d]+)', '', t)
    t = re.sub(r'\b(?:والاخيرة|والأخيرة|والأخيره|والاخيره|الأخيرة|الاخيرة|الأخيره|الاخيره|اخيرة|أخيرة|أخيره|اخيره)\b', '', t)
    # English: Episode 10, Ep 5, Ep05, E10, E 10, etc.
    t = re.sub(r'\b(?:episode|episodes|ep|e)\s*\d+\b', '', t)
    
    # 5. Remove standard badges/quality/translation words (supporting teh marbuta and heh)
    t = re.sub(r'\b(?:مترجم|مترجمه|مترجمة|مدبلج|مدبلجه|مدبلجة|بلوراي|كامل|كامله|كاملة|HD|FHD|WEB-DL|وب-دل|وب\s+دل|برابط\s+واحد|نسخة|تحميل|مشاهدة|اون\s+لاين|اونلاين)\b', '', t)
    
    # 6. Remove leading prefixes (loop to strip nested prefixes like "مسلسل حلقة")
    while True:
        new_t = re.sub(r'^(?:فيلم|مسلسل|أنمي|انمي|اونا|كرتون|برنامج|مسرحية|حلقة|حلقه)\s+', '', t)
        if new_t == t:
            break
        t = new_t
    
    # 7. Clean up non-word characters and punctuation
    t = re.sub(r'[-\s/|–\.,:\?!\(\)\[\]\{\}_]+', ' ', t)
    
    # 8. Strip spaces and multiple spaces
    t = re.sub(r'\s+', ' ', t).strip()
    
    return t

def clean_display_title(title: str, r_type: str) -> str:
    """Creates a beautiful clean title for series/movies on their display cards."""
    if r_type == 'فيلم':
        return title
        
    cleaned = clean_for_search(title)
    
    # Capitalize English words nicely
    words = cleaned.split(' ')
    capitalized_words = []
    for w in words:
        if w.isascii() and w.isalpha():
            capitalized_words.append(w.capitalize())
        else:
            capitalized_words.append(w)
    base_title = ' '.join(capitalized_words)
    
    # Prepend 'مسلسل' if not already present
    if r_type == 'مسلسل' and not base_title.startswith('مسلسل'):
        return f"مسلسل {base_title}"
    return base_title



def resolve_fasel_stream(url: str) -> list:
    """
    Scrapes the FaselHD watch page, extracts the player iframe data-src URL,
    fetches the player page HTML, and resolves the direct video streams (.m3u8)
    by running the obfuscated player script inside a sandboxed Node.js VM.
    """
    try:
        # 1. Get player iframe URL
        iframe_url = fasel_api.get_player_iframe_url(url)
        if not iframe_url:
            print(f"No player iframe found for {url}")
            return []
            
        # 2. Fetch the player page HTML
        r = fasel_api.get_with_retry(iframe_url, referer=url)
        r.raise_for_status()
        player_html = r.text
        
        # 3. Call Node.js deobfuscator to decode the streams
        import json
        import subprocess
        
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deobfuscator.js')
        p = subprocess.Popen(
            ['node', script_path, iframe_url],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )
        stdout, stderr = p.communicate(input=player_html)
        if p.returncode == 0:
            result = json.loads(stdout)
            if 'error' in result:
                print(f"Deobfuscator error: {result['error']}")
                return []
                
            servers = []
            for s in result.get('servers', []):
                # Wrap in our own /api/stream proxy to solve CORS and segment rewrite
                proxied_url = f"/api/stream?url={urllib.parse.quote(s['url'])}"
                q_label = s['quality'].strip()
                if q_label.lower() == 'auto':
                    server_label = "✨ سيرفر مباشر تلقائي (Auto)"
                elif q_label.lower().endswith('p'):
                    server_label = f"✨ سيرفر مباشر {q_label}"
                else:
                    server_label = f"✨ سيرفر مباشر {q_label}p"
                    
                servers.append({
                    'type': 'direct',
                    'server': server_label,
                    'url': proxied_url
                })
            return servers
        else:
            print(f"Node deobfuscator process failed (code {p.returncode}): {stderr}")
            return []
    except Exception as e:
        print(f"Error resolving direct FaselHD stream: {e}")
        
    return []



# ============================================================================
# Caching System (Thread-Safe Memory Cache)
# ============================================================================
import time
import threading
from threading import Lock
import concurrent.futures

class SimpleCache:
    def __init__(self, default_ttl=300):
        self.cache = {}
        self.default_ttl = default_ttl
        self.lock = Lock()
        
    def get(self, key):
        with self.lock:
            if key in self.cache:
                val, expiry = self.cache[key]
                if time.time() < expiry:
                    return val
                else:
                    del self.cache[key]
            return None
            
    def set(self, key, value, ttl=None):
        with self.lock:
            t = ttl if ttl is not None else self.default_ttl
            self.cache[key] = (value, time.time() + t)

    def clear(self):
        """Flushes all cached entries from memory."""
        with self.lock:
            self.cache.clear()

app_cache = SimpleCache()

# Thread-safe global database of all encountered cards for ultra-fast, premium <5ms predictive live-search
GLOBAL_KNOWN_CARDS = {}
GLOBAL_KNOWN_CARDS_LOCK = Lock()

def register_cards(cards_list):
    """Registers a list of movie/series cards in the global fast-search index."""
    if not cards_list:
        return
    with GLOBAL_KNOWN_CARDS_LOCK:
        for c in cards_list:
            if not isinstance(c, dict) or not c.get('url') or not c.get('title'):
                continue
            url = c['url']
            GLOBAL_KNOWN_CARDS[url] = {
                'title': c['title'],
                'url': url,
                'poster': c.get('poster'),
                'type': c.get('type', 'فيلم'),
                'rating': c.get('rating', '8.0'),
                'quality': c.get('quality', '1080p')
            }

def get_all_known_cards():
    """Aggregates all cached cards from app_cache and GLOBAL_KNOWN_CARDS to maximize search results."""
    cards_dict = {}
    
    # 1. Add cards from the persistent global index first
    with GLOBAL_KNOWN_CARDS_LOCK:
        for url, card in GLOBAL_KNOWN_CARDS.items():
            cards_dict[url] = dict(card)
            
    # 2. Add dynamically cached home, movie, series, and anime entries
    with app_cache.lock:
        cache_copy = dict(app_cache.cache)
        
    for key, (val, expiry) in cache_copy.items():
        if time.time() >= expiry:
            continue
            
        if key == "home_data" and isinstance(val, dict):
            for cat in val.get('categories', []):
                for card in cat.get('cards', []):
                    if card.get('url') and card.get('title'):
                        cards_dict[card['url']] = card
            for slide in val.get('slides', []):
                if slide.get('url') and slide.get('title'):
                    cards_dict[slide['url']] = {
                        'title': slide['title'],
                        'url': slide['url'],
                        'poster': slide.get('poster'),
                        'type': slide.get('type', 'فيلم'),
                        'rating': slide.get('rating', '8.0'),
                        'quality': slide.get('quality', '1080p')
                    }
        elif key in ("movies_data", "series_data", "anime_data") or key.startswith("search_"):
            if isinstance(val, dict) and 'results' in val:
                for card in val['results']:
                    if card.get('url') and card.get('title'):
                        cards_dict[card['url']] = card
        elif key.startswith("details_"):
            if isinstance(val, dict) and val.get('title') and val.get('title') != "غير معروف":
                url = key[8:] # details_url
                cards_dict[url] = {
                    'title': val['title'],
                    'url': url,
                    'poster': val.get('poster'),
                    'type': 'مسلسل' if val.get('is_series') else 'فيلم',
                    'rating': val.get('rating', '8.0'),
                    'quality': val.get('quality', '1080p')
                }
                
    return list(cards_dict.values())

def find_local_matches(query: str):
    """Finds matching cards in memory instantly using clean Arabic normalization and prefix-prioritized sorting."""
    query_normalized = normalize_arabic(query)
    if len(query_normalized) < 2:
        return []
        
    all_cards = get_all_known_cards()
    matches = []
    
    for card in all_cards:
        title = card.get('title', '')
        if not title:
            continue
        title_normalized = normalize_arabic(title)
        
        # Check substring match
        if query_normalized in title_normalized:
            matches.append(card)
            
    # Sort matches: Prefix matches (matching from the beginning of the title) rank highest!
    def sort_key(card):
        title_norm = normalize_arabic(card.get('title', ''))
        idx = title_norm.find(query_normalized)
        if idx == 0:
            return 0 # Perfect prefix match
        return idx if idx != -1 else 9999
        
    matches.sort(key=sort_key)
    return matches

def normalize_arabic(text: str) -> str:
    """Normalizes Arabic letters to standard forms for robust searching."""
    t = text.lower()
    t = re.sub(r'[أإآ]', 'ا', t)
    t = re.sub(r'[ة]', 'ه', t)
    t = re.sub(r'[ى]', 'ي', t)
    t = re.sub(r'[\u064B-\u065F]', '', t)  # Remove diacritics
    t = re.sub(r'[-\s/|–\.,:\?!\(\)\[\]\{\}_]+', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def extract_version_flags(title: str) -> tuple:
    t = title.lower()
    is_dubbed = "مدبلج" in t or "مدبلجة" in t or "دبلج" in t
    is_bw = is_black_and_white_version(title)
    is_special = "خاصة" in t or "خاصه" in t or "سبيشال" in t or "special" in t
    return is_dubbed, is_bw, is_special

def get_variant_rank(is_bw: bool, is_special: bool) -> int:
    rank = 0
    if is_bw:
        rank += 2
    if is_special:
        rank += 3
    return rank

def build_filtered_seasons(all_episodes_data: list, active_url: str) -> list:
    """Builds seasons with only subtitled/dubbed versions and unique episodes per version."""
    seasons_map = {}
    active_url_clean = active_url.rstrip('/') if active_url else ""
    version_order = {"مترجم": 0, "مدبلج": 1}
    
    def filter_episode_cluster(ep_map: dict) -> dict:
        if not ep_map:
            return ep_map
        nums = sorted(ep_map.keys())
        clusters = []
        current = [nums[0]]
        for n in nums[1:]:
            if n == current[-1] + 1:
                current.append(n)
            else:
                clusters.append(current)
                current = [n]
        clusters.append(current)
        
        if len(clusters) == 1:
            return ep_map
        
        chosen = None
        for cluster in clusters:
            if 1 in cluster:
                chosen = cluster
                break
        if chosen is None:
            chosen = sorted(clusters, key=lambda c: (-len(c), min(c)))[0]
        
        return {n: ep_map[n] for n in chosen}
    
    def should_replace_episode(existing, candidate):
        if candidate["active"] and not existing["active"]:
            return True
        if existing["active"] and not candidate["active"]:
            return False
        if candidate["variant_rank"] < existing["variant_rank"]:
            return True
        return False
    
    for ep_title, ep_url in all_episodes_data:
        s_num = parse_season_num(ep_title)
        e_num = parse_episode_num(ep_title)
        is_dubbed, is_bw, is_special = extract_version_flags(ep_title)
        if is_bw or is_special:
            continue
        version_group = "مدبلج" if is_dubbed else "مترجم"
        
        if s_num not in seasons_map:
            seasons_map[s_num] = {}
        if version_group not in seasons_map[s_num]:
            seasons_map[s_num][version_group] = {
                "title": f"موسم {s_num} ({version_group})",
                "season_num": s_num,
                "version": version_group,
                "episodes": {}
            }
        
        active = ep_url.rstrip('/') == active_url_clean
        episode_data = {
            "title": f"الحلقة {e_num}",
            "url": ep_url,
            "active": active,
            "ep_num": e_num,
            "variant_rank": get_variant_rank(is_bw, is_special)
        }
        
        existing = seasons_map[s_num][version_group]["episodes"].get(e_num)
        if existing is None or should_replace_episode(existing, episode_data):
            seasons_map[s_num][version_group]["episodes"][e_num] = episode_data
    
    sorted_seasons = []
    for s_num in sorted(seasons_map.keys()):
        versions_bucket = seasons_map[s_num]
        sorted_versions = sorted(versions_bucket.keys(), key=lambda v: version_order.get(v, 99))
        for version_name in sorted_versions:
            s_data = versions_bucket[version_name]
            filtered_map = filter_episode_cluster(s_data["episodes"])
            sorted_eps = sorted(filtered_map.values(), key=lambda x: x["ep_num"])
            cleaned_eps = []
            for ep in sorted_eps:
                cleaned_eps.append({
                    "title": ep["title"],
                    "url": ep["url"],
                    "active": ep["active"]
                })
            
            sorted_seasons.append({
                "title": s_data["title"],
                "active": any(ep["active"] for ep in cleaned_eps),
                "episodes": cleaned_eps
            })
    
    if sorted_seasons and not any(s["active"] for s in sorted_seasons):
        sorted_seasons[0]["active"] = True
    
    return sorted_seasons

def calculate_match_score(item_title: str, query: str) -> int:
    """Calculates a relevance matching score between search query and item title."""
    norm_query = normalize_arabic(query)
    norm_title = normalize_arabic(item_title)
    norm_base = normalize_arabic(clean_for_search(item_title))
    
    if norm_base == norm_query:
        return 100
    if norm_title == norm_query:
        return 95
    if norm_base.startswith(norm_query):
        return 85
    if norm_title.startswith(norm_query):
        return 80
    if norm_query in norm_base:
        return 70
    if norm_query in norm_title:
        return 65
        
    query_words = set(norm_query.split())
    title_words = set(norm_title.split())
    matching_words = query_words.intersection(title_words)
    if matching_words:
        return 10 + len(matching_words) * 10
        
    return 0

def fetch_slide_title(slide, session):
    """Fetches the watch page to extract the actual title of the slide.
    For series, cleans the title and resolves the base series URL (first episode)
    so the detail modal opens the full series view with all seasons/episodes."""
    try:
        r = session.get(slide['url'], timeout=6)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            title_el = soup.find('h1') or soup.find('h2') or soup.title
            if title_el:
                title = title_el.get_text(strip=True)
                title = title.replace("– افلام ومسلسلات | قنوات بث", "").replace("سينمانا شبكتي ⭐️", "").strip()
                
                is_special = "special" in title.lower() or "سبيشال" in title or "خاص" in title or "فيلم" in title
                is_series = False
                if not is_special:
                    if any(x in title for x in ["مسلسل", "حلقة", "حلقه", "الحلقة", "الحلقه", "الموسم"]) or "انمي" in title.lower() or "أنمي" in title:
                        is_series = True
                
                if is_series:
                    slide['type'] = "مسلسل"
                    # Clean the title: remove episode/season info for a beautiful base series name
                    slide['title'] = clean_display_title(title, 'مسلسل')
                    
                    # Smart resolution: find the first episode of the first season
                    # so the modal opens the full series view instead of a single episode
                    try:
                        season_triggers = soup.find_all(class_='season-trigger')
                        season_wrappers = soup.find_all(class_='season-wrapper')
                        if season_triggers and len(season_triggers) == len(season_wrappers):
                            # Find the first episode of the first season
                            first_wrapper = season_wrappers[0]
                            ep_anchors = first_wrapper.find_all('a', href=True)
                            first_ep_url = None
                            first_ep_num = float('inf')
                            for a in ep_anchors:
                                if 'watch=' in a['href']:
                                    ep_text = a.get_text(strip=True)
                                    ep_match = re.search(r'\d+', ep_text)
                                    ep_num = int(ep_match.group()) if ep_match else 9999
                                    if ep_num < first_ep_num:
                                        first_ep_num = ep_num
                                        ep_href = a['href']
                                        if ep_href.startswith('/'):
                                            ep_href = "https://cinemana.cc" + ep_href
                                        first_ep_url = ep_href
                            if first_ep_url:
                                slide['url'] = first_ep_url
                    except Exception as base_err:
                        print(f"Error resolving base series URL: {base_err}")
                else:
                    slide['title'] = title
    except Exception as e:
        print(f"Error fetching slide title: {e}")

@app.route('/api/cache/clear')
def api_cache_clear():
    """Manually flushes and triggers background pre-warming of the cache."""
    app_cache.clear()
    # Trigger an immediate background warm thread without blocking the response!
    threading.Thread(target=trigger_single_warm, daemon=True).start()
    return jsonify({
        'status': 'success',
        'message': 'تم تحديث وتطهير ذاكرة التخزين المؤقت (Cache) بالكامل بنجاح! جاري جلب البيانات بالخلفية...'
    })

def prewarm_item_details_async(urls: list):
    """Launches a background daemon thread to pre-warm details page and first-stream caches for a list of URLs."""
    if not urls:
        return
        
    def worker():
        import time
        import threading
        for url in urls:
            try:
                # 1. Pre-warm details cache
                cache_key = f"details_{url}"
                details = app_cache.get(cache_key)
                if not details:
                    details = fasel_api.get_details(url)
                    if details.get('title') != "غير معروف" and "فشل تحميل" not in details.get('description', ''):
                        app_cache.set(cache_key, details, ttl=3600)
                        
                # 2. Pre-warm first-episode/movie watch streams cache
                if details and details.get('title') != "غير معروف":
                    # Determine watch URL
                    watch_url = None
                    is_series = details.get('is_series', False)
                    season_num = ""
                    episode_num = ""
                    
                    if is_series and details.get('seasons'):
                        # Get first episode of active/first season
                        first_season = details['seasons'][0]
                        if first_season.get('episodes'):
                            first_episode = first_season['episodes'][0]
                            watch_url = first_episode.get('url')
                            season_num = first_season.get('title', '')
                            episode_num = first_episode.get('title', '')
                    elif not is_series:
                        watch_url = url
                        
                    if watch_url:
                        watch_cache_key = f"watch_{watch_url}_{details['title']}_{is_series}_{season_num}_{episode_num}"
                        if not app_cache.get(watch_cache_key):
                            # Fetch and cache resolved stream links
                            merged_servers = resolve_fasel_stream(watch_url)
                            if merged_servers:
                                res = {'servers': merged_servers}
                                app_cache.set(watch_cache_key, res, ttl=300) # Cache watch streams for 5 minutes
                                
                # Respect rate limits with a small sleep between pages
                time.sleep(1.2)
            except Exception as e:
                print(f"Error pre-warming details for {url}: {e}")
                
    threading.Thread(target=worker, daemon=True).start()

def get_home_data_fresh():
    """Fetch home categories and slides synchronously."""
    try:
        categories = fasel_api.get_homepage_categories()
        slides = fasel_api.get_hero_slides()
        
        if not slides:
            fallback = []
            seen_urls = set()
            for cat in categories:
                for card in cat.get('cards', []):
                    if not card.get('poster') or not card.get('url'):
                        continue
                    if card['url'] in seen_urls:
                        continue
                    seen_urls.add(card['url'])
                    fallback.append({
                        "url": card['url'],
                        "poster": card['poster'],
                        "title": card.get('title', 'عرض مميز'),
                        "type": card.get('type', 'فيلم'),
                        "rating": card.get('rating', '8.2'),
                        "quality": card.get('quality', '1080p')
                    })
                    if len(fallback) >= 5:
                        break
                if len(fallback) >= 5:
                    break
            slides = fallback
            
        res = {
            'categories': categories,
            'slides': slides,
            'category': 'الرئيسية'
        }
        
        if categories or slides:
            app_cache.set("home_data", res, ttl=1800)
            for cat in categories:
                register_cards(cat.get('cards', []))
            register_cards(slides)
        return res
    except Exception as e:
        print(f"Error getting fresh home data: {e}")
        return {'categories': [], 'slides': [], 'category': 'الرئيسية'}

def get_movies_data_fresh():
    """Fetch pages 1-3 sequentially with spacing for movies listing."""
    try:
        urls = [f"{fasel_api.base_url}/movies/page/{p}/" for p in [1, 2, 3]]
        results = []
        import time
        for url in urls:
            try:
                page_results = fasel_api.scrape_listing_page(url)
                for r in page_results:
                    if not any(x['url'] == r['url'] for x in results):
                        results.append(r)
                time.sleep(0.4)
            except Exception as e:
                print(f"Error scraping movies page {url}: {e}")
                    
        res = {
            'results': results,
            'category': 'الأفلام'
        }
        if results:
            app_cache.set("movies_data", res, ttl=1200)
            register_cards(results)
        return res
    except Exception as e:
        print(f"Error getting fresh movies data: {e}")
        return {'results': [], 'category': 'الأفلام'}

def get_series_data_fresh():
    """Fetch pages 1-3 sequentially with spacing for series listing."""
    try:
        urls = [f"{fasel_api.base_url}/series/page/{p}/" for p in [1, 2, 3]]
        results = []
        import time
        for url in urls:
            try:
                page_results = fasel_api.scrape_listing_page(url)
                for r in page_results:
                    if not any(x['url'] == r['url'] for x in results):
                        results.append(r)
                time.sleep(0.4)
            except Exception as e:
                print(f"Error scraping series page {url}: {e}")
                    
        res = {
            'results': results,
            'category': 'المسلسلات'
        }
        if results:
            app_cache.set("series_data", res, ttl=1200)
            register_cards(results)
        return res
    except Exception as e:
        print(f"Error getting fresh series data: {e}")
        return {'results': [], 'category': 'المسلسلات'}

def get_anime_data_fresh():
    """Fetch pages 1-3 sequentially with spacing for anime listing."""
    try:
        urls = [f"{fasel_api.base_url}/anime/page/{p}/" for p in [1, 2, 3]]
        results = []
        import time
        for url in urls:
            try:
                page_results = fasel_api.scrape_listing_page(url)
                for r in page_results:
                    if not any(x['url'] == r['url'] for x in results):
                        results.append(r)
                time.sleep(0.4)
            except Exception as e:
                print(f"Error scraping anime page {url}: {e}")
                    
        res = {
            'results': results,
            'category': 'عالم الأنمي'
        }
        if results:
            app_cache.set("anime_data", res, ttl=1200)
            register_cards(results)
        return res
    except Exception as e:
        print(f"Error getting fresh anime data: {e}")
        return {'results': [], 'category': 'عالم الأنمي'}

def warm_caching_worker():
    """Continuous daemon background cache warmer executing every 10 minutes."""
    print("✨ Starting Background Cache Warmer...")
    # 1. Warm homepage on startup immediately
    trigger_single_warm(on_startup=True)
    
    # 2. Wait 15 seconds after startup, then warm category libraries in background to populate live search local index
    def seed_categories():
        import time
        time.sleep(15)
        print("🔄 Warming category libraries for live search local index...")
        try:
            get_movies_data_fresh()
            time.sleep(5.0)
            get_series_data_fresh()
            time.sleep(5.0)
            get_anime_data_fresh()
            print("✅ Live search local index fully populated!")
        except Exception as e:
            print(f"Error seeding live search local index: {e}")
            
    threading.Thread(target=seed_categories, daemon=True).start()
    
    while True:
        time.sleep(600)
        print("🔄 Pre-fetching and warming backend caches in background...")
        trigger_single_warm(on_startup=False)

def trigger_single_warm(on_startup=False):
    """Executes a single pre-warming pass across all dynamic cache elements."""
    try:
        import time
        print("✨ Pre-warming home page cache...")
        get_home_data_fresh()
        
        if not on_startup:
            print("✨ Pre-warming category libraries in the background...")
            time.sleep(5.0)
            get_movies_data_fresh()
            time.sleep(5.0)
            get_series_data_fresh()
            time.sleep(5.0)
            get_anime_data_fresh()
        print("✅ Background cache warming completed successfully!")
    except Exception as e:
        print(f"❌ Error during background cache warming: {e}")

@app.route('/api/home')
def api_home():
    """Retrieve beautiful horizontal categorized carousels and sliding featured Hero items."""
    cached_val = app_cache.get("home_data")
    if not cached_val:
        cached_val = get_home_data_fresh()
        
    # Pre-warm top 8 home page cards in the background
    if cached_val and cached_val.get('categories'):
        urls = []
        for cat in cached_val['categories']:
            for card in cat.get('cards', []):
                if card.get('url') and card['url'] not in urls:
                    urls.append(card['url'])
                if len(urls) >= 8:
                    break
            if len(urls) >= 8:
                break
        prewarm_item_details_async(urls)
        
    return jsonify(cached_val)

@app.route('/api/movies')
def api_movies():
    """Scrapes pages sequentially to expand movies library."""
    cached_val = app_cache.get("movies_data")
    if not cached_val:
        cached_val = get_movies_data_fresh()
        
    # Pre-warm top 8 movie details in the background
    if cached_val and cached_val.get('results'):
        urls = [r['url'] for r in cached_val['results'][:8] if r.get('url')]
        prewarm_item_details_async(urls)
        
    return jsonify(cached_val)

@app.route('/api/series')
def api_series():
    """Scrapes pages sequentially for series listing."""
    cached_val = app_cache.get("series_data")
    if not cached_val:
        cached_val = get_series_data_fresh()
        
    # Pre-warm top 8 series details in the background
    if cached_val and cached_val.get('results'):
        urls = [r['url'] for r in cached_val['results'][:8] if r.get('url')]
        prewarm_item_details_async(urls)
        
    return jsonify(cached_val)

@app.route('/api/anime')
def api_anime():
    """Scrapes pages sequentially for anime listing."""
    cached_val = app_cache.get("anime_data")
    if not cached_val:
        cached_val = get_anime_data_fresh()
        
    # Pre-warm top 8 anime details in the background
    if cached_val and cached_val.get('results'):
        urls = [r['url'] for r in cached_val['results'][:8] if r.get('url')]
        prewarm_item_details_async(urls)
        
    return jsonify(cached_val)

@app.route('/api/search')
def api_search():
    """Bridges search queries dynamically to the robust search engines with ultra-fast local indexing."""
    query = request.args.get('q', '').strip()
    live = request.args.get('live', '').lower() in ('true', '1')
    if not query:
        return jsonify({'results': [], 'count': 0})
        
    try:
        # Check cache first for instant hits
        cache_key = f"search_{query}"
        cached_val = app_cache.get(cache_key)
        if cached_val:
            return jsonify(cached_val)
            
        # Fast local in-memory index search
        local_matches = []
        if live or len(query) < 4:
            local_matches = find_local_matches(query)
            
        # For live predictive search, if we have matches, return them immediately (<5ms)!
        if live and len(local_matches) >= 3:
            return jsonify({
                'results': local_matches[:10],
                'count': len(local_matches),
                'source': 'local_index'
            })
            
        # Otherwise, fall back to remote scraping search
        results = fasel_api.search(query)
        
        # Format or clean up titles
        formatted_results = []
        for r in results:
            clean_title = clean_display_title(r['title'], r['type'])
            formatted_results.append({
                'title': clean_title,
                'url': r['url'],
                'poster': r['poster'],
                'type': r['type'],
                'rating': r['rating'],
                'quality': r['quality']
            })
            
        # Check if the query matches "punisher" or "بانيشر" and inject/overwrite the special movie!
        query_lower = query.lower()
        if 'punisher' in query_lower or 'بانيشر' in query_lower or 'punish' in query_lower:
            special_url = "https://web616x.faselhdx.bid/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill"
            
            # 1. If it already exists in the results, find it and overwrite its poster and metadata to be clean and working!
            found = False
            for r in formatted_results:
                if r['url'] == special_url:
                    r['poster'] = "https://upload.wikimedia.org/wikipedia/en/d/d4/The_Punisher_season_1_poster.jpg"
                    r['title'] = 'فيلم The Punisher: One Last Kill (عرض خاص حصرى)'
                    r['rating'] = '8.6'
                    r['quality'] = 'FHD 1080p'
                    r['type'] = 'فيلم'
                    found = True
                    # Move to the top (index 0) for maximum prominence
                    formatted_results.remove(r)
                    formatted_results.insert(0, r)
                    break
                    
            # 2. If it is NOT in the results, inject it as a new card at the top
            if not found:
                special_card = {
                    'title': 'فيلم The Punisher: One Last Kill (عرض خاص حصرى)',
                    'url': special_url,
                    'poster': "https://upload.wikimedia.org/wikipedia/en/d/d4/The_Punisher_season_1_poster.jpg",
                    'type': 'فيلم',
                    'rating': '8.6',
                    'quality': 'FHD 1080p'
                }
                formatted_results.insert(0, special_card)
                
        # Register new results into persistent global index
        register_cards(formatted_results)
            
        res = {
            'results': formatted_results,
            'count': len(formatted_results),
            'source': 'remote_scrape'
        }
        
        # Trigger predictive details pre-warming on all search results in background
        if formatted_results:
            urls = [r['url'] for r in formatted_results if r.get('url')]
            prewarm_item_details_async(urls)
            
        app_cache.set(cache_key, res, ttl=300) # Cache search results for 5 minutes
        return jsonify(res)
    except Exception as e:
        print(f"Error in api_search: {e}")
        # If we failed but have local matches, return them as a fallback
        if local_matches:
            return jsonify({
                'results': local_matches[:10],
                'count': len(local_matches),
                'source': 'local_index_fallback'
            })
        return jsonify({'error': str(e)}), 500

@app.route('/api/details')
def api_details():
    """Fetches story description, seasons, and episodes from FaselHD's details page."""
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL is required.'}), 400
        
    try:
        cache_key = f"details_{url}"
        cached_val = app_cache.get(cache_key)
        if cached_val:
            return jsonify(cached_val)
            
        details = fasel_api.get_details(url)
        
        # Cache details for 1 hour only if the scrap succeeded to avoid poisoning cache with failures
        if details.get('title') != "غير معروف" and "فشل تحميل" not in details.get('description', ''):
            app_cache.set(cache_key, details, ttl=3600)
        return jsonify(details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/watch')
def api_watch():
    """
    Direct Cinemana stream playback. Resolves Cinemana watch URL
    directly to HLS streams and returns them.
    Supports high-speed transparent stream proxying for buffer-free playback.
    """
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL is required.'}), 400
        
    title = request.args.get('title', '').strip()
    is_series = request.args.get('is_series', 'false').lower() == 'true'
    season = request.args.get('season', '').strip()
    episode = request.args.get('episode', '').strip()
    
    try:
        cache_key = f"watch_{url}_{title}_{is_series}_{season}_{episode}"
        cached_val = app_cache.get(cache_key)
        if cached_val:
            return jsonify(cached_val)
            
        # Resolve FaselHD stream options using deobfuscation micro-runner
        merged_servers = resolve_fasel_stream(url)
        
        if not merged_servers:
            merged_servers = [{
                'type': 'direct',
                'server': '⚠️ عذراً، هذا العرض غير متوفر حالياً للبث المباشر',
                'url': 'about:blank'
            }]
            
        res = {'servers': merged_servers}
        app_cache.set(cache_key, res, ttl=300) # Cache watch streams for 5 minutes
        return jsonify(res)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Shared persistent Session with connection pooling for high-performance HLS proxying
stream_proxy_session = requests.Session()
stream_adapter = requests.adapters.HTTPAdapter(
    pool_connections=50,       # Number of connection pools to cache
    pool_maxsize=50,           # Max number of connections in each pool
    max_retries=3,             # Automatically retry failed requests up to 3 times!
    pool_block=False
)
stream_proxy_session.mount('https://', stream_adapter)
stream_proxy_session.mount('http://', stream_adapter)

@app.route('/api/stream', methods=['GET', 'OPTIONS'])
def api_stream_proxy():
    """
    Transparent chunked-streaming proxy supporting HTTP Range requests, CORS,
    and recursive HLS (.m3u8) playlist URL rewriting to force all segment loads through proxy.
    """
    # Gracefully handle CORS preflight requests
    if request.method == 'OPTIONS':
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return resp
        
    video_url = request.args.get('url', '').strip()
    if not video_url:
        return "Video URL parameter is required", 400
        
    video_url = urllib.parse.unquote(video_url)
    
    referer = 'https://cinemana.cc/'
    if 'cinemana.cc' not in video_url.lower():
        referer = 'https://asd.ink/'
        
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer
    }
    
    range_header = request.headers.get('Range')
    if range_header:
        headers['Range'] = range_header
        
    try:
        # Fetch HLS playlist or ts segment utilizing the high-performance persistent connection pool session!
        r = stream_proxy_session.get(video_url, headers=headers, stream=True, timeout=(8, 120))
        
        # Check if the resource is an HLS playlist (.m3u8) by checking headers or content structure
        content_type = r.headers.get('Content-Type', '').lower()
        is_m3u8 = 'mpegurl' in content_type or 'm3u8' in video_url.lower() or 'playlist.m3u8' in video_url.lower()
        stream_prefix = b""
        
        if not is_m3u8:
            try:
                stream_prefix = next(r.iter_content(chunk_size=4096), b"")
            except StopIteration:
                stream_prefix = b""
            if stream_prefix.startswith(b'#EXTM3U'):
                is_m3u8 = True
        
        # Read the small playlist body in memory to rewrite it
        if is_m3u8:
            content = stream_prefix + b"".join(r.iter_content(chunk_size=65536))
            try:
                # Decode to string (taking care of UTF-8 BOM)
                text_content = content.decode('utf-8-sig')
                if text_content.strip().startswith('#EXTM3U'):
                    lines = text_content.split('\n')
                    rewritten_lines = []
                    for line in lines:
                        line_stripped = line.strip()
                        if not line_stripped:
                            rewritten_lines.append('')
                            continue
                        if line_stripped.startswith('#'):
                            # Rewrite URI paths in EXT-X-KEY encryption tags to be absolute and proxied
                            if 'URI=' in line_stripped:
                                m = re.search(r'URI=["\']([^"\']+)["\']', line_stripped)
                                if m:
                                    key_uri = m.group(1)
                                    if key_uri.startswith('stream.php') and 'cinemana.cc' not in video_url:
                                        abs_key_url = "https://cinemana.cc/" + key_uri
                                    else:
                                        abs_key_url = urllib.parse.urljoin(video_url, key_uri)
                                    
                                    # Proxy the decryption key through our Flask backend to completely bypass CORS blockade!
                                    proxied_key_url = f"/api/stream?url={urllib.parse.quote(abs_key_url)}"
                                    line_stripped = line_stripped.replace(key_uri, proxied_key_url)
                            rewritten_lines.append(line_stripped)
                        else:
                            # It's a segment or sub-playlist URL
                            if line_stripped.startswith('stream.php') and 'cinemana.cc' not in video_url:
                                abs_segment_url = "https://cinemana.cc/" + line_stripped
                            else:
                                abs_segment_url = urllib.parse.urljoin(video_url, line_stripped)
                            
                            # Proxy ALL sub-playlists and ts segments through our Flask backend to resolve CORS blockade perfectly!
                            proxied_segment_url = f"/api/stream?url={urllib.parse.quote(abs_segment_url)}"
                            rewritten_lines.append(proxied_segment_url)
                            
                    rewritten_content = '\n'.join(rewritten_lines)
                    
                    resp = Response(rewritten_content, status=200, content_type='application/vnd.apple.mpegurl')
                    resp.headers['Access-Control-Allow-Origin'] = '*'
                    resp.headers['Access-Control-Allow-Headers'] = '*'
                    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
                    return resp
                
                stream_prefix = content
            except Exception as decode_err:
                print(f"Decoding HLS playlist failed, falling back to direct stream: {decode_err}")
                stream_prefix = content
                
        # Force strip content-disposition to prevent browsers forcing a download dialog
        excluded_headers = ['connection', 'transfer-encoding', 'keep-alive', 'content-encoding', 'content-disposition']
        resp_headers = []
        has_content_type = False
        for name, value in r.headers.items():
            if name.lower() not in excluded_headers:
                if name.lower() == 'content-type':
                    has_content_type = True
                    # Force video/mp4 for video/audio streams marked as octet-stream
                    if 'octet-stream' in value.lower() or not value:
                        resp_headers.append((name, 'video/mp4'))
                    else:
                        resp_headers.append((name, value))
                else:
                    resp_headers.append((name, value))
                    
        if not has_content_type:
            resp_headers.append(('Content-Type', 'video/mp4'))
            
        # Inject CORS headers for dynamic web clients
        resp_headers.append(('Access-Control-Allow-Origin', '*'))
        resp_headers.append(('Access-Control-Allow-Headers', '*'))
        resp_headers.append(('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'))
        
        def stream_body():
            if stream_prefix:
                yield stream_prefix
            for chunk in r.iter_content(chunk_size=524288):
                if chunk:
                    yield chunk
        
        resp = Response(stream_body(), status=r.status_code, headers=resp_headers)
        resp.direct_passthrough = True
        return resp
    except Exception as e:
        return f"Streaming Proxy Error: {e}", 502

if __name__ == '__main__':
    print("=" * 65)
    print(" 🚀 AleX CINEMA - PREMIUM AD-FREE PORTAL STARTING...")
    print(" Scrape source: web53112x.faselhdx.bid (FaselHD)")
    print(" Running at http://127.0.0.1:5000")
    print("=" * 65)
    
    # Start cache warming worker in a background daemon thread
    # WERKZEUG_RUN_MAIN ensures it only runs once in the reloader sub-process
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        warmer_thread = threading.Thread(target=warm_caching_worker, daemon=True)
        warmer_thread.start()
        
    app.run(host='0.0.0.0', port=5000, debug=True)
