# Implementation Plan: Shopkeeper Product Add

## Overview

Most of the feature is already implemented. These tasks focus on the specific gaps identified by comparing the codebase against the spec: the missing `paid_at` field and migration, concurrent stock safety, serializer completeness, billing sort order, revenue summary correctness, and verification of the frontend wiring.

## Tasks

- [ ] 1. Add `paid_at` field to `ShopkeeperBilling` model and create migration
  - In `local_vendors_marketplace/apps/products/models.py`, add `paid_at = models.DateTimeField(null=True, blank=True)` to `ShopkeeperBilling`
  - In `apply_payment()`, set `self.paid_at = timezone.now()` when `remaining_amount == 0` (status transitions to `paid`), and ensure `paid_at` is included in the `save()` call
  - Run `python manage.py makemigrations products` to generate migration `0012_shopkeeperbilling_paid_at.py`
  - Verify the migration file contains `AddField` for `paid_at` with `null=True, blank=True`
  - _Requirements: 11.1, 11.9_

  - [ ]* 1.1 Write unit test for `apply_payment` paid_at behaviour
    - Assert `paid_at is None` before full payment
    - Assert `paid_at is not None` after full payment
    - Assert `paid_at` remains `None` after a partial payment
    - _Requirements: 11.9_

- [ ] 2. Add `select_for_update()` to `ApprovePurchaseRequestView` for concurrent stock safety
  - In `local_vendors_marketplace/apps/products/views.py`, wrap the stock check and deduction in `ApprovePurchaseRequestView.post()` inside `with transaction.atomic():` and fetch the `VendorProduct` via `VendorProduct.objects.select_for_update().get(id=pr.product_id)` before the stock check
  - Use the locked `vp` instance for both the stock check and `vp.stock -= pr.quantity; vp.save(update_fields=['stock'])`
  - Import `transaction` from `django.db` at the top of the method (or file)
  - _Requirements: 4.3, 4.4_

  - [ ]* 2.1 Write property test for stock invariant
    - **Property 1: Stock Invariant** — after any sequence of approvals, `vp.stock == initial_stock - sum(approved quantities)`
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [ ] 3. Expose `paid_at` in `ShopkeeperBillingSerializer`
  - In `local_vendors_marketplace/apps/products/serializers.py`, add `'paid_at'` to the `fields` tuple of `ShopkeeperBillingSerializer`
  - Verify the field is read-only (it is a model field with no write path in the serializer)
  - _Requirements: 11.1_

  - [ ]* 3.1 Write property test for serializer round-trip consistency
    - **Property 6: Round-Trip Serializer Consistency** — `parse(serialize(bill)).seconds_remaining ≈ (bill.due_date - now).total_seconds()`
    - **Validates: Requirements 10.5**

- [ ] 4. Fix `VendorBillingView` sort order to `due_date` ascending
  - In `local_vendors_marketplace/apps/products/views.py`, change `VendorBillingView.get_queryset()` to order by `due_date` only: `.order_by('due_date')` instead of `.order_by('status', 'due_date')`
  - This ensures soonest-due bills appear first regardless of status, matching Requirement 10.1
  - _Requirements: 10.1_

- [ ] 5. Verify `VendorRevenueSummaryView` returns all four required fields
  - In `local_vendors_marketplace/apps/products/views.py`, confirm `VendorRevenueSummaryView.get()` returns `earned_revenue`, `pending_revenue`, `overdue_revenue`, and `total_billed`
  - The current implementation already computes these; verify the `earned` calculation uses `amount_paid` (not `total_amount`) for all bills, and `pending` uses `remaining_amount` for non-paid bills only
  - Fix `earned` if needed: it should be `sum(b.amount_paid for b in bills)` — this is already correct in the current code
  - _Requirements: 10.7_

  - [ ]* 5.1 Write property test for billing amount invariant
    - **Property 2: Billing Amount Invariant** — `bill.total_amount == bill.cost_price × bill.quantity` and `bill.remaining_amount == bill.total_amount - bill.amount_paid`
    - **Validates: Requirements 9.3, 11.7_**

- [ ] 6. Checkpoint — run backend tests and verify migrations apply cleanly
  - Run `python manage.py migrate` and confirm no errors
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Verify `ShopkeeperBillingSerializer` exposes `seconds_remaining` correctly
  - Confirm `get_seconds_remaining` in `ShopkeeperBillingSerializer` returns `int((obj.due_date - timezone.now()).total_seconds())` — this is already implemented; verify it handles negative values (overdue) correctly by checking the sign is preserved
  - No code change needed if already correct; add a comment confirming the negative-value contract
  - _Requirements: 10.5_

