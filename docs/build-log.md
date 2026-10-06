# Publication log

## October 5, 2026 — Curated organizer case study

Prepared a fresh portfolio package covering the personal organization problem, capture classification, grounded task selection, calendar reliability, and limitations. Added selected source excerpts, a synthetic demonstration and screenshot, and standalone guard tests.

Verification: 41 original offline calendar acceptance checks passed; 11 public guard tests passed; JavaScript syntax checks passed; extracted whitelist and guard matched the source route; desktop and mobile demo checks passed. A targeted content scan found no credential values, private hosts, personal contact details, private names, local paths, forbidden files, or broken relative Markdown links. Source hashes matched the manifest.

Independent review identified a mismatch between a synthetic ranking and its “shortest first” explanation. The example was reordered to match its stated rule before publication. The description of classification failure was also made precise: model/schema parse errors return an error, while null or low-confidence parsed results fall back to notes.

No production service was called. The current application's private logs, personal fixtures, configuration, and Git history were excluded. Remaining limitation: the public demo uses fixed outputs; model accuracy, ranking quality, and time saved are unmeasured.

## October 5, 2026 — Portfolio visual refresh

Restyled the synthetic demo to follow the original ryan-os command center mockup's navy and gold palette, compact rail, condensed typography, and responsive three-column panel layout. Kept all content synthetic and the existing capture/task selection behavior. Replaced the README screenshot after checking the new desktop and mobile layout. No private mockup examples were published.

Independent review found that the small secondary labels were too faint. Lightened the dim-text token, checked contrast against the composited panel background, and refreshed the screenshot before publishing.
