// src/hooks/useBrand.js
// Loads brand/theme settings from Firestore and injects CSS variables
// into :root so every component reacts to changes in real-time.
import { useEffect } from 'react';
import { useDocument } from './useFirestore';

export const DEFAULT_BRAND = {
  // Primary palette
  colorNavy:      '#0a1628',
  colorNavyMid:   '#132040',
  colorNavyLight: '#1e2f55',
  colorGold:      '#c9a84c',
  colorGoldLight: '#e2c47a',
  colorGoldPale:  '#f5ecd1',
  colorCream:     '#faf8f3',
  // Logo
  logoType:       'text',   // 'text' | 'image'
  logoImageUrl:   '',
  logoText:       'DFS',
  companyShort:   'Duty Free Sourcing',
  companySuffix:  'Inc. (PTY) LTD',
};

export function useBrand() {
  const { data, loading } = useDocument('settings', 'brand');
  const brand = { ...DEFAULT_BRAND, ...(data || {}) };

  useEffect(() => {
    if (loading) return;
    const root = document.documentElement;
    root.style.setProperty('--navy',       brand.colorNavy);
    root.style.setProperty('--navy-mid',   brand.colorNavyMid);
    root.style.setProperty('--navy-light', brand.colorNavyLight);
    root.style.setProperty('--gold',       brand.colorGold);
    root.style.setProperty('--gold-light', brand.colorGoldLight);
    root.style.setProperty('--gold-pale',  brand.colorGoldPale);
    root.style.setProperty('--cream',      brand.colorCream);
  }, [brand.colorNavy, brand.colorNavyMid, brand.colorNavyLight,
      brand.colorGold, brand.colorGoldLight, brand.colorGoldPale,
      brand.colorCream, loading]);

  return { brand, loading };
}
