import { Banknote, CheckCircle, CreditCard, DollarSign, Loader2, Wallet } from 'lucide-react';

const ICONS = {
  banknote: { Icon: Banknote, tone: 'bg-green-100 text-green-600' },
  wallet: { Icon: Wallet, tone: 'bg-purple-100 text-purple-600' },
  'credit-card': { Icon: CreditCard, tone: 'bg-blue-100 text-blue-600' },
  paypal: { Icon: DollarSign, tone: 'bg-sky-100 text-sky-600' },
};

/**
 * Radio-card list of the enabled payment gateways. Driven entirely by
 * /payments/methods, so enabling or adding a gateway in the admin panel
 * is all it takes for a new payment button to appear here.
 */
const PaymentMethodPicker = ({ methods, loading, error, selected, onSelect, note, emptyMessage }) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || methods.length === 0) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-8">
        {error
          ? 'We could not load the available payment methods. Please refresh the page.'
          : emptyMessage || 'No payment methods are available right now. Please contact us to complete your booking.'}
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-8">
      {methods.map((method) => {
        const { Icon, tone } = ICONS[method.icon] || ICONS.wallet;
        const active = selected === method.id;

        return (
          <label
            key={method.id}
            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${active ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}
          >
            <input
              type="radio"
              name="payment"
              value={method.id}
              checked={active}
              onChange={() => onSelect(method.id)}
              className="hidden"
            />
            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2 flex-wrap">
                {method.name}
                {method.sandbox && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    Test mode
                  </span>
                )}
              </h3>
              {method.description && <p className="text-sm text-neutral-500">{method.description}</p>}
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-primary-600 bg-primary-600' : 'border-neutral-300'}`}>
              {active && <CheckCircle className="h-4 w-4 text-white" />}
            </div>
          </label>
        );
      })}
      {note && <p className="text-xs text-neutral-500 px-1">{note}</p>}
    </div>
  );
};

export default PaymentMethodPicker;
