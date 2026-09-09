// Only the two primitives that are genuinely shared.
//
// This barrel once also re-exported SiteHeader, MegaMenu and MobileMenuDrawer.
// Nothing imported them through it — every caller imports them directly — but a
// barrel pulls in every module it names, so each of the ~20 pages that imports
// Container was dragging three client components and their dependencies along
// with it.
//
// SiteFooter was excluded here for the sharper version of the same problem: it
// reads the active region through next/headers, which is server-only, and
// re-exporting it pulled next/headers into client bundles and failed the build.
// Keeping this barrel to leaf primitives is what stops that recurring.
export { default as Container } from './Container'
export { default as Section } from './Section'
