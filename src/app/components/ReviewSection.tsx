import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import ReviewForm from './ReviewForm';

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  is_verified_buyer: boolean;
  created_at: string;
  updated_at: string;
}

interface ReviewStats {
  average_rating: number | null;
  total_reviews: number;
  verified_reviews: number;
  rating_distribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

interface Props {
  shopkeeperProductId: number;
  isEligibleToReview: boolean;
  userEmail?: string;
}

const StarRating = ({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};

const ReviewItem = ({ review }: { review: Review }) => {
  const date = new Date(review.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="border-b border-gray-200 py-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-800">{review.customer_name}</p>
            {review.is_verified_buyer && (
              <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-xs text-green-700">
                <CheckCircle className="w-3 h-3" />
                Verified Purchase
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">{date}</p>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>
      {review.comment && <p className="text-gray-700 text-sm mt-2">{review.comment}</p>}
    </div>
  );
};

export default function ReviewSection({ shopkeeperProductId, isEligibleToReview, userEmail }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [shopkeeperProductId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/reviews/?shopkeeper_product=${shopkeeperProductId}`
      );
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(Array.isArray(data) ? data : data.results || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/reviews/${shopkeeperProductId}/stats/`
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleReviewSubmitted = () => {
    setShowForm(false);
    fetchReviews();
    fetchStats();
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">
        Loading reviews...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          {isEligibleToReview && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Write a Review
            </Button>
          )}
        </div>

        {/* Rating Summary */}
        {stats && stats.total_reviews > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {stats.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}
                </div>
                <StarRating rating={Math.round(stats.average_rating || 0)} size="md" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">
                  Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
                  {stats.verified_reviews > 0 && ` (${stats.verified_reviews} verified)`}
                </div>
                {/* Rating distribution */}
                {Object.entries(stats.rating_distribution)
                  .reverse()
                  .map(([rating, count]) => (
                    <div key={rating} className="flex items-center gap-2 text-xs mb-1">
                      <span className="w-8 text-gray-600">{rating} ★</span>
                      <div className="flex-1 bg-gray-200 rounded h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded"
                          style={{
                            width: `${stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="w-8 text-right text-gray-600">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Eligibility message */}
        {!isEligibleToReview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">
                You can only review products after your order has been delivered.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Complete your purchase and wait for delivery to write a review.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Review form */}
      {showForm && isEligibleToReview && (
        <div className="bg-gray-50 rounded-lg p-4">
          <ReviewForm
            shopkeeperProductId={shopkeeperProductId}
            onSuccess={handleReviewSubmitted}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Reviews list */}
      <div>
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
