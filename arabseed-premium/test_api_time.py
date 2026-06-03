import time
import sys
sys.path.append('.')
from fasel_scraper import FaselAPI
start = time.time()
api = FaselAPI('https://web630x.faselhdx.bid')
cats = api.get_homepage_categories()
slides = api.get_hero_slides()
end = time.time()
print(f'Done in {end-start} seconds. Cats: {len(cats)}, Slides: {len(slides)}')
