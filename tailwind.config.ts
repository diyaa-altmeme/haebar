import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        sand: "#f6f0e5",
        ink: "#101828",
        olive: "#2d5a46",
        coral: "#d96f4a",
        gold: "#c68b2f",
        mist: "#e7eef4",
        slate: "#4b5565"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(16, 24, 40, 0.08)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top right, rgba(198,139,47,0.18), transparent 32%), radial-gradient(circle at bottom left, rgba(45,90,70,0.18), transparent 28%)"
      }
    }
  },
  plugins: [animate]
};

export default config;
