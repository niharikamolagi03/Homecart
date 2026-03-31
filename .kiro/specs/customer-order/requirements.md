# Requirements Document

## Introduction

The Customer Order feature enables customers in the Local Vendors Marketplace to add products to a cart, manage cart contents, complete a two-step checkout (delivery details → payment selection), and place orders. It also covers order history viewing. This spec additionally captures two known defects: the ×85 currency conversion bug in `Checkout.tsx` and the missing `payment_method` field on the `Order` model.

## Glossary

- **Cart**: A OneToOne model per authenticated customer user that holds CartItems before checkout.
- **CartItem**: A line item in a Cart linking a ShopkeeperProduct with a quantity. Unique per (cart, product).
- **ShopkeeperProduct**: A product listed by a shopkeeper with a `selling_price` (in INR) and a `stock` count.
- **Order**: A placed order with status, payment_status, delivery_address, and (after this feature) payment_method.
- **OrderItem**: A snapshot of a CartItem captured at order placement time (product, quantity, price).
- **Checkout**: The two-step frontend modal: Step 1 collects delivery details; Step 2 collects payment method.
- **Payment_Method**: One of CASH, UPI, or CARD, selected by the customer during checkout.
- **Geocoder**: The Nominatim OpenStreetMap API used to resolve a text address into latitude/longitude.
- **Cart_API**: The Django REST backend endpoints for cart read/write operations.
- **Order_API**: The Django REST backend endpoints for order placement and retrieval.
- **fmt**: The currency formatting utility function in the frontend that renders INR amounts.

---

## Requirements

### Requirement 1: Add Product to Cart

**User Story:** As a customer, I want to add a product to my cart, so that I can collect items before placing an order.

#### Acceptance Criteria

1. WHEN a customer clicks "Add" on a product with `stock > 0`, THE Cart_API SHALL add one unit of that product to the customer's Cart and return the updated Cart.
2. WHEN a customer adds a product that already exists in the Cart, THE Cart_API SHALL increment the existing CartItem quantity by 1 rather than creating a duplicate entry.
3. WHEN a customer attempts to add a product whose `stock` is 0, THE Cart_API SHALL reject the request with an HTTP 400 error and a descriptive message.
4. WHEN a customer attempts to add a quantity that would exceed the product's available `stock`, THE Cart_API SHALL reject the request with an HTTP 400 error indicating the available stock.
5. WHILE a product's `stock` is 0, THE CustomerDashboard SHALL display an "Out of Stock" overlay on that product card and disable the "Add" button.

---

### Requirement 2: Cart Management

**User Story:** As a customer, I want to view and manage my cart, so that I can review items and their costs before checkout.

#### Acceptance Criteria

1. THE Cart_API SHALL return the customer's Cart including all CartItems, each with product name, image URL, quantity, unit price, and line total.
2. THE CustomerDashboard SHALL display the cart item count in the Cart tab label.
3. WHEN a customer removes a CartItem, THE Cart_API SHALL delete that CartItem and return the updated Cart.
4. THE Cart_API SHALL compute and return `total_price` as the sum of `selling_price × quantity` for all CartItems, with all amounts in INR.
5. THE CustomerDashboard SHALL display the cart total using the `fmt` function without any currency conversion multiplier.
6. WHEN the Cart contains zero items, THE CustomerDashboard SHALL display an empty-cart message and a "Start Shopping" button.

---

### Requirement 3: Checkout Step 1 — Delivery Details

**User Story:** As a customer, I want to enter my delivery details, so that my order can be delivered to the correct address.

#### Acceptance Criteria

1. THE Checkout SHALL present a Step 1 form collecting: Full Name (required), Phone Number (required), and Delivery Address (required).
2. WHEN a customer clicks "Continue to Payment" with any required field empty, THE Checkout SHALL display a field-specific error message and SHALL NOT advance to Step 2.
3. WHEN a customer clicks "Continue to Payment" with all required fields filled, THE Checkout SHALL advance to Step 2.
4. WHEN the customer proceeds to place an order, THE Checkout SHALL call the Geocoder with the delivery address and include the resolved `latitude` and `longitude` in the order payload; IF the Geocoder returns no result, THE Checkout SHALL send `null` for both coordinates.
5. THE Checkout SHALL display the order subtotal and total in INR using the `fmt` function without multiplying by any conversion factor.

---

### Requirement 4: Checkout Step 2 — Payment Method Selection

**User Story:** As a customer, I want to select a payment method, so that I can pay for my order in my preferred way.

#### Acceptance Criteria

1. THE Checkout SHALL present three payment options: CASH (pay on delivery), UPI, and CARD.
2. WHEN a customer selects UPI, THE Checkout SHALL display a UPI ID input field.
3. WHEN a customer selects CARD, THE Checkout SHALL display card number, expiry (MM/YY), and CVV input fields.
4. WHEN a customer clicks "Pay" with UPI selected and the UPI ID does not contain "@", THE Checkout SHALL display a validation error and SHALL NOT submit the order.
5. WHEN a customer clicks "Pay" with CARD selected and the card number has fewer than 16 digits, THE Checkout SHALL display a validation error and SHALL NOT submit the order.
6. WHEN a customer clicks "Pay" with CARD selected and the expiry does not match MM/YY format, THE Checkout SHALL display a validation error and SHALL NOT submit the order.
7. WHEN a customer clicks "Pay" with CARD selected and the CVV has fewer than 3 digits, THE Checkout SHALL display a validation error and SHALL NOT submit the order.
8. THE Checkout SHALL include the selected `payment_method` value (CASH, UPI, or CARD) in the order placement request payload.

---

### Requirement 5: Order Placement

**User Story:** As a customer, I want to place my order, so that the shopkeeper can prepare and dispatch my items.

