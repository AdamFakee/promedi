/**
 * src/shared/theme/design-tokens.ts
 * ---------------------------------------------------------------
 * Nguồn token duy nhất cho ProMedi.
 * Colors, Shadows, Spacing, FontSize, Border, LineHeight.
 * ---------------------------------------------------------------
 */

export const colors = {
  primary: {
    DEFAULT: '#9B0000',
    default: '#9B0000',
    on: '#FFFFFF',
    fixed: '#FFE8E8',
    bright: '#B80000',
    deep: '#6E0000',
    press: '#7A0000',
  },
  yellow: {
    DEFAULT: '#FFDD00',
    default: '#FFDD00',
    on: '#9B0000',
    soft: '#FFF7CC',
    deep: '#E0BE00',
  },
  text: {
    primary: {
      red: '#9B0000',
      black: '#000000',
      white: '#FFFFFF',
    },
    secondary: '#707070',
    disabled: '#A3A3A3',
  },
  background: {
    white: '#FFFFFF',
    secondary: '#D9D9D9',
    overlay: 'rgba(0, 0, 0, 0.5)',
    scrim: 'rgba(0, 0, 0, 0.72)',
    headerGradient: {
      start: '#FFD848',
      end: '#FDAC41',
    },
    primaryGradient: {
      start: '#FFE149',
      end: '#F72B2B',
    },
  },
  surface: {
    50: '#FFFFFF',
    100: '#F5F5F5',
    200: '#EDEDED',
    300: '#D9D9D9',
    on: '#0F0F0F',
    'on-variant': '#464555',
    onVariant: '#464555',
  },
  outline: {
    DEFAULT: '#DFE0E1',
    default: '#DFE0E1',
    variant: '#E5E7EB',
    strong: '#A3A3A3',
  },
  success: {
    DEFAULT: '#00944A',
    default: '#00944A',
    container: '#ECFDF3',
    on: '#FFFFFF',
  },
  error: {
    DEFAULT: '#DD2027',
    default: '#DD2027',
    container: '#FEF3F2',
    on: '#FFFFFF',
  },
  warning: {
    DEFAULT: '#FB6514',
    default: '#FB6514',
    container: '#FFF4F2',
    on: '#FFFFFF',
  },
  info: {
    DEFAULT: '#2F6BFF',
    default: '#2F6BFF',
    container: '#DBEAFE',
    on: '#FFFFFF',
  },
  reading: {
    normal: '#00944A',
    normalBg: '#ECFDF3',
    caution: '#FB6514',
    cautionBg: '#FFF4F2',
    high: '#DD2027',
    highBg: '#FEF3F2',
    low: '#2F6BFF',
    lowBg: '#DBEAFE',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#5B5B5C',
    800: '#262626',
    900: '#0F0F0F',
  },
  gradient: {
    brand: ['#FFD848', '#FDAC41'] as const,
  },
  secondary: '#707070',
  muted: '#707070',
}

export const shadows = {
  bottom: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  up: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 20,
  },
} as const

export const fontFamily = {
  sans: ['BeVietnamPro_400Regular'],
  extralight: ['BeVietnamPro_200ExtraLight'],
  light: ['BeVietnamPro_300Light'],
  regular: ['BeVietnamPro_400Regular'],
  medium: ['BeVietnamPro_500Medium'],
  semibold: ['BeVietnamPro_600SemiBold'],
  bold: ['BeVietnamPro_700Bold'],
}

