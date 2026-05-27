# ADR 004: Double-Entry Ledger and Wallet Caching Strategy

## Status
Accepted

## Context
FinPulse handles critical financial transactions where accuracy and auditability are paramount. Currently, financial balances may be stored directly, but as we scale, relying solely on mutable balance fields exposes the system to race conditions, partial updates, and difficult-to-trace discrepancies. We need a robust mechanism to record every financial movement immutably while ensuring fast read access to current balances. Additionally, we must handle concurrent transactions safely.

## Decision
1. **Strict Double-Entry Ledger:** We will implement a strict double-entry ledger system for all financial movements. Every transaction must consist of at least two entries (a debit and a credit) that sum to zero. The ledger will serve as the single source of truth for all financial data.
2. **Wallet as a Cached View:** The existing `Wallet` model will be retained but repurposed as a cached view of the underlying ledger. Its balance will be computed from the ledger but stored on the `Wallet` entity for fast read operations.
3. **Pessimistic Locking:** To prevent race conditions and ensure data integrity during concurrent transactions, we will employ a pessimistic locking strategy (`PESSIMISTIC_WRITE`) on the `Wallet` rows when a transaction is being processed. This ensures that only one transaction can modify a wallet's balance and corresponding ledger entries at a time.

## Consequences

### Positive
- **Auditability:** Complete, immutable history of all financial movements.
- **Data Integrity:** Double-entry ensures that money is neither created nor destroyed arbitrarily.
- **Performance:** Reads remain fast because the `Wallet` caches the balance.
- **Concurrency Safety:** Pessimistic locking prevents double-spending and race conditions.

### Negative
- **Complexity:** Increased complexity in the transaction processing logic.
- **Performance Overhead on Writes:** Pessimistic locking may introduce contention and reduce write throughput for highly active wallets.
- **Storage:** Storing every ledger entry increases database size over time.

## Implementation Notes
- The ledger table will be append-only.
- The transaction manager must enforce the zero-sum constraint before committing.
- Any mismatch between the `Wallet` cache and the aggregated ledger balance must trigger an alert and potentially a reconciliation process.
