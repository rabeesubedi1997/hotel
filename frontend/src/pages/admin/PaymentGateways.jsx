import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Loader2, Plug, Plus, Settings2, Trash2, Zap } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import useAuthStore from '../../stores/authStore';
import { Badge, Button, Card, Input, Modal, Select, Textarea } from '../../components/ui';

const MODES = ['sandbox', 'live'];

const firstError = (error, fallback) => {
  const errors = error.response?.data?.errors;
  if (errors) return Object.values(errors).flat()[0];
  return error.response?.data?.message || fallback;
};

// Only non-secret values are ever prefilled — secrets never come back from
// the server (only a masked hint), so those inputs start empty and a blank
// means "keep the stored value".
const prefillCredentials = (driver, gateway) => {
  const out = { sandbox: {}, live: {} };
  for (const mode of MODES) {
    for (const field of driver?.fields || []) {
      out[mode][field.key] = field.secret ? '' : gateway?.credentials?.[mode]?.[field.key] ?? '';
    }
  }
  return out;
};

// Settings are mode-independent and non-secret, so every value (including the
// driver's declared default) is prefilled and editable.
const prefillSettings = (driver, gateway) => {
  const out = {};
  for (const field of driver?.settings_fields || []) {
    out[field.key] = gateway?.settings?.[field.key] ?? field.default ?? '';
  }
  return out;
};

const MONO = 'font-mono text-xs';

// One renderer for every driver-declared field type, so a new driver's
// form needs no frontend work.
const FieldControl = ({ field, value, onChange, placeholder }) => {
  const label = `${field.label}${field.required ? ' *' : ''}`;
  const hint = field.help ? <p className="mt-1 text-xs text-neutral-400">{field.help}</p> : null;

  if (field.type === 'select') {
    return (
      <div>
        <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        {hint}
      </div>
    );
  }

  if (field.type === 'json' || field.type === 'textarea') {
    return (
      <div>
        <Textarea
          label={label}
          rows={field.type === 'json' ? 6 : 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? field.placeholder}
          spellCheck={false}
          className={MONO}
        />
        {hint}
      </div>
    );
  }

  return (
    <div>
      <Input
        label={label}
        type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? field.placeholder}
      />
      {hint}
    </div>
  );
};

const Switch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-primary-600' : 'bg-neutral-300'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

