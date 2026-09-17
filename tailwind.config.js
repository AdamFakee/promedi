/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')
const { colors, fontFamily, themeRefs, themeVars } = require('./src/shared/theme/design-tokens')

const refs = themeRefs()

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      fontFamily,
      spacing: refs.spacing,
      fontSize: refs.fontSize,
      borderRadius: refs.borderRadius,
      borderWidth: refs.borderWidth,
      minHeight: {
        touch: refs.spacing.touch,
        field: refs.spacing.field,
        cta: refs.spacing['4xl'],
      },
      minWidth: { touch: refs.spacing.touch },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': themeVars(1) })
    }),
  ],
}
