const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

async function fetchRaw(url) {
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(url)}`;
  const res = await fetch(tunnelUrl, {
    headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  // latestMovies: latestMovies/level/{level}/itemsPerPage/24/page/{page}/
  // Default level is usually 2 (parental control/subscription level)
  console.log("Fetching latestMovies/level/2/itemsPerPage/24/page/1/ ...");
  const movies = await fetchRaw("https://cinemana.shabakaty.com/api/android/latestMovies/level/2/itemsPerPage/24/page/1/");
  console.log("Movies is array:", Array.isArray(movies));
  if (Array.isArray(movies)) {
    console.log("Movies count:", movies.length);
    if (movies.length > 0) {
      console.log("First movie details:", Object.keys(movies[0]));
      console.log("Title:", movies[0].ar_title || movies[0].en_title);
      console.log("img:", movies[0].img);
    }
  } else {
    console.log("Failed to fetch movies:", JSON.stringify(movies).substring(0, 300));
  }

  console.log("\nFetching latestSeries/level/2/itemsPerPage/24/page/1/ ...");
  const series = await fetchRaw("https://cinemana.shabakaty.com/api/android/latestSeries/level/2/itemsPerPage/24/page/1/");
  console.log("Series is array:", Array.isArray(series));
  if (Array.isArray(series)) {
    console.log("Series count:", series.length);
  } else {
    console.log("Failed to fetch series:", JSON.stringify(series).substring(0, 300));
  }
}

run();
