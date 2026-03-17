/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      boxShadow: {
        soft: '0 18px 45px rgba(70, 55, 39, 0.10)',
        float: '0 28px 60px rgba(70, 55, 39, 0.14)',
      },
      fontFamily: {
        sans: ['"Trebuchet MS"', '"Segoe UI"', 'sans-serif'],
      },
      backgroundImage: {
        'hero-wash':
          'radial-gradient(circle at top left, rgba(240, 150, 82, 0.28), transparent 28%), radial-gradient(circle at right 20%, rgba(74, 122, 94, 0.18), transparent 28%), linear-gradient(145deg, rgba(252,248,240,0.98), rgba(244,235,221,0.95))',
      },
    },
  },
  plugins: [],
}
