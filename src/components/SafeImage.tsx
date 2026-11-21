import React, { useState } from 'react';
import { HeartPulse } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackLabel,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EEF7F6] to-[#E2ECEB] p-6 text-center text-[#0D7A6F] ${className}`}
        role="img"
        aria-label={alt}
      >
        <HeartPulse className="h-8 w-8 opacity-75" />
        {fallbackLabel && (
          <span className="mt-2 text-xs font-medium text-[#0F1E2E]">{fallbackLabel}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
