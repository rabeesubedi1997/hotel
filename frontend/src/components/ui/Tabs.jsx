/**
 * Underlined tab bar — used to replace hand-rolled tab-button rows
 * (e.g. Restaurant POS's Kitchen/Menu/Tables/Reports tabs).
 *
 *   <Tabs
 *     tabs={[{ key: 'kitchen', label: 'Kitchen', icon: ChefHat }, ...]}
 *     active={tab}
 *     onChange={setTab}
 *   />
 */
const Tabs = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex gap-2 border-b border-neutral-200 ${className}`}>
    {tabs.map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
          active === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'
        }`}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </button>
    ))}
  </div>
);

export default Tabs;
