import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        graphite: {
          DEFAULT: 'hsl(var(--graphite))',
          muted: 'hsl(var(--graphite-muted))',
        },
        surface: {
          muted: 'hsl(var(--surface-muted))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        urgency: 'hsl(var(--urgency))',
        success: 'hsl(var(--success))',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        'ui-xs': ['0.75rem', { lineHeight: '1.35' }], /* 12px */
        'ui-sm': ['0.875rem', { lineHeight: '1.45' }], /* 14px */
        'heading-sm': ['1.5rem', { lineHeight: '1.25', fontWeight: '700' }], /* 24px */
        'heading': ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }], /* 28px */
        'heading-lg': ['2rem', { lineHeight: '1.15', fontWeight: '700' }], /* 32px */
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        card: 'var(--radius-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      spacing: {
        section: 'var(--space-section)',
        'section-lg': 'var(--space-section-lg)',
        card: 'var(--space-card)',
        'card-lg': 'var(--space-card-lg)',
      },
    },
  },
  plugins: [],
};

export default config;
