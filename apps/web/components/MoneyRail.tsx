// Right rail for money pages: a reserved ad zone (inert until AdSense is on) plus
// a "related" link module. Shared by procedure / hospital / state pages.
import { AdSlot } from "./AdSlot";

export type RailItem = { href: string; label: string };

export function MoneyRail({ title, items }: { title: string; items: RailItem[] }) {
  return (
    <aside className="mg-rail">
      <div className="mg-rail-inner">
        <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_RAIL} className="adrail" />
        {items.length > 0 && (
          <nav className="relbox" aria-label={title}>
            <h3>{title}</h3>
            {items.map((it) => (
              <a key={it.href} href={it.href}>{it.label}</a>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
