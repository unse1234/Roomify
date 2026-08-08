const FormInput = ({ label, icon: Icon, error, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
      <input
        className={`w-full rounded-xl border bg-white py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors
          ${Icon ? 'pl-10 pr-4' : 'px-4'}
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'}
          disabled:bg-gray-50 disabled:text-gray-400`}
        {...props}
      />
    </div>
    {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
  </div>
);

export default FormInput;