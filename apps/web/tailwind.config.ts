import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontSize: {
  			'page-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],
  			'section-title': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
  		},
  		fontFamily: {
  			sans: ['"Google Sans"', 'var(--font-roboto)', '"Roboto"', 'Arial', 'sans-serif'],
  			heading: ['"Google Sans"', 'var(--font-roboto)', '"Roboto"', 'Arial', 'sans-serif'],
  		},
  		colors: {
  			background: 'var(--bg-base)',
  			foreground: 'var(--text-primary)',
  			card: {
  				DEFAULT: 'var(--bg-elevated)',
  				foreground: 'var(--text-primary)'
  			},
  			popover: {
  				DEFAULT: 'var(--bg-elevated)',
  				foreground: 'var(--text-primary)'
  			},
  			primary: {
  				DEFAULT: 'var(--accent-primary)',
  				foreground: 'white'
  			},
  			secondary: {
  				DEFAULT: 'var(--accent-secondary)',
  				foreground: 'white'
  			},
  			muted: {
  				DEFAULT: 'var(--bg-subtle)',
  				foreground: 'var(--text-muted)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent-primary)',
  				foreground: 'white'
  			},
  			destructive: {
  				DEFAULT: 'var(--status-danger-text)',
  				foreground: 'white'
  			},
  			border: 'var(--border-default)',
  			input: 'var(--color-bg-input)',
  			ring: 'var(--accent-primary)',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
        brand: {
          primary: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          accent: 'var(--color-accent)',
        },
        surface: 'var(--color-bg-surface)',
        input: 'var(--color-bg-input)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'premium-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'premium-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
  	}
  },
  plugins: [],
};
export default config;
