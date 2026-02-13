/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: "hsl(var(--card))",
                accent: "hsl(var(--accent))",
                border: "hsl(var(--border))",
            },
            fontFamily: {
                display: ["'Bebas Neue'", "cursive"],
                sans: ["'Space Grotesk'", "sans-serif"],
            },
        },
    },
    plugins: [],
}
