/**
 * FINOTAUR Design System — spacing plugin
 * --------------------------------------------------------------
 * Adds px-based spacing utilities under the `ds-N` namespace so
 * Tailwind defaults (`p-4` = 1rem) stay untouched while DS-strict
 * code can use `p-ds-5` (24px) per spec.
 *
 * Reference: DESIGN_SYSTEM.md §3 (8px grid)
 *
 * Generated utilities (per scale value 1..9):
 *   p-ds-N, px-ds-N, py-ds-N, pt-ds-N, pr-ds-N, pb-ds-N, pl-ds-N
 *   m-ds-N, mx-ds-N, my-ds-N, mt-ds-N, mr-ds-N, mb-ds-N, ml-ds-N
 *   gap-ds-N, gap-x-ds-N, gap-y-ds-N
 *   w-ds-N, h-ds-N, size-ds-N
 *   top-ds-N, right-ds-N, bottom-ds-N, left-ds-N
 *   inset-ds-N, inset-x-ds-N, inset-y-ds-N
 *   space-x-ds-N, space-y-ds-N (sibling margins via child selector,
 *   same selector as Tailwind core space-x/y; no -reverse variant)
 */

const plugin = require('tailwindcss/plugin');

const SCALE = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '24px',
  6: '32px',
  7: '48px',
  8: '64px',
  9: '96px',
};

module.exports = plugin(function ({ matchUtilities }) {
  matchUtilities(
    {
      'p-ds': (v) => ({ padding: v }),
      'px-ds': (v) => ({ paddingInlineStart: v, paddingInlineEnd: v }),
      'py-ds': (v) => ({ paddingTop: v, paddingBottom: v }),
      'pt-ds': (v) => ({ paddingTop: v }),
      'pr-ds': (v) => ({ paddingRight: v }),
      'pb-ds': (v) => ({ paddingBottom: v }),
      'pl-ds': (v) => ({ paddingLeft: v }),
      'm-ds': (v) => ({ margin: v }),
      'mx-ds': (v) => ({ marginInlineStart: v, marginInlineEnd: v }),
      'my-ds': (v) => ({ marginTop: v, marginBottom: v }),
      'mt-ds': (v) => ({ marginTop: v }),
      'mr-ds': (v) => ({ marginRight: v }),
      'mb-ds': (v) => ({ marginBottom: v }),
      'ml-ds': (v) => ({ marginLeft: v }),
      'gap-ds': (v) => ({ gap: v }),
      'gap-x-ds': (v) => ({ columnGap: v }),
      'gap-y-ds': (v) => ({ rowGap: v }),
      'space-x-ds': (v) => ({
        '& > :not([hidden]) ~ :not([hidden])': { marginLeft: v },
      }),
      'space-y-ds': (v) => ({
        '& > :not([hidden]) ~ :not([hidden])': { marginTop: v },
      }),
      'w-ds': (v) => ({ width: v }),
      'h-ds': (v) => ({ height: v }),
      'size-ds': (v) => ({ width: v, height: v }),
      'top-ds': (v) => ({ top: v }),
      'right-ds': (v) => ({ right: v }),
      'bottom-ds': (v) => ({ bottom: v }),
      'left-ds': (v) => ({ left: v }),
      'inset-ds': (v) => ({ inset: v }),
      'inset-x-ds': (v) => ({ left: v, right: v }),
      'inset-y-ds': (v) => ({ top: v, bottom: v }),
    },
    { values: SCALE },
  );
});
