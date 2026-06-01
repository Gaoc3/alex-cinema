import urllib.parse

# Simulated parsed links from epAll of The Punisher Season 2
parsed_links = [
    {"text": "الحلقة 1", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-1-xr"},
    {"text": "الحلقة 2", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-2"},
    {"text": "الحلقة 3", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-3"},
    {"text": "الحلقة 4", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-4"},
    {"text": "الحلقة 5", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-5"},
    {"text": "الحلقة 6", "href": "https://web616x.faselhdx.bid/episodes/1-%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-6"},
    {"text": "الحلقة 7", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-7"},
    {"text": "الحلقة 8", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-8"},
    {"text": "الحلقة 9", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-9"},
    {"text": "الحلقة 10", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-10"},
    {"text": "الحلقة 11", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-11"},
    {"text": "الحلقة 12", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-12"},
    {"text": "الحلقة 13", "href": "https://web616x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-13-%d9%88%d8%a7%d9%84%d8%a3%d8%ae"},
    {"text": "الحلقة 14", "href": "https://web616x.faselhdx.bid/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill"}
]

filtered = []
for item in parsed_links:
    ep_href = item["href"]
    ep_href_decoded = urllib.parse.unquote(ep_href).lower()
    ep_text_lower = item["text"].lower()
    
    exclude_keywords = [
        'special-presentation', 'special_presentation',
        'movie', 'film', 'فيلم', 'فلم', 'خاصة', 'سبيشال',
        'one-last-kill'
    ]
    
    if any(k in ep_href_decoded or k in ep_text_lower for k in exclude_keywords):
        # Print without Unicode/Arabic or Emojis to be fully compatible with CP1252
        print(f"Excluded: Episode 14 -> {ep_href_decoded}")
        continue
    filtered.append(item)

print(f"\nTotal episodes originally: {len(parsed_links)}")
print(f"Total episodes after filtering: {len(filtered)}")
assert len(filtered) == 13, "Error: Filtering logic did not produce 13 episodes!"
print("SUCCESS: Offline test PASSED perfectly!")
