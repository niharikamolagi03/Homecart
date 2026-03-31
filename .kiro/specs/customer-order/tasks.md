# Implementation Plan

## Task 1: Add payment_method field to Order model

- [ ] 1.1 Add `PaymentMethod` TextChoices class and `payment_method` CharField (choices: CASH/UPI/CARD, default: CASH) to `apps/orders/models.py`
- [ ] 1.2 Run `python manage.py makemigrations orders` and `python manage.py migrate` to apply the migration

## Task 2: Update order serializers

- [ ] 2.1 Add `UPI` to `PlaceOrderSerializer.payment_method` choices in `apps/orders/serializers.py`
- [ ] 2.2 Add `payment_method` to `OrderSerializer.Meta.fields`
- [ ] 2.3 Add `product_name` SerializerMethodField (source: `product.name`) to `OrderItemSerializer`

## Task 3: Fix PlaceOrderView — payment_method, stock safety, and delivery agent assignment

- [ ] 3.1 Pass `payment_method` from validated data into `Order.objects.create(...)` in `apps/orders/views.py`
- [ ] 3.2 Add `select_for_update()` to the cart items query inside `PlaceOrderView.post()`
- [ ] 3.3 Add a pre-validation loop that checks each CartItem quantity against available stock before creating any Order; return HTTP 400 if any item exceeds stock
- [ ] 3.4 After creating each Order, query `User.objects.filter(role='DELIVERY', is_approved=True, is_active=True).first()` and set `order.assigned_delivery` if a result is found (already partially implemented — verify and complete)
- [ ] 3.5 After assigning a delivery agent, import `Notification` from `apps.products.models` and create a Notification for the agent with a message containing the order ID, delivery address, and total price

## Task 4: Fix Checkout.tsx frontend bugs

- [ ] 4.1 Remove the `* 85` multiplier from the `fmt` function in `src/app/components/Checkout.tsx`
- [ ] 4.2 Tighten the card expiry validation regex to `^\d{2}\/\d{2}$` (MM/YY format)

## Task 5: Fix CustomerDashboard — status display

- [ ] 5.1 Add a `statusLabel` helper in `src/app/pages/dashboards/CustomerDashboard.tsx` that maps `PENDING` → `"Placed / Awaiting Confirmation"` and other statuses to a human-readable string
- [ ] 5.2 Replace raw `order.status` renders in the Orders tab with `statusLabel(order.status)`

## Task 6: Update DeliveryDashboard — real orders with full details and status flow

The `OrderSerializer` must expose all fields the delivery dashboard needs. First ensure the backend exposes them, then wire the frontend.

- [ ] 6.1 In `apps/orders/serializers.py`, add to `OrderSerializer`:
  - `customer_name = serializers.CharField(source='customer.name', read_only=True)`
  - `customer_phone = serializers.CharField(source='customer.phone', read_only=True)`
  - `items` nested via `OrderItemSerializer` (already exists — verify `product_name` is included per Task 2.3)
  - Ensure `delivery_address`, `total_price`, `status`, `created_at` are all in `Meta.fields`
  - _Requirements: 10.5, 10.6_

- [ ] 6.2 In `src/app/pages/dashboards/DeliveryDashboard.tsx`, replace the static `activeDeliveries` mock array with real API data:
  - Add `const [orders, setOrders] = useState<any[]>([])`
  - In `useEffect`, call `GET /api/orders/` (use `getOrders` from `@/services/api`) and `setOrders` with the result
  - _Requirements: 10.5_

- [ ] 6.3 Render each assigned order card showing all required fields:
  - Customer name (`order.customer_name`)
  - Delivery address (`order.delivery_address`)
  - Products list — map `order.items` to show `product_name` and `quantity`
  - Contact details — phone number (`order.customer_phone`)
  - Current status badge
  - _Requirements: 10.6_

- [ ] 6.4 Add an "Out for Delivery" action button:
  - Show the button when `order.status === 'ACCEPTED'` or `order.status === 'PREPARING'`
  - On click, call `PATCH /api/orders/{id}/update-status/` with `{ status: 'OUT_FOR_DELIVERY' }` (use `updateOrderStatus` from `@/services/api`)
  - After success, update the order status in local state and show a toast
  - _Requirements: 10.6_

- [ ] 6.5 Add a "Mark Delivered" button:
  - Show when `order.status === 'OUT_FOR_DELIVERY'`
  - On click, call `updateOrderStatus(order.id, { status: 'DELIVERED' })`
  - After success, remove the order from the active list or move it to a completed section
  - _Requirements: 10.6_

## Task 7: Order Tracking — Customer status timeline

- [ ] 7.1 In `src/app/pages/dashboards/CustomerDashboard.tsx`, add a `statusLabel` helper that maps all statuses to display strings:
  - `PENDING` → "Placed"
  - `ACCEPTED` → "Accepted by Shopkeeper"
  - `PREPARING` → "Being Prepared"
  - `OUT_FOR_DELIVERY` → "Out for Delivery"
  - `DELIVERED` → "Delivered"
  - `CANCELLED` → "Cancelled"
  - _Requirements: 6.2, 9.5, 9.6_

