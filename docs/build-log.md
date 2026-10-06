# Publication log

## October 5, 2026 — Curated organizer case study

Prepared a fresh portfolio package covering the personal organization problem, capture classification, grounded task selection, calendar reliability, and limitations. Added selected source excerpts, a synthetic demonstration and screenshot, and standalone guard tests.

Verification: 41 original offline calendar acceptance checks passed; 11 public guard tests passed; JavaScript syntax checks passed; extracted whitelist and guard matched the source route; desktop and mobile demo checks passed. A targeted content scan found no credential values, private hosts, personal contact details, private names, local paths, forbidden files, or broken relative Markdown links. Source hashes matched the manifest.

Independent review identified a mismatch between a synthetic ranking and its “shortest first” explanation. The example was reordered to match its stated rule before publication. The description of classification failure was also made precise: model/schema parse errors return an error, while null or low-confidence parsed results fall back to notes.

No production service was called. The current application's private logs, personal fixtures, configuration, and Git history were excluded. Remaining limitation: the public demo uses fixed outputs; model accuracy, ranking quality, and time saved are unmeasured.

## October 5, 2026 — Portfolio visual refresh

Restyled the synthetic demo to follow the original ryan-os command center mockup's navy and gold palette, compact rail, condensed typography, and responsive three-column panel layout. Kept all content synthetic and the existing capture/task selection behavior. Replaced the README screenshot after checking the new desktop and mobile layout. No private mockup examples were published.

Independent review found that the small secondary labels were too faint. Lightened the dim-text token, checked contrast against the composited panel background, and refreshed the screenshot before publishing.

## October 5, 2026 — Full workspace preview

Added synthetic CRM, Jobs, Notes, Training, and investment Portfolio previews with expandable workflow descriptions, following the full ryan-os modules. Updated the case study and application response to describe the broader workspace while keeping the evidenced ML example focused on capture and task ranking. Noted that brokerage sync is paused and that the additional cards are illustrative rather than published implementations.

Verification: 11 public guard tests passed; all five module links and workflow disclosures worked in the browser with no page errors; checked widths from 320 to 1440 pixels with no horizontal overflow. Independent review caught an inaccurate claim that code orders task-search results; corrected it to state that the model ranks tasks and code validates its returned IDs. The screenshot uses invented records only. No production service was called.

The same review noted that hidden tablet/mobile navigation made the module section harder to find and that card text was small. Added a direct module link in the operator card, increased the preview and workflow text, and added a visible keyboard focus style for the disclosures.
