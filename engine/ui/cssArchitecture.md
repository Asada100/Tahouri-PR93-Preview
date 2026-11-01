# Tahouri Edu Platform — CSS Ownership

## Rules

1. `style.css` is the shared UI foundation and must not contain page-specific learning or engine styling.
2. `platformShell.css` contains only shell-level compatibility rules shared by platform screens.
3. `header.css` owns Header presentation.
4. `grades.css`, `subjects.css`, `chapters.css`, and `activitySelection.css` own their corresponding Learning screens.
5. Each activity/game Engine owns its visual CSS in a dedicated stylesheet when that Engine is migrated.
6. A new activity that reuses an existing Engine must not require a new stylesheet.
7. Do not replace a shared stylesheet with a screen-specific stylesheet.
8. Do not copy an existing screen's CSS into another stylesheet. Move ownership instead.
9. Header and Bottom Navigation are shared infrastructure and must not be restyled from Learning or Engine stylesheets.
10. JavaScript files must not contain CSS rules; screen rendering and styling remain separate.

## Ownership map

- Shared foundation → `style.css`
- Platform shell compatibility → `engine/ui/platformShell.css`
- Header → `engine/ui/header.css`
- Bottom Navigation → `engine/ui/bottomNavigation.css` / its existing component ownership
- Grade selection → `engine/ui/grades.css`
- Subject selection → `engine/ui/subjects.css`
- Chapter selection → `engine/ui/chapters.css`
- Activity selection → `engine/ui/activitySelection.css`
- Profile → `engine/ui/profilePolish.css`
- Dashboard → `engine/ui/dashboardPolish.css`
- Quiz → Engine-owned stylesheet when migrated
- Memory → Engine-owned stylesheet when migrated
- Puzzle → Engine-owned stylesheet when migrated

## Safety rule

A change to one owned stylesheet must never require rewriting or replacing another screen's stylesheet. This is the primary protection against the regression where Activity CSS replaced the approved Grade/Subject/Chapter UI.
