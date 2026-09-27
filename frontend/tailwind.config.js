/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep teal brand primary — ramp anchored on the mockup's M3
        // tokens: 600 = primary (#005f50), 500 = primary-container,
        // 700 = on-primary-fixed-variant, 200/300 = the light
        // primary-container/primary-fixed-dim tints used on dark heroes.
        primary: {
          50: '#eafbf6',
          100: '#d3f5ea',
          200: '#aaffe9',
          300: '#7cd7c1',
          400: '#3fb69c',
          500: '#0d7a68',
          600: '#005f50',
          700: '#005144',
          800: '#003d33',
          900: '#00201a',
        },
        // Steel-blue secondary brand color (new — the mockups use a
        // distinct blue for secondary CTAs/badges alongside the teal
        // primary and amber accent).
        secondary: {
          50: '#eef7ff',
          100: '#cee5ff',
          200: '#97cbff',
          300: '#8ec6fd',
          400: '#4a8cc2',
          500: '#216293',
          600: '#1b5480',
          700: '#004a77',
          800: '#023a5e',
          900: '#001d33',
        },
        // Amber/tertiary accent — repurposed from the old coral scale to
        // the mockups' tertiary role (badges, highlights, star ratings,
        // emphasis CTAs).
        accent: {
          50: '#fff4ea',
          100: '#ffe8d1',
          200: '#ffdcc3',
          300: '#ffb77d',
          400: '#e08a3f',
          500: '#a55800',
          600: '#814400',
          700: '#6e3900',
          800: '#522b00',
          900: '#2f1500',
        },
        // Cool navy-gray neutral scale (was warm gray) — anchored on the
        // mockups' on-surface (#141c28) / outline (#6e7a75) / background
        // (#f9f9ff) so every existing neutral-* usage site-wide re-themes
        // automatically.
        neutral: {
          50: '#f9f9ff',
          100: '#f0f3ff',
          200: '#e7eeff',
          300: '#dbe3f4',
          400: '#bdc9c4',
          500: '#6e7a75',
          600: '#3e4946',
          700: '#29313e',
          800: '#1c232e',
          900: '#141c28',
        },
        // Exact M3 surface vocabulary — additive-only, used by hand-built
        // sections that need precise layered-card depth beyond what the
        // neutral-* ramp expresses.
        surface: '#f9f9ff',
        'surface-container': '#e7eeff',
        'surface-container-low': '#f0f3ff',
        'surface-container-high': '#e1e8fa',
        'surface-container-highest': '#dbe3f4',
        'on-surface': '#141c28',
        'on-surface-variant': '#3e4946',
        outline: '#6e7a75',
        'outline-variant': '#bdc9c4',
        'inverse-surface': '#29313e',
        'inverse-on-surface': '#ebf1ff',
      },
      fontFamily: {
        // Plus Jakarta Sans now carries body/label text (was the heading
        // font); Outfit is new and carries display/headline text.
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Named type scale from the mockups — additive, existing
        // text-3xl/4xl/etc. utilities keep working unchanged.
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '700' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'body-md': ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'price-display': ['24px', { lineHeight: '28px', fontWeight: '700' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'headline-md': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'headline-lg': ['30px', { lineHeight: '38px', fontWeight: '500' }],
        'headline-xl-mobile': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'display-hero-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-hero': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'space-2xl': '4rem',
        'space-3xl': '6rem',
        gutter: '1.5rem',
        'gutter-mobile': '1rem',
        margin: '3rem',
        'margin-mobile': '1.25rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(20, 28, 40, 0.08)',
        'card-hover': '0 12px 28px rgba(20, 28, 40, 0.16)',
      },
      borderRadius: {
        '3xl': '1.75rem',
      },
      keyframes: {
        'ken-burns': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
      },
      animation: {
        // Slow background zoom for hero slides — ~5s so it's visible
        // across a typical slide duration without looking jittery.
        'ken-burns': 'ken-burns 6s ease-out forwards',
      },
    },
  },
  plugins: [],
}
