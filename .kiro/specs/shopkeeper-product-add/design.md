# Design Document

## Overview

This document describes the technical design for the **Shopkeeper Product Add** feature — the complete flow from a shopkeeper browsing vendor products, submitting a purchase request, vendor approval with stock deduction, shopkeeper activation (set price + stock), billing creation, payment, and real-time dashboard updates.

The system is a Django REST Framework backend with a React + TypeScript frontend. All state is managed locally in React components using `useState`/`useCallback`; there is no global state library. Real-time updates are achieved via polling intervals and a lightweight browser `CustomEvent` bus (`billingEvents`).

---

## Architecture

```
React Frontend (Vite + TypeScript)
├── ShopkeeperDashboard.tsx   — browse, request, activate, pay
├── VendorDashboard.tsx       — manage products, approve/reject, view billing
├── services/api.js           — all fetch calls to Django API
└── services/billingEvents.ts — CustomEvent bus for billing:paid

Django Backend (DRF)
└── apps/products/
    ├── models.py             — VendorProduct, ShopkeeperProduct, PurchaseRequest,
    │                           ShopkeeperBilling, Notification, ProductUsage
    ├── views.py              — all API views
    ├── serializers.py        — all serializers
    └── urls.py               — URL routing
```

---

## Data Models

### VendorProduct
| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `vendor` | FK → User | |
| `name` | CharField | |
| `description` | TextField | |
| `base_price` | DecimalField | Wholesale price |
| `stock` | PositiveIntegerField | Decremented on approval |
| `category` | FK → Category | nullable |
| `image` | ImageField | nullable |

### ShopkeeperProduct
| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `shopkeeper` | FK → User | |
| `vendor_product` | FK → VendorProduct | unique_together with shopkeeper |
| `selling_price` | DecimalField | Set by shopkeeper on activation |
| `locked_cost_price` | DecimalField | Snapshot of base_price at first activation |
| `stock` | PositiveIntegerField | |
| `is_active` | BooleanField | False until shopkeeper activates |
| `bill_generated` | BooleanField | Idempotency guard — billing created exactly once |

### PurchaseRequest
| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `shopkeeper` | FK → User | |
| `vendor` | FK → User | |
| `product` | FK → VendorProduct | unique_together with shopkeeper |
| `quantity` | PositiveIntegerField | |
| `status` | CharField | `pending` / `approved` / `rejected` |

### ShopkeeperBilling
| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `shopkeeper` | FK → User | |
| `vendor` | FK → User | |
| `purchase_request` | OneToOneField → PurchaseRequest | nullable |
| `product_name` | CharField | Snapshot at approval time |
| `quantity` | PositiveIntegerField | |
| `cost_price` | DecimalField | Snapshot of base_price at approval |
| `total_amount` | DecimalField | `cost_price × quantity` |
| `amount_paid` | DecimalField | Running total of payments |
| `remaining_amount` | DecimalField | `total_amount - amount_paid` |
| `status` | CharField | `pending` / `partially_paid` / `paid` / `overdue` |
| `due_date` | DateTimeField | approval_time + 7 days |
| `paid_at` | DateTimeField | nullable; set only on full payment |

---

## API Endpoints

### Vendor Products
| Method | URL | View | Description |
|---|---|---|---|
| GET | `/api/vendor-products/` | `VendorProductListView` | All products (shopkeeper browse) |
| GET | `/api/vendor-products/mine/` | `MyVendorProductsView` | Vendor's own products |
| POST | `/api/vendor-products/create/` | `VendorProductCreateView` | Create product |
| PATCH/DELETE | `/api/vendor-products/<pk>/` | `VendorProductDetailView` | Edit/delete |
| GET | `/api/vendor-products/stock/` | `VendorStockView` | Real-time stock list (polling) |