- [ ] 7.2 Add a visual status timeline component inside each order card in the Orders tab:
  - Render 4 steps in order: Placed → Accepted → Out for Delivery → Delivered
  - Each step shows a circle icon — filled/coloured if the order has reached or passed that step, grey if not yet
  - Use the existing `order.status` value to determine which steps are active
  - _Requirements: 6.2_

- [ ] 7.3 Poll order status every 15 seconds while the Orders tab is active:
  - Add a `useEffect` that sets `setInterval(loadData, 15_000)` when `activeTab === 'orders'`
  - Clear the interval when the tab changes or the component unmounts
  - This keeps the timeline updating without a manual refresh
  - _Requirements: 6.2_

- [ ] 7.4 Show the "Track Live Location" button only when `status === 'OUT_FOR_DELIVERY'` (already partially implemented — verify it uses the correct condition and opens the `CustomerMap` modal)
  - _Requirements: 6.3_

## Task 8: Live Map — Show delivery agent location to customer

- [ ] 8.1 In `apps/delivery/views.py` (or `apps/orders/views.py`), add or verify a `DeliveryLocationView` endpoint:
  - `GET /api/delivery/location/<order_id>/` — returns the assigned delivery agent's last known `latitude` and `longitude`
  - Query the `DeliveryLocation` model (or equivalent) filtered by `agent = order.assigned_delivery`
  - Return `{ latitude, longitude, updated_at }` or 404 if no location recorded yet
  - _Requirements: 6.3_

- [ ] 8.2 Add `getDeliveryLocation(orderId)` to `src/services/api.js`:
  ```js
  export const getDeliveryLocation = (orderId) => apiCall(`/delivery/location/${orderId}/`);
  ```

- [ ] 8.3 In `src/app/components/CustomerMap.tsx` (or create it if missing), wire the map to show two pins:
  - Blue pin — customer's delivery address (`customerLat`, `customerLng` props, already geocoded at order placement)
  - Green animated pin — delivery agent's live location, fetched from `getDeliveryLocation(orderId)` and refreshed every 10 seconds via `setInterval`
  - Use the existing `LiveMap` / Leaflet + OpenStreetMap setup (no API key needed)
  - _Requirements: 6.3_

- [ ] 8.4 In `CustomerDashboard.tsx`, when the "Track Live Location" button is clicked:
  - Open the tracking modal (already exists — verify it passes `orderId`, `customerLat`, `customerLng` to `CustomerMap`)
  - The map should auto-centre on the delivery agent's position and update every 10 seconds
  - Show a "Last updated X seconds ago" label using the `updated_at` timestamp from the API
  - _Requirements: 6.3_

- [ ] 8.5 In `DeliveryDashboard.tsx`, ensure the delivery agent's location is pushed to the backend every 10 seconds while they have active deliveries:
  - The existing `updateDeliveryLocation(lat, lng)` call in `useEffect` already does this via `watchPosition` — verify it is active and not blocked by the mock data removal in Task 6.2
  - _Requirements: 10.4_

## Task 9: Rules — One agent per order, real-time status, live customer updates

**Rule 1: One order → one delivery agent**

- [ ] 9.1 In `apps/orders/views.py` `PlaceOrderView`, ensure `assigned_delivery` is set exactly once per Order and never overwritten:
  - The assignment query `User.objects.filter(role='DELIVERY', is_approved=True, is_active=True).first()` already runs once per order — verify it is inside the per-order loop, not shared across multiple orders in the same cart
  - Add a DB-level guard: `Order.assigned_delivery` is a nullable `ForeignKey` — once set, it should only be changed via an explicit reassignment endpoint, not silently overwritten on status updates
  - _Requirements: 10.1, 10.2_

**Rule 2: Status updates in real-time**

- [ ] 9.2 In `apps/orders/views.py` `UpdateOrderStatusView`, after saving the new status, create a `Notification` for the customer:
  - Message: `"Your order #{order.id} is now {status_label}"` where `status_label` maps the raw status to a human-readable string
  - Import `Notification` from `apps.products.models`
  - _Requirements: 6.2_

- [ ] 9.3 In `src/app/pages/dashboards/CustomerDashboard.tsx`, confirm the 15-second polling from Task 7.3 is in place — this is the real-time mechanism for status updates without WebSockets

**Rule 3: Customer sees live updates**

- [ ] 9.4 In `CustomerDashboard.tsx`, add a visual "pulse" indicator on the order card when `status === 'OUT_FOR_DELIVERY'`:
  - A small green animated dot next to the status badge to signal live tracking is active
  - Clicking anywhere on the card (or the Track button) opens the live map modal

- [ ] 9.5 In `CustomerMap.tsx`, confirm the delivery agent pin refreshes every 10 seconds (Task 8.3) and the map re-centres on the agent's new position on each update — customer always sees where the agent is without any manual action
