/**
 * Client-side image URL helper.
 * NO encryption keys, NO shabakaty domains — just simple URL construction.
 */

// Bump when a previously cached proxy failure must be invalidated in browsers/CDNs.
const IMAGE_CACHE_VERSION = '20260814-100';

function withImageCacheVersion(url: string): string {
  if (!url || (!url.startsWith('/api/img') && !url.startsWith('/tunnel/'))) return url;
  if (/[?&]iv=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}iv=${IMAGE_CACHE_VERSION}`;
}

/**
 * Returns a proxy image URL for the given image field.
 * - If the field is already a proxied URL (/api/...), returns it as-is.
 * - If it's a plain filename, constructs /api/img?type=...&file=...
 * - If null/undefined, returns empty string.
 */
export function getImageUrl(
  imgField: string | undefined | null,
  type: 'poster' | 'cover' | 'backdrop' = 'poster'
): string {
  if (!imgField) return '';
  const trimmed = imgField.trim();
  if (!trimmed) return '';
  // Ignore raw server command/internal path leaks
  if (trimmed.startsWith('/var/') || trimmed.startsWith('/usr/') || trimmed.includes('s3cmd') || trimmed.includes('s3md5')) {
    return '';
  }
  // Already a proxied/rewritten URL from sanitized server data
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/tunnel/')) {
    return withImageCacheVersion(trimmed);
  }
  // Strip query parameters and hash
  const cleanPath = trimmed.split('?')[0].split('#')[0];
  // Extract pure basename
  const filename = cleanPath.split('/').pop() || cleanPath;
  if (!filename) return '';
  return withImageCacheVersion(`/api/img?type=${type}&file=${encodeURIComponent(filename)}`);
}

export function getVideoImageCandidates(
  video: { 
    img?: string; 
    imgObjUrl?: string; 
    imgMediumThumb?: string; 
    imgThumb?: string;
    imgThumbObjUrl?: string;
    imgMediumThumbObjUrl?: string;
    banner_img?: string;
    cover?: string;
  } | undefined | null,
  type: 'poster' | 'cover' | 'backdrop' = 'poster'
): string[] {
  if (!video) return [];
  const results: string[] = [];

  if (type === 'poster') {
    if (video.imgMediumThumb) results.push(getImageUrl(video.imgMediumThumb, 'poster'));
    if (video.imgMediumThumbObjUrl) results.push(getImageUrl(video.imgMediumThumbObjUrl, 'poster'));
    if (video.img) results.push(getImageUrl(video.img, 'poster'));
    if (video.imgThumb) results.push(getImageUrl(video.imgThumb, 'poster'));
    if (video.imgThumbObjUrl) results.push(getImageUrl(video.imgThumbObjUrl, 'poster'));
    if (video.imgObjUrl) results.push(getImageUrl(video.imgObjUrl, 'poster'));
    if (video.banner_img) results.push(getImageUrl(video.banner_img, 'poster'));
  } else {
    if (video.img) results.push(getImageUrl(video.img, type));
    if (video.imgObjUrl) results.push(getImageUrl(video.imgObjUrl, type));
    if (video.banner_img) results.push(getImageUrl(video.banner_img, type));
    if (video.cover) results.push(getImageUrl(video.cover, type));
    if (video.imgMediumThumb) results.push(getImageUrl(video.imgMediumThumb, type));
    if (video.imgMediumThumbObjUrl) results.push(getImageUrl(video.imgMediumThumbObjUrl, type));
    if (video.imgThumb) results.push(getImageUrl(video.imgThumb, type));
    if (video.imgThumbObjUrl) results.push(getImageUrl(video.imgThumbObjUrl, type));
  }

  // Deduplicate while preserving priority order
  return Array.from(new Set(results.filter(Boolean)));
}

export function getVideoImageUrl(
  video: { 
    img?: string; 
    imgObjUrl?: string; 
    imgMediumThumb?: string; 
    imgThumb?: string;
    imgThumbObjUrl?: string;
    imgMediumThumbObjUrl?: string;
    banner_img?: string;
    cover?: string;
  } | undefined | null,
  type: 'poster' | 'cover' | 'backdrop' = 'poster'
): string {
  const candidates = getVideoImageCandidates(video, type);
  return candidates[0] || '';
}
