import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size }) => {
  return (
    <img
      src="/logo.png"
      alt="CivicResolve Logo"
      width={size}
      height={size}
      className={`object-contain inline-block shrink-0 ${className}`}
    />
  );
};

export default Logo;
