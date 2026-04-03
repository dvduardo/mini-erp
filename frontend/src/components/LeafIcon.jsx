import React from 'react';

function LeafIcon({ className = '', color = 'currentColor' }) {
  const classes = ['leaf-icon', className].filter(Boolean).join(' ');

  return (
    <svg
      className={classes}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M50 8 C72 18, 80 44, 72 68 C64 86, 50 92, 50 92 C50 92, 36 86, 28 68 C20 44, 28 18, 50 8 Z"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
      />
      <line x1="50" y1="10" x2="50" y2="90" stroke={color} strokeWidth="2" />
      <path
        d="M50 28 Q38 35 30 38 M50 44 Q36 50 28 53 M50 60 Q37 65 30 67"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M50 28 Q62 35 70 38 M50 44 Q64 50 72 53 M50 60 Q63 65 70 67"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default LeafIcon;
