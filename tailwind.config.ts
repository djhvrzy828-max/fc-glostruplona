import type { Config } from 'tailwindcss'
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { fcgred: '#a72f23', fcgdark: '#160f0d', fcgcream: '#f0d7aa' } } },
  plugins: []
} satisfies Config
