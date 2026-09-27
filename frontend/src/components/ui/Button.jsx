import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-sm',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-400 shadow-sm',
  // Filled steel-blue CTA — distinct from `secondary` (which means
  // "white/outline" below and is relied on across admin/vendor screens).
  info: 'bg-secondary-500 text-white hover:bg-secondary-600 focus-visible:ring-secondary-400 shadow-sm',
  secondary: 'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-400',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-xl gap-2',
};

// Same padding/gap per size, but pill-shaped — used for nav/hero CTAs in
// the new design instead of relying on a className override (which isn't
// guaranteed to win over the size class above at equal specificity).
const PILL_SIZES = {
  sm: 'px-3.5 py-1.5 text-sm rounded-full gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-full gap-2',
  lg: 'px-7 py-3.5 text-base rounded-full gap-2',
};

/**
 * Shared button primitive. Use instead of hand-rolling Tailwind button
 * classes so styling stays consistent across public/admin/vendor UI.
 *
 *   <Button variant="primary" size="md" loading={isSubmitting}>Save</Button>
 */
const Button = ({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  pill = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = pill ? (PILL_SIZES[size] || PILL_SIZES.md) : (SIZES[size] || SIZES.md);
  return (
    <Component
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${VARIANTS[variant] || VARIANTS.primary}
        ${sizeClasses}
        ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Component>
  );
};

export default Button;
