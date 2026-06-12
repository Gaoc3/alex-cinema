const text = '{"videoUrl":"https:\\/\\/cdn.shabakaty.com\\/vascin24-mp4\\/test.mp4"}';
const result = text.replace(/https?:(?:\\?\/){2}(cdn|cnth[0-9]+|cndw[0-9]+|cinemana)\.shabakaty\.com([^"'\s]*)/g, (match, p1, p2) => {
  // we must unescape the path if it was escaped
  const unescapedPath = p2.replace(/\\/g, '');
  return '/api/stream?ref=' + unescapedPath;
});
console.log(result);
