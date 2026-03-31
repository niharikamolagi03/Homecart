import React, { useState, useEffect } from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Order {
  id: number;
  status: string;
  created_at: string;
}

interface Props {
  shopkeeperProductId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const StarRatingInput = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function ReviewForm({ shopkeeperProductId, onSuccess, onCancel }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEligibleOrders();
  }, []);

  const fetchEligibleOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/orders/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      
      // Filter for delivered orders
      const deliveredOrders = (Array.isArray(data) ? data : data.results || [])
        .filter((order: Order) => order.status === 'DELIVERED');
      
      setOrders(deliveredOrders);
      
      if (deliveredOrders.length === 0) {
        setError('No delivered orders found. You can only review products from delivered orders.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!selectedOrderId) {
      setError('Please select an order');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/reviews/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopkeeper_product: shopkeeperProductId,
          order: selectedOrderId,
          rating,
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = 
          typeof data === 'object' && data !== null
            ? Object.values(data).flat().join(', ')
            : 'Failed to submit review';
        throw new Error(errorMsg);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-yellow-900">
            No delivered orders found. You can only review products from orders with "Delivered" status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <Label htmlFor="order">Select Order *</Label>
        <select
          id="order"
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value ? parseInt(e.target.value) : '')}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose an order...</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              Order #{order.id} ({new Date(order.created_at).toLocaleDateString('en-IN')})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Rating *</Label>
        <div className="mt-2">
          <StarRatingInput value={rating} onChange={setRating} />
        </div>
        {rating > 0 && <p className="text-sm text-gray-600 mt-1">{rating} star{rating !== 1 ? 's' : ''}</p>}
      </div>

      <div>
        <Label htmlFor="comment">Review (Optional)</Label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product..."
          maxLength={500}
          rows={4}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {comment.length}/500 characters
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </form>
  );
}
