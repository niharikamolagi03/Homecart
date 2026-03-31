# HomeCart Product Review System - Implementation Guide

## Overview

The HomeCart Product Review System is a secure, authentication-based review system that ensures only verified buyers can leave reviews for products. This document provides a comprehensive guide to understanding and using the review system.

## Features

### 1. **Review Eligibility**
- ✅ Only customers with orders in "Delivered" status can review products
- ✅ Prevents fake reviews from non-buyers
- ✅ One review per customer per product per order (enforced via unique constraint)

### 2. **Review Submission**
- ✅ Star rating (1-5 stars)
- ✅ Optional text comment (up to 500 characters)
- ✅ Automatic "Verified Purchase" badge for genuine orders
- ✅ Validation ensures reviews are only from delivered orders

### 3. **Access Control**
- ✅ Review submission: Authentication required (POST /api/reviews/)
- ✅ Review viewing: Publicly accessible (no auth needed)
- ✅ Review editing/deletion: Only by review author
- ✅ Fine-grained permissions to prevent unauthorized actions

### 4. **Review Visibility**
- ✅ All reviews are publicly visible to logged-in and guest users
- ✅ "Verified Purchase" badge automatically displayed
- ✅ Customer name displayed (not email)
- ✅ Rating and comment clearly formatted
- ✅ Review date shown

### 5. **Review Statistics**
- ✅ Average rating calculation
- ✅ Total review count
- ✅ Verified/Unverified breakdown
- ✅ Rating distribution (5-star breakdown)

## Backend Architecture

### Database Models

#### Review Model (`apps/products/models.py`)
```python
class Review(models.Model):
    customer = ForeignKey(User)                    # Reviewer
    shopkeeper_product = ForeignKey(ShopkeeperProduct)  # Product reviewed
    order = ForeignKey(Order)                      # Associated order
    rating = IntegerField(1-5)                     # Star rating
    comment = TextField()                          # Review text
    verified_purchase = BooleanField()             # Auto-set if order delivered
    created_at = DateTimeField()                   # Creation timestamp
    updated_at = DateTimeField()                   # Last update timestamp
    
    # Unique constraint: One review per customer per product per order
    unique_together = ('customer', 'shopkeeper_product', 'order')
```

**Key Features:**
- `is_verified_buyer` property: Returns `True` if order status is "DELIVERED"
- Unique constraint prevents duplicate reviews
- Database indexes for performance on product and customer queries

### Views/Endpoints

#### 1. **ProductReviewsView** - List & Create Reviews
- **GET** `/api/reviews/?shopkeeper_product={id}`
  - Public endpoint (no auth required)
  - Returns all reviews for a product
  - Parameters: `shopkeeper_product` (required)
  - Response: Array of review objects

- **POST** `/api/reviews/`
  - Requires authentication
  - Creates a new review
  - Body:
    ```json
    {
      "shopkeeper_product": 123,
      "order": 456,
      "rating": 5,
      "comment": "Great product!"
    }
    ```
  - Validation:
    - Rating must be 1-5
    - Order must belong to authenticated user
    - Order status must be "DELIVERED"
    - Product must exist in the order
    - No duplicate review for this product from this order

#### 2. **ProductReviewDetailView** - View, Update, Delete Individual Review
- **GET** `/api/reviews/{id}/`
  - Public endpoint
  - Returns single review details

- **PATCH** `/api/reviews/{id}/`
  - Requires authentication
  - Only review author can edit
  - Editable fields: `rating`, `comment`

- **DELETE** `/api/reviews/{id}/`
  - Requires authentication
  - Only review author can delete

#### 3. **CustomerReviewsView** - Reviews by Authenticated Customer
- **GET** `/api/reviews/my/`
  - Requires authentication
  - Returns reviews submitted by current user
  - Sorted by newest first

#### 4. **ProductReviewStatsView** - Review Statistics
- **GET** `/api/reviews/{shopkeeper_product_id}/stats/`
  - Public endpoint
  - Returns aggregated statistics
  - Response:
    ```json
    {
      "average_rating": 4.5,
      "total_reviews": 10,
      "verified_reviews": 8,
      "rating_distribution": {
        "5": 6,
        "4": 3,
        "3": 1,
        "2": 0,
        "1": 0
      }
    }
    ```

### Serializers

