# Requirements Document

## Introduction

This feature covers the shopkeeper product acquisition flow in the Local Vendors Marketplace. It has two parts:

**Part 2 — Shopkeeper Adds Product**: A shopkeeper browses vendor products, clicks "Add to My Shop", enters a selling price and quantity, and the system saves the vendor–shopkeeper–product relationship.

**Part 3 — Stock Update**: When a shopkeeper adds a product (via the purchase request → approval flow), the vendor's stock is reduced immediately and the system prevents stock from going below zero.

The existing flow is: shopkeeper sends a purchase request → vendor approves → shopkeeper sets selling price + quantity to activate. This spec formalises the requirements for that complete flow with correctness guarantees.

---

## Glossary

- **Shopkeeper**: A registered user with role `shopkeeper` who resells vendor products.
- **Vendor**: A registered user with role `vendor` who supplies products in bulk.
- **VendorProduct**: A product listed by a Vendor with a wholesale `base_price` and a `stock` count.
- **ShopkeeperProduct**: A resale listing owned by a Shopkeeper, linked to a VendorProduct, with a `selling_price` and its own `stock`.
- **PurchaseRequest**: A request submitted by a Shopkeeper to a Vendor to acquire a quantity of a VendorProduct.
- **AddToShop_Flow**: The end-to-end process: browse → request → vendor approval → shopkeeper activation.
- **ActivationModal**: The UI dialog where a Shopkeeper sets `selling_price` and `stock_quantity` before activating a ShopkeeperProduct.
- **locked_cost_price**: A snapshot of the VendorProduct's `base_price` captured at the moment of first activation — never changes after that.
- **ShopkeeperBilling**: A billing record created when a PurchaseRequest is approved, tracking what the Shopkeeper owes the Vendor.
- **Dashboard**: The ShopkeeperDashboard React component.
- **API**: The Django REST Framework backend.

---

## Requirements

### Requirement 1: Browse Vendor Products

**User Story:** As a Shopkeeper, I want to browse all available vendor products with their stock and price, so that I can decide which products to add to my shop.

#### Acceptance Criteria

1. THE Dashboard SHALL display all VendorProducts with name, image, wholesale `base_price`, available `stock`, category, and vendor name.
2. WHEN a Shopkeeper enters text in the search field, THE Dashboard SHALL filter the displayed VendorProducts to those whose name contains the search text (case-insensitive).
3. WHILE a VendorProduct's `stock` is 0, THE Dashboard SHALL display that product as out-of-stock and disable the request button for it.
4. WHEN a Shopkeeper already has an active ShopkeeperProduct linked to a VendorProduct, THE Dashboard SHALL display "Already in your shop" instead of the request button for that VendorProduct.
5. WHEN a Shopkeeper already has a pending PurchaseRequest for a VendorProduct, THE Dashboard SHALL display the request status badge instead of the request button.

---

### Requirement 2: Submit Purchase Request

**User Story:** As a Shopkeeper, I want to request a quantity of a vendor product, so that the vendor can approve and reserve stock for me.

#### Acceptance Criteria

1. WHEN a Shopkeeper submits a purchase request with a valid `product_id` and `quantity >= 1`, THE API SHALL create a PurchaseRequest with status `pending` and notify the Vendor.
2. WHEN a Shopkeeper submits a purchase request for a product that already has a `pending` PurchaseRequest from the same Shopkeeper, THE API SHALL return an error and SHALL NOT create a duplicate PurchaseRequest.
3. IF `quantity` is less than 1 or not a positive integer, THEN THE API SHALL return a 400 error with a descriptive message.
4. IF the VendorProduct does not exist, THEN THE API SHALL return a 404 error.
5. WHEN a PurchaseRequest is created, THE API SHALL send a Notification to the Vendor containing the Shopkeeper's name, product name, and requested quantity.

---

### Requirement 3: Vendor Approves Purchase Request

**User Story:** As a Vendor, I want to approve or reject shopkeeper purchase requests, so that I control which shopkeepers can resell my products.

#### Acceptance Criteria

