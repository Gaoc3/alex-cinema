/**
 * Client-side image URL helper.
 * NO encryption keys, NO shabakaty domains — just simple URL construction.
 */

// Bump when a previously cached proxy failure must be invalidated in browsers/CDNs.
const IMAGE_CACHE_VERSION = '20260730-1';

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

export function getVideoImageUrl(
  video: { img?: string; imgObjUrl?: string; imgMediumThumb?: string; imgThumb?: string },
  type: 'poster' | 'cover' | 'backdrop' = 'poster'
): string {
  if (!video) return '';

  // 1. For covers/backdrops (like HeroCarousel), prefer high-res main image
  if (type === 'cover' || type === 'backdrop') {
    const img = video.img || video.imgMediumThumb || video.imgThumb;
    return getImageUrl(img, type);
  }

  // 2. For poster grid cards:
  // Prefer imgObjUrl if pre-sanitized by server
  if (video.imgObjUrl && (video.imgObjUrl.startsWith('/api/') || video.imgObjUrl.startsWith('/tunnel/'))) {
    return withImageCacheVersion(video.imgObjUrl);
  }

  // Prefer main img, then fallback to medium/small thumbnails
  const img = video.img || video.imgMediumThumb || video.imgThumb;
  return getImageUrl(img, 'poster');
}
