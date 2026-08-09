# Glass System

Two variants, both from the `Glass` component.

## chrome
Window furniture: sidebar, header, dialog, popover, toast.
Heavy blur (`--glass-blur-chrome`, 64px). Strong presence.

## surface
Content cards: `Card`, `DashboardCard`, `Panel`.
Lighter blur (`--glass-blur`, 20px) so body text stays crisp over the aurora.

Content cards on glass are permitted. This reverses the earlier prohibition.

## Contrast
Text over glass must meet WCAG AA (4.5:1) in both themes, composited over the
page background. Enforced automatically by `packages/ui/src/styles/tokens.test.ts`
— that test is the gate, not a reviewer's judgement.

## Fallback
Where `backdrop-filter` is unsupported, both variants fall back to a solid
`--color-surface`.