1. WHEN a Vendor approves a PurchaseRequest, THE API SHALL set the PurchaseRequest status to `approved`.
2. WHEN a Vendor approves a PurchaseRequest, THE API SHALL deduct the requested `quantity` from the VendorProduct's `stock` immediately.
3. WHEN a Vendor approves a PurchaseRequest, THE API SHALL create a ShopkeeperProduct with `is_active=False`, `selling_price=0`, and `stock=0` as a placeholder awaiting shopkeeper activation.
4. WHEN a Vendor approves a PurchaseRequest, THE API SHALL create a ShopkeeperBilling record with `total_amount = base_price × quantity` and `due_date = approval_time + 7 days`.
5. IF the VendorProduct's `stock` is less than the requested `quantity`, THEN THE API SHALL return a 400 error and SHALL NOT approve the request or deduct any stock.
6. IF the PurchaseRequest status is not `pending`, THEN THE API SHALL return a 400 error and SHALL NOT modify the request or stock.
7. WHEN a Vendor approves a PurchaseRequest, THE API SHALL send a Notification to the Shopkeeper instructing them to set a selling price.
8. WHEN a Vendor rejects a PurchaseRequest, THE API SHALL set the PurchaseRequest status to `rejected` and SHALL NOT deduct any stock.

---

### Requirement 4: Stock Integrity

**User Story:** As a Vendor, I want my stock levels to always be accurate and never go negative, so that I don't oversell products.

#### Acceptance Criteria

1. WHEN a PurchaseRequest is approved, THE API SHALL reduce VendorProduct `stock` by exactly the requested `quantity`.
2. THE API SHALL ensure VendorProduct `stock` never falls below 0 after any approval operation.
3. WHEN two concurrent approval requests for the same VendorProduct would together exceed available stock, THE API SHALL approve at most one and reject the other with an insufficient-stock error.
4. FOR ALL sequences of approval operations on a VendorProduct, the sum of all approved quantities SHALL NOT exceed the VendorProduct's initial `stock`.

---

### Requirement 5: Shopkeeper Activates Product (Set Selling Price)

**User Story:** As a Shopkeeper, I want to set my selling price and stock quantity for an approved product, so that it becomes visible to customers in my shop.

#### Acceptance Criteria

1. WHEN a Shopkeeper submits a selling price and stock quantity for an approved ShopkeeperProduct, THE API SHALL set `selling_price`, `stock`, and `is_active=True` on the ShopkeeperProduct.
2. IF the submitted `selling_price` is less than or equal to the VendorProduct's `base_price`, THEN THE API SHALL return a 400 error with a message stating the minimum required price.
3. IF `stock_quantity` is less than 1, THEN THE API SHALL return a 400 error.
4. WHEN a Shopkeeper activates a ShopkeeperProduct for the first time (`bill_generated=False`), THE API SHALL snapshot the VendorProduct's current `base_price` into `locked_cost_price` and set `bill_generated=True`.
5. WHEN a Shopkeeper updates selling price or stock on an already-activated ShopkeeperProduct (`bill_generated=True`), THE API SHALL update only `selling_price` and `stock` and SHALL NOT create a new billing record or modify `locked_cost_price`.
6. WHEN a ShopkeeperProduct is activated, THE API SHALL send a Notification to the Vendor with the Shopkeeper's name, product name, quantity, and billed amount.

---

### Requirement 6: ActivationModal UI

**User Story:** As a Shopkeeper, I want a clear dialog to enter my selling price and stock when activating an approved product, so that I don't make pricing mistakes.

#### Acceptance Criteria

1. WHEN a Shopkeeper clicks "Set Price & Activate" on an approved product, THE Dashboard SHALL display the ActivationModal showing the product name and wholesale `base_price`.
2. WHILE the ActivationModal is open, THE Dashboard SHALL prevent submission if `selling_price <= base_price` and SHALL display an inline error message.
3. WHILE the ActivationModal is open, THE Dashboard SHALL prevent submission if `stock_quantity < 1` and SHALL display an inline error message.
4. WHEN the Shopkeeper successfully activates a product, THE Dashboard SHALL close the ActivationModal, display a success toast, and refresh the product lists.
5. WHEN the Shopkeeper clicks Cancel or the backdrop, THE Dashboard SHALL close the ActivationModal without making any API call.

