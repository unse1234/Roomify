import { Check } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  social: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
};

const Button = ({ children, isLoading, isSuccess, variant = 'primary', className = '', disabled, ...props }) => (
  <button
    className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
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