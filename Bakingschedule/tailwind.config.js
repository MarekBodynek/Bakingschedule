/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Kolory dla wave indicators
    'bg-green-50', 'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500', 'bg-green-600',
    'bg-blue-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600',
    'bg-orange-50', 'bg-orange-100', 'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-orange-500', 'bg-orange-600',
    'bg-yellow-50', 'bg-yellow-100', 'bg-yellow-200', 'bg-yellow-300', 'bg-yellow-400',
    'bg-red-50', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500',
    'border-green-200', 'border-green-300', 'border-green-400', 'border-green-500',
    'border-blue-200', 'border-blue-300', 'border-blue-400', 'border-blue-500',
    'border-orange-200', 'border-orange-300', 'border-orange-400', 'border-orange-500',
    'border-yellow-200', 'border-yellow-400',
    'border-red-200', 'border-red-400',
    'text-green-600', 'text-green-700', 'text-green-800',
    'text-blue-600', 'text-blue-700', 'text-blue-800',
    'text-orange-600', 'text-orange-700', 'text-orange-800',
    'text-yellow-600', 'text-yellow-800',
    'text-red-600', 'text-red-800',
  ]
}
