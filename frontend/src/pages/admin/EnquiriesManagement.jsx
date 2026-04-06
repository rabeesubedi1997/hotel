import { useState, useEffect } from 'react';
import { 
  Mail, 
  Search, 
  Filter, 
  Eye, 
  Reply, 
  Trash2, 
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { adminAPI } from '../../services/api';

const EnquiriesManagement = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0
  });

  useEffect(() => {
    fetchEnquiries();
  }, [filters.status, filters.type, pagination.current_page]);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const params = {
        status: filters.status,
        type: filters.type,
        search: filters.search,
        page: pagination.current_page
      };
      const response = await adminAPI.getEnquiries(params);
      setEnquiries(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setMessage('Error loading enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, current_page: 1 }));
    fetchEnquiries();
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

  const getStatusBadge = (status) => {
    const badges = {
      new: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      responded: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
      spam: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };
    const badge = badges[status] || badges.new;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const types = {
      booking: 'bg-purple-100 text-purple-700',
      general: 'bg-gray-100 text-gray-700',
      package: 'bg-orange-100 text-orange-700',
      custom: 'bg-pink-100 text-pink-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${types[type] || types.general}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Mail className="h-6 w-6 mr-2" />
          Enquiries
        </h1>
        <div className="text-sm text-gray-500">
          Total: {pagination.total} enquiries
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 mr-2" /> : <Check className="h-5 w-5 mr-2" />}
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by name, email, subject, or enquiry number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </form>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="responded">Responded</option>
            <option value="closed">Closed</option>
            <option value="spam">Spam</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="booking">Booking</option>
            <option value="general">General</option>
            <option value="package">Package</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Enquiries List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No enquiries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enquiries.map((enquiry) => (
                  <tr 
                    key={enquiry.id} 
                    onClick={() => setSelectedEnquiry(enquiry)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{enquiry.subject}</div>
                      <div className="text-xs text-gray-500">{enquiry.enquiry_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{enquiry.name}</div>
                      <div className="text-xs text-gray-500">{enquiry.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(enquiry.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(enquiry.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(enquiry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEnquiry(enquiry);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(enquiry.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
              disabled={pagination.current_page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
              disabled={pagination.current_page === pagination.last_page}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Enquiry Detail Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedEnquiry.subject}</h2>
                <p className="text-sm text-gray-500">{selectedEnquiry.enquiry_number}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedEnquiry(null);
                  setResponseText('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Name</p>
                  <p className="font-medium">{selectedEnquiry.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <p className="font-medium">{selectedEnquiry.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Phone</p>
                  <p className="font-medium">{selectedEnquiry.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Type</p>
                  <p className="font-medium">{getTypeBadge(selectedEnquiry.type)}</p>
                </div>
              </div>

              {/* Status Actions */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {['new', 'in_progress', 'responded', 'closed', 'spam'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(selectedEnquiry.id, status)}
                      disabled={selectedEnquiry.status === status}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        selectedEnquiry.status === status
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Message</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedEnquiry.message}</p>
                </div>
              </div>

              {/* Admin Response */}
              {selectedEnquiry.admin_response && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Response</p>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedEnquiry.admin_response}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Sent on {new Date(selectedEnquiry.responded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Reply Form */}
              {selectedEnquiry.status !== 'closed' && selectedEnquiry.status !== 'spam' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {selectedEnquiry.admin_response ? 'Send Another Response' : 'Send Response'}
                  </p>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Type your response here..."
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleRespond}
                      disabled={!responseText.trim() || sending}
                      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <Reply className="h-4 w-4 mr-2" />
                      )}
                      Send Response
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnquiriesManagement;
