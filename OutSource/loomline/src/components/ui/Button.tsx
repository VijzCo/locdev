import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded font-display uppercase tracking-[0.06em] ' +
    'transition-colors disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-navy-700 text-white hover:bg-navy-600 dark:bg-accent dark:text-accent-ink dark:hover:bg-white',
        secondary: 'bg-raised text-ink border border-line hover:bg-line/40',
        ghost: 'text-muted hover:bg-raised hover:text-ink',
        danger: 'bg-signal-red text-white hover:brightness-110',
      },
      size: {
        // Default sits at 40px. Scan screens use `floor`, sized for a
        // gloved hand on a tablet rather than a mouse pointer.
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-[0.9375rem]',
        lg: 'h-12 px-6 text-base',
        floor: 'h-16 px-8 text-xl',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
