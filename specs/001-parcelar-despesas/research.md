# Research: Parcelar Despesas

## Decision: Use a backend atomic parcelamento endpoint

**Rationale**: The specification requires that a failed save must not be presented as a partial success. A single endpoint that accepts the base expense and installment count lets the backend persist all installments atomically, validate authorization once, and return the created installments as a coherent group.

**Alternatives considered**: Creating many expenses from the frontend with the existing `POST /Despesas` endpoint is already similar to the current batch flow, but it risks partial persistence and makes rollback/consistency unclear. Hiding partial failures in the UI would violate the feature's error handling requirement.

## Decision: Calculate installment previews in integer cents

**Rationale**: Financial totals must match exactly even when the total does not divide evenly. Converting the total to cents, dividing with integer quotient/remainder, and distributing remaining cents deterministically keeps the sum exact and makes tests straightforward.

**Alternatives considered**: Floating-point division with two-decimal rounding is simpler but can create one-cent drift. Asking the user to provide each installment value adds friction and weakens the two-minute success criterion.

## Decision: Distribute remainder cents to the earliest installments

**Rationale**: Earliest-first distribution is deterministic, easy to explain, and common for installment schedules. For example, R$ 100,00 in 3 installments becomes R$ 33,34, R$ 33,33, and R$ 33,33.

**Alternatives considered**: Put the remainder on the final installment, or spread it by alternating installments. Final-installment adjustment is also reasonable, but earliest-first makes the preview stable from the first upcoming month and avoids a surprising final amount.

## Decision: Generate monthly dates from the selected initial date with end-of-month clamping

**Rationale**: The spec calls for predictable monthly dates and special handling for dates at the end of the month. Preserve the original day when the target month has it; otherwise use the target month's last valid day.

**Alternatives considered**: Always use the first day of `mesReferencia`, or keep adding fixed day counts. These options are less aligned with user expectation for purchase/vencimento dates.

## Decision: Show parcel indicators inline in the existing expense list

**Rationale**: The existing monthly list is the primary place where users understand expenses. Adding a compact indicator such as `Parcela 2/6` near metadata preserves the current workflow and meets the recognition requirement without a new page.

**Alternatives considered**: A separate installment history view would be heavier and out of scope. Encoding the parcel number only in the description is fragile and makes filtering/display rules harder to evolve.

## Decision: Keep bulk edit/delete of installment groups out of scope

**Rationale**: The current spec only requires creation, recognition, validation, and monthly display. Group editing/deleting introduces destructive confirmations and backend semantics beyond the requested slice.

**Alternatives considered**: Implement group operations now for completeness, but this would increase scope and delay the central user value.

## Decision: Re-enable token propagation before authenticated parcelamento calls

**Rationale**: `/despesas` is route-protected, but REST calls also need the bearer token for protected financial data. The existing token interceptor is present but commented out in `app.config.ts` and source. This feature should reactivate or replace it with a tested functional interceptor.

**Alternatives considered**: Leave token propagation unchanged and rely on backend/browser state. That would conflict with the project constitution for private financial data.
