/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F9FC",
        ink: "#121417",
        inkmuted: "#6B7280",
        line: "#E5E9F0",
        brand: { DEFAULT: "#2E6EF7", dark: "#1E54C8", soft: "#EAF1FE" },
        teal: { DEFAULT: "#0E9F6E", soft: "#E6F6F0" },
        danger: "#D33F2E"
      },
      fontFamily: {
        display: ["Lexend", "sans-serif"],
        body: ["Roboto", "system-ui", "sans-serif"]
      },
      borderRadius: { card: "10px" }
    }
  },
  plugins: []
};
