# Cancellation model question

Can an order still be cancelled after payment?

States: pending, paid, shipped, cancelled.

Rules:
- A pending order can be paid or cancelled.
- A paid order can be shipped or cancelled with a full refund.
- A shipped order cannot be cancelled.
- A cancelled order has no further transitions.
