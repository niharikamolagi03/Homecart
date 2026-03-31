# Design Document

## Introduction

This document describes the technical design for the Customer Order feature. It covers the backend Django REST changes and frontend React changes needed to satisfy all nine requirements in the requirements document.

The existing codebase already has a working skeleton: `Order`, `OrderItem`, `Cart`, `CartItem` models exist; `PlaceOrderView`, `OrderListView`, and `Checkout.tsx` exist. The work is primarily **additive fixes and extensions** rather than greenfield development.

---

## Glossary

- **Order_API**: Django REST endpoints under `/api/orders/`
- **Cart_API**: Django REST endpoints under `/api/cart/`
- **Checkout**: The `Checkout.tsx` React modal component
- **CustomerDashboard**: `CustomerDashboard.tsx` React page
- **fmt**: INR currency formatter function
- **ShopkeeperProduct**: Product listed by a shopkeeper with `selling_price` and `stock`
- **Geocoder**: Nominatim OpenStreetMap API called from the frontend

---

## Architecture Overview

```
CustomerDashboard.tsx
  ├── Cart tab  →  Cart_API  (GET /api/cart/)
  ├── Checkout modal  →  Order_API  (POST /api/orders/place/)
  └── Orders tab  →  Order_API  (GET /api/orders/)

Django Backend
  ├── apps/orders/models.py      — Order, OrderItem
  ├── apps/orders/serializers.py — PlaceOrderSerializer, OrderSerializer, OrderItemSerializer
  ├── apps/orders/views.py       — PlaceOrderView, OrderListView
  └── apps/cart/models.py        — Cart, CartItem
```

---

## Component Design

### 1. Backend — `apps/orders/models.py`

**Gap**: `Order` model is missing `payment_method` field.

**Change**: Add `payment_method` CharField with choices CASH/UPI/CARD, default CASH.

```python
class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Cash'
    UPI  = 'UPI',  'UPI'
    CARD = 'CARD', 'Card'

payment_method = models.CharField(
    max_length=10,
    choices=PaymentMethod.choices,
    default=PaymentMethod.CASH
)
```

A new migration is required after this change.

**No other model changes are needed.** All other fields (`customer`, `shopkeeper`, `delivery_address`, `total_price`, `payment_status`, `status`, `latitude`, `longitude`, `created_at`) already exist on `Order`. `OrderItem` already stores `product`, `quantity`, and `price` (selling_price snapshot).

---

### 2. Backend — `apps/orders/serializers.py`

**Gap 1**: `PlaceOrderSerializer` only accepts `CASH` and `CARD` — missing `UPI`.

**Change**: Update `payment_method` choices to include `UPI`.

```python
payment_method = serializers.ChoiceField(
    choices=['CASH', 'UPI', 'CARD'],
    default='CASH'
)
```

**Gap 2**: `OrderSerializer` does not expose `payment_method` or `created_at` in a customer-friendly shape, and `OrderItemSerializer` does not expose `product_name` as a flat field.

**Change**: Add `payment_method` to `OrderSerializer.Meta.fields`. Add a `product_name` SerializerMethodField to `OrderItemSerializer`.

```python
class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.name', read_only=True
    )
    total_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_name', 'quantity', 'price', 'total_price')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    ...
    class Meta:
        model = Order
        fields = (
            'id', 'customer', 'shopkeeper_name', 'delivery_name', 'items',
            'total_price', 'status', 'payment_status', 'payment_method',
            'delivery_address', 'latitude', 'longitude',
            'assigned_delivery', 'created_at', 'updated_at'
        )
```

---

### 3. Backend — `apps/orders/views.py` (`PlaceOrderView`)

**Gap 1**: `payment_method` is not passed from the serializer to `Order.objects.create(...)`.

**Change**: Pass `payment_method` when creating the Order.

```python
order = Order.objects.create(
    customer=request.user,
    shopkeeper=shopkeeper,
    total_price=total,
    delivery_address=serializer.validated_data['delivery_address'],
    payment_method=serializer.validated_data.get('payment_method', 'CASH'),
    latitude=serializer.validated_data.get('latitude'),
    longitude=serializer.validated_data.get('longitude'),
)
```

**Gap 2**: Stock deduction does not use `select_for_update()`, so concurrent orders can oversell.

**Change**: Add `select_for_update()` to the cart items query and validate stock before creating any order.

```python
@transaction.atomic
def post(self, request):
    ...
    cart_items = list(
        cart.items.select_related('product__shopkeeper')
                  .select_for_update()
                  .all()
    )
    # Pre-validate all stock before touching anything
    for item in cart_items:
        if item.quantity > item.product.stock:
            return Response(
                {'error': f'Insufficient stock for {item.product.name}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    # Then create orders and deduct stock
    ...
```

**Gap 3**: `total_price` on the Order is computed from `CartItem.total_price` (which uses live `selling_price`), but `OrderItem.price` is also set to `selling_price`. These are consistent — no change needed — but the design makes this explicit: `total_price = sum(item.product.selling_price * item.quantity for item in items)`.

---

### 4. Backend — Migration

After adding `payment_method` to `Order`:

```bash
python manage.py makemigrations orders
python manage.py migrate
```

---

### 5. Frontend — `Checkout.tsx`