---

### Requirement 7: Post-Activation Visibility

**User Story:** As a Customer, I want to see only active, in-stock shopkeeper products, so that I can only order items that are available.

#### Acceptance Criteria

1. THE API SHALL return a ShopkeeperProduct in the public product listing only if `is_active=True` and `stock > 0`.
2. WHEN a ShopkeeperProduct's `stock` reaches 0, THE API SHALL exclude it from the public product listing.
3. THE API SHALL include `selling_price`, `stock`, `name`, `image_url`, and `vendor_name` in the public product listing response.

---

### Requirement 8: Idempotency of Billing

**User Story:** As a Vendor, I want billing records to be created exactly once per purchase batch, so that shopkeepers are never double-billed.

#### Acceptance Criteria

1. FOR ALL approved PurchaseRequests, THE API SHALL create exactly one ShopkeeperBilling record per PurchaseRequest.
2. WHEN `SetSellingPriceView` is called multiple times on the same ShopkeeperProduct, THE API SHALL create a billing record only on the first call (when `bill_generated=False`) and SHALL NOT create additional billing records on subsequent calls.
3. THE API SHALL use `bill_generated` as an idempotency guard to ensure billing is generated exactly once per inventory batch.

---

### Requirement 9: Unpaid Bill Creation

**User Story:** As a Shopkeeper, I want an unpaid bill to be automatically created when the vendor approves my purchase request, so that I can track what I owe and when it is due.

#### Acceptance Criteria

1. WHEN a Vendor approves a PurchaseRequest, THE API SHALL create a ShopkeeperBilling record with the following fields populated:
   - `shopkeeper`: reference to the Shopkeeper who submitted the PurchaseRequest
   - `vendor`: reference to the Vendor who approved the PurchaseRequest
   - `product_name`: the name of the VendorProduct at the time of approval
   - `quantity`: the quantity from the PurchaseRequest
   - `cost_price`: the VendorProduct's `base_price` at the time of approval
   - `total_amount`: computed as `cost_price × quantity`
   - `created_at`: the timestamp of the approval action
   - `due_date`: exactly 7 days after the approval timestamp
   - `status`: `pending`
2. THE API SHALL set the initial `status` of every newly created ShopkeeperBilling to `pending`.
3. FOR ALL ShopkeeperBilling records, `total_amount` SHALL equal `cost_price × quantity` (correctness invariant).
4. WHEN a Shopkeeper views the billing section of the Dashboard, THE API SHALL return all ShopkeeperBilling records belonging to that Shopkeeper where `status != paid`.
5. WHEN a Vendor views the pending revenue section of the Dashboard, THE API SHALL return all ShopkeeperBilling records belonging to that Vendor where `status != paid`.
6. IF a PurchaseRequest is rejected, THEN THE API SHALL NOT create any ShopkeeperBilling record for that PurchaseRequest.

---

### Requirement 10: Vendor Pending Revenue Display

**User Story:** As a Vendor, I want to see a clear breakdown of pending, overdue, and paid revenue from shopkeepers, so that I can track what I am owed and follow up on late payments.

#### Acceptance Criteria

1. THE Vendor_Dashboard SHALL display a Pending Revenue list showing all ShopkeeperBilling records where `vendor = current vendor` and `status != paid`, sorted by `due_date` ascending (soonest first).
2. WHEN the Vendor_Dashboard renders a billing row, THE Vendor_Dashboard SHALL display `shopkeeper_name`, `product_name`, `total_amount`, `remaining_amount`, `due_date`, and a computed `time_remaining` field for each record.
3. WHEN `due_date - current_time` is positive, THE Vendor_Dashboard SHALL display the `time_remaining` field as "X days / X hours remaining".
4. WHEN `due_date - current_time` is zero or negative, THE Vendor_Dashboard SHALL display the `time_remaining` field as "Overdue" with a visual red indicator.
5. THE ShopkeeperBillingSerializer SHALL expose a `seconds_remaining` computed field equal to `(due_date - current_time)` in seconds, so the frontend can render a live countdown without additional API calls.
6. WHEN a fetch request is made and a ShopkeeperBilling record's `due_date` has passed and `status` is `pending` or `partially_paid`, THE API SHALL automatically update that record's `status` to `overdue` before returning the response.
7. THE Vendor_Dashboard SHALL display summary cards for: total earned revenue (sum of `total_amount` for `status = paid`), total pending revenue (sum of `remaining_amount` for `status = pending` or `partially_paid`), total overdue revenue (sum of `remaining_amount` for `status = overdue`), and total billed (sum of `total_amount` for all records).
8. WHEN a Shopkeeper makes a payment and the API updates the ShopkeeperBilling record, THE Vendor_Dashboard SHALL reflect the updated amounts without requiring a full page reload.

