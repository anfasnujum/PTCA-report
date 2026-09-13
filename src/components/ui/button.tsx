import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'bg-card text-foreground border border-border shadow-sm',
        ghost: 'bg-transparent text-foreground hover:bg-accent-soft',
        danger: 'bg-danger text-white',
        outline: 'border border-accent text-accent bg-transparent hover:bg-accent-soft',
      },
      size: {
        default: 'min-h-11 px-5',
        lg: 'min-h-12 px-6 text-[15px]',
        sm: 'min-h-9 px-3.5 text-sm',
        icon: 'size-10 p-0',
        pill: 'min-h-11 px-4 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
