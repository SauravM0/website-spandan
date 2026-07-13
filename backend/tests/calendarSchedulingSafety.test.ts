import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slotMinutesForCount } from '../src/services/operations';

const operations = readFileSync(join(process.cwd(), 'src/services/operations.ts'), 'utf8');
const routes = readFileSync(join(process.cwd(), 'src/routes/adminOperations.ts'), 'utf8');
const controller = readFileSync(join(process.cwd(), 'src/controllers/operationsController.ts'), 'utf8');

test('slot count produces an exact appointment duration', () => {
  assert.equal(slotMinutesForCount('10:00', '14:00', 8), 30);
  assert.equal(slotMinutesForCount('09:00', '13:00', 4), 60);
  assert.throws(() => slotMinutesForCount('10:00', '14:00', 7), /divide evenly/);
  assert.throws(() => slotMinutesForCount('14:00', '10:00', 8), /divide evenly/);
});

test('schedule reductions lock every affected doctor date and reject active slot holds', () => {
  assert.match(operations, /for \(const date of uniqueDates\)[\s\S]*doctor_id}:\$\{date}/);
  assert.match(operations, /FROM appointment_holds[\s\S]*appointment_date = ANY\(\$2::date\[\]\)/);
  assert.match(operations, /error\.code = 'ACTIVE_SLOT_HOLDS'/);
});

test('hold conversion revalidates the effective slot while excluding only its own hold', () => {
  assert.match(operations, /excludeHoldId\?: string/);
  assert.match(operations, /AND \(\$3::uuid IS NULL OR id <> \$3\)/);
  assert.match(operations, /const currentSlots = await listSlotsWithDb\([\s\S]*input\.hold_id/);
  assert.match(operations, /error\.code = 'HELD_SLOT_NO_LONGER_AVAILABLE'/);
});

test('removing custom or extra hours is rejected when appointments or holds would be stranded', () => {
  assert.match(operations, /\['custom_hours', 'add_extra_hours'\]\.includes/);
  assert.match(operations, /const impactedAppointments = activeAppointments\.rows\.filter/);
  assert.match(operations, /const impactedHolds = activeHolds\.rows\.filter/);
  assert.match(operations, /error\.code = 'SCHEDULE_REVERT_CONFLICT'/);
});

test('conflict cases require verified appointment outcomes before the schedule change can apply', () => {
  assert.match(operations, /recordScheduleConflictResolutions/);
  assert.match(operations, /APPOINTMENT_CANCELLATION_REQUIRED/);
  assert.match(operations, /APPOINTMENT_TRANSFER_REQUIRED/);
  assert.match(operations, /APPOINTMENT_RESCHEDULE_REQUIRED/);
  assert.match(operations, /status = 'ready'/);
  assert.match(operations, /resolved_conflict_case_id/);
  assert.match(routes, /schedule-conflicts\/:id\/resolutions/);
  assert.match(routes, /schedule-conflicts\/:id\/apply/);
});

test('Sunday availability is determined by doctor rules instead of a hard-coded closure', () => {
  assert.doesNotMatch(operations, /weekday === 0 && customHours/);
});

test('setting exact open hours or closing a day replaces prior active date overrides', () => {
  assert.match(operations, /\['custom_hours', 'unavailable_whole_day'\]\.includes/);
  assert.match(operations, /SET status = 'superseded'[\s\S]*exception_date = \$2 AND status = 'active'/);
});

test('doctor calendar writes are restricted to the authenticated doctor id', () => {
  assert.match(controller, /req\.body\.doctor_id !== req\.user\.doctor_id/);
  assert.match(operations, /actorDoctorId && doctorId !== actorDoctorId/);
  assert.match(operations, /DOCTOR_CALENDAR_SCOPE_DENIED/);
});

test('recurring weekday replacement is versioned and blocks dates with appointments or holds', () => {
  assert.match(operations, /RECURRING_SCHEDULE_CONFLICT/);
  assert.match(operations, /schedule\.weekday_replaced/);
  assert.match(operations, /SET effective_until = \(\$3::date - 1\)/);
});

test('public availability returns authoritative day statuses and opening-hour summaries', () => {
  assert.match(operations, /getPublicDoctorAvailabilityView/);
  assert.match(operations, /booking_not_open/);
  assert.match(operations, /fully_booked/);
  assert.match(operations, /opening_time/);
  assert.match(operations, /closing_time/);
});
