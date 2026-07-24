export const encodeProxyUrl = (url: string): string => {
  if (!url) return '';
  return encodeURIComponent(url);
};

/**
 * Executes a fetch call while intercepting 301, 302, 303, 307, 308 redirects manually in Node.js.
 * This guarantees that redirects from internal Shabakaty CDN nodes stay inside the SSH tunnel 
 * and never leak a 307 Temporary Redirect back to the browser.
 */
export async function fetchWithRedirects(
  initialUrl: string, 
  headers: Headers, 
  maxRedirects = 5
): Promise<Response> {
  let currentUrl = initialUrl;

  for (let i = 0; i < maxRedirects; i++) {
    const currentHeaders = new Headers(headers);
    if (!currentHeaders.has('User-Agent')) {
      currentHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    currentHeaders.set('Bypass-Tunnel-Reminder', 'true');
    currentHeaders.set('Referer', 'https://cinemana.shabakaty.com/');

    const response = await fetch(currentUrl, {
      headers: currentHeaders,
      redirect: 'manual', // Manually intercept 3xx redirects to keep them inside Node.js
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;

      try {
        currentUrl = new URL(location, currentUrl).href;
      } catch {
        return response;
      }
      continue;
    }

    return response;
  }

  // Fallback if max redirects reached: try one final fetch with follow
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Bypass-Tunnel-Reminder', 'true');
  finalHeaders.set('Referer', 'https://cinemana.shabakaty.com/');
  return fetch(currentUrl, { headers: finalHeaders, redirect: 'follow' });
}
