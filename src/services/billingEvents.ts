/**
 * billingEvents — lightweight in-app event bus for billing state changes.
 *
 * Uses the browser's native CustomEvent on window so any component
 * anywhere in the tree can subscribe without prop drilling or context.
 *
 * Usage:
 *   emit:    billingEvents.paid(billId, newStatus)
 *   listen:  billingEvents.onPaid(handler)   → returns cleanup fn
 */

export const BILLING_PAID_EVENT = 'billing:paid';

export interface BillingPaidDetail {
  billId: number;
  newStatus: string;
  amountPaid: number;
  remainingAmount: number;
}

const billingEvents = {
  /** Fire after a successful payment API call. */
  paid(detail: BillingPaidDetail) {
    window.dispatchEvent(new CustomEvent<BillingPaidDetail>(BILLING_PAID_EVENT, { detail }));
  },

  /** Subscribe to payment events. Returns a cleanup function. */
  onPaid(handler: (detail: BillingPaidDetail) => void): () => void {
    const listener = (e: Event) => handler((e as CustomEvent<BillingPaidDetail>).detail);
    window.addEventListener(BILLING_PAID_EVENT, listener);
    return () => window.removeEventListener(BILLING_PAID_EVENT, listener);
  },
};

export default billingEvents;
