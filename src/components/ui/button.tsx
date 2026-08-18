import { forwardRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-fg shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40',
  secondary: 'bg-surface-2 text-fg border border-border hover:border-border-strong hover:bg-surface-2/70',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  outline: 'border border-border-strong text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:bg-danger/90',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
}

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
)
Button.displayName = 'Button'

type ButtonLinkProps = CommonProps & React.ComponentProps<typeof Link>

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  )
}