**Gap 1**: `fmt` multiplies by 85 (currency conversion bug).

**Change**: Replace the `fmt` function body:

```typescript
// Before (buggy):
const fmt = (n: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0
}).format(n * 85);  // ← BUG

// After:
const fmt = (n: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0
}).format(n);
```

**Gap 2**: The order payload does not include `payment_method`. It already does — `handlePlaceOrder` sends `payment_method: payment`. No change needed here.

**Gap 3**: CARD expiry validation uses `includes('/')` which is too loose. The requirement specifies MM/YY format.

**Change**: Tighten the regex:

```typescript
if (!/^\d{2}\/\d{2}$/.test(card.expiry)) {
  setError('Enter expiry as MM/YY'); return false;
}
```

---

### 6. Frontend — `CustomerDashboard.tsx`

**Gap 1**: Orders tab displays raw `PENDING` status string.

**Change**: Add a `statusLabel` helper that maps status values to display strings:

```typescript
const statusLabel = (s: string) => {
  if (s === 'PENDING') return 'Placed / Awaiting Confirmation';
  return s.replace(/_/g, ' ');
};
```

Use `statusLabel(order.status)` wherever the order status badge is rendered.

**Gap 2**: Cart total display may use a `fmt` with the ×85 bug (if it imports or duplicates the Checkout fmt). The `CustomerDashboard.tsx` already has its own correct `fmt` (line 26) — no change needed there.

---

## Data Flow: Order Placement

```
Customer clicks "Pay"
  → Checkout.tsx: geocodeAddress(address)
  → Checkout.tsx: POST /api/orders/place/
      { delivery_address, payment_method, latitude, longitude }
  → PlaceOrderView.post()
      → select_for_update() on cart items
      → validate stock for all items
      → transaction.atomic:
          → Order.create(... payment_method ...)
          → OrderItem.create(price=selling_price snapshot) × N
          → product.stock -= quantity × N
          → cart.items.delete()
      → return OrderSerializer(order)
  → Checkout.tsx: setStep('success') → onSuccess()
  → CustomerDashboard: reload orders tab
```

---

## API Contract

### POST `/api/orders/place/`

Request:
```json
{
  "delivery_address": "123 Main St, City",
  "payment_method": "UPI",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

Response (201):
```json
{
  "message": "Order placed successfully",
  "orders": [
    {
      "id": 42,
      "status": "PENDING",
      "payment_status": "PENDING",
      "payment_method": "UPI",
      "delivery_address": "Name, Phone, 123 Main St",
      "total_price": "450.00",
      "created_at": "2024-01-15T10:30:00Z",
      "items": [
        { "id": 1, "product_name": "Tomatoes", "quantity": 2, "price": "25.00", "total_price": "50.00" }
      ]
    }
  ]
}
```

Response (400 — stock error):
```json
{ "error": "Insufficient stock for Tomatoes" }
```

### GET `/api/orders/`

Returns all orders for the authenticated customer, ordered by `created_at` descending. Each order includes the full `items` list with `product_name`, `quantity`, and `price`.

---

## Correctness Properties

### Property 1: Stock Deduction Invariant
For any successful order placement, the sum of all `OrderItem.quantity` values for a given `ShopkeeperProduct` equals the total reduction in `ShopkeeperProduct.stock` since placement. Verified by: `pre_stock - post_stock == sum(item.quantity for item in order.items.filter(product=p))`.

### Property 2: Cart-to-Order Consistency
For every `CartItem` in the customer's cart at placement time, there exists exactly one `OrderItem` in the created order with the same `product_id` and `quantity`.

### Property 3: Price Snapshot Immutability
`OrderItem.price` equals `ShopkeeperProduct.selling_price` at the moment of order creation. Subsequent changes to `selling_price` do not affect existing `OrderItem.price` values.

### Property 4: Total Price Consistency
`Order.total_price == sum(item.price * item.quantity for item in order.items.all())` holds for all orders.

### Property 5: fmt Idempotence
`fmt(fmt_raw(n)) == fmt(n)` — applying the INR formatter to a raw number produces the same display string regardless of how many times it is applied (no multiplier accumulation).

### Property 6: Concurrent Oversell Prevention
Given two concurrent requests each requesting quantity Q for a product with stock S where 2Q > S, at most one request succeeds. The other receives HTTP 400.

---

## Files to Change

| File | Change |
|------|--------|
| `local_vendors_marketplace/apps/orders/models.py` | Add `payment_method` field + `PaymentMethod` choices class |
| `local_vendors_marketplace/apps/orders/serializers.py` | Add `UPI` to `PlaceOrderSerializer`; add `payment_method` + `product_name` to `OrderSerializer`/`OrderItemSerializer` |
| `local_vendors_marketplace/apps/orders/views.py` | Pass `payment_method` to `Order.create`; add `select_for_update()` + pre-validation loop |
| `src/app/components/Checkout.tsx` | Fix `fmt` (remove ×85); tighten expiry regex |
| `src/app/pages/dashboards/CustomerDashboard.tsx` | Add `statusLabel` helper; render PENDING as "Placed / Awaiting Confirmation" |
| *(new migration)* | `apps/orders/migrations/0007_order_payment_method.py` |
