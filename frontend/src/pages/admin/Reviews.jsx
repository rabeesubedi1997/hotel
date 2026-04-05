import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Trash2, Loader2, Star } from 'lucide-react';
import { adminAPI } from '../../services/api';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await adminAPI.getReviews(params);
      setReviews(response.data.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveReview = async (id) => {
    try {
      await adminAPI.approveReview(id);
      setReviews(reviews.map((review) =>
        review.id === id ? { ...review, status: 'approved' } : review
      ));
    } catch (error) {
      console.error('Error approving review:', error);
    }
  };

  const rejectReview = async (id) => {
    try {
      await adminAPI.rejectReview(id);
      setReviews(reviews.map((review) =>
        review.id === id ? { ...review, status: 'rejected' } : review
      ));
    } catch (error) {
      console.error('Error rejecting review:', error);
    }
  };

  const deleteReview = async (id) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await adminAPI.deleteReview(id);
      setReviews(reviews.filter((review) => review.id !== id));
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReviews = reviews.filter((review) =>
    review.user?.name.toLowerCase().includes(search.toLowerCase()) ||
    review.comment?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Manage Reviews</h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            fetchReviews();
          }}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredReviews.map((review) => (
              <tr key={review.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{review.user?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{review.reviewable?.name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-gray-900">{review.rating}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{review.comment}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(review.status)}`}>
                    {review.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveReview(review.id)}
                          className="p-2 text-green-600 hover:text-green-800"
                          title="Approve"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => rejectReview(review.id)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="Reject"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="p-2 text-gray-600 hover:text-gray-800"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReviews;
