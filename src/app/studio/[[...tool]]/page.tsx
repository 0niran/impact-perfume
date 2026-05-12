export { metadata, viewport } from 'next-sanity/studio'
export const dynamic = 'force-dynamic'

import StudioClient from './StudioClient'

export default function StudioPage() {
  return <StudioClient />
}
