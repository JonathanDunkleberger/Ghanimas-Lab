"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * next/image that degrades gracefully: when the source 404s or errors,
 * renders the fallback (default: a neutral surface) instead of the
 * browser's broken-image glyph. Resets when src changes, so a modal that
 * swaps placeholder art for enriched art gets a second chance.
 */
export function SafeImage({
  fallback,
  ...props
}: ImageProps & { fallback?: React.ReactNode }) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  if (failedSrc === props.src) {
    return <>{fallback ?? <div className="h-full w-full bg-fey-surface" />}</>;
  }
  return <Image {...props} onError={() => setFailedSrc(props.src)} />;
}
