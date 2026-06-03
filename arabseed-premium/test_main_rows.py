import sys
sys.path.append('.')
from fasel_scraper import FaselAPI
from bs4 import BeautifulSoup
api = FaselAPI('https://web630x.faselhdx.bid')
r = api.get_with_retry(f"{api.base_url}/main", timeout=12)
soup = BeautifulSoup(r.text, 'lxml')
print([div.get('class') for div in soup.find_all('div') if div.get('class')][:20])
