export function withdraw({ balance, amount, authorized }) {
  if (!authorized) {
    return { ok: false, error: "forbidden" }
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "invalid_amount" }
  }

  if (amount > balance) {
    return { ok: false, error: "insufficient_funds" }
  }

  return { ok: true, balance: balance - amount }
}
