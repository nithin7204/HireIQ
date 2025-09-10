/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'professional': {
          // Ultra-subtle warm whites with premium feel
          50: '#fefefe',    // Pure white with microscopic warm tint
          100: '#fdfdfd',   // Extremely subtle warm white
          200: '#fafafa',   // Very light warm gray
          300: '#f5f5f5',   // Light warm gray
          400: '#e8e8e8',   // Subtle warm gray for borders
        },
        'accent': {
          // Professional blue-indigo gradients
          50: '#f0f4ff',
          100: '#e0edff',
          500: '#4f46e5',
          600: '#4338ca',
          700: '#3730a3',
        },
        'surface': {
          // Premium surface colors
          white: '#ffffff',
          cream: '#fefcfb',
          pearl: '#fbfaf9',
          mist: '#f8f7f6',
        }
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
        'premium': '0 4px 25px -2px rgba(0, 0, 0, 0.06), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
        'elevated': '0 8px 40px -4px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.04)',
      },
      backdropBlur: {
        'xs': '2px',
        'premium': '24px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}