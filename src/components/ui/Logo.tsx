import Image from 'next/image';

type LogoVariant = 'primary' | 'black' | 'white';
type LogoSchema = 'default' | 'favicon';

interface LogoProps {
  variant?: LogoVariant;
  schema?: LogoSchema;
  size?: number;
  className?: string;
}

const assetMap: Record<LogoVariant, Record<LogoSchema, string>> = {
  primary: { default: '/logo/revenue-engine-symbol.svg', favicon: '/logo/revenue-engine-symbol-favicon.svg' },
  black: { default: '/logo/revenue-engine-symbol-black.svg', favicon: '/logo/revenue-engine-symbol-black.svg' },
  white: { default: '/logo/revenue-engine-symbol-white.svg', favicon: '/logo/revenue-engine-symbol-white.svg' },
};

export function Logo({ variant = 'primary', schema = 'default', size = 32, className = '' }: LogoProps) {
  const src = assetMap[variant][schema];
  return (
    <Image
      src={src}
      alt="Revenue Engine"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
