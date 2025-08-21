/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{html,js,jsx,ts,tsx}', // Tell Tailwind where to look for your files
    ],
    darkMode: 'class', // Enables dark mode (class strategy)
    theme: {
        extend: {
            colors: {
                // Custom colors for light mode buttons
                primary: '#333333',   // Blue button background
                secondary: '#9333EA', // Purple button background
                lightButtonText: '#FFFFFF', // Light button text color
                lightButtonHoverBg: '#2563EB', // Hover state for blue button
                lightButtonHoverText: '#E0E0E0', // Hover text color for light button
                specsecbutton: '#FC9215',

                // Custom dark mode colors (only if you re-enable dark mode in the future)
                darkButtonBg: '#333333',     // Dark mode button background
                darkButtonText: '#FFFFFF',   // Dark mode button text color
                darkButtonHoverBg: '#444444', // Dark mode button hover background
                darkButtonHoverText: '#CCCCCC', // Dark mode button hover text color
            },
            // The 'keyframes' and 'animation' blocks should be REMOVED from here
        },
    },
    plugins: [],
};