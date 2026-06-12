export const encodeProxyUrl = (url: string): string => {
  if (!url) return '';
  return encodeURIComponent(url);
};
