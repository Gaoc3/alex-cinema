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

/**
 * Returns the best available image URL from a video object.
 * Prefers imgObjUrl (already sanitized by server) over img filename.
 */
export function getVideoImageUrl(
  video: { img?: string; imgObjUrl?: string; imgMediumThumb?: string; imgThumb?: string },
  type: 'poster' | 'cover' | 'backdrop' = 'poster'
): string {
  // Grid cards must prefer the dedicated thumbnails. Some full poster PNGs are
  // multiple megabytes while the corresponding medium thumbnail is ~30 KB.
  if (type === 'poster') {
    const thumbnail = video.imgMediumThumb || video.imgThumb;
    if (thumbnail) return getImageUrl(thumbnail, type);
  }

  // imgObjUrl is already sanitized by the server to /api/img?ref=...
  if (video.imgObjUrl && (video.imgObjUrl.startsWith('/api/') || video.imgObjUrl.startsWith('/tunnel/'))) {
    return withImageCacheVersion(video.imgObjUrl);
  }

  // For covers (like HeroCarousel), prefer high-res
  const img = video.img || video.imgMediumThumb || video.imgThumb;
  return getImageUrl(img, type);
}
