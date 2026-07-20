/**
 * Original vector glyphs, drawn inline.
 *
 * Generated rather than imported so SYSTEM carries no third-party icon
 * licensing and the marks stay stylistically consistent with the interface.
 */
const PATHS: Record<string, React.ReactElement> = {
  pulse: <path d="M2 12h4l3-8 4 16 3-8h4" />,
  ascend: <path d="M12 3v18M12 3l-6 6M12 3l6 6" />,
  tier: <path d="M12 3l8 5-8 5-8-5 8-5zM4 14l8 5 8-5" />,
  surge: <path d="M4 18L10 8l4 5 6-9" />,
  crest: <path d="M12 2l9 5v6c0 5-4 8-9 9-5-1-9-4-9-9V7l9-5z" />,
  monolith: <path d="M8 21V6l4-4 4 4v15M8 11h8M8 16h8" />,
  lattice: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  strata: <path d="M3 7h18M3 12h18M3 17h18" />,
  branch: <path d="M12 21V9m0 0L6 3m6 6l6-6" />,
  constellation: <path d="M5 6l6 4 8-3M11 10l2 8m-2-8l-5 5m13-8l-2 6" />,
  still: <path d="M4 12h16M7 8h10M7 16h10" />,
  balance: <path d="M12 3v18M4 8h16M6 8l-2 6h4l-2-6zm12 0l-2 6h4l-2-6z" />,
  return: <path d="M4 12a8 8 0 1 1 3 6M4 12v-5M4 12h5" />,
  candor: <path d="M12 3l9 16H3l9-16zm0 6v5m0 3v.5" />,
  cycle: <path d="M4 12a8 8 0 0 1 14-5m2 5a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4" />,
  archive: <path d="M3 6h18v4H3zM5 10v10h14V10M9 14h6" />,
  // Shown for locked hidden achievements — deliberately uninformative, so it
  // never hints at what the real icon would be.
  unknown: <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM9.5 9a2.5 2.5 0 015 .3c0 1.7-2.5 1.9-2.5 3.7M12 17v.01" />,
};

export function AchievementGlyph({ icon }: { icon: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {PATHS[icon] ?? PATHS['pulse']}
    </svg>
  );
}
