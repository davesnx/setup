# Cancellation model question

Can an order still be cancelled after payment?

States: pending, paid, shipped, cancelled.

Rules:
- A pending order can be paid or cancelled.
- A paid order can be shipped or cancelled with a full refund.
- A shipped order cannot be cancelled.
- A cancelled order has no further transitions.

## Browser contract

Use an order total of 100. Start in pending with a refund of 0.
Provide visible buttons with accessible names Pay, Ship, Cancel, and Reset
(button text or aria-label). Keep these buttons present. Disable illegal
actions, or reject them without changing the state or refund.

Show the current state in a visible element with id `order-state` and the
numeric refund in a visible element with id `refund-amount`. These elements
contain only the value; put their labels beside them. Currency formatting is
optional. Reset returns to pending with refund 0 and restores legal actions.

These names and two output IDs let a browser test drive the experiment.
Choose any layout, styling, internal model, and additional scenario controls.
