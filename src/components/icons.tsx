// Line icons drawn in currentColor, 24-unit grid.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const Eye = () => (
  <svg {...base}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const EyeOff = () => (
  <svg {...base}>
    <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
)

export const Alert = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.4v.1" />
  </svg>
)

export const Low = () => (
  <svg {...base}>
    <path d="M3 7l6 6 4-4 8 8M21 11v6h-6" />
  </svg>
)

export const Shared = () => (
  <svg {...base}>
    <path d="M7 7h11l-3-3M17 17H6l3 3" />
  </svg>
)

export const Chevron = () => (
  <svg {...base}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export const Change = () => (
  <svg {...base}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
)

export const Doc = () => (
  <svg {...base}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M14 3v5h5" />
  </svg>
)

export const Check = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.6 2.5L16 9.5" />
  </svg>
)
