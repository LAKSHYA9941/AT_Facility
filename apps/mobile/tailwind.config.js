module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#1B4F8A", // navy blue — buttons, links, logo
          secondary: "#2563A8", // slightly lighter navy
          bg: "#EEF2F7", // outer screen background
          card: "#FFFFFF", // card white
          input: "#F4F6F9", // input field bg
          border: "#DDE3ED", // input border
          text: "#111827", // primary text
          sub: "#6B7280", // subtitle/placeholder
          link: "#1B4F8A", // forgot password, sign up
          divider: "#D1D9E6", // OR divider line
        },
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        medium: ["PlusJakartaSans_500Medium"],
        semibold: ["PlusJakartaSans_600SemiBold"],
        bold: ["PlusJakartaSans_700Bold"],
      },
    },
  },
  plugins: [],
};
