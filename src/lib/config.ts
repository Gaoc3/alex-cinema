export function getTunnelBaseUrl(): string {
  const url = process.env.TUNNEL_BASE_URL;
  if (!url) {
    console.error('TUNNEL_BASE_URL is not defined in environment variables');
    throw new Error('TUNNEL_BASE_URL is not defined in environment variables');
  }
  return url;
}

export const TUNNEL_BASE_URL = getTunnelBaseUrl();
