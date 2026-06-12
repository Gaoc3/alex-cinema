const text = '{"videoUrl":"https:\\/\\/cdn.shabakaty.com\\/vascin24-mp4\\/test.mp4"}';
const result = text.replace(/https?:(?:\\?\/){2}(cdn|cnth[0-9]+|cndw[0-9]+|cinemana)\.shabakaty\.com([^"'\s]*)/g, (match) => {
  try {
    const unescapedMatch = match.replace(/\\/g, '');
    const parsed = new URL(unescapedMatch);
    const pathWithSearch = parsed.pathname + parsed.search;
    if (match.includes('mp4') || match.includes('video') || match.includes('m3u8') || match.includes('.ts')) {
      return `/api/stream?ref=${pathWithSearch}`;
    }
    return `/api/img?ref=${pathWithSearch}`;
  } catch (e) {
    console.error("error", e);
    return match;
  }
});
console.log(result);
