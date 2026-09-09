// postcss.config.js
export default {
  plugins: {
    // ─── Tailwind CSS ────────────────────────────────────────────
    // Process Tailwind directives and generate utility classes
    tailwindcss: {},
    
    // ─── Autoprefixer ────────────────────────────────────────────
    // Add vendor prefixes for cross-browser compatibility
    autoprefixer: {
      flexbox: 'no-2009',
      grid: 'autoplace',
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'not dead',
        'not op_mini all',
        'not ie 11',
      ],
    },
    
    // ─── CSSNano (Production Only) ──────────────────────────────
    // Minify and optimize CSS in production
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: [
          'default',
          {
            // Discard comments (but keep important ones)
            discardComments: {
              removeAll: true,
            },
            // Optimize z-index values
            zindex: false,
            // Reduce calc() usage
            reduceCalc: true,
            // Normalize display values
            normalizeDisplay: true,
            // Normalize positions
            normalizePositions: true,
            // Normalize repeat values
            normalizeRepeat: true,
            // Normalize string values
            normalizeString: true,
            // Normalize timing functions
            normalizeTimingFunctions: true,
            // Normalize unicode
            normalizeUnicode: true,
            // Normalize URL quotes
            normalizeUrl: true,
            // Normalize whitespace
            normalizeWhitespace: true,
            // Order values
            orderValues: true,
            // Reduce background position
            reduceBackgroundRepeat: true,
            // Reduce display values
            reduceDisplayValues: true,
            // Reduce initial values
            reduceInitial: true,
            // Reduce position values
            reducePositions: true,
            // Reduce repeat values
            reduceRepeat: true,
            // Reduce timing functions
            reduceTimingFunctions: true,
            // Merge adjacent rules
            mergeAdjacentRules: true,
            // Merge at-rules
            mergeAtRules: true,
            // Merge longhand shorthand
            mergeLonghand: true,
            // Merge rules
            mergeRules: true,
            // Minify font family values
            minifyFontFamily: true,
            // Minify function values
            minifyFunctionValues: true,
            // Minify gradient values
            minifyGradient: true,
            // Minify parameters
            minifyParams: true,
            // Minify selectors
            minifySelectors: true,
            // Normalize decls
            normalizeDecls: true,
            // Reduce calc
            reduceCalc: true,
            // Reduce transform
            reduceTransforms: true,
            // Unique selectors
            uniqueSelectors: true,
            // Colormin
            colormin: true,
            // Convert values
            convertValues: true,
            // Core
            core: true,
            // Discard duplicates
            discardDuplicates: true,
            // Discard empty
            discardEmpty: true,
            // Discard overridden
            discardOverridden: true,
            // Merge longhand
            mergeLonghand: true,
            // Reduce font
            reduceFont: true,
          },
        ],
      },
    }),
  },
};