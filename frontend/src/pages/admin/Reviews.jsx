import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Trash2, Loader2, Star } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Input, Select, Table, Th, Td, Badge } from '../../components/ui';

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
        <h2 className="font-display text-2xl font-bold text-neutral-900">Manage Reviews</h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Input
          icon={Search}
          type="text"
          placeholder="Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            fetchReviews();
          }}
          className="w-full sm:w-auto"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Item</Th>
            <Th>Rating</Th>
            <Th>Comment</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {filteredReviews.map((review) => (
            <tr key={review.id}>
              <Td className="text-neutral-900">{review.user?.name}</Td>
              <Td className="text-neutral-500">{review.reviewable?.name}</Td>
              <Td>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-amber-400 fill-current" />
                  <span className="ml-1 text-neutral-900">{review.rating}</span>
                </div>
              </Td>
              <Td className="whitespace-normal max-w-xs text-neutral-500 truncate">{review.comment}</Td>
              <Td>
                <Badge status={review.status} />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  {review.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approveReview(review.id)}
                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-800"
                        title="Approve"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => rejectReview(review.id)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800"
                        title="Reject"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default AdminReviews;
