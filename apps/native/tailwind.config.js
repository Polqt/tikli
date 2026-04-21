/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#242424",
        cream: "#fffaf5",
        cloud: "#f4efe8",
        coral: "#E0533D",
        lavender: "#9DA7D0",
        teal: "#469B88",
        blue: "#377CC8",
        yellow: "#EED868",
        pink: "#E78C9D",
        primary: {
          DEFAULT: "#1d9e75",
          50: "#f0fdf8",
          100: "#ccfbee",
          200: "#9af5dd",
          300: "#5feac6",
          400: "#2dd4aa",
          500: "#1d9e75",
          600: "#0f7d5c",
          700: "#0e6349",
          800: "#104f3b",
          900: "#104231",
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
