import React from 'react';
import { getMediaUrl } from '../../services/api';

const colorPalettes = [
  'from-emerald-600 to-teal-700',
  'from-cyan-600 to-blue-700',
  'from-indigo-600 to-purple-700',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-pink-700',
  'from-teal-600 to-emerald-800'
];

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] || 'B').toUpperCase();
};

const getGradient = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalettes[Math.abs(hash) % colorPalettes.length];
};

export const Avatar = ({
  src,
  name = '',
  size = 'md',
  isOnline = false,
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-2xl'
  };

  const dotClasses = {
    xs: 'w-2 h-2 ring-1',
    sm: 'w-2.5 h-2.5 ring-1.5',
    md: 'w-3 h-3 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-5 h-5 ring-4'
  };

  const resolvedSrc = getMediaUrl(src);
  const hasImage = Boolean(resolvedSrc && resolvedSrc.trim());

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {hasImage ? (
        <img
          src={resolvedSrc}
          alt={name}
          className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover shadow-sm bg-bakwas-panel`}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) {
              e.target.nextSibling.style.display = 'flex';
            }
          }}
        />
      ) : null}

      <div
        style={{ display: hasImage ? 'none' : 'flex' }}
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full bg-gradient-to-br ${getGradient(name)} text-white font-semibold items-center justify-center shadow-sm select-none`}
      >
        {getInitials(name)}
      </div>

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotClasses[size] || dotClasses.md} bg-emerald-500 ring-bakwas-panel dark:ring-bakwas-dark rounded-full`}
        />
      )}
    </div>
  );
};
