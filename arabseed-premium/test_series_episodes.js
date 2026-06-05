const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";

async function fetchRaw(url) {
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(url)}`;
  const res = await fetch(tunnelUrl, {
    headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  console.log("Fetching latestSeries...");
  const seriesList = await fetchRaw("https://cinemana.shabakaty.com/api/android/latestSeries/level/2/itemsPerPage/24/page/1/");
  if (Array.isArray(seriesList) && seriesList.length > 0) {
    const seriesId = seriesList[0].nb;
    console.log(`Series ID: ${seriesId}, Title: ${seriesList[0].ar_title}`);
    
    // Fetch seasons number
    console.log(`Fetching videoSeasonNumber/id/${seriesId}...`);
    const seasons = await fetchRaw(`https://cinemana.shabakaty.com/api/android/videoSeasonNumber/id/${seriesId}`);
    console.log("Seasons:", JSON.stringify(seasons));
    
    // Fetch seasons videos
    console.log(`Fetching videoSeason/id/${seriesId}...`);
    const episodes = await fetchRaw(`https://cinemana.shabakaty.com/api/android/videoSeason/id/${seriesId}`);
    console.log("Episodes type:", typeof episodes, "isArray:", Array.isArray(episodes));
    if (Array.isArray(episodes)) {
      console.log("Episodes count:", episodes.length);
      if (episodes.length > 0) {
        console.log("First episode details:", Object.keys(episodes[0]));
        console.log("First episode title:", episodes[0].ar_title || episodes[0].en_title);
        console.log("First episode ID (nb):", episodes[0].nb);
      }
    } else {
      console.log("Episodes raw response:", JSON.stringify(episodes).substring(0, 300));
    }
  } else {
    console.log("Failed to fetch latestSeries");
  }
}

run();
