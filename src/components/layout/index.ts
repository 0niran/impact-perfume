// NOTE: SiteFooter is deliberately NOT re-exported here.
//
// It reads the active region via next/headers, which is server-only. Client
// components across the app import { Container } from this barrel, and a barrel
// pulls in every module it names — so re-exporting SiteFooter drags next/headers
// into those client bundles and fails the build. Import it directly from
// './SiteFooter' (as app/layout.tsx does).
export { default as Container } from './Container'
export { default as Section } from './Section'
export { default as SiteHeader } from './SiteHeader'
export { default as MegaMenu } from './MegaMenu'
export { default as MobileMenuDrawer } from './MobileMenuDrawer'
