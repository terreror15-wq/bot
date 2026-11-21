import React from 'react';
import type { EmblemVariant, StudentProfile } from '../types/botchase';

interface EmblemSvgProps {
  variant: EmblemVariant;
  color: string;
  accentColor?: string;
  size?: number;
  initials?: string;
}

export const EmblemSvg: React.FC<EmblemSvgProps> = ({
  variant,
  color,
  accentColor = '#6B93F5',
  size = 64,
  initials = 'IT',
}) => {
  if (variant === 'escudo') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Emblema Escudo"
      >
        <path
          d="M32 6L52 13V30C52 43.2 43.4 53.6 32 58C20.6 53.6 12 43.2 12 30V13L32 6Z"
          stroke={color}
          strokeWidth="2.5"
          fill={`${color}14`}
        />
        <path
          d="M32 13L45 17.8V29.5C45 38.8 39.3 46.5 32 50C24.7 46.5 19 38.8 19 29.5V17.8L32 13Z"
          stroke={accentColor}
          strokeWidth="1.5"
        />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fill={color}
          fontSize="14"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {initials}
        </text>
      </svg>
    );
  }

  if (variant === 'sello') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Emblema Sello"
      >
        <circle cx="32" cy="32" r="26" stroke={color} strokeWidth="2.2" fill={`${color}10`} />
        <circle
          cx="32"
          cy="32"
          r="20.5"
          stroke={accentColor}
          strokeWidth="1.4"
          strokeDasharray="3 3"
        />
        <circle cx="32" cy="32" r="15" stroke={color} strokeWidth="1.2" />
        <text
          x="32"
          y="36.5"
          textAnchor="middle"
          fill={color}
          fontSize="13"
          fontWeight="700"
          fontFamily="Source Serif 4, serif"
        >
          {initials}
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Emblema Iniciales"
    >
      <rect
        x="8"
        y="8"
        width="48"
        height="48"
        rx="12"
        stroke={color}
        strokeWidth="2.4"
        fill={`${color}12`}
      />
      <line x1="16" y1="45" x2="48" y2="45" stroke={accentColor} strokeWidth="2" />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fill={color}
        fontSize="18"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
};

export function getProfileInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const ProfileLogoMark: React.FC<{
  profile: StudentProfile;
  primaryColor: string;
  accentColor?: string;
  size: number;
}> = ({ profile, primaryColor, accentColor = '#6B93F5', size }) => {
  if (profile.logoType === 'upload' && profile.logoDataUrl) {
    return (
      <img
        src={profile.logoDataUrl}
        alt="Logo institucional del estudiante"
        style={{ width: size, height: size }}
        className="object-contain mx-auto"
      />
    );
  }

  return (
    <EmblemSvg
      variant={profile.emblemVariant}
      color={primaryColor}
      accentColor={accentColor}
      size={size}
      initials={getProfileInitials(profile.fullName)}
    />
  );
};
