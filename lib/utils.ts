import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Brazilian Real (BRL) currency.
 * Default output: "R$ 1.000" (no cents).
 */
export function formatCurrency(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const minimumFractionDigits = options?.minimumFractionDigits ?? 0
  const maximumFractionDigits = options?.maximumFractionDigits ?? 0

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}
