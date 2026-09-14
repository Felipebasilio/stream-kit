/** Amarracao do React em volta de canvas/brand.ts. */

import type { Brand } from '@stream-kit/types';
import { useEffect } from 'react';

import { applyBrand } from './brand.js';

export function useBrand(brand: Brand): void {
  useEffect(() => {
    applyBrand(document.documentElement.style, brand);
  }, [brand]);
}