const PaymentGateways = () => {
  const toast = useToast();
  const { user } = useAuthStore();
  const canManage = user?.role === 'super_admin' || user?.role === 'admin';

  const [gateways, setGateways] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // gateway being edited, or null when adding
  const [form, setForm] = useState(null);
  const [credTab, setCredTab] = useState('sandbox');
  const [saving, setSaving] = useState(false);

  const driversByKey = useMemo(() => Object.fromEntries(drivers.map((d) => [d.key, d])), [drivers]);
  const formDriver = form ? driversByKey[form.driver] : null;

  const load = useCallback(async () => {
    try {
      const response = await adminAPI.getPaymentGateways();
      setGateways(response.data.gateways);
      setDrivers(response.data.drivers);
    } catch (error) {
      toast.error(firstError(error, 'Failed to load payment gateways'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    const driver = drivers[0];
    setEditing(null);
    setForm({
      driver: driver?.key || '',
      name: driver?.label || '',
      description: '',
      currency: driver?.default_currency || 'USD',
      mode: 'sandbox',
      credentials: prefillCredentials(driver, null),
      settings: prefillSettings(driver, null),
    });
    setCredTab('sandbox');
    setModalOpen(true);
  };

  const openEdit = (gateway) => {
    setEditing(gateway);
    setForm({
      driver: gateway.driver,
      name: gateway.name,
      description: gateway.description || '',
      currency: gateway.currency,
      mode: gateway.mode,
      credentials: prefillCredentials(driversByKey[gateway.driver], gateway),
      settings: prefillSettings(driversByKey[gateway.driver], gateway),
    });
    setCredTab(gateway.mode);
    setModalOpen(true);
  };

  const changeDriver = (key) => {
    const driver = driversByKey[key];
    setForm((f) => ({
      ...f,
      driver: key,
      // A Custom gateway has no meaningful built-in name — make the admin pick one.
      name: key === 'custom' ? '' : driver?.label || f.name,
      currency: driver?.default_currency || f.currency,
      credentials: prefillCredentials(driver, null),
      settings: prefillSettings(driver, null),
    }));
  };

  const setSetting = (key, value) => setForm((f) => ({ ...f, settings: { ...f.settings, [key]: value } }));

  const setCredential = (mode, key, value) =>
    setForm((f) => ({ ...f, credentials: { ...f.credentials, [mode]: { ...f.credentials[mode], [key]: value } } }));

  const buildCredentials = () => {
    const out = { sandbox: {}, live: {} };
    for (const mode of MODES) {
      for (const field of formDriver?.fields || []) {
        const value = (form.credentials[mode][field.key] ?? '').trim();
        // Blank secret = keep stored; blank non-secret = clear it.
        if (field.secret) {
          if (value) out[mode][field.key] = value;
        } else {
          out[mode][field.key] = value;
        }
      }
    }
    return out;
  };

  const save = async (e) => {
    e.preventDefault();

    if (editing?.is_enabled && editing.mode !== form.mode && form.mode === 'live'
      && !window.confirm('Switch this gateway to LIVE mode? Real customers will be charged real money.')) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        currency: form.currency,
        mode: form.mode,
        credentials: buildCredentials(),
        settings: form.settings,
      };
      if (editing) {
        await adminAPI.updatePaymentGateway(editing.id, payload);
        toast.success('Gateway updated');
      } else {
        await adminAPI.createPaymentGateway({ ...payload, driver: form.driver });
        toast.success('Gateway added — switch it on once you are happy with the settings');
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      toast.error(firstError(error, 'Failed to save gateway'));
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (gateway, enabled) => {
    if (enabled && gateway.mode === 'live'
      && !window.confirm(`Enable ${gateway.name} in LIVE mode? Customers will be charged real money.`)) {
      return;
    }
    setBusyId(gateway.id);
    try {
      await adminAPI.updatePaymentGateway(gateway.id, { is_enabled: enabled });
      toast.success(`${gateway.name} ${enabled ? 'enabled' : 'disabled'}`);
      await load();
    } catch (error) {
      toast.error(firstError(error, 'Could not update gateway'));
    } finally {
      setBusyId(null);
    }
  };

  const testConnection = async (gateway) => {
    setBusyId(gateway.id);
    try {
      const response = await adminAPI.testPaymentGateway(gateway.id);
      (response.data.ok ? toast.success : toast.error)(response.data.message);
    } catch (error) {
      toast.error(firstError(error, 'Connection test failed'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (gateway) => {
    if (!window.confirm(`Delete "${gateway.name}"? This cannot be undone.`)) return;
    setBusyId(gateway.id);
    try {
      await adminAPI.deletePaymentGateway(gateway.id);
      toast.success('Gateway deleted');
      await load();
    } catch (error) {
      toast.error(firstError(error, 'Could not delete gateway'));
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= gateways.length) return;
    const next = [...gateways];
    [next[index], next[target]] = [next[target], next[index]];
    setGateways(next);
    try {
      await adminAPI.reorderPaymentGateways(next.map((g) => g.id));
    } catch (error) {
      toast.error(firstError(error, 'Could not save the new order'));
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <Card hoverLift={false} className="p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h2 className="font-display text-xl font-bold text-neutral-900 mb-1">Administrators only</h2>
        <p className="text-neutral-600">Payment gateway settings contain API secrets, so only admins and super admins can view or change them.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">Payment Gateways</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Enabled gateways appear as payment buttons at checkout, in the order shown here.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-5 w-5" />
          Add Gateway
        </Button>
      </div>

      <div className="space-y-3">
        {gateways.map((gateway, index) => {
          const driver = driversByKey[gateway.driver];
          const busy = busyId === gateway.id;

          return (
            <Card key={gateway.id} hoverLift={false} className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-20" aria-label="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === gateways.length - 1} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-20" aria-label="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                    <Plug className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-neutral-900">{gateway.name}</h3>
                      {!driver?.offline && (
                        <Badge tone={gateway.mode === 'live' ? 'danger' : 'warning'}>
                          {gateway.mode === 'live' ? 'Live' : 'Sandbox'}
                        </Badge>
                      )}
                      <Badge tone="neutral">{gateway.currency}</Badge>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {driver?.label || gateway.driver} · code <code>{gateway.code}</code>
                      {gateway.payments_count > 0 && ` · ${gateway.payments_count} payment${gateway.payments_count === 1 ? '' : 's'}`}
                    </p>
                    {gateway.configured ? (
                      <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {driver?.offline ? 'Ready — no credentials needed' : `Credentials set for ${gateway.mode} mode`}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Missing for {gateway.mode} mode: {gateway.missing.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                  {!driver?.offline && (
                    <Button variant="ghost" size="sm" onClick={() => testConnection(gateway)} disabled={busy}>
                      <Zap className="h-4 w-4" /> Test
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => openEdit(gateway)} disabled={busy}>
                    <Settings2 className="h-4 w-4" /> Configure
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(gateway)}
                    disabled={busy}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                    title="Delete gateway"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                    <span className="text-xs font-medium text-neutral-600 w-14">{gateway.is_enabled ? 'Enabled' : 'Disabled'}</span>
                    <Switch
                      checked={gateway.is_enabled}
                      onChange={(value) => toggleEnabled(gateway, value)}
                      disabled={busy}
                      label={`Enable ${gateway.name}`}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-neutral-500">
        Provider not listed? Choose <strong>Custom gateway</strong> in <strong>Add Gateway</strong> and fill in its URLs and
        response mapping from its API docs — no developer needed. (Providers that require a locally computed signature or a
        browser form-POST, such as eSewa, need a developer-written driver.) You can add the same provider more than once,
        for example two Stripe accounts.
      </p>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Configure ${editing.name}` : 'Add Payment Gateway'}
        size="lg"
      >
        {form && (
          <form onSubmit={save} className="space-y-4">
            {!editing && (
              <Select label="Provider" value={form.driver} onChange={(e) => changeDriver(e.target.value)}>
                {drivers.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </Select>
            )}
            {formDriver?.description && <p className="text-sm text-neutral-500 -mt-2">{formDriver.description}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Button name shown to customers" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {formDriver?.offline ? (
                <div />
              ) : formDriver?.supported_currencies ? (
                <Select label="Charge currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {formDriver.supported_currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              ) : (
                <Input label="Charge currency (ISO code)" maxLength={3} required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              )}
            </div>
            <Textarea label="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            {formDriver?.offline ? (
              <p className="text-sm text-neutral-600 bg-neutral-50 rounded-xl p-4">
                This is an offline payment method — the booking is confirmed immediately and the customer pays in person. No credentials needed.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Active mode</label>
                  <div className="inline-flex rounded-xl border border-neutral-300 overflow-hidden">
                    {MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setForm({ ...form, mode }); setCredTab(mode); }}
                        className={`px-5 py-2 text-sm font-medium capitalize transition-colors ${form.mode === mode ? (mode === 'live' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white') : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Sandbox uses the provider&apos;s test environment (no real money). Live charges real customers.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200">
                  <div className="flex border-b border-neutral-200">
                    {MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCredTab(mode)}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium capitalize ${credTab === mode ? 'text-primary-700 border-b-2 border-primary-600 -mb-px' : 'text-neutral-500 hover:text-neutral-700'}`}
                      >
                        {mode} credentials
                      </button>
                    ))}
                  </div>
                  <div className="p-4 space-y-4">
                    {(formDriver?.fields || []).map((field) => {
                      const stored = editing?.credentials?.[credTab]?.[field.key];
                      return (
                        <FieldControl
                          key={`${credTab}-${field.key}`}
                          field={field}
                          value={form.credentials[credTab][field.key] ?? ''}
                          onChange={(value) => setCredential(credTab, field.key, value)}
                          placeholder={
                            field.secret && stored?.set
                              ? `Saved (${stored.hint}) — leave blank to keep`
                              : field.placeholder || (field.key === 'api_url' ? formDriver?.default_api_urls?.[credTab] : '') || ''
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {formDriver?.settings_fields?.length > 0 && (
              <div className="rounded-xl border border-neutral-200 p-4 space-y-5">
                <div>
                  <h4 className="font-semibold text-neutral-900">Gateway settings</h4>
                  <p className="text-xs text-neutral-500">Same for sandbox and live. Tell us how to talk to this provider.</p>
                </div>
                {[...new Set(formDriver.settings_fields.map((f) => f.group || 'General'))].map((group) => (
                  <fieldset key={group} className="space-y-4">
                    <legend className="text-xs font-bold uppercase tracking-wide text-primary-700 mb-1">{group}</legend>
                    {formDriver.settings_fields.filter((f) => (f.group || 'General') === group).map((field) => (
                      <FieldControl
                        key={field.key}
                        field={field}
                        value={form.settings[field.key] ?? ''}
                        onChange={(value) => setSetting(field.key, value)}
                      />
                    ))}
                  </fieldset>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Add gateway'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PaymentGateways;
