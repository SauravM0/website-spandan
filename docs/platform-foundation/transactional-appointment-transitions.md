# Transactional appointment transitions

Work Package 18 replaces the generic appointment status patch with `POST /api/admin/operations/appointments/:id/transitions`. Every command carries an action, expected version, reason, administrator identity, and idempotency key. PostgreSQL locks the appointment and commits the appointment, booking state, evidence, transition timeline, and audit record together.

Confirmation, check-in, and completion require one immutable financial record: an authoritative successful online payment, exact cash matching the appointment fee snapshot, or an administrator-approved waiver. PhonePe success records online evidence before confirming the appointment. Direct completion from confirmed is no longer allowed; the administrator must check the patient in first. A paid cancellation moves the booking to `refund_pending` without deleting payment or appointment history.

The API returns the updated appointment and allowed next command actions. Stale versions receive `APPOINTMENT_VERSION_CONFLICT` with the current version. Duplicate idempotency keys return the original outcome. The integration suite submits fifty simultaneous commands and requires one version winner.

Run `npm run appointment-transitions:check` for the structural gate. Staging acceptance must cover online, cash, waiver, stale version, repeated command, cancellation/refund-pending, check-in, no-show, and completion workflows.