#### Acceptance Criteria

1. WHEN a customer submits a valid checkout form, THE Order_API SHALL create an Order with status PENDING, payment_status PENDING, and the provided `delivery_address`, `latitude`, `longitude`, and `payment_method`.
2. WHEN an Order is created, THE Order_API SHALL create one OrderItem per CartItem, capturing the product, quantity, and `selling_price` at the time of placement.
3. WHEN an Order is created, THE Order_API SHALL deduct each CartItem's quantity from the corresponding ShopkeeperProduct's `stock` atomically.
4. IF any CartItem's quantity exceeds the ShopkeeperProduct's available `stock` at placement time, THEN THE Order_API SHALL reject the entire order with HTTP 400 and SHALL NOT modify any stock or create any Order or OrderItem.
5. WHEN an Order is successfully created, THE Order_API SHALL clear all CartItems from the customer's Cart.
6. WHEN an Order is successfully created, THE Checkout SHALL display a success screen and redirect the customer to the Orders tab.
7. THE Order model SHALL store `payment_method` as a CharField with choices CASH, UPI, CARD.

---

### Requirement 6: Order History

**User Story:** As a customer, I want to view my past orders, so that I can track their status and review what I ordered.

#### Acceptance Criteria

1. THE Order_API SHALL return all Orders belonging to the authenticated customer, ordered by `created_at` descending.
2. THE CustomerDashboard SHALL display each Order with: order ID, placement date, delivery address, total price (in INR), order status badge, and payment status.
3. WHEN an Order has status OUT_FOR_DELIVERY, THE CustomerDashboard SHALL display a "Track Live Location" button for that order.
4. WHEN an Order has status CANCELLED, THE CustomerDashboard SHALL display the status badge in a red style.
5. WHEN the customer has no orders, THE CustomerDashboard SHALL display a "No orders yet" message and a "Start Shopping" button.

---

### Requirement 7: Data Integrity — No Overselling

**User Story:** As a platform operator, I want stock to be accurately decremented on order placement, so that products are never oversold.

#### Acceptance Criteria

1. THE Order_API SHALL perform stock deduction and Order creation within a single database transaction so that a partial failure leaves no inconsistent state.
2. FOR ALL valid order placements, the sum of all OrderItem quantities for a given ShopkeeperProduct SHALL equal the total reduction in that product's `stock` since the order was placed (stock deduction invariant).
3. FOR ALL valid order placements, every CartItem in the customer's Cart at placement time SHALL have a corresponding OrderItem in the created Order with the same product and quantity (cart-to-order consistency property).
4. WHEN two concurrent requests attempt to place orders that together exceed a product's available stock, THE Order_API SHALL allow at most one to succeed and SHALL reject the other with HTTP 400.

---

### Requirement 8: Currency Display Fix

**User Story:** As a customer, I want prices displayed correctly in INR, so that I am not shown inflated amounts due to a conversion bug.

#### Acceptance Criteria

1. THE fmt function in `Checkout.tsx` SHALL format a number as INR currency without multiplying the value by any conversion factor.
2. THE fmt function in `Checkout.tsx` SHALL produce output equivalent to `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)` where `n` is the input value.
3. WHEN the same `cartTotal` value is passed to both `CustomerDashboard` and `Checkout`, THE displayed total in the Checkout modal SHALL equal the displayed total in the Cart tab (consistency between fmt implementations).

---

### Requirement 9: Order Record Structure

**User Story:** As a customer, I want my order to capture all relevant details at placement time, so that I have a complete and accurate record of what I ordered, where it should be delivered, and how I paid.

#### Acceptance Criteria

1. WHEN an Order is created, THE Order model SHALL store: customer (FK to User), shopkeeper (FK to User, derived from the cart items), delivery_address (text), total_price (sum of all OrderItem line totals), payment_method (CASH/UPI/CARD), payment_status (PENDING), status (PENDING), latitude (nullable decimal), longitude (nullable decimal), and created_at (auto-set timestamp).
2. WHEN an Order is created, THE Order_API SHALL create one OrderItem per CartItem with: product (FK to ShopkeeperProduct), quantity, and price (snapshot of selling_price at placement time).
3. THE Order_API SHALL compute total_price as the sum of (OrderItem.price × OrderItem.quantity) for all items in the order.
4. THE Order_API response SHALL include: order id, status, payment_status, payment_method, delivery_address, total_price, created_at, and a list of order items each containing product name, quantity, and unit price.
5. WHEN an Order is first created, its status SHALL be PENDING (representing "Placed" — the order has been received and is awaiting shopkeeper acceptance).
6. THE CustomerDashboard SHALL display status PENDING as "Placed / Awaiting Confirmation" to the customer.


---

### Requirement 10: Delivery Agent Assignment and Notification

**User Story:** As a delivery agent, I want to be automatically assigned to new orders and notified with order details, so that I can promptly begin delivery.

#### Acceptance Criteria

1. WHEN an Order is created, THE Order_API SHALL attempt to assign an available delivery agent by querying User objects with role=DELIVERY, is_approved=True, is_active=True and selecting the first available one.
2. IF an available delivery agent is found, THE Order_API SHALL set Order.assigned_delivery to that agent.
3. IF no delivery agent is available, THE Order_API SHALL leave Order.assigned_delivery as null and SHALL NOT fail the order placement.
4. WHEN a delivery agent is assigned, THE Order_API SHALL create a Notification for that agent containing: order ID, customer delivery address, and total price.
5. THE DeliveryDashboard SHALL display all orders assigned to the authenticated delivery agent via GET /api/orders/.
6. THE DeliveryDashboard SHALL show for each assigned order: order ID, customer delivery address, total price, and current status.
