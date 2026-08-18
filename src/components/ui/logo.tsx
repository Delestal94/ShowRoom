import Link from 'next/link'
import { cn } from '@/lib/cn'

/** Isometric cube mark — reads as both a building volume and a 3D primitive. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn('h-7 w-7', className)}>
      <defs>
        <linearGradient id="sr-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.70 0.20 275)" />
          <stop offset="1" stopColor="oklch(0.80 0.15 78)" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 29 10v12L16 29.5 3 22V10L16 2.5Z" stroke="url(#sr-mark)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 10l13 7.5L29 10M16 17.5v12" stroke="url(#sr-mark)" strokeWidth="2" strokeLinejoin="round" opacity="0.75" />
    </svg>
  )
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-2.5', className)}>
      <LogoMark className="transition-transform duration-300 group-hover:rotate-12" />
      <span className="text-[1.0625rem] font-semibold tracking-tight text-fg">ShowRoom</span>
    </Link>
  )
}
