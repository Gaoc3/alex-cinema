import requests
import urllib.parse
import json

class CinemanaAPI:
    def __init__(self):
        self.tunnel_base = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url="
        self.headers = {
            "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)"
        }

    def _get(self, url):
        full_url = f"{self.tunnel_base}{urllib.parse.quote(url)}"
        try:
            r = requests.get(full_url, headers=self.headers, timeout=20)
            if r.status_code == 200:
                try:
                    return r.json()
                except ValueError:
                    return r.text
            return None
        except:
            return None

    def get_categories(self):
        url = "https://cinemana.shabakaty.com/api/android/mainCategories?lang=ar"
        data = self._get(url)
        return data if isinstance(data, list) else []

    def get_home_videos(self):
        url = "https://cinemana.shabakaty.com/api/android/video"
        data = self._get(url)
        return data if isinstance(data, list) else []

    def get_video_details(self, video_id):
        url = f"https://cinemana.shabakaty.com/api/android/videoInfo?id={video_id}"
        data = self._get(url)
        if isinstance(data, dict):
            # Parse translations and video streams
            if data.get("fileFile"):
                # Usually standard format
                data["stream_url"] = f"https://cndw2.shabakaty.com/m240/{data['fileFile']}"
            return data
        return {}

    def search(self, query):
        # Fallback to fetching generic list if search isn't available
        # or implement a working search URL if discovered
        return self.get_home_videos()
