/**
 * Currency formatting utilities for Indonesian Rupiah (IDR)
 */

/**
 * Format a number as Indonesian Rupiah with abbreviated suffixes for large numbers
 * @param amount - The amount to format
 * @param showCurrency - Whether to show the IDR prefix (default: true)
 * @param useAbbreviation - Whether to abbreviate large numbers (default: true)
 * @returns Formatted currency string
 */
export function formatIDR(amount: number | string, showCurrency: boolean = true, useAbbreviation: boolean = true): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return showCurrency ? 'IDR 0' : '0';
  }

  let formatted: string;
  let suffix = '';

  if (useAbbreviation) {
    if (numAmount >= 1_000_000_000_000) { // Trillion
      formatted = (numAmount / 1_000_000_000_000).toFixed(1);
      suffix = ' T';
    } else if (numAmount >= 1_000_000_000) { // Billion (Bio)
      formatted = (numAmount / 1_000_000_000).toFixed(1);
      suffix = ' Bio';
    } else if (numAmount >= 1_000_000) { // Million (Mio)
      formatted = (numAmount / 1_000_000).toFixed(1);
      suffix = ' Mio';
    } else {
      formatted = numAmount.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
  } else {
    formatted = numAmount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  return showCurrency ? `IDR ${formatted}${suffix}` : `${formatted}${suffix}`;
}

/**
 * Format IDRX token amount (considering 2 decimal places)
 * @param amount - The raw amount from blockchain (with 2 decimals)
 * @param showCurrency - Whether to show the IDRX suffix (default: true)
 * @returns Formatted IDRX string
 */
export function formatIDRX(amount: number | string | bigint, showCurrency: boolean = true): string {
  let numAmount: number;
  
  if (typeof amount === 'bigint') {
    // Convert from smallest unit (2 decimals for IDRX)
    numAmount = Number(amount) / 100;
  } else if (typeof amount === 'string') {
    numAmount = parseFloat(amount) / 100;
  } else {
    numAmount = amount / 100;
  }
  
  if (isNaN(numAmount)) {
    return showCurrency ? 'IDRX 0' : '0';
  }

  // Format with Indonesian locale
  const formatted = numAmount.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return showCurrency ? `${formatted} IDRX` : formatted;
}