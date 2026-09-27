import { Fragment, useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Button, Input, Select, Table, Th, Td, Badge } from '../../components/ui';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'view', label: 'Viewed' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'status_change', label: 'Status Changed' },
  { value: 'update_role', label: 'Role Changed' },
  { value: 'reset_password', label: 'Password Reset' },
];

const SUBJECT_OPTIONS = [
  { value: '', label: 'All Subjects' },
  { value: 'User', label: 'User' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Activity', label: 'Activity' },
  { value: 'Booking', label: 'Booking' },
];

const ACTION_TONE = {
  view: 'neutral',
  update: 'primary',
  delete: 'danger',
  status_change: 'warning',
  update_role: 'accent',
  reset_password: 'warning',
};

const ACTION_LABEL = ACTION_OPTIONS.reduce((acc, opt) => {
  if (opt.value) acc[opt.value] = opt.label;
  return acc;
}, {});

const AdminAuditLog = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };
      if (actionFilter) params.action = actionFilter;
      if (subjectFilter) params.subject_type = subjectFilter;

      const response = await adminAPI.getAuditLog(params);
      setEntries(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, actionFilter, subjectFilter]);

  useEffect(() => {
    fetchAuditLog();
  }, [pagination.current_page, pagination.per_page, actionFilter, subjectFilter]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.last_page) {
      setPagination((prev) => ({ ...prev, current_page: page }));
    }
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const getPageNumbers = () => {
    const pages = [];
    const { current_page, last_page } = pagination;
    for (let i = Math.max(1, current_page - 2); i <= Math.min(last_page, current_page + 2); i++) {
      pages.push(i);
    }
    return pages;
  };

  const filteredEntries = search.trim()
    ? entries.filter((entry) => {
        const q = search.toLowerCase();
        return (
          entry.actor?.name?.toLowerCase().includes(q) ||
          entry.target_user?.name?.toLowerCase().includes(q)
        );
      })
    : entries;

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderDiff = (entry) => {
    const before = entry.before || {};
    const after = entry.after || {};
    const fields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    if (fields.length === 0) return null;

    return (
      <div className="space-y-1.5">
        {fields.map((field) => (
          <div key={field} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-neutral-700">{field}:</span>
            <span className="text-red-600 line-through">{JSON.stringify(before[field])}</span>
            <span className="text-neutral-400">→</span>
            <span className="text-green-700">{JSON.stringify(after[field])}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">Audit Log</h2>
        <p className="text-sm text-neutral-500 mt-1">
          A record of superadmin/admin oversight actions across vendor and customer accounts.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Input
          type="text"
          placeholder="Filter by actor or target name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          value={actionFilter}
          onChange={handleFilterChange(setActionFilter)}
          className="w-full sm:w-auto"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <Select
          value={subjectFilter}
          onChange={handleFilterChange(setSubjectFilter)}
          className="w-full sm:w-auto"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-12 text-center text-neutral-500">
          No audit log entries yet
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Timestamp</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Subject</Th>
              <Th>Target User</Th>
              <Th className="text-right">Details</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredEntries.map((entry) => {
              const hasDiff = entry.before || entry.after;
              const isExpanded = expandedId === entry.id;
              return (
                <Fragment key={entry.id}>
                  <tr>
                    <Td className="whitespace-nowrap text-neutral-600">
                      {new Date(entry.created_at).toLocaleString()}
                    </Td>
                    <Td>{entry.actor?.name || '—'}</Td>
                    <Td>
                      <Badge tone={ACTION_TONE[entry.action] || 'neutral'}>
                        {ACTION_LABEL[entry.action] || entry.action}
                      </Badge>
                    </Td>
                    <Td>{entry.subject_type} #{entry.subject_id}</Td>
                    <Td>
                      {entry.target_user ? (
                        <div>
                          <span className="text-neutral-900">{entry.target_user.name}</span>
                          {entry.target_user.role && (
                            <Badge tone="neutral" className="ml-2 !py-0.5">
                              {entry.target_user.role}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-right">
                      {hasDiff ? (
                        <button
                          onClick={() => toggleExpanded(entry.id)}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
                        >
                          {isExpanded ? 'Hide' : 'View'}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-sm">—</span>
                      )}
                    </Td>
                  </tr>
                  {isExpanded && hasDiff && (
                    <tr>
                      <td colSpan={6} className="px-4 sm:px-6 py-4 text-sm text-neutral-700 bg-neutral-50">
                        {renderDiff(entry) || (
                          <pre className="text-xs text-neutral-600 whitespace-pre-wrap">
                            {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-card gap-4">
        <p className="text-neutral-600 text-sm">
          Showing {filteredEntries.length} of {pagination.total} entries
        </p>
        {pagination.last_page > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((page) => (
              <Button
                key={page}
                variant={page === pagination.current_page ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="!px-4"
              >
                {page}
              </Button>
            ))}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;
