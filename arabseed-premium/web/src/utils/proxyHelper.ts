export const encodeProxyUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    return window.btoa(unescape(encodeProxyUrl(url)));
  }
  return Buffer.from(url).toString('base64');
};
