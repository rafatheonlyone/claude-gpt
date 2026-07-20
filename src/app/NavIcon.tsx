/**
 * Original navigation glyphs — geometric, minimal, consistent stroke weight
 * with `src/ui/AchievementGlyph.tsx`. No third-party icon set.
 */
export type NavIconName =
  | 'home'
  | 'today'
  | 'quests'
  | 'status'
  | 'skills'
  | 'achievements'
  | 'bosses'
  | 'timeline'
  | 'architect'
  | 'settings';

const PATHS: Record<NavIconName, React.ReactElement> = {
  home: <path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6" />,
  today: <path d="M4 5h16v16H4zM4 9h16M8 3v4M16 3v4M9 14l2 2 4-4" />,
  quests: <path d="M6 3v18M6 4h11l-2 4 2 4H6" />,
  status: <path d="M4 20V10M11 20V4M18 20v-7" />,
  skills: <path d="M12 21V9m0 0L6 3m6 6l6-6M6 3v4m12-4v4" />,
  achievements: <path d="M12 2l2.6 5.9L21 9l-4.7 4.3L17.4 20 12 16.9 6.6 20l1.1-6.7L3 9l6.4-1.1z" />,
  bosses: <path d="M12 2l8 3v6c0 5-3.6 8.4-8 11-4.4-2.6-8-6-8-11V5z" />,
  timeline: <path d="M3 12h18M6 12v-4M11 12v6M16 12v-3M6 8v.01M11 18v.01M16 9v.01" />,
  architect: <path d="M12 5c-5 0-8.5 4-9.5 7 1 3 4.5 7 9.5 7s8.5-4 9.5-7c-1-3-4.5-7-9.5-7zM12 9a3 3 0 100 6 3 3 0 000-6z" />,
  settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-.9a7 7 0 002 1.2L10 21h4l.5-2.5a7 7 0 002-1.2l2.4.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z" />,
};

export function NavIcon({ name }: { name: NavIconName }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
