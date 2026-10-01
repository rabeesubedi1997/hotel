import { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  Eye,
  Reply,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Button, Input, Textarea, Select, Modal, Table, Th, Td, Badge, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const EnquiriesManagement = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // A new search term or filter always lands back on page 1 (a no-op if
  // already there).
  useEffect(() => {
    resetToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.type, debouncedSearch]);

  useEffect(() => {
    fetchEnquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.type, debouncedSearch, pagination.current_page, pagination.per_page]);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const params = {
        status: filters.status,
        type: filters.type,
        search: debouncedSearch,
        page: pagination.current_page,
        per_page: pagination.per_page,
      };
      const response = await adminAPI.getEnquiries(params);
      setEnquiries(response.data.data);
      applyResponse(response.data);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setMessage('Error loading enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await adminAPI.updateEnquiryStatus(id, status);
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry(prev => ({ ...prev, status }));
      }
      setMessage('Status updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage('Error updating status');
    }
  };

  const handleRespond = async () => {
    if (!responseText.trim()) return;

    setSending(true);
    try {
      await adminAPI.respondToEnquiry(selectedEnquiry.id, responseText);
      setEnquiries(prev => prev.map(e =>
        e.id === selectedEnquiry.id ? { ...e, status: 'responded', admin_response: responseText } : e
      ));
      setSelectedEnquiry(prev => ({ ...prev, status: 'responded', admin_response: responseText }));
      setResponseText('');
      setMessage('Response sent successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error sending response:', error);
      setMessage('Error sending response');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;

    try {
      await adminAPI.deleteEnquiry(id);
      setEnquiries(prev => prev.filter(e => e.id !== id));
      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry(null);
      }
      setMessage('Enquiry deleted');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      setMessage('Error deleting enquiry');
    }
  };

  const STATUS_TONE = {
    new: 'primary',
    in_progress: 'warning',
    responded: 'success',
    closed: 'neutral',
    spam: 'danger',
  };

  const STATUS_ICON = {
    new: Clock,
    in_progress: Clock,
    responded: CheckCircle,
    closed: XCircle,
    spam: XCircle,
  };

  const StatusBadge = ({ status }) => {
    const Icon = STATUS_ICON[status] || Clock;
    return (
      <Badge tone={STATUS_TONE[status] || 'neutral'}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const TYPE_TONE = {
    booking: 'accent',
    general: 'neutral',
    package: 'warning',
    custom: 'primary',
  };

  const TypeBadge = ({ type }) => (
    <Badge tone={TYPE_TONE[type] || 'neutral'}>{type}</Badge>
  );

  const closeModal = () => {
    setSelectedEnquiry(null);
    setResponseText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center">
          <Mail className="h-6 w-6 mr-2 text-primary-600" />
          Enquiries
        </h2>
        <div className="text-sm text-neutral-500">
          Total: {pagination.total} enquiries
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 mr-2 shrink-0" /> : <Check className="h-5 w-5 mr-2 shrink-0" />}
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card p-4">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={(e) => e.preventDefault()} className="flex-1 min-w-[280px]">
            <Input
              icon={Search}
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name, email, subject, or enquiry number..."
            />
          </form>

          <Select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full sm:w-auto"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="responded">Responded</option>
            <option value="closed">Closed</option>
            <option value="spam">Spam</option>
          </Select>

          <Select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full sm:w-auto"
          >
            <option value="all">All Types</option>
            <option value="booking">Booking</option>
            <option value="general">General</option>
            <option value="package">Package</option>
            <option value="custom">Custom</option>
          </Select>
        </div>
      </div>

      {/* Enquiries List */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p className="text-neutral-500">No enquiries found</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Enquiry</Th>
                <Th>Contact</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {enquiries.map((enquiry) => (
                <tr
                  key={enquiry.id}
                  onClick={() => setSelectedEnquiry(enquiry)}
                  className="hover:bg-neutral-50 cursor-pointer"
                >
                  <Td className="whitespace-normal">
                    <div className="text-sm font-medium text-neutral-900">{enquiry.subject}</div>
                    <div className="text-xs text-neutral-500">{enquiry.enquiry_number}</div>
                  </Td>
                  <Td className="whitespace-normal">
                    <div className="text-sm text-neutral-900">{enquiry.name}</div>
                    <div className="text-xs text-neutral-500">{enquiry.email}</div>
                  </Td>
                  <Td>
                    <TypeBadge type={enquiry.type} />
                  </Td>
                  <Td>
                    <StatusBadge status={enquiry.status} />
                  </Td>
                  <Td className="text-neutral-500">
                    {new Date(enquiry.created_at).toLocaleDateString()}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEnquiry(enquiry);
                        }}
                        className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-800"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(enquiry.id);
                        }}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {pagination.total > 0 && (
        <Pagination pagination={pagination} onPageChange={goToPage} onPerPageChange={setPerPage} itemLabel="enquiries" />
      )}

      {/* Enquiry Detail Modal */}
      {selectedEnquiry && (
        <Modal
          open={!!selectedEnquiry}
          onClose={closeModal}
          title={selectedEnquiry.subject}
          size="lg"
        >
          <div className="space-y-6">
            <p className="text-sm text-neutral-500 -mt-2">{selectedEnquiry.enquiry_number}</p>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Name</p>
                <p className="font-medium text-neutral-900">{selectedEnquiry.name}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Email</p>
                <p className="font-medium text-neutral-900">{selectedEnquiry.email}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Phone</p>
                <p className="font-medium text-neutral-900">{selectedEnquiry.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Type</p>
                <p className="font-medium mt-0.5"><TypeBadge type={selectedEnquiry.type} /></p>
              </div>
            </div>

            {/* Status Actions */}
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['new', 'in_progress', 'responded', 'closed', 'spam'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(selectedEnquiry.id, status)}
                    disabled={selectedEnquiry.status === status}
                    className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                      selectedEnquiry.status === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Message</p>
              <div className="bg-neutral-50 p-4 rounded-xl">
                <p className="text-neutral-800 whitespace-pre-wrap">{selectedEnquiry.message}</p>
              </div>
            </div>

            {/* Admin Response */}
            {selectedEnquiry.admin_response && (
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">Your Response</p>
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <p className="text-neutral-800 whitespace-pre-wrap">{selectedEnquiry.admin_response}</p>
                  <p className="text-xs text-neutral-500 mt-2">
                    Sent on {new Date(selectedEnquiry.responded_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Reply Form */}
            {selectedEnquiry.status !== 'closed' && selectedEnquiry.status !== 'spam' && (
              <div>
                <Textarea
                  label={selectedEnquiry.admin_response ? 'Send Another Response' : 'Send Response'}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={5}
                  placeholder="Type your response here..."
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleRespond} disabled={!responseText.trim() || sending} loading={sending}>
                    {!sending && <Reply className="h-4 w-4 mr-2" />}
                    Send Response
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EnquiriesManagement;
