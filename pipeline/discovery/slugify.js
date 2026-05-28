// pipeline/discovery/slugify.js
// Stable transformation of a hospital legal name into a URL slug.
// Per PROJECT_BRIEF.md Section 3: slugs come from the name, not CCN.
//
// Rules:
//   - lowercase
//   - ASCII-fold (drop accents, ligatures)
//   - strip apostrophes entirely so "St. Joseph's" → "st-josephs", not "st-joseph-s"
//   - replace anything else non-alphanumeric with a hyphen
//   - collapse runs of hyphens
//   - trim leading/trailing hyphens
//   - drop standalone "the" (we render "the children's hospital" as
//     "childrens-hospital" because adding "the-" to URLs adds nothing)

const STRIP = /['']/g;  // straight + curly apostrophes
const APOSTROPHIZED_S = /\b(\w+)['']s\b/gi; // catch unicode in case STRIP misses

export function slugify(name) {
  if (!name) return '';

  let s = name.toLowerCase();

  // ASCII-fold accents
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');

  // Remove apostrophes entirely (so "st. joseph's" → "st-josephs")
  s = s.replace(STRIP, '');
  s = s.replace(APOSTROPHIZED_S, '$1s');

  // Replace anything non-alphanumeric with a hyphen
  s = s.replace(/[^a-z0-9]+/g, '-');

  // Drop leading "the-"
  s = s.replace(/^the-/, '');

  // Collapse multi-hyphens and trim
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');

  return s;
}
