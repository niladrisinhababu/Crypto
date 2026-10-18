/**
 * VegaEdge Precision Number & Currency Formatting Utilities
 * Prevents TypeError: Cannot read properties of undefined (reading 'toLocaleString')
 */

export function safeToLocale(
  val: number | string | null | undefined,
  options?: Intl.NumberFormatOptions,
  fallback: string = 'N/A'
): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return num.toLocaleString(undefined, options);
}

export function safePrice(
  val: number | string | null | undefined,
  decimals?: number,
  fallback: string = 'N/A'
): string {
  if (val === null || val === undefined || val === '') return fallback;
  
  // Strip leading dollar signs if string
  let cleanVal: number | string = val;
  if (typeof cleanVal === 'string') {
    cleanVal = cleanVal.replace(/^\$+/, '').trim();
    if (cleanVal === '' || cleanVal === 'N/A' || cleanVal === '—') return fallback;
  }

  const num = typeof cleanVal === 'number' ? cleanVal : Number(cleanVal);
  if (isNaN(num)) return fallback;

  let minDec = decimals;
  let maxDec = decimals;

  if (minDec === undefined) {
    const abs = Math.abs(num);
    if (abs >= 1000) {
      minDec = 2;
      maxDec = 2;
    } else if (abs >= 1) {
      minDec = 2;
      maxDec = 4;
    } else if (abs >= 0.01) {
      minDec = 4;
      maxDec = 4;
    } else if (abs >= 0.0001) {
      minDec = 5;
      maxDec = 6;
    } else if (abs > 0) {
      minDec = 6;
      maxDec = 8;
    } else {
      minDec = 2;
      maxDec = 2;
    }
  } else {
    maxDec = Math.max(minDec, 4);
  }

  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  })}`;
}
