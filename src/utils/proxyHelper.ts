export const encodeProxyUrl = (url: string): string => {
  if (typeof window !== 'undefined') {
    return window.btoa(unescape(encodeURIComponent(url)));
  }
  return Buffer.from(url).toString('base64');
};