### Shopkeeper Products
| Method | URL | View | Description |
|---|---|---|---|
| GET | `/api/shopkeeper-products/` | `ShopkeeperProductListView` | Public listing (active + in-stock) |
| GET | `/api/shopkeeper-products/mine/` | `MyShopkeeperProductsView` | Shopkeeper's own listings |
| PATCH | `/api/shopkeeper-products/<pk>/set-price/` | `SetSellingPriceView` | Activate product |
| DELETE | `/api/shopkeeper-products/<pk>/` | `ShopkeeperProductDetailView` | Remove from shop |

### Purchase Requests
| Method | URL | View | Description |
|---|---|---|---|
| POST | `/api/purchase-requests/` | `CreatePurchaseRequestView` | Submit request |
| GET | `/api/purchase-requests/mine/` | `ShopkeeperPurchaseRequestsView` | Shopkeeper's requests |
| GET | `/api/purchase-requests/vendor/` | `VendorPurchaseRequestsView` | Vendor's incoming requests |
| GET | `/api/purchase-requests/pending-setup/` | `PendingSetupProductsView` | Approved, not yet activated |
| POST | `/api/purchase-requests/<pk>/approve/` | `ApprovePurchaseRequestView` | Approve + deduct stock + create billing |
| POST | `/api/purchase-requests/<pk>/reject/` | `RejectPurchaseRequestView` | Reject |

### Billing
| Method | URL | View | Description |
|---|---|---|---|
| GET | `/api/billing/` | `ShopkeeperBillingListView` | Shopkeeper's bills |
| POST | `/api/billing/<pk>/pay/` | `MakePaymentView` | Make full or partial payment |
| GET | `/api/billing/vendor/` | `VendorBillingView` | Vendor's pending revenue |
| GET | `/api/billing/vendor/summary/` | `VendorRevenueSummaryView` | Aggregated revenue totals |

---

## Component Design

### ShopkeeperDashboard

**State:**
- `vendorProducts` — all vendor products for Browse tab
- `myProducts` — shopkeeper's active ShopkeeperProducts
- `myRequests` — all PurchaseRequests submitted by this shopkeeper
- `pendingSetup` — approved ShopkeeperProducts with `is_active=False`
- `billing` — all ShopkeeperBilling records
- `activateTarget` — `{ spId, basePrice, productName }` controlling ActivationModal visibility

**`loadData()`** — single `Promise.all` fetching all six endpoints; called on mount and after every mutation.

**Mutations and immediate UI updates:**
- `handleRequestProduct` — calls `createPurchaseRequest`, then `loadData()` and switches to Requests tab
- `handleMakePayment` — calls `makePayment`, patches `billing` state in-place with the returned record, fires `billingEvents.paid()`
- `ActivateModal.onSuccess` — calls `loadData()` and switches to My Shop tab

**Real-time:**
- No polling on ShopkeeperDashboard; all updates are mutation-triggered via `loadData()`

### VendorDashboard

**State:**
- `products` — vendor's own VendorProducts
- `requests` — all PurchaseRequests for this vendor
- `vendorBilling` — all ShopkeeperBilling records for this vendor
- `revenue` — aggregated summary `{ earned_revenue, pending_revenue, overdue_revenue, total_billed }`
- `pollRef` — `useRef<ReturnType<typeof setInterval>>` for managing polling intervals

**`loadData()`** — calls `loadProducts()` + `loadOrders()` in parallel.

**`loadOrders()`** — fetches orders, revenue summary, purchase requests, and vendor billing in a single `Promise.all`.

**Mutations and immediate UI updates:**
- `handleApprove` — calls `approvePurchaseRequest`, patches `requests` state in-place (status → `approved`)
- `handleReject` — calls `rejectPurchaseRequest`, patches `requests` state in-place (status → `rejected`)

**Real-time:**
- Stock polling: `setInterval(getVendorStock, 10_000)` active while `activeTab === 'products'`; patches `products` state in-place by matching `id`
- Billing polling: `setInterval(loadOrders, 30_000)` active while `activeTab === 'billing'`
- `billingEvents.onPaid` listener: calls `loadOrders()` immediately when shopkeeper fires a payment event

### ActivationModal

