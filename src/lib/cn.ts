import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges conditional class names, with later Tailwind classes winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
