/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                royal: {
                    primary: '#102213', // background-dark
                    secondary: '#2bee4b', // neon green
                    accent: '#2bee4b',
                    card: '#1a331d', // card-dark
                    ink: '#ffffff',
                    shelf: '#16241a',
                    wood: '#101c13',
                }
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
