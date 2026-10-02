// Staff dashboards report in the base currency (USD). "$14,800.00" instead
// of "$14800.00" — thousands separators matter once totals grow.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatUSD = (value) => usd.format(Number(value) || 0);
