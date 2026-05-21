'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

/**
 * Clears the persisted cart on mount. Mounted from /order-confirmed once
 * we have a payment reference — covers the Stripe path (server-side
 * fulfilment redirects here without touching browser state) and as a
 * fail-safe for Paystack (in case the router push fires before the
 * client clearCart() does).
 */
export default function ClearCartOnConfirm() {
  const clear = useCartStore((s) => s.clear)
  useEffect(() => {
    clear()
  }, [clear])
  return null
}
