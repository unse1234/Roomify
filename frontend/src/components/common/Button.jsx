import { Check } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-active disabled:bg-primary-disabled',
  secondary: 'bg-white border border-hairline text-ink hover:bg-surface-soft',
  danger: 'bg-error text-white hover:bg-[#9f2d12] disabled:bg-[#edb8a9]',
};

const Button = ({ children, isLoading, isSuccess, variant = 'primary', className = '', disabled, ...props }) => (
  <button
    className={`w-full min-h-11 flex items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    disabled={isLoading || disabled}
    {...props}
  >
    {isLoading ? (
      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
    ) : isSuccess ? (
      <Check className="w-4 h-4" strokeWidth={3} />
    ) : (
      children
    )}
  </button>
);

export default Button;
