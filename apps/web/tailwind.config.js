/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
        code: ['JetBrains Mono', 'Space Mono', 'monospace'],
      },
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
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
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
        mono: {
          green: '#37F712',
          blue: '#00A6F4',
          success: '#00A63D',
          warning: '#FE9900',
          danger: '#FF2157',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
        DEFAULT: 'var(--radius)',
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'glow-sm': '0 0 4px rgba(55,247,18,0.25)',
        glow: '0 0 8px rgba(55,247,18,0.35)',
        'glow-lg': '0 0 16px rgba(55,247,18,0.4)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in': {
          from: { transform: 'translate(-50%,-48%) scale(0.97)', opacity: '0' },
          to: { transform: 'translate(-50%,-50%) scale(1)', opacity: '1' },
        },
        'slide-out': {
          from: { transform: 'translate(-50%,-50%) scale(1)', opacity: '1' },
          to: { transform: 'translate(-50%,-48%) scale(0.97)', opacity: '0' },
        },
        'cursor-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'fade-out': 'fade-out 0.15s ease-in',
        'slide-in': 'slide-in 0.2s cubic-bezier(0.16,1,0.3,1)',
        'slide-out': 'slide-out 0.15s ease-in',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
