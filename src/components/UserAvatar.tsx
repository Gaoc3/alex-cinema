"use client";

import { useState } from 'react';

function safeAvatarUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function UserAvatar({
  imageUrl,
  name,
  className = 'size-8',
}: {
  imageUrl?: string | null;
  name?: string | null;
  className?: string;
}) {
  const url = safeAvatarUrl(imageUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const fallback = name?.trim().charAt(0).toUpperCase() || 'م';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500/90 to-slate-700 text-[0.7rem] font-black text-white ${className}`}
      aria-hidden="true"
    >
      {url && failedUrl !== url ? (
        // Native img supports both Clerk and Telegram URLs without coupling avatars to Next image host rules.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="absolute inset-0 size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
        />
      ) : fallback}
    </span>
  );
}
