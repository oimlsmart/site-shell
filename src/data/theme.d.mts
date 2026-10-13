/**
 * The typed surface of theme.mjs (the plain-.mjs leaf for non-bundler
 * consumers — see theme.mjs's header). Strict TypeScript consumers
 * (identity's gates walk the package source) resolve this declaration
 * instead of falling to implicit any.
 */
declare const THEME_STORAGE_KEY: 'oiml-theme'
declare const THEME_CLASS: 'dark'

export { THEME_STORAGE_KEY, THEME_CLASS }