- [ ] 8. Verify `unique_together` constraints and `bill_generated` idempotency guard
  - In `local_vendors_marketplace/apps/products/models.py`, confirm `ShopkeeperProduct.Meta` has `unique_together = ('shopkeeper', 'vendor_product')`
  - Confirm `PurchaseRequest.Meta` has `unique_together = ('shopkeeper', 'product')`
  - Confirm `ShopkeeperBilling` has `purchase_request = OneToOneField(..., null=True, blank=True)` providing DB-level idempotency
  - Confirm `SetSellingPriceView` checks `not sp.bill_generated` before creating billing and sets `sp.bill_generated = True` after
  - No code changes needed if all guards are in place; add inline comments referencing Requirements 8.2 and 8.3 if missing
  - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 8.1 Write property test for billing idempotency
    - **Property 3: Billing Idempotency** — calling `SetSellingPriceView` N times on the same `ShopkeeperProduct` creates exactly 1 `ShopkeeperBilling` record
    - **Validates: Requirements 8.2, 8.3**

- [ ] 9. Verify `ShopkeeperDashboard` billing tab payment inputs and `billingEvents` wiring
  - In `src/app/pages/dashboards/ShopkeeperDashboard.tsx`, confirm `handleMakePayment` calls `billingEvents.paid(...)` after a successful payment API response
  - Confirm the billing tab renders `paymentInputs[bill.id]` input and a Pay button for each unpaid bill
  - Confirm `TimeRemaining` is rendered with `bill.seconds_remaining` in the billing tab
  - No code changes needed if already correct; these are verification tasks
  - _Requirements: 11.8, 12.5_

- [ ] 10. Verify `VendorDashboard` billing polling and `billingEvents` listener
  - In `src/app/pages/dashboards/VendorDashboard.tsx`, confirm `useEffect` sets `setInterval(loadOrders, 30_000)` when `activeTab === 'billing'` and clears it on tab change or unmount
  - Confirm `billingEvents.onPaid(() => loadOrders())` is registered in a `useEffect` and the returned cleanup is returned from the effect
  - Confirm stock polling `setInterval(getVendorStock, 10_000)` is active only when `activeTab === 'products'`
  - No code changes needed if already correct
  - _Requirements: 12.2, 12.6, 11.8_

- [ ] 11. Verify `billingEvents.ts` CustomEvent bus contract
  - In `src/services/billingEvents.ts`, confirm `paid()` dispatches `new CustomEvent<BillingPaidDetail>('billing:paid', { detail })` on `window`
  - Confirm `onPaid()` adds a `window` event listener for `'billing:paid'` and returns a cleanup function that removes it
  - Confirm the `BillingPaidDetail` interface includes `billId`, `newStatus`, `amountPaid`, `remainingAmount`
  - No code changes needed if already correct
  - _Requirements: 11.8, 12.5_

- [ ] 12. Enforce no-duplicate-request rule: block re-adding an active product

  **Backend — `CreatePurchaseRequestView`:**
  - In `local_vendors_marketplace/apps/products/views.py`, extend the duplicate check in `CreatePurchaseRequestView.post()` to also block requests where a `ShopkeeperProduct` already exists for this shopkeeper + product with `is_active=True` and `stock > 0`
  - Return HTTP 400 with `{"error": "You already have this product in your shop."}` in that case
  - Keep the existing check for a pending `PurchaseRequest` unchanged
  - _Requirements: 1.4, 2.2_

  **Backend — `CreatePurchaseRequestView` (allow re-request when stock = 0 or removed):**
  - Allow a new `PurchaseRequest` if the existing `ShopkeeperProduct` has `stock == 0` OR `is_active=False` (product was removed/deactivated)
  - This means the block condition is: `ShopkeeperProduct.objects.filter(shopkeeper=request.user, vendor_product=vp, is_active=True, stock__gt=0).exists()`
  - _Requirements: 1.4_

  **Frontend — Browse tab in `ShopkeeperDashboard`:**
  - In `src/app/pages/dashboards/ShopkeeperDashboard.tsx`, update the `alreadyActive` check in the Browse tab to use: `myProducts.some(mp => mp.vendor_product_id === vp.id && mp.is_active && mp.stock > 0)`
  - When `alreadyActive` is true, render `<Badge>Already in your shop</Badge>` and hide the request form
  - When the product exists but `stock === 0`, show the request form again so the shopkeeper can restock
  - _Requirements: 1.3, 1.4_

- [ ] 13. Final checkpoint — end-to-end flow verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the full flow manually: browse → request → approve → activate → pay → vendor dashboard updates

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks 7–11 are verification tasks; they require code changes only if the described behaviour is absent
- The primary code changes are tasks 1–5: `paid_at` field + migration, `select_for_update()`, serializer field, sort order fix
- Property tests validate universal correctness invariants from the design document
