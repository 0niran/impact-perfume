import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string;
  unitPriceKobo: number;
  qty: number;
  thumbnail?: string;
  color?: string;
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
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
    { name: "impact-cart-v1" }
  )
);

export const cartSelectors = {
  subtotalKobo: (state: CartState) =>
    state.lines.reduce((sum, l) => sum + l.unitPriceKobo * l.qty, 0),
  itemCount: (state: CartState) =>
    state.lines.reduce((sum, l) => sum + l.qty, 0),
};
