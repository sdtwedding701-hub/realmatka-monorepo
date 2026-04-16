import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { brand: {50:"#f3f7ff",100:"#e6efff",200:"#c4d8ff",300:"#9dbbff",400:"#6b95ff",500:"#3b6aff",600:"#274fe0",700:"#1f3eb3",800:"#1a358e",900:"#172e74"} },
      boxShadow: { soft: "0 8px 30px rgba(0,0,0,0.08)" }, borderRadius: { '2xl': '1.25rem' }
    },
  },
  plugins: [],
};
export default config;
