# Stray Frequency — Official Backlog

This is the repository's authoritative working backlog for agreed or clearly identified future work. It is intentionally not a complete design document and does not assign speculative delivery dates.

Items belong here when they are useful, actionable work that we intend to revisit. Ideas that are still exploratory should remain in design discussion until they become concrete enough to schedule.

## Active / next

### Compact mobile landscape HUD

- Rework the active panel around a **28-slot, 4 × 7 inventory grid** with every slot simultaneously accessible.
- Keep the active panel and right tab rail exactly aligned top-to-bottom.
- Remove inventory scrolling and pagination.
- Reduce the status module's vertical footprint.
- Fit the tab rail to short landscape screens, including a two-column tab arrangement if appropriate.
- Preserve fullscreen operation, movable HUD modules, layout editing, hard screen-edge collision and module overlap.
- Keep transient collapse state separate from persisted layout placement.

## Gameplay and world

### Sound direction

Establish the preliminary sound-design language for Stray Frequency. Sound direction has not yet been formally defined and should be developed specifically for this game rather than inherited from other projects.

### Glassmarket and South Dock

Continue turning Glassmarket and South Dock into places worth returning to rather than disposable early-game areas. Priorities include recurring NPCs, useful services, mundane routines, environmental storytelling, local social knowledge and reasons to revisit familiar locations after progression expands elsewhere.

### Mara

Continue development of Mara's inventor/repairer role, workshop interactions, scrap economy, inventions and relationship-state consequences. Preserve her as a non-romance character and avoid turning her into a generic quest dispenser or starter merchant.

### NPC social simulation

Develop the compact local relationship/knowledge model: broad perceptions, landmark memories, imperfect information, gossip, local reputation and consequences that affect opportunities without creating irreversible progression traps.

### District expansion

Design additional districts as horizontal expansion rather than level-gated replacements for South Dock. Information and reputation should remain locally grounded instead of synchronising globally by default.

## Accounts, communication and infrastructure

### Human-facing mailbox

Set up a real correspondence mailbox on the main domain, likely `support@strayfrequency.co.uk` or `hello@strayfrequency.co.uk`.

Keep this separate from `noreply@auth.strayfrequency.co.uk`, which is reserved for transactional authentication email through Resend. Choose the mailbox provider before changing DNS, then verify SPF/DKIM/DMARC coexist cleanly with the existing Resend configuration. Do not create a duplicate root DMARC record.

### Authentication email UX

- Keep the production resend-confirmation flow available for unconfirmed accounts.
- Monitor transactional deliverability as real testing expands beyond the current small prototype audience.
- Revisit authentication email copy/branding when the wider account UX receives a polish pass.

### Multiplayer presence

Replace the current persisted-room approximation of Nearby/online presence with an appropriate server-side heartbeat/presence model when genuine online-presence behaviour becomes necessary.

## Character and presentation

### Character appearance system

Continue modular character customisation using registered layered assets and fixed pivots. Expand beyond the current prototype appearance choices as authoritative assets become available.

### Canonical transit mark and Mara variant

Create and preserve the exact canonical old transit authority mark as a reusable asset. Design Mara's handmade modern descendant as a separate canonical asset suitable for both her workshop/stall and the Stray Frequency launcher icon. Scene generation should leave placement space for canonical marks rather than redrawing them inconsistently.

## Assets and technical debt

### Asset validation

Keep asset references aligned with the authoritative `public/` hierarchy and `SRC/core/assets.ts`. Add targeted validation where it usefully catches missing, mistyped or invalid runtime assets.

### Documentation maintenance

Keep README, architecture, UI contract, asset guide and this backlog aligned with the actual `main` branch. Remove temporary handoff/readme files after their instructions are obsolete.

### Automated validation

Add targeted automated checks where they meaningfully reduce regressions. Candidates include persistence validation, core gameplay systems, server-authoritative action boundaries and asset/reference validation. Avoid adding testing infrastructure merely for coverage numbers.

## Later / deliberately unscheduled

- Broader character cosmetic progression earned through gameplay.
- Additional gathering/crafting/economic systems once they have a clear place in the world.
- More authored NPC interiors/scenes for characters whose physical spaces meaningfully belong to them.
- Expanded multiplayer/social systems as actual player behaviour demonstrates what is useful.
- Human-facing support/contact workflow once the mailbox exists and there is enough external usage to justify it.

## Backlog rules

- No speculative dates.
- Do not treat an interesting idea as committed scope until it becomes actionable.
- Player convenience is the default; implementation effort determines priority, not whether the player deserves the feature.
- Essential gameplay access must not depend on maintaining perfect NPC relationships or avoiding persistent social consequences.
- New systems should strengthen the feeling of living in Stray Frequency's world rather than existing solely to add another progression bar.