/* ====================== TOKEN GỐC (dp, K = 1) ====================== */
export const BASE = {
  spacing: {
    none: 0,
    xxs: 2,
    xs: 5,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
    '4xl': 64,
    header: 64,
    screen: 20,
    touch: 54,
    field: 48,
    gutter: 16,
  },
  fontSize: {
    note: [12, 1.5, 'BeVietnamPro_400Regular'],
    'note-3': [12, 1.5, 'BeVietnamPro_400Regular'],
    note1: [15, 1.5, 'BeVietnamPro_400Regular'],
    'note-1': [15, 1.5, 'BeVietnamPro_400Regular'],
    body: [16, 1.55, 'BeVietnamPro_400Regular'],
    blogContent: [16, 1.65, 'BeVietnamPro_400Regular'],
    button: [18, 1.2, 'BeVietnamPro_500Medium'],
    medium: [18, 1.4, 'BeVietnamPro_500Medium'],
    shortDesc: [18, 1.55, 'BeVietnamPro_400Regular'],
    mainContent: [20, 1.55, 'BeVietnamPro_400Regular'],
    sectionTitle: [24, 1.3, 'BeVietnamPro_700Bold'],
    screenName: [28, 1.25, 'BeVietnamPro_600SemiBold'],
    pageTitle: [30, 1.2, 'BeVietnamPro_600SemiBold'],
    metric: [34, 1.1, 'BeVietnamPro_700Bold'],
  } as Record<string, [number, number, string]>,
  attractFontSize: {
    display: [52, 1.15, 'BeVietnamPro_700Bold'],
    displaySub: [20, 1.4, 'BeVietnamPro_400Regular'],
  } as Record<string, [number, number, string]>,
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    input: 12,
    button: 12,
    'card-xs': 6,
    'card-sm': 10,
    'card-md': 12,
    'card-lg': 16,
    pill: 999,
  },
  borderWidth: { 0: 0, DEFAULT: 1, hairline: 1, 2: 2, thick: 3, accent: 6 },
}

export const VAR = {
  sp: (k: string) => `--sp-${k}`,
  fs: (k: string) => `--fs-${k}`,
  lh: (k: string) => `--lh-${k}`,
  r: (k: string) => `--r-${k}`,
  bw: (k: string) => `--bw-${k}`,
}

const px = (n: number) => `${Math.round(n)}px`

export function themeRefs() {
  const spacing: Record<string, string> = {}
  for (const key of Object.keys(BASE.spacing)) spacing[key] = `var(${VAR.sp(key)})`

  const fontSize: Record<string, [string, { lineHeight: string; fontFamily: string }]> = {}
  const allFonts = { ...BASE.fontSize, ...BASE.attractFontSize }
  for (const [key, [, , family]] of Object.entries(allFonts)) {
    fontSize[key] = [
      `var(${VAR.fs(key)})`,
      { lineHeight: `var(${VAR.lh(key)})`, fontFamily: family },
    ]
  }

  const borderRadius: Record<string, string> = {}
  for (const key of Object.keys(BASE.borderRadius)) borderRadius[key] = `var(${VAR.r(key)})`

  const borderWidth: Record<string, string> = {}
  for (const key of Object.keys(BASE.borderWidth)) borderWidth[key] = `var(${VAR.bw(key)})`

  return { spacing, fontSize, borderRadius, borderWidth }
}

export function themeVars(k = 1, kAttract = k): Record<string, string> {
  const out: Record<string, string> = {}

  for (const [key, val] of Object.entries(BASE.spacing)) {
    out[VAR.sp(key)] = val === 0 ? '0px' : px(val * k)
  }

  for (const [key, [size, lh]] of Object.entries(BASE.fontSize)) {
    out[VAR.fs(key)] = px(size * k)
    out[VAR.lh(key)] = px(size * lh * k)
  }
  for (const [key, [size, lh]] of Object.entries(BASE.attractFontSize)) {
    out[VAR.fs(key)] = px(size * kAttract)
    out[VAR.lh(key)] = px(size * lh * kAttract)
  }

  for (const [key, val] of Object.entries(BASE.borderRadius)) {
    out[VAR.r(key)] = val >= 999 ? '999px' : val === 0 ? '0px' : px(val * k)
  }

  for (const [key, val] of Object.entries(BASE.borderWidth)) {
    out[VAR.bw(key)] = val === 0 ? '0px' : val === 1 ? '1px' : px(val * k)
  }

  return out
}