Controlled component rendered inside `ShopkeeperDashboard`. Receives `target: { spId, basePrice, productName }`. Validates `selling_price > base_price` and `stock >= 1` client-side before calling `setSellingPrice`. On success calls `onSuccess()` callback which triggers `loadData()` in the parent.

### billingEvents (CustomEvent bus)

```typescript
// Emit (ShopkeeperDashboard after successful payment)
billingEvents.paid({ billId, newStatus, amountPaid, remainingAmount });

// Subscribe (VendorDashboard on mount)
const cleanup = billingEvents.onPaid(detail => loadOrders());
// cleanup returned from useEffect → removes listener on unmount
```

Uses `window.dispatchEvent` / `window.addEventListener` with event name `billing:paid`. No dependencies, no context, works across any component tree depth.

---

## Key Flows

### Flow 1: Submit Purchase Request

```
Shopkeeper clicks "Request from Vendor"
  → POST /api/purchase-requests/ { product_id, quantity }
  → API: creates PurchaseRequest(status=pending), notifies vendor
  → Frontend: loadData() → myRequests updated → tab switches to Requests
```

### Flow 2: Vendor Approves Request

```
Vendor clicks "Approve"
  → POST /api/purchase-requests/<pk>/approve/
  → API (atomic):
      1. Check pr.status == 'pending'
      2. Check vp.stock >= pr.quantity
      3. pr.status = 'approved'
      4. vp.stock -= pr.quantity  (save update_fields=['stock'])
      5. ShopkeeperProduct.get_or_create(is_active=False, selling_price=0, stock=0)
      6. ShopkeeperBilling.get_or_create(purchase_request=pr, total_amount=base_price×qty, due_date=now+7d)
      7. Notification → shopkeeper
  → Frontend: patches requests state in-place (optimistic status update)
```

### Flow 3: Shopkeeper Activates Product

```
Shopkeeper clicks "Set Price & Activate" → ActivationModal opens
  → PATCH /api/shopkeeper-products/<pk>/set-price/ { selling_price, stock_quantity }
  → API:
      1. Validate selling_price > base_price, stock_quantity >= 1
      2. If first activation (bill_generated=False):
         - Lock locked_cost_price = base_price
         - Update existing ShopkeeperBilling (qty, cost_price, total_amount, due_date)
         - Set bill_generated = True
         - Notify vendor
      3. sp.selling_price = selling_price, sp.stock = qty, sp.is_active = True
      4. sp.save()
  → Frontend: ActivationModal.onSuccess → loadData() → product moves to "My Active Products"
```

### Flow 4: Shopkeeper Makes Payment

```
Shopkeeper enters amount, clicks Pay
  → POST /api/billing/<pk>/pay/ { amount }
  → API:
      1. Validate amount > 0, amount <= remaining_amount, status != 'paid'
      2. bill.apply_payment(amount)  — updates amount_paid, remaining_amount, status, paid_at
      3. Notification → vendor
  → Frontend:
      - setBilling(prev => prev.map(b => b.id === billId ? updated : b))  (in-place patch)
      - billingEvents.paid({ billId, newStatus, amountPaid, remainingAmount })
      - VendorDashboard.onPaid listener fires → loadOrders()
```

### Flow 5: Real-Time Stock Polling (Vendor)

```
VendorDashboard mounts, activeTab = 'products'
  → setInterval every 10s:
      GET /api/vendor-products/stock/
      → returns [{ id, name, stock }, ...]
      → setProducts(prev => prev.map(p => match ? { ...p, stock: updated.stock } : p))
  → interval cleared when tab changes or component unmounts
```

### Flow 6: Real-Time Billing Polling (Vendor)

```
VendorDashboard, activeTab = 'billing'
  → setInterval every 30s:
      loadOrders() → fetches revenue summary + vendor billing
      → setRevenue(...), setVendorBilling(...)
  → interval cleared when tab changes or component unmounts
```

---

## Stock Integrity

Stock deduction happens in `ApprovePurchaseRequestView.post()`:

