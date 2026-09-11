import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-base font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-fg',
        secondary: 'bg-card text-foreground border border-border',
        ghost: 'bg-transparent text-foreground',
        danger: 'bg-danger text-background',
        outline: 'border border-accent text-accent bg-transparent',
      },
      size: {
        default: 'min-h-12 px-5',
        lg: 'min-h-14 px-6 text-lg',
        sm: 'min-h-11 px-4 text-sm',
        icon: 'size-12 p-0',
        pill: 'min-h-12 px-4 rounded-full',
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
