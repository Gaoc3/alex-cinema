async function test() {
  const url = 'http://cnth2.shabakaty.com/vascin-translation-files/DD0974DF-6854-9677-74C8-5CB1C30AEB90_ar_transfile.srt?response-cache-control=max-age%3D86400&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1783958715&Signature=wSHpLyQbtuG31Nkd8u0wqKGEluo%3D';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://cinemana.shabakaty.com/',
      }
    });
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Length:", text.length);
    console.log("Snippet:", text.slice(0, 300));
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

test();
