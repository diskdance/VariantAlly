import { isLoggedIn } from './utils';

const LOCAL_VARIANT_KEY = 'va-var';
const OPTOUT_KEY = 'va-output';
const VALID_VARIANTS = [
  'zh-cn',
  'zh-sg',
  'zh-my',
  'zh-tw',
  'zh-hk',
  'zh-mo',
];
// Additional variants which are not recommended but recognized by MediaWiki
// Remember to convert lang codes to lowercase before comparing with this
const VALID_VARIANTS_BCP47 = [
  'zh-hans-cn',
  'zh-hans-sg',
  'zh-hans-my',
  'zh-hant-tw',
  'zh-hant-hk',
  'zh-hant-mo',
];

/**
 * Get current variant of the page (don't be misled by config naming).
 * @returns variant, null for non-wikitext page
 */
function getPageVariant(): string | null {
  return mw.config.get('wgUserVariant');
}

/**
 * Get account variant.
 * @returns account variant, null for anonymous user
 */
function getAccountVariant(): string | null {
  if (isLoggedIn()) {
    return mw.user.options.get('variant');
  }
  return null;
}

function getLocalVariant(): string | null {
  const browserVariant = getBrowserVariant();
  const localVariant = localStorage.getItem(LOCAL_VARIANT_KEY);
  if (browserVariant !== null && browserVariant !== localVariant) {
    // Sync local variant with browser variant
    setLocalVariant(browserVariant);
    // Return synced local variant (browser variant here)
    return browserVariant;
  }
  return localVariant;
}

/**
 * Return browser variant if it's valid.
 * @returns browser variant
 */
function getBrowserVariant(): string | null {
  return navigator.languages
    .map((lang) => lang.toLowerCase())
    // FIXME: Use spread syntax once default gadget supports ES6
    .find((lang) => VALID_VARIANTS.includes(lang) || VALID_VARIANTS_BCP47.includes(lang))
    ?? null;
}

/**
 * Get the "natural" variant inferred by MediaWiki when the link doesn't specify a variant.
 *
 * Used in link normalization.
 *
 * Only return valid variants, null otherwise.
 *
 * @returns variant
 */
function getMediaWikiVariant(): string | null {
  return getAccountVariant() ?? getBrowserVariant();
}

/**
 * Calculate preferred variant from browser variant, local variant and account variant.
 *
 * Priority: account variant > local variant > browser variant
 *
 * @returns preferred variant
 */
function calculatePreferredVariant(): string | null {
  return getAccountVariant() ?? getLocalVariant() ?? getBrowserVariant();
}

function setLocalVariant(variant: string): void {
  if (VALID_VARIANTS.includes(variant)) {
    localStorage.setItem(LOCAL_VARIANT_KEY, variant);
  }
}

function setOptOut(): void {
  localStorage.setItem(OPTOUT_KEY, '');
}

function isOptOuted(): boolean {
  return localStorage.getItem(OPTOUT_KEY) !== null;
}

export {
  getPageVariant,
  getAccountVariant,
  getLocalVariant,
  getBrowserVariant,
  getMediaWikiVariant,
  calculatePreferredVariant,
  setLocalVariant,
  setOptOut,
  isOptOuted,
};
