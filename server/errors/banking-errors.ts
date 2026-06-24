/**
 * Typed banking domain errors for Phase 6.
 *
 * These are thrown inside the transfer service and caught by the API route,
 * which maps each to an appropriate HTTP status code.
 * Stack traces are never exposed to clients.
 */

export class BankingError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code = 'BANKING_ERROR'
  ) {
    super(message)
    this.name = 'BankingError'
  }
}

export class InsufficientFundsError extends BankingError {
  constructor() {
    super('Insufficient funds for this transfer.', 400, 'INSUFFICIENT_FUNDS')
  }
}

export class AccountFrozenError extends BankingError {
  constructor() {
    super(
      'This account is frozen and cannot send transfers.',
      400,
      'ACCOUNT_FROZEN'
    )
  }
}

export class AccountNotFoundError extends BankingError {
  constructor() {
    super('Account not found or access denied.', 404, 'ACCOUNT_NOT_FOUND')
  }
}

export class BeneficiaryNotFoundError extends BankingError {
  constructor() {
    super('Beneficiary not found.', 404, 'BENEFICIARY_NOT_FOUND')
  }
}

export class SameAccountError extends BankingError {
  constructor() {
    super('Source and destination accounts must differ.', 400, 'SAME_ACCOUNT')
  }
}

export class CurrencyMismatchError extends BankingError {
  constructor() {
    super(
      'Source and destination accounts must share the same currency.',
      400,
      'CURRENCY_MISMATCH'
    )
  }
}

// ---------------------------------------------------------------------------
// Phase 7: bill payment errors
// ---------------------------------------------------------------------------

export class BillerNotFoundError extends BankingError {
  constructor() {
    super('Biller not found or inactive.', 404, 'BILLER_NOT_FOUND')
  }
}

export class BillPaymentFailedError extends BankingError {
  constructor(message = 'Bill payment failed.') {
    super(message, 400, 'BILL_PAYMENT_FAILED')
  }
}
