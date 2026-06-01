#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
FaselHD Scraper Engine (Cloudflare-Immune impersonation Edition)
-----------------------------------------------------------------
A professional, high-performance scraper for FaselHD.
Seamlessly aggregates search results, homepage loops, details, seasons, and episodes.
Leverages the curl_cffi TLS impersonation engine to bypass all Cloudflare 403 blocks.
"""

import sys
import re
import urllib.parse
import time
from typing import List, Dict, Any
from curl_cffi import requests
from bs4 import BeautifulSoup
import concurrent.futures
import threading

# Ensure UTF-8 output to support Arabic characters in all terminals
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def normalize_url(url: str) -> str:
    """Normalizes URL paths to standard uppercase percent-encoding to bypass Cloudflare constraints."""
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlparse(url)
        path_unquoted = urllib.parse.unquote(parsed.path)
        path_quoted = urllib.parse.quote(path_unquoted, safe='/')
        
        # Re-assemble URL
        parts = list(parsed)
        parts[2] = path_quoted
        return urllib.parse.urlunparse(parts)
    except Exception as e:
        print(f"Error normalizing URL {url}: {e}")
        return url

class FaselAPI:
    """
    API Scraper client for FaselHD.
    Acts as a direct drop-in replacement for the cinemana scraper, 
    matching all method signatures and expected return structures.
    """
    
    def __init__(self, base_url: str = "https://web616x.faselhdx.bid"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.redirect_cache = {}
        self.redirect_cache_lock = threading.Lock()
        
        # State-of-the-art modern browser headers to bypass Cloudflare protection
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "Referer": self.base_url + "/"
        }
        self.session.headers.update(self.headers)

    def check_and_update_mirror(self, url: str):
        """Self-healing helper: extracts and migrates internal base_url if a newer mirror domain is detected."""
        try:
            parsed = urllib.parse.urlparse(url)
            if parsed.netloc and 'faselhdx.bid' in parsed.netloc:
                current_netloc = urllib.parse.urlparse(self.base_url).netloc
                if parsed.netloc != current_netloc:
                    old_base = self.base_url
                    self.base_url = f"{parsed.scheme}://{parsed.netloc}"
                    self.headers["Referer"] = self.base_url + "/"
                    self.session.headers.update(self.headers)
                    print(f"✨ Dynamic Mirror Self-Healing: Migrated base_url from {old_base} to {self.base_url}")
        except Exception:
            pass

    def get_with_retry(self, url: str, timeout: int = 12, params: dict = None, referer: str = None) -> requests.Response:
        """
        Thread-safe requests.get wrapper with smart retries and backoff for Cloudflare bypass.
        Leverages curl_cffi impersonate Chrome fingerprint.
        """
        # Always normalize the request URL to standard uppercase percent encoding
        url = normalize_url(url)
        
        headers = self.headers.copy()
        if referer:
            headers["Referer"] = normalize_url(referer)
            
        for i in range(3):
            try:
                # Impersonate modern Chrome 120 client TLS fingerprinter
                r = self.session.get(url, headers=headers, params=params, timeout=timeout, impersonate="chrome120")
                if r.status_code == 200:
                    return r
                elif r.status_code in [403, 429]:
                    print(f"⚠️ Rate-limiting/Cloudflare {r.status_code} on {url}. Retry {i+1}/3 after sleeping...")
                    time.sleep(2.0 * (i + 1))
            except Exception as e:
                print(f"⚠️ Connection error for {url}: {e}. Retry {i+1}/3 after sleeping...")
                time.sleep(2.0 * (i + 1))
                
        # Final request attempt (fallback)
        return self.session.get(url, headers=headers, params=params, timeout=timeout, impersonate="chrome120")

    def parse_card(self, div) -> Dict[str, str]:
        """
        Parses a single card (.postDiv or .blockMovie) and returns structured details.
        """
        try:
            a_tag = div.find('a', href=True) if div.name != 'a' else div
            if not a_tag:
                return {}
                
            href = a_tag['href']
            self.check_and_update_mirror(href)
            # Make sure it's absolute
            if href.startswith('/'):
                href = self.base_url + href
            elif not href.startswith('http'):
                href = self.base_url + '/' + href
                
            img_el = a_tag.find('img')
            title = "عرض غير معروف"
            poster = ""
            
            if img_el:
                title = img_el.get('alt') or title
                poster = img_el.get('data-src') or img_el.get('src') or ""
                
            # If title is still generic, search for a class containing title or .h1
            if title == "عرض غير معروف" or not title:
                h1_el = a_tag.find(class_=re.compile(r'title|h1|h2')) or a_tag.find(['h1', 'h2', 'h3'])
                if h1_el:
                    title = h1_el.get_text(strip=True)
                    
            # Clean title
            title = title.strip()
            
            # Detect type
            media_type = "فيلم"
            if any(x in href.lower() for x in ['seasons', 'series', 'asian-series', 'anime']) or any(x in title for x in ["مسلسل", "حلقة", "حلقه", "الموسم"]):
                media_type = "مسلسل"
                
            # Rating and Quality
            rating = "8.2"
            quality = "1080p FHD"
            
            # Parse rating and quality if available in .posTop
            pos_top = a_tag.find(class_='posTop')
            if pos_top:
                q_el = pos_top.find(class_='quality')
                if q_el:
                    quality = q_el.get_text(strip=True)
                # Check for star icon or text rating
                text = pos_top.get_text(strip=True)
                m = re.search(r'(\d+\.\d+)', text)
                if m:
                    rating = m.group(1)
            
            return {
                "title": title,
                "url": href,
                "poster": poster,
                "type": media_type,
                "rating": rating,
                "quality": quality
            }
        except Exception:
            return {}

    def get_homepage_categories(self) -> List[Dict[str, Any]]:
        """
        Scrapes homepage categories sequentially with spacing to avoid Cloudflare triggers.
        """
        categories = []
        try:
            r = self.get_with_retry(f"{self.base_url}/main", timeout=15)
            r.raise_for_status()
            
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # 1. Added Recently (المضاف حديثاً) - scrape postList form-row
            recent_cards = []
            post_list = soup.find(id="postList") or soup.find(class_="form-row")
            if post_list:
                divs = post_list.find_all(class_="postDiv")
                for d in divs[:24]: # Limit to first 24 cards
                    parsed = self.parse_card(d)
                    if parsed and parsed.get('url'):
                        recent_cards.append(parsed)
                        
            if recent_cards:
                categories.append({
                    "category": "✨ أحدث الإضافات الحصرية",
                    "cards": recent_cards
                })
                
            # 2. Fetch subcategories for Movies and Series sequentially to avoid Cloudflare 403 blocks
            def fetch_sub_cat(category_name, path):
                cards = []
                try:
                    r_sub = self.get_with_retry(f"{self.base_url}/{path}", timeout=10)
                    if r_sub.status_code == 200:
                        soup_sub = BeautifulSoup(r_sub.text, 'html.parser')
                        divs = soup_sub.find_all(class_="postDiv")
                        for d in divs[:18]:
                            parsed = self.parse_card(d)
                            if parsed and parsed.get('url'):
                                cards.append(parsed)
                except Exception as ex:
                    print(f"Error fetching sub-category {category_name}: {ex}")
                return {"category": category_name, "cards": cards}
                
            # Sequential loading with minor sleep spacing to respect rate-limits
            for cat_name, cat_path in [
                ("🎬 أحدث الأفلام العالمية", "movies"),
                ("📺 أحدث المسلسلات التلفزيونية", "series"),
                ("🔥 أحدث حلقات الأنمي والكرتون", "anime-episodes")
            ]:
                time.sleep(0.15)
                res = fetch_sub_cat(cat_name, cat_path)
                if res.get('cards'):
                    categories.append(res)
                        
            return categories
        except Exception as e:
            print(f"Error scraping FaselHD homepage categories: {e}")
            return []

    def get_hero_slides(self) -> List[Dict[str, Any]]:
        """
        Scrapes the #homeSlide hero carousel from FaselHD's main page.
        """
        slides = []
        try:
            r = self.get_with_retry(f"{self.base_url}/main", timeout=12)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                slider = soup.find(id="homeSlide") or soup.find(class_=re.compile(r'slide|carousel', re.I))
                if slider:
                    # Swiper slides have class "swiper-slide" or "slideInner"
                    slide_items = slider.find_all(class_=re.compile(r'swiper-slide|slideInner', re.I))
                    seen_urls = set()
                    for s in slide_items:
                        a_tag = s.find('a', href=True)
                        if not a_tag or not a_tag.get('href'):
                            continue
                        href = a_tag['href']
                        if href.startswith('/'):
                            href = self.base_url + href
                        if href in seen_urls:
                            continue
                        seen_urls.add(href)
                        
                        # Title
                        title = a_tag.get_text(strip=True) or "عرض حصري مميز"
                        # Clean title from nested tags
                        title = title.replace("\n", "").strip()
                        
                        # Background or Poster
                        poster = ""
                        img = s.find('img')
                        if img:
                            poster = img.get('data-src') or img.get('src') or ""
                        if not poster:
                            bg_div = s.find(class_=re.compile(r'Img|bg', re.I)) or s.find(style=re.compile(r'background'))
                            if bg_div:
                                style = bg_div.get('style', '')
                                m = re.search(r"url\(['\"]?([^'\")]+)['\"]?\)", style)
                                if m:
                                    poster = m.group(1)
                                    
                        rating = "8.5"
                        quality = "1080p FHD"
                        
                        meta_el = s.find(class_=re.compile(r'Meta|imdb|Rate', re.I))
                        if meta_el:
                            text = meta_el.get_text(strip=True)
                            m = re.search(r'(\d+\.\d+)', text)
                            if m:
                                rating = m.group(1)
                                
                        media_type = "فيلم"
                        if any(x in href.lower() for x in ['seasons', 'series', 'asian-series', 'anime']):
                            media_type = "مسلسل"
                            
                        slides.append({
                            "url": href,
                            "poster": poster,
                            "title": title,
                            "type": media_type,
                            "rating": rating,
                            "quality": quality
                        })
                        if len(slides) >= 5:
                            break
        except Exception as e:
            print(f"Error scraping hero slides: {e}")
        return slides

    def scrape_listing_page(self, url: str) -> List[Dict[str, Any]]:
        """
        Scrapes a standard grid listing page on FaselHD (e.g. /movies/page/2/) and returns parsed cards.
        """
        cards = []
        try:
            r = self.get_with_retry(url, timeout=12)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                divs = soup.find_all(class_="postDiv")
                for d in divs:
                    parsed = self.parse_card(d)
                    if parsed and parsed.get('url'):
                        cards.append(parsed)
        except Exception as e:
            print(f"Error scraping listing page '{url}': {e}")
        return cards

    def search(self, query: str, max_pages: int = 1) -> List[Dict[str, Any]]:
        """
        Searches FaselHD by scraping the standard /?s={query} endpoint.
        """
        cards = []
        seen_urls = set()
        
        try:
            search_url = f"{self.base_url}/"
            params = {"s": query}
            
            r = self.get_with_retry(search_url, params=params, timeout=15)
            r.raise_for_status()
            
            soup = BeautifulSoup(r.text, 'html.parser')
            
            divs = soup.find_all(class_="postDiv")
            for d in divs:
                parsed = self.parse_card(d)
                if parsed and parsed.get('url') and parsed['url'] not in seen_urls:
                    seen_urls.add(parsed['url'])
                    cards.append(parsed)
                    
            # Fallback check if search was empty, try simple title card scraping
            if not cards:
                anchors = soup.find_all('a', href=True)
                for a in anchors:
                    if '/movies/' in a['href'] or '/seasons/' in a['href'] or '/asian-series/' in a['href']:
                        parsed = self.parse_card(a)
                        if parsed and parsed.get('url') and parsed['url'] not in seen_urls:
                            seen_urls.add(parsed['url'])
                            cards.append(parsed)
                            
            return cards
        except Exception as e:
            print(f"Error searching FaselHD for '{query}': {e}")
            return []

    def resolve_clean_url(self, raw_url: str) -> str:
        """Resolves raw WordPress query parameter URLs (/?p=...) to clean human-friendly URLs with smart retries."""
        if not raw_url or "?p=" not in raw_url:
            return raw_url
            
        # Check thread-safe cache first
        with self.redirect_cache_lock:
            if raw_url in self.redirect_cache:
                return self.redirect_cache[raw_url]
                
        current_url = raw_url
        headers = self.headers.copy()
        
        for _ in range(3): # follow up to 3 redirects sequentially
            if "?p=" not in current_url:
                break
                
            success = False
            for i in range(3): # retries for WAF
                try:
                    r = self.session.get(normalize_url(current_url), headers=headers, allow_redirects=False, impersonate="chrome120")
                    if r.status_code in [301, 302, 307, 308] and 'Location' in r.headers:
                        next_url = r.headers['Location']
                        if next_url.startswith('/'):
                            next_url = self.base_url + next_url
                        current_url = next_url
                        success = True
                        print(f"✅ Dynamic Redirect Resolver: Resolved to {current_url}")
                        break
                    elif r.status_code in [403, 429]:
                        print(f"⚠️ Redirect WAF hit {r.status_code} for {current_url}. Retry {i+1}/3 after sleeping...")
                        time.sleep(1.5 * (i + 1))
                    else:
                        break # no redirect
                except Exception as e:
                    print(f"⚠️ Connection error during redirect resolution for {current_url}: {e}. Retry {i+1}/3 after sleeping...")
                    time.sleep(1.5 * (i + 1))
                    
            if not success:
                break
                
        with self.redirect_cache_lock:
            self.redirect_cache[raw_url] = current_url
            
        return current_url

    def get_details(self, watch_url: str) -> Dict[str, Any]:
        """
        Retrieves series/movie details, seasons, and episode grids.
        Utilizes hybrid sequential redirect-resolution and parallel episode scraping to bypass Cloudflare.
        """
        self.check_and_update_mirror(watch_url)
        # Ensure url matches the active mirror host
        watch_url_parsed = urllib.parse.urlparse(watch_url)
        active_url = f"{self.base_url}{watch_url_parsed.path}"
        if watch_url_parsed.query:
            active_url += f"?{watch_url_parsed.query}"
            
        try:
            r = self.get_with_retry(active_url, timeout=15)
            r.raise_for_status()
            
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # 1. Parse Title
            title_el = soup.find('h1') or soup.find('h2') or soup.title
            title = title_el.get_text(strip=True) if title_el else "غير معروف"
            title = title.split('-')[0].replace("مشاهدة وتحميل", "").replace("مسلسل", "").replace("فيلم", "").strip()
            
            # 2. Parse Description
            desc_div = soup.find(class_="singleDesc") or soup.find(class_=re.compile(r'desc|story|excerpt'))
            if desc_div:
                description = desc_div.get_text(strip=True)
            else:
                description = "لا توجد قصة متوفرة حالياً لهذا العرض."
                
            # 3. Detect if series robustly
            is_series = False
            seasons = []
            
            season_loop = soup.find(class_="seasonLoop")
            if any(x in active_url.lower() for x in ['/seasons/', '/series/', '/asian-series/', '/anime/']) or season_loop:
                is_series = True
                season_divs = season_loop.find_all(class_="seasonDiv") if season_loop else []
                
                # Fetch seasons data
                seasons_to_fetch = []
                for s_div in season_divs:
                    s_title = s_div.find(class_="title").get_text(strip=True) if s_div.find(class_="title") else "موسم غير معروف"
                    
                    # Resolve season URL/ID from onclick attribute: onclick="window.location.href = '/?p=40476'"
                    onclick = s_div.get('onclick', '')
                    m = re.search(r"href\s*=\s*['\"]([^'\"]+)['\"]", onclick)
                    s_url = ""
                    if m:
                        s_url = m.group(1)
                        if s_url.startswith('/'):
                            s_url = self.base_url + s_url
                        elif not s_url.startswith('http'):
                            s_url = self.base_url + '/' + s_url
                            
                    is_active = 'active' in s_div.get('class', [])
                    
                    seasons_to_fetch.append({
                        "title": s_title,
                        "url": s_url,
                        "active": is_active
                    })
                    
                # A. Resolve raw URLs sequentially with a 250ms spacing sleep to prevent Cloudflare WAF rate triggers
                for s_data in seasons_to_fetch:
                    time.sleep(0.25)
                    s_data['clean_url'] = self.resolve_clean_url(s_data['url'])
                    
                # B. Parallel loading helper for season episodes (direct requests to clean URLs)
                def fetch_season_episodes(season_data):
                    eps = []
                    url_to_fetch = season_data.get('clean_url') or season_data['url']
                    try:
                        r_season = self.get_with_retry(url_to_fetch, timeout=10)
                        if r_season.status_code == 200:
                            s_soup = BeautifulSoup(r_season.text, 'html.parser')
                            ep_all = s_soup.find(class_="epAll")
                            if ep_all:
                                ep_links = ep_all.find_all('a', href=True)
                                for a in ep_links:
                                    ep_href = a['href']
                                    if ep_href.startswith('/'):
                                        ep_href = self.base_url + ep_href
                                    elif not ep_href.startswith('http'):
                                        ep_href = self.base_url + '/' + ep_href
                                        
                                    # Filter out standalone movies, films, and special presentations from the episode list
                                    ep_href_decoded = urllib.parse.unquote(ep_href).lower()
                                    ep_text_lower = a.get_text(strip=True).lower()
                                    exclude_keywords = [
                                        'special-presentation', 'special_presentation',
                                        'movie', 'film', 'فيلم', 'فلم', 'خاصة', 'سبيشال',
                                        'one-last-kill'
                                    ]
                                    if any(k in ep_href_decoded or k in ep_text_lower for k in exclude_keywords):
                                        print(f"🚫 Filtering out movie/special presentation from episode list: {ep_href}")
                                        continue
                                        
                                    ep_title = a.get_text(strip=True)
                                    # Active episode detection
                                    is_active_ep = ep_href.rstrip('/') == active_url.rstrip('/')
                                    
                                    eps.append({
                                        "title": ep_title,
                                        "url": ep_href,
                                        "active": is_active_ep
                                    })
                    except Exception as s_err:
                        print(f"Error fetching episodes for season {season_data['title']}: {s_err}")
                    
                    # Sort episodes logically (ep 1, ep 2...)
                    if eps:
                        def extract_ep_num(ep):
                            num_match = re.search(r'\d+', ep['title'])
                            return int(num_match.group()) if num_match else 9999
                        eps = sorted(eps, key=extract_ep_num)
                        
                    season_data["episodes"] = eps
                    return season_data
                
                # Fetch season episodes concurrently using ThreadPoolExecutor
                with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
                    seasons = list(executor.map(fetch_season_episodes, seasons_to_fetch))
            else:
                # Direct movie or standalone episode
                is_series = False
                seasons = []
                
            return {
                "title": title,
                "description": description,
                "is_series": is_series,
                "seasons": seasons
            }
        except Exception as e:
            print(f"Error scraping details for '{active_url}': {e}")
            return {
                "title": "غير معروف",
                "description": "فشل تحميل تفاصيل العرض من فاصل إعلاني.",
                "is_series": any(x in active_url.lower() for x in ['/seasons/', '/series/', '/asian-series/', '/anime/']),
                "seasons": []
            }

    def get_player_iframe_url(self, episode_or_movie_url: str) -> str:
        """
        Loads the watch page and extracts the player token data-src iframe link.
        """
        self.check_and_update_mirror(episode_or_movie_url)
        # Ensure domain is correct
        parsed = urllib.parse.urlparse(episode_or_movie_url)
        active_url = f"{self.base_url}{parsed.path}"
        if parsed.query:
            active_url += f"?{parsed.query}"
            
        try:
            r = self.get_with_retry(active_url, timeout=12)
            r.raise_for_status()
            
            soup = BeautifulSoup(r.text, 'html.parser')
            iframe = soup.find('iframe', attrs={'name': 'player_iframe'})
            if iframe:
                iframe_src = iframe.get('data-src') or iframe.get('src')
                if iframe_src:
                    if iframe_src.startswith('/'):
                        iframe_src = self.base_url + iframe_src
                    return iframe_src
            return ""
        except Exception as e:
            print(f"Error getting player iframe for '{active_url}': {e}")
            return ""
