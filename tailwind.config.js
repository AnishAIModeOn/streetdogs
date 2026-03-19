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
        soft: '0 18px 45px rgba(85, 98, 77, 0.10)',
        float: '0 28px 60px rgba(85, 98, 77, 0.15)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', '"Segoe UI"', 'sans-serif'],
      },
      backgroundImage: {
        'hero-wash':
          'radial-gradient(circle at top left, rgba(245,157,82,0.26), transparent 28%), radial-gradient(circle at right 18%, rgba(110,162,128,0.18), transparent 26%), linear-gradient(148deg, rgba(253,251,245,0.99), rgba(245,248,240,0.98) 48%, rgba(240,247,243,0.97))',
      },
    },
  },
  plugins: [],
}
