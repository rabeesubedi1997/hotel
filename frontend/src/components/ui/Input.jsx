/**
 * Shared form field primitives — replace the duplicated
 * "w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500..."
 * class string that was copy-pasted across Hotels/Activities/admin forms.
 */
const FIELD_BASE =
  'w-full px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-800 placeholder:text-neutral-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'disabled:bg-neutral-100 disabled:cursor-not-allowed transition';

export const Input = ({ label, error, icon: Icon, className = '', id, ...props }) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />}
      <input
        id={id}
        className={`${FIELD_BASE} ${Icon ? 'pl-10' : ''} ${error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export const Textarea = ({ label, error, className = '', id, rows = 4, ...props }) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </label>
    )}
    <textarea
      id={id}
      rows={rows}
      className={`${FIELD_BASE} ${error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export const Select = ({ label, error, className = '', id, children, ...props }) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </label>
    )}
    <select id={id} className={`${FIELD_BASE} bg-white ${error ? 'border-red-400' : ''}`} {...props}>
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default Input;
