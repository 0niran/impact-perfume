import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string;
  /** Amount in smallest currency unit (kobo for NGN, cents for CAD) */
  unitPriceKobo: number;
  /** ISO currency code (uppercase). All lines in a cart must share the same currency. */
  currency: string;
  qty: number;
  thumbnail?: string;
  color?: string;
  /** Product handle (eg. "no-5", "oil-no-12"). Used by the recently-viewed rail. */
  handle?: string;
  /** PDP url. Used by the recently-viewed rail. */
  href?: string;
};

const RECENTLY_VIEWED_KEY = "impact-recently-viewed-v1";
const RECENTLY_VIEWED_MAX = 8;

/**
 * Mirror an add-to-cart event into the recently-viewed rail. Lets the cart
 * drawer's "Recently viewed" section reflect what the user has actually
 * touched even if they added directly from a listing without visiting the PDP.
 */
function pushToRecentlyViewed(line: CartLine): void {
  if (typeof window === "undefined") return;
  if (!line.handle || !line.href) return;
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    const prev: Array<{ handle: string }> = raw ? JSON.parse(raw) : [];
    const without = Array.isArray(prev)
      ? prev.filter((p) => p && p.handle !== line.handle)
      : [];
    const next = [
      {
        handle: line.handle,
        href: line.href,
        title: line.name,
        subtitle: line.variantLabel,
        imageUrl: line.thumbnail,
        signatureColor: line.color,
      },
      ...without,
    ].slice(0, RECENTLY_VIEWED_MAX);
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  /** Add a line. If the new line's currency differs from existing lines, the cart is cleared first. */
  add: (line: CartLine) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      add: (line) =>
        set((state) => {
          pushToRecentlyViewed(line);
          // Guard: mixing currencies isn't supported. Reset to the new line's currency.
          const cartCurrency = state.lines[0]?.currency;
          if (cartCurrency && cartCurrency !== line.currency) {
            return { lines: [line] };
          }
          const existing = state.lines.find(
            (l) => l.variantId === line.variantId
          );
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.variantId === line.variantId
                  ? { ...l, qty: l.qty + line.qty }
                  : l
              ),
            };
          }
          return { lines: [...state.lines, line] };
        }),
      remove: (variantId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.variantId !== variantId),
        })),
      setQty: (variantId, qty) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.variantId === variantId ? { ...l, qty } : l
          ),
        })),
      clear: () => set({ lines: [] }),
      setOpen: (isOpen) => set({ isOpen }),
    }),
    { name: "impact-cart-v2" }
  )
);

export const cartSelectors = {
  subtotalMinor: (state: CartState) =>
    state.lines.reduce((sum, l) => sum + l.unitPriceKobo * l.qty, 0),
  itemCount: (state: CartState) =>
    state.lines.reduce((sum, l) => sum + l.qty, 0),
  currency: (state: CartState) => state.lines[0]?.currency ?? 'NGN',
  /** @deprecated alias for subtotalMinor — kept until callers migrate */
  subtotalKobo: (state: CartState) =>
    state.lines.reduce((sum, l) => sum + l.unitPriceKobo * l.qty, 0),
};
