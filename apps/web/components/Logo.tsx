// Bandage-X mark (faithful inline SVG of Logo.ai, pending Jake's real export).
// Bandages use currentColor; pad dots are paper-colored to "punch through".
const DOT_ROWS = [18, 21, 24, 27, 30];
const DOT_COLS = [19.5, 22.5, 25.5, 28.5];

export default function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <g fill="currentColor">
        <rect x="2.5" y="17.5" width="43" height="13" rx="6.5" transform="rotate(45 24 24)" />
        <rect x="2.5" y="17.5" width="43" height="13" rx="6.5" transform="rotate(-45 24 24)" />
      </g>
      <g transform="rotate(45 24 24)" fill="#FAF9F6">
        {DOT_ROWS.flatMap((cy) => DOT_COLS.map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.9} />))}
      </g>
    </svg>
  );
}
