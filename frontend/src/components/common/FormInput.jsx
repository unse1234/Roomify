import { useId } from 'react';

const FormInput = ({ label, icon: Icon, error, className = '', id, ...props }) => {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-sm border bg-white py-2.5 text-sm text-ink placeholder:text-muted-soft outline-none transition-colors
          ${Icon ? 'pl-10 pr-4' : 'px-4'}
          ${error
            ? 'border-[#f3b6a8] focus:border-error focus:ring-2 focus:ring-[#fff4f1]'
            : 'border-hairline focus:border-ink focus:ring-2 focus:ring-surface-soft'}
          disabled:bg-surface-soft disabled:text-muted-soft`}
        {...props}
      />
    </div>
      {error && <p id={errorId} className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
};

export default FormInput;
