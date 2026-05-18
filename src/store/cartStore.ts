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
};

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