```python
if pr.product.stock < pr.quantity:
    return Response({'error': 'Insufficient stock.'}, status=400)

pr.status = 'approved'
pr.save()
pr.product.stock -= pr.quantity
pr.product.save(update_fields=['stock'])
```

For concurrent approval safety, the check-and-deduct should be wrapped in `select_for_update()` to prevent race conditions:

```python
from django.db import transaction

with transaction.atomic():
    vp = VendorProduct.objects.select_for_update().get(id=pr.product_id)
    if vp.stock < pr.quantity:
        return Response({'error': 'Insufficient stock.'}, status=400)
    vp.stock -= pr.quantity
    vp.save(update_fields=['stock'])
```

This ensures the invariant: sum of all approved quantities ≤ initial stock.

---

## Billing Idempotency

The `bill_generated` flag on `ShopkeeperProduct` is the idempotency guard:

- Set to `True` on first call to `SetSellingPriceView`
- Subsequent calls skip billing creation entirely
- `ShopkeeperBilling.get_or_create(purchase_request=pr, ...)` provides a second layer of protection at the DB level via the `OneToOneField` constraint on `purchase_request`

---

## Correctness Properties

### 1. Stock Invariant
For all VendorProducts, at any point in time:
```
vp.stock == initial_stock - sum(pr.quantity for pr in approved_requests where pr.product == vp)
```
Verified by: checking stock after each approval sequence never goes below 0.

### 2. Billing Amount Invariant
For all ShopkeeperBilling records:
```
bill.total_amount == bill.cost_price × bill.quantity
bill.remaining_amount == bill.total_amount - bill.amount_paid
```

### 3. Billing Idempotency
For all ShopkeeperProducts, calling `SetSellingPriceView` N times creates exactly 1 ShopkeeperBilling record (guarded by `bill_generated` flag and `OneToOneField`).

### 4. Payment Invariant (Paid Bills)
For all ShopkeeperBilling where `status == 'paid'`:
```
bill.remaining_amount == 0
bill.amount_paid == bill.total_amount
bill.paid_at is not None
```

### 5. Real-Time Consistency
For all dashboard state updates triggered by polling or CustomEvent:
```
displayed_value == database_value  (within 1 polling cycle)
```
- Stock: within 10 seconds (VendorDashboard products tab)
- Billing totals: within 30 seconds (VendorDashboard billing tab)
- Payment events: immediate (CustomEvent bus, no polling delay)

### 6. Round-Trip: Serializer Consistency
For all ShopkeeperBilling records returned by the API:
```
parse(serialize(bill)).seconds_remaining ≈ (bill.due_date - now).total_seconds()
```
The `seconds_remaining` computed field must be consistent with `due_date` on every response.

---

## Error Handling

| Scenario | HTTP Status | Behaviour |
|---|---|---|
| Duplicate pending request | 400 | Return error, no new PurchaseRequest |
| Insufficient stock on approval | 400 | Return error, no stock deduction, no billing |
| Request already approved/rejected | 400 | Return error, no state change |
| `selling_price <= base_price` | 400 | Return error with minimum price message |
| `stock_quantity < 1` | 400 | Return error |
| Payment exceeds remaining | 400 | Return error, no billing modification |
| Payment on already-paid bill | 400 | Return error |
| VendorProduct not found | 404 | Return 404 |

All errors are surfaced to the user via the toast notification system in both dashboards.

---

## File Map

| File | Role |
|---|---|
| `local_vendors_marketplace/apps/products/models.py` | All data models |
| `local_vendors_marketplace/apps/products/views.py` | All API views |
| `local_vendors_marketplace/apps/products/serializers.py` | All serializers |
| `local_vendors_marketplace/apps/products/urls.py` | URL routing |
| `src/app/pages/dashboards/ShopkeeperDashboard.tsx` | Shopkeeper UI |
| `src/app/pages/dashboards/VendorDashboard.tsx` | Vendor UI |
| `src/services/api.js` | All API calls |
| `src/services/billingEvents.ts` | CustomEvent bus |
