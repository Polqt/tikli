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
