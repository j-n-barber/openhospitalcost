// OpenHospitalCost bandage-X mark — Jake's real export (brand/Logo_Icon.svg).
// Two-color brand mark: ink #13283A bandage, teal #1A6B7A adhesive-pad dots.
const INK = "#13283A";
const TEAL = "#1A6B7A";

// Adhesive-pad dot grid (cx, cy), from the source SVG.
const DOTS: ReadonlyArray<readonly [number, number]> = [
  [211.12, 145.15], [225.42, 159.46], [239.73, 173.77], [254.04, 188.08], [268.35, 202.38],
  [176.14, 180.13], [190.45, 194.44], [204.76, 208.74], [219.06, 223.05], [233.37, 237.36],
  [158.65, 197.62], [172.96, 211.92], [187.27, 226.23], [201.58, 240.54], [215.88, 254.85],
  [193.63, 162.64], [207.94, 176.95], [222.24, 191.26], [236.55, 205.56], [250.86, 219.87],
];

export default function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 427 400" aria-hidden="true">
      <rect
        fill={INK}
        x="146.04" y="-2.37" width="134.91" height="404.74" rx="20" ry="20"
        transform="translate(203.95 -92.39) rotate(45)"
      />
      <g fill={TEAL}>
        {DOTS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5.62} />)}
      </g>
      <path
        fill={INK}
        d="M143.64,34.74c-15.9-15.9-41.67-15.9-57.56,0l-38,38c-15.81,15.81-15.81,41.43,0,57.24l53.9,53.9c7.11,7.11,18.65,7.11,25.76,0l69.64-69.64c7.11-7.11,7.11-18.65,0-25.76l-53.74-53.74Z"
      />
      <path
        fill={INK}
        d="M283.24,365.14c15.9,15.9,41.67,15.9,57.56,0l38-38c15.81-15.81,15.81-41.43,0-57.24l-53.9-53.9c-7.11-7.11-18.65-7.11-25.76,0l-69.64,69.64c-7.11,7.11-7.11,18.65,0,25.76l53.74,53.74Z"
      />
    </svg>
  );
}