#### ReviewListSerializer
Used for displaying reviews to clients:
```python
fields: id, customer_name, rating, comment, verified_purchase, 
        is_verified_buyer, created_at, updated_at
```

#### ReviewCreateSerializer
Used when creating reviews:
- Validates order belongs to user
- Checks order status = DELIVERED
- Verifies product in order
- Prevents duplicate reviews
- Auto-sets `verified_purchase = True`

#### ReviewDetailSerializer
Used for viewing/updating reviews:
- Same fields as ListSerializer
- `customer_name` and timestamps are read-only

## Frontend Architecture

### Components

#### ReviewSection Component
Main component for displaying reviews on product detail page.

**Props:**
```typescript
{
  shopkeeperProductId: number;
  isEligibleToReview: boolean;
  userEmail?: string;
}
```

**Features:**
- Displays review statistics (average rating, distribution)
- Shows all reviews with proper formatting
- "Write a Review" button only for eligible users
- Integrated with ReviewForm component
- Auto-refreshes after new review submission
- Responsive design with Tailwind CSS

**Example Usage:**
```tsx
<ReviewSection 
  shopkeeperProductId={product.id}
  isEligibleToReview={userHasDeliveredOrder}
  userEmail={user?.email}
/>
```

#### ReviewForm Component
Modal/form for submitting new reviews.

**Props:**
```typescript
{
  shopkeeperProductId: number;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Features:**
- Interactive 5-star rating selector
- Text comment field (500 char limit)
- Dropdown to select delivered order
- Fetches user's delivered orders
- Validates all inputs
- Shows helpful error messages
- Character counter for comment

**Validation:**
- Rating required (1-5)
- Order required
- Comment optional but limited to 500 chars
- Only delivered orders shown

### API Functions (`src/services/api.js`)

```javascript
// List reviews for a product
getProductReviews(shopkeeperProductId)

// Create a new review
createReview(data)

// Get specific review
getReviewDetail(id)

// Update review
updateReview(id, data)

// Delete review
deleteReview(id)

// Get current user's reviews
getMyReviews()

// Get review statistics
getProductReviewStats(shopkeeperProductId)
```

## Security Considerations

### Access Control
- ✅ Reviews can only be created by authenticated users
- ✅ Only customers with delivered orders can submit reviews
- ✅ Users can only edit/delete their own reviews
- ✅ Review data is validated server-side

### Data Validation
- ✅ Rating range enforced (1-5)
- ✅ Order ownership validated
- ✅ Order status verified (DELIVERED)
- ✅ Product existence in order validated
- ✅ Duplicate prevention via unique constraint

### Permissions
- ✅ Unauthenticated users can view reviews
- ✅ Authenticated users can submit reviews (if eligible)
- ✅ Review authors can edit/delete
- ✅ Django admin can manage all reviews

## How to Use

### For Customers

#### Post a Review
1. Complete an order and receive it (status = "Delivered")
2. Visit product page
3. Scroll to "Customer Reviews" section
4. See "Write a Review" button (only visible if eligible)
5. Click button to open review form
6. Select the delivered order containing the product
7. Click stars to rate (1-5)
8. Write optional comment (max 500 chars)
9. Click "Submit Review"
10. Review appears immediately with "Verified Purchase" badge

#### Edit a Review
1. After posting, you can edit your review
2. The rating and comment can be changed
3. Updated timestamp will reflect the change

#### Delete a Review
1. Only you can delete your own review
2. Once deleted, it cannot be recovered

### For Developers

#### Integrate into Product Page
```tsx
import ReviewSection from '@/components/ReviewSection';

export default function ProductDetail() {
  const [customer, setCustomer] = useState(null);
  
  // Check if customer is eligible
  const isEligible = customer?.delivered_orders?.some(
    order => order.items.some(item => item.product_id === productId)
  );
  
  return (
    <div>
      {/* Product details */}
      <ReviewSection 
        shopkeeperProductId={productId}
        isEligibleToReview={isEligible}
        userEmail={customer?.email}
      />
    </div>
  );
}
```

#### Fetch Reviews with Statistics
```javascript
// Both calls together
const [reviews, stats] = await Promise.all([
  getProductReviews(productId),
  getProductReviewStats(productId)
]);

