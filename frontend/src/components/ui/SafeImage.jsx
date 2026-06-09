import React from 'react';
import { encodeImageUrl } from '@/utils/formatter';

/**
 * SafeImage - Wrapper around img tag that safely handles special URLs
 * Automatically encodes Open edX asset URLs like:
 * asset-v1:BerkeleyX+CS169.1x+3T2015SP+type@asset+block@image.png
 */
export const SafeImage = ({
  src,
  alt,
  className,
  ...props
}) => {
  const safeSrc = encodeImageUrl(src);
  
  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default SafeImage;
