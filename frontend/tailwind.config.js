/** @type {import('tailwindcss').Config} */
export default { darkMode: 'class', content: ['./index.html', './src/**/*.{tsx,ts}'], theme: { extend: { fontFamily: { sans: ['Inter', 'Manrope', 'ui-sans-serif', 'system-ui'] }, colors: { teal: { 50:'#e8f2f0', 100:'#cbe2de', 400:'#5c9e91', 500:'#347d72', 600:'#26645b', 700:'#1c4f4a' } } } }, plugins: [] };
