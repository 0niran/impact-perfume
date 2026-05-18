import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bone: "#F2E6C8",      // warm champagne cream — text on dark, light surfaces
        ink: "#0A0A08",       // true black — primary background
        accent: "#E4B250",    // vivid amber-gold — CTAs, highlights, interactive
        gold: "#E8D5A3",      // light champagne gold — decorative borders, watermarks
        cream: "#F5EFDF",     // warm editorial cream — light panels, InfoRail, checkout
        stone: "#8A7A60",     // muted gold-stone — secondary text on dark
        mist: "#1D1B16",      // dark warm surface — section alternation against ink
        slate: "#5C4E38",     // warm dark — body text, subdued elements
        success: "#2E5D3A",
        error: "#8B2E2E",
        no: {
          1: "#1FA84F",  2: "#A8137C",  3: "#C18A1F",  4: "#C9281D",
          5: "#1E64A4",  6: "#A8B125",  7: "#C81273",  8: "#0E5F58",
          9: "#1240A6", 10: "#C71285", 11: "#1D2B9C", 12: "#A0157E",
         13: "#A98917", 14: "#1E78B8", 15: "#A1147F", 16: "#0E78B8",
         17: "#85801C", 18: "#5C29A0", 19: "#1A4DC4", 20: "#A11AB1",
         21: "#B41349", 22: "#0E3DA8", 23: "#7414B0", 24: "#9C9412",
         25: "#0F7E7E", 26: "#B91268", 27: "#C25719", 28: "#0F8F3E",
         29: "#7E2EB4", 30: "#19A0BE", 31: "#1928B8", 32: "#B414A8",
         33: "#669C13", 34: "#B41454", 35: "#C0671A", 36: "#5022C4",
         37: "#0DA227", 38: "#C72020", 39: "#B91261", 40: "#2123A8",
         41: "#A91239", 42: "#B58818", 43: "#1F9F7F", 44: "#B6178D",
         45: "#C72124", 46: "#19BB22", 47: "#B919AE", 48: "#1F2BA8",
         49: "#C8541E", 50: "#1A87C6",
        },
      },
      fontFamily: {
        brand: ["var(--font-brand)", "Kaushan Script", "cursive"],
        // Kaushan Script is now the dominant display font
        display: ["var(--font-brand)", "Kaushan Script", "cursive"],
        // Cormorant Garamond available via font-serif for editorial use
        serif: ["var(--font-display)", "Cormorant Garamond", "serif"],
        sans: ["var(--font-sans)", "Manrope", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["80px", { lineHeight: "88px", letterSpacing: "-0.01em" }],
        "display-l": ["56px", { lineHeight: "64px", letterSpacing: "-0.01em" }],
        "display-s": ["36px", { lineHeight: "44px", letterSpacing: "-0.01em" }],
        h1: ["40px", { lineHeight: "48px" }],
        h2: ["28px", { lineHeight: "36px" }],
        h3: ["22px", { lineHeight: "30px" }],
        "body-l": ["18px", { lineHeight: "28px" }],
        body: ["16px", { lineHeight: "26px" }],
        small: ["14px", { lineHeight: "22px" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.08em" }],
      },
      spacing: {
        "section-y": "96px",
        "section-y-mobile": "48px",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
      },
      transitionTimingFunction: {
        "soft": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      maxWidth: {
        container: "1280px",
        prose: "680px",
      },
    },
  },
  plugins: [],
};

export default config;
