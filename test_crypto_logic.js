const fs = require('fs');

// Create a quick mock of serverCrypto.ts logic
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('shabakaty.com')) return url;

  try {
    const parsed = new URL(url);
    let subdomain = parsed.hostname.split('.')[0];
    
    if (parsed.pathname.startsWith('/vascin24-mp4') || parsed.pathname.startsWith('/vascin24-video') || parsed.pathname.startsWith('/vascin-video')) {
      subdomain = 'cndw2';
    } else if (parsed.pathname.startsWith('/vascin-poster-images') || parsed.pathname.startsWith('/vascin-cover-images') || parsed.pathname.startsWith('/uploads/')) {
      subdomain = 'cnth2';
    } else if (!['cdn', 'cndw2', 'cnth2', 'cinemana'].includes(subdomain)) {
       subdomain = 'cinemana'; // fallback
    }

    if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('.ts')) {
      return `https://64-225-99-144.nip.io/${subdomain}${parsed.pathname}${parsed.search}`;
    }
    return `/tunnel/${subdomain}${parsed.pathname}${parsed.search}`;
  } catch(e) {
    return url;
  }
}

console.log('Video:', sanitizeUrl('https://cdn.shabakaty.com/vascin24-mp4/9E8C4E53-AD5B-B491-B5E6-9CDFC18BC13C_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=nU%2BGih6%2Fu972Y4t6tlxuMSUaRio%3D'));
console.log('Poster:', sanitizeUrl('https://cdn.shabakaty.com/vascin-poster-images/55CFF932-647E-CB72-9392-206AD2F0FA82_poster.jpg?v=2'));