// Display results
console.log(`Product has ${stats.total_reviews} reviews`);
console.log(`Average rating: ${stats.average_rating}/5`);
console.log(`${stats.verified_reviews} verified purchases`);
```

## Testing Guidelines

### Manual Testing Checklist

- [ ] Review visibility
  - [ ] Reviews visible to all users (logged in or not)
  - [ ] Verified Purchase badge visible for delivered orders
  - [ ] Unverified badge visible for other reviews (if any)
  - [ ] Review creation timestamp displayed correctly
  
- [ ] Review submission
  - [ ] User without delivered order sees info message
  - [ ] Rating required validation works
  - [ ] Order selection dropdown populated correctly
  - [ ] Comment character counter works
  - [ ] Submission successful and review appears
  - [ ] Duplicate prevention works
  
- [ ] Statistics
  - [ ] Average rating calculated correctly
  - [ ] Rating distribution accurate
  - [ ] Total count updated after new review
  
- [ ] Permissions
  - [ ] Non-authenticated users can view but not submit
  - [ ] Authenticated users without delivered orders cannot submit
  - [ ] Users can only edit own reviews
  - [ ] Users can only delete own reviews

### API Testing Examples

```bash
# Get reviews for product 1
curl -X GET http://127.0.0.1:8000/api/reviews/?shopkeeper_product=1

# Get review statistics
curl -X GET http://127.0.0.1:8000/api/reviews/1/stats/

# Create a review (requires auth token)
curl -X POST http://127.0.0.1:8000/api/reviews/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopkeeper_product": 1,
    "order": 10,
    "rating": 5,
    "comment": "Excellent product!"
  }'

# Get current user's reviews
curl -X GET http://127.0.0.1:8000/api/reviews/my/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update a review
curl -X PATCH http://127.0.0.1:8000/api/reviews/5/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "comment": "Still great!"
  }'
```

## Database Migrations

The migration file `apps/products/migrations/0004_review.py` creates:
- Review table with all necessary fields
- Unique constraint on (customer, shopkeeper_product, order)
- Indexes for fast queries on product and customer

To apply migrations:
```bash
python manage.py migrate products
```

## Performance Considerations

### Indexes
- Product + date index for sorting reviews by product
- Customer + product index for duplicate prevention
- Both improve query performance significantly

### Caching (Future Enhancement)
Consider caching:
- Review statistics (invalidate on new review)
- Product review list (invalidate on new/updated review)
- Customer review list (invalidate on new review)

### Query Optimization
- `select_related()` for customer and order
- `prefetch_related()` for reviews on product detail
- Pagination on review list (to be implemented)

## Known Limitations & Future Enhancements

### Current Limitations
- No image upload in reviews (future enhancement)
- No review moderation system (auto or manual)
- No review helpfulness voting
- No review replies/comments
- No spam detection

### Planned Features
- ✨ Image uploads in reviews
- ✨ Review moderation (flag inappropriate)
- ✨ "Was this helpful?" voting
- ✨ Admin review approval workflow
- ✨ Automated spam detection
- ✨ Review filtering by rating
- ✨ Review search functionality
- ✨ Seller response to reviews
- ✨ Email notifications for new reviews
- ✨ Review trending/trending products

## Troubleshooting

### Issue: "You can only review products from delivered orders"
**Solution:** Ensure the order associated with the review has status = "DELIVERED"

### Issue: "You have already reviewed this product from this order"
**Solution:** The unique constraint prevents duplicate reviews. You can edit the existing review instead.

### Issue: Review not appearing immediately
**Solution:** Try refreshing the page. Reviews are created instantly but caching might delay visibility.

### Issue: "This product is not in the selected order"
**Solution:** Select an order that actually contains the product being reviewed.

## Admin Management

In Django admin (`/admin/`):
- View all reviews
- Filter by rating, verified status, date
- Search by customer name or product name
- Edit review content (except customer/order/verified flag which are readonly)
- Delete reviews
- See verified buyer indicators

## Compliance & Privacy

- ✅ Customer emails not displayed (only names)
- ✅ Review data stored securely in database
- ✅ Authentic reviews only (order verification)
- ✅ User can delete their own reviews anytime
- ✅ GDPR compliant (user data controlled by user)

---

## Summary

The HomeCart Review System successfully achieves:
✅ Trust through verified purchase badges
✅ Authenticity via order verification
✅ Security through proper access control
✅ Transparency with public reviews
✅ User empowerment with edit/delete capabilities
✅ Performance with optimized queries

This implementation provides a solid foundation for an e-commerce platform's review ecosystem.
