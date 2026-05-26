import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* ── Primary accent (new: #5bb880, was #10b981) ── */
        primary: {
          50:  '#f0faf4',
          100: '#d9f2e4',
          200: '#b3e5c9',
          300: '#88d4a9',
          400: '#6cc792',
          500: '#5bb880',  /* --accent */
          600: '#4ea16f',  /* --accent-active */
          700: '#3e8559',
          800: '#2c5d44',  /* --accent-soft */
          900: '#1a3d2d',
        },
        secondary: {
          50:  '#fff1f2',
          100: '#fce7f3',
          200: '#fbbfcf',
          300: '#f687a8',
          400: '#c2255c',
          500: '#881337',
          600: '#6d0f2e',
          700: '#520a22',
          800: '#3a0718',
          900: '#23040f',
        },
        gray: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        /* ── Design system palette ── */
        unity: {
          /* Dark scale (cabinet backgrounds) */
          'bg0':      '#08120e',
          'bg1':      '#0f1d16',
          'bg2':      '#16271e',
          'bg3':      '#1e3327',
          'bg4':      '#28402f',
          /* Warm dark */
          'warm1':    '#1a120b',
          'warm2':    '#271a10',
          /* Light */
          cream:      '#f4efe7',
          /* Legacy aliases */
          dark:       '#08120e',
          surface:    '#16271e',
          muted:      '#1e3327',
          emerald:    '#2c5d44',
          'emerald-light': '#5bb880',
          mocha:      '#2e1f14',
          'mocha-mid':'#3d2a1a',
          'mocha-accent': '#8b5a3a',
        },
        /* ── Semantic state colors (updated to match design) ── */
        success: '#5bb880',
        warning: '#d6a55c',
        error:   '#d96a6a',
        info:    '#6aa4d9',
      },

      /* ── Fonts ── */
      fontFamily: {
        sans:    ['var(--font-onest)', 'Onest', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-onest)', 'Onest', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-onest)', 'Onest', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['var(--font-onest)', 'Onest', 'Inter', 'system-ui', 'sans-serif'],
        /* Keep serif slot (hero-h1 still uses it in some places) */
        serif:   ['Georgia', 'serif'],
        mono:    ['var(--font-jetbrains)', 'JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem' }],
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':['3rem',     { lineHeight: '1.15' }],
      },

      /* ── Radii (aligned with design: r-5=14px for cards) ── */
      borderRadius: {
        sm:    '6px',   /* --r-2 */
        card:  '14px',  /* --r-5 (was 8px) */
        input: '6px',   /* --r-2 */
        badge: '4px',   /* --r-1 */
        modal: '20px',  /* --r-6 */
        md:    '14px',  /* --r-5 */
        lg:    '20px',  /* --r-6 */
        xl:    '24px',
        full:  '9999px',
      },

      boxShadow: {
        sm:           '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        card:         '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
        md:           '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg:           '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'el-2':       'inset 0 0 0 1px rgba(255,255,255,.10), 0 1px 0 rgba(255,255,255,.04) inset',
        'el-3':       'inset 0 0 0 1px rgba(255,255,255,.10), 0 12px 32px -16px rgba(0,0,0,.6)',
        'glow-accent':'0 0 0 1px rgba(91,184,128,.35), 0 0 24px -4px rgba(91,184,128,.22)',
        'glow-emerald':'0 0 60px rgba(91,184,128,.22)',
        'glow-mocha': '0 0 60px rgba(139,90,58,0.3)',
      },

      letterSpacing: {
        tighter: '-0.04em',
        tight:   '-0.02em',
        snug:    '-0.01em',
        normal:  '0em',
        wide:    '0.04em',
        wider:   '0.08em',
        widest:  '0.10em',
      },

      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%':      { transform: 'rotate(-8deg)' },
          '75%':      { transform: 'rotate(8deg)' },
        },
        'badge-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
      },

      animation: {
        shimmer:      'shimmer 1.5s infinite',
        'slide-up':   'slide-up 0.15s ease-out',
        'slide-down': 'slide-down 0.15s ease-out',
        'fade-in':    'fade-in 0.15s ease-out',
        wiggle:       'wiggle 0.5s ease-in-out',
        'badge-pulse':'badge-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
