import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appJs = await readFile('app.js', 'utf8');
const html = await readFile('index.html', 'utf8');

assert.match(appJs, /const\s+APPT_STORAGE_KEY\s*=\s*["']ff_appointments_v1["']/, 'Missing ff_appointments_v1 storage key');
assert.match(appJs, /function\s+loadAppointments\s*\(/, 'Missing loadAppointments helper');
assert.match(appJs, /function\s+saveAppointments\s*\(/, 'Missing saveAppointments helper');
assert.match(appJs, /function\s+addAppointmentFromForm\s*\(/, 'Missing addAppointmentFromForm helper');
assert.match(appJs, /function\s+deleteAppointmentById\s*\(/, 'Missing deleteAppointmentById helper');
assert.match(appJs, /function\s+renderAppointmentsSection\s*\(/, 'Missing renderAppointmentsSection');
assert.match(appJs, /if \(sectionId === ['"]appointments['"]\) renderAppointmentsSection\(\);/, 'Appointments nav should trigger renderAppointmentsSection');
assert.match(appJs, /window\.renderAppointmentsSection\s*=\s*renderAppointmentsSection;/, 'renderAppointmentsSection should be exposed on window');
assert.match(appJs, /window\.addAppointmentFromForm\s*=\s*addAppointmentFromForm;/, 'addAppointmentFromForm should be exposed on window');
assert.match(appJs, /window\.deleteAppointmentById\s*=\s*deleteAppointmentById;/, 'deleteAppointmentById should be exposed on window');

assert.doesNotMatch(appJs, /function\s+ensureAddAppointmentFab\s*\(/, 'Old FAB helper should be removed');
assert.doesNotMatch(html, /id=["']addAppointmentBtn["']/, 'Old + Add button should be removed from markup');
assert.doesNotMatch(html, /appointmentsDiagnosticsToggle|appointmentsDiagnosticsPanel/, 'Diagnostics UI should be removed');

console.log('PASS: appointments form workflow is wired and legacy FAB/modal diagnostics are removed.');
