import { encryptUrl } from './cryptoHelper';

export const encodeProxyUrl = (url: string): string => {
  if (!url) return '';
  return encryptUrl(url);
};
