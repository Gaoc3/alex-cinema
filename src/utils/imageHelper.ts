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
  // Already a proxied/rewritten URL from sanitized server data
  if (imgField.startsWith('/api/') || imgField.startsWith('/tunnel/')) {
    return withImageCacheVersion(imgField);
  }
  if (imgField.startsWith('http')) {
    return withImageCacheVersion(`/api/img?type=${type}&file=${encodeURIComponent(imgField.split('/').pop() || imgField)}`);
  }
  // Plain filename — construct the simple proxy URL
  return withImageCacheVersion(`/api/img?type=${type}&file=${encodeURIComponent(imgField)}`);
}

export function getVideoImageCandidates(
  video: { img?: string; imgObjUrl?: string; imgMediumThumb?: string; imgThumb?: string } | undefined | null,
  type: 'poster' | 'cover' | 'backdrop' = 'poster'
): string[] {
  if (!video) return [];
  const results: string[] = [];

  if (type === 'poster') {
    if (video.imgMediumThumb) results.push(getImageUrl(video.imgMediumThumb, 'poster'));
    if (video.img) results.push(getImageUrl(video.img, 'poster'));
    if (video.imgThumb) results.push(getImageUrl(video.imgThumb, 'poster'));
    if (video.imgObjUrl) results.push(getImageUrl(video.imgObjUrl, 'poster'));
  } else {
    if (video.img) results.push(getImageUrl(video.img, type));
    if (video.imgObjUrl) results.push(getImageUrl(video.imgObjUrl, type));
    if (video.imgMediumThumb) results.push(getImageUrl(video.imgMediumThumb, type));
    if (video.imgThumb) results.push(getImageUrl(video.imgThumb, type));
  }

  // Deduplicate while preserving priority order
  return Array.from(new Set(results.filter(Boolean)));
}

export function getVideoImageUrl(
  video: { img?: string; imgObjUrl?: string; imgMediumThumb?: string; imgThumb?: string } | undefined | null,
  type: 'poster' | 'cover' | 'backdrop' = 'poster'
): string {
  const candidates = getVideoImageCandidates(video, type);
  return candidates[0] || '';
}