---

### Requirement 11: Payment Flow

**User Story:** As a Shopkeeper, I want to pay my bill (fully or partially), so that my account balance is updated in real time and the vendor can track completed revenue.

#### Acceptance Criteria

1. THE ShopkeeperBilling model SHALL include a `paid_at` DateTimeField that is nullable and defaults to null, storing the timestamp of full payment.
2. WHEN a Shopkeeper submits a payment with an `amount` that is greater than 0 and less than or equal to `remaining_amount`, THE API SHALL add `amount` to `amount_paid`, subtract `amount` from `remaining_amount`, and update `status` to `partially_paid` if `remaining_amount` is still greater than 0, or to `paid` and set `paid_at` to the current timestamp if `remaining_amount` becomes 0.
3. IF the submitted `amount` exceeds `remaining_amount`, THEN THE API SHALL return a 400 error and SHALL NOT modify the ShopkeeperBilling record.
4. IF the ShopkeeperBilling `status` is already `paid`, THEN THE API SHALL return a 400 error and SHALL NOT process the payment.
5. WHEN a payment is made, THE API SHALL send a Notification to the Vendor containing the payment amount and the updated `remaining_amount`.
6. WHEN a ShopkeeperBilling `status` transitions to `paid`, THE Vendor_Dashboard SHALL move that record from the Pending Revenue list to a Completed Revenue section.
7. FOR ALL ShopkeeperBilling records where `status = paid`, `remaining_amount` SHALL equal 0 and `amount_paid` SHALL equal `total_amount` (correctness invariant).
8. WHEN a Shopkeeper makes a payment, THE billingEvents system SHALL fire a `billing:paid` event so THE Vendor_Dashboard refreshes its revenue totals without a full page reload.
9. THE API SHALL set `paid_at` only when `status` transitions to `paid` (full payment) and SHALL NOT set `paid_at` on partial payments.

---

### Requirement 12: Real-Time Dashboard and Stock Updates

**User Story:** As a Shopkeeper or Vendor, I want dashboards and stock levels to update instantly after any action, so that I always see accurate data without manually refreshing the page.

#### Acceptance Criteria

1. WHEN a Vendor approves a PurchaseRequest, THE Vendor_Dashboard SHALL immediately reflect the reduced VendorProduct stock without requiring a page reload.
2. THE Vendor_Dashboard SHALL poll GET /api/vendor-products/stock/ every 10 seconds while the Products tab is active and patch the displayed stock values in local state.
3. WHEN a Shopkeeper submits a purchase request, THE Shopkeeper_Dashboard SHALL immediately show the new request in the Requests tab without requiring a page reload.
4. WHEN a Shopkeeper activates a product (sets price + stock), THE Shopkeeper_Dashboard SHALL immediately move the product from "Pending Setup" to "My Active Products" without requiring a page reload.
5. WHEN a Shopkeeper makes a payment, THE billingEvents system SHALL dispatch a browser CustomEvent so both the Shopkeeper_Dashboard and Vendor_Dashboard update their billing totals and lists instantly.
6. THE Vendor_Dashboard billing tab SHALL poll GET /api/billing/vendor/ every 30 seconds while active to keep revenue totals current.
7. WHEN any API mutation (approve, reject, activate, pay) succeeds, THE initiating dashboard SHALL call its data-reload function to refresh all dependent state in a single pass.
8. FOR ALL dashboard state updates triggered by real-time events, the displayed values SHALL be consistent with the database state within 1 polling cycle.
