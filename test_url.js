const proxyUrl = '/tunnel/cdn/vascin24-mp4/video.mp4?Signature=EGC3qFqSZkjDX07yaRdQQglRnPs%3D';
const reqUrl = 'https://alex-cinema.vercel.app/api/stream?ref=...';
const newUrl = new URL(proxyUrl, reqUrl);
console.log(newUrl.href);
console.log(newUrl.search);
