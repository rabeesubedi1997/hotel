/**
 * Lightweight styled table shell — standardizes the raw `<table
 * className="w-full">` + `<thead className="bg-gray-50">` markup that was
 * duplicated across every admin/vendor list page. Use plain <tr>/<td> for
 * body rows (they inherit sensible defaults via the `divide-y` on tbody);
 * use `Th`/`Td` only where you want the standard cell padding/alignment.
 *
 *   <Table>
 *     <thead><tr><Th>Name</Th><Th>Status</Th></tr></thead>
 *     <tbody>{rows.map(r => <tr key={r.id}><Td>{r.name}</Td><Td>{r.status}</Td></tr>)}</tbody>
 *   </Table>
 */
export const Table = ({ children, className = '' }) => (
  <div className="overflow-x-auto rounded-2xl border border-neutral-100 shadow-card">
    <table className={`w-full text-left ${className}`}>{children}</table>
  </div>
);

export const Th = ({ children, className = '' }) => (
  <th className={`px-4 sm:px-6 py-3 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wide ${className}`}>
    {children}
  </th>
);

export const Td = ({ children, className = '' }) => (
  <td className={`px-4 sm:px-6 py-4 text-sm text-neutral-700 whitespace-nowrap ${className}`}>{children}</td>
);

export default Table;
