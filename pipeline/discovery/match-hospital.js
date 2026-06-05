// pipeline/discovery/match-hospital.js
//
// Shared hospital<->MRF-file matcher used by every discovery script that turns a
// cms-hpt entry (location-name + mrf-url) into a hospital row. Single source of
// truth so the scrapers cannot diverge.
//
// The file URL's EIN is AUTHORITATIVE: CMS names files
// `<EIN>_<facility-slug>_standardcharges.<ext>`, so the leading 9 digits are the
// publisher's legal-entity id. We use it to (a) match directly and (b) VETO any
// name match against a hospital whose known EIN differs from the file's — the
// exact failure that mis-assigned single-facility MRFs to similarly-named
// hospitals (see docs/DATA_INTEGRITY_DUPLICATES.md).

import { slugify } from './slugify.js';

// Within-state trigram threshold raised from the old 0.4 (which let
// "phelps-county-..." match "phelps-memorial-..."). Cross-state stays stricter.
export const SIM_STATE = 0.55;
export const SIM_CROSS = 0.62;

// Extract the publisher EIN (NN-NNNNNNN or 9 bare digits) from an MRF URL's
// filename. Returns a 9-digit string or null.
export function einOf(url) {
  let base;
  try { base = decodeURIComponent(new URL(url).pathname.split('/').pop() || ''); }
  catch { base = String(url || ''); }
  const m = base.match(/(\d{2})-?(\d{7})(?!\d)/);
  return m ? m[1] + m[2] : null;
}

// Decide which hospital a cms-hpt entry's file belongs to. Priority: exact-slug
// in state -> EIN-exact (system EIN disambiguated by slug) -> cross-slug ->
// fuzzy, and EVERY path is EIN-gated. sourceHospital may be null (cross-state,
// e.g. browser-fetched or system-level URLs). Returns { id, ccn, name, _via } or
// null; _via records the matching evidence for logging.
export async function matchHospitalForEntry(client, entry, sourceHospital = null) {
  const targetName = entry['location-name'];
  if (!targetName) return null;

  const targetSlug = slugify(targetName);
  const fileEin = einOf(entry['mrf-url']);
  const state = sourceHospital?.state ?? null;
  const sourceCcn = sourceHospital?.ccn ?? null;

  // Hospitals that authoritatively OWN this file's EIN (single facility or a
  // whole system). Used both to match and to veto wrong fuzzy matches.
  const einRows = fileEin
    ? (await client.query(`SELECT id, ccn, name, slug, ein FROM hospitals WHERE ein = $1`, [fileEin])).rows
    : [];
  const einOwnsSomeone = einRows.length > 0;
  const einOwnerIds = new Set(einRows.map((r) => r.id));

  // 1) Exact slug within state — the locator names this exact facility. Still
  //    EIN-gated: a generic name ("Saint Joseph Hospital") can exact-match the
  //    wrong entity; if both EINs are known and disagree, reject.
  if (state) {
    const exact = await client.query(
      `SELECT id, ccn, name, ein FROM hospitals
       WHERE state = $1 AND slug = $2
       ORDER BY (ccn = $3) DESC LIMIT 1`,
      [state, targetSlug, sourceCcn]
    );
    if (exact.rows.length) {
      const c = exact.rows[0];
      if (fileEin && c.ein && c.ein !== fileEin) {
        console.log(`    ⊘ slug "${targetSlug}" in ${state} matches ${c.ccn} but EIN ${c.ein}≠${fileEin}; rejected`);
      } else {
        return { ...c, _via: 'slug_state' };
      }
    }
  }

  // 2) EIN-authoritative. One owner -> that hospital. A system EIN (many owners)
  //    -> disambiguate by the entry's slug; if none slug-matches, do NOT guess.
  if (einRows.length === 1) return { ...einRows[0], _via: 'ein_unique' };
  if (einRows.length > 1) {
    const bySlug = einRows.find((r) => r.slug === targetSlug);
    if (bySlug) return { ...bySlug, _via: 'ein_slug' };
  }

  // 3) Cross-state exact slug — but if EINs are both known and disagree, this is
  //    a slug collision between two entities; reject rather than mis-assign.
  const exactCross = await client.query(
    `SELECT id, ccn, name, ein FROM hospitals WHERE slug = $1 LIMIT 1`,
    [targetSlug]
  );
  if (exactCross.rows.length) {
    const c = exactCross.rows[0];
    if (fileEin && c.ein && c.ein !== fileEin) {
      console.log(`    ⊘ slug "${targetSlug}" matches ${c.ccn} but EIN ${c.ein}≠${fileEin}; rejected`);
    } else {
      return { ...c, _via: 'slug_cross' };
    }
  }

  // 4) Fuzzy — last resort, EIN-VETOED. Accept only when it does not contradict
  //    the file's EIN: reject if the candidate's known EIN differs, or if this
  //    EIN is owned by some hospital(s) and the candidate is not one of them.
  const fuzzy = (await client.query(
    `SELECT id, ccn, name, ein, similarity(slug, $2) AS sim
     FROM hospitals
     WHERE ($1::text IS NULL OR state = $1) AND similarity(slug, $2) > $3
     ORDER BY sim DESC LIMIT 1`,
    [state, targetSlug, state ? SIM_STATE : SIM_CROSS]
  )).rows[0];
  if (fuzzy) {
    const einConflict = fileEin && fuzzy.ein && fuzzy.ein !== fileEin;
    const stealsKnownEntity = einOwnsSomeone && !einOwnerIds.has(fuzzy.id);
    if (einConflict || stealsKnownEntity) {
      console.log(`    ⊘ fuzzy "${targetSlug}"~${fuzzy.ccn} (sim ${Number(fuzzy.sim).toFixed(2)}) vetoed by EIN ${fileEin}`);
      return null;
    }
    return { ...fuzzy, _via: 'fuzzy' };
  }

  return null;
}
