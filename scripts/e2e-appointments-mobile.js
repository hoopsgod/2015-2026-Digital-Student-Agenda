import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appJs = await readFile('app.js', 'utf8');

assert.match(appJs, /function\s+ensureAddAppointmentFab\s*\(/, 'Missing ensureAddAppointmentFab helper');
assert.match(appJs, /fab\.id\s*=\s*['"]addAppointmentFab['"]/, 'FAB id should be addAppointmentFab');
assert.match(appJs, /fab\.addEventListener\(['"]click['"],\s*openModal,\s*true\)/, 'FAB should bind click in capture mode');
assert.match(appJs, /fab\.addEventListener\(['"]pointerup['"],\s*openModal,\s*true\)/, 'FAB should bind pointerup in capture mode');
assert.match(appJs, /fab\.addEventListener\(['"]touchend['"],\s*openModal,\s*\{\s*capture:\s*true,\s*passive:\s*false\s*\}\)/, 'FAB should bind touchend non-passive capture');
assert.match(appJs, /function\s+setAddAppointmentFabVisible\s*\(visible\)/, 'Missing FAB visibility helper');
assert.match(appJs, /setAddAppointmentFabVisible\(sectionId === ['"]appointments['"] \|\| sectionId === ['"]appts['"] \|\| sectionId === ['"]appointmentsSection['"]\)/, 'switchSection should toggle FAB for appointments section');
assert.match(appJs, /document\.addEventListener\(['"]DOMContentLoaded['"],\s*\(\)\s*=>\s*\{[\s\S]*?ensureAddAppointmentFab\(\)/, 'DOMContentLoaded init should ensure FAB');
assert.doesNotMatch(appJs, /function\s+installAppointmentAddHandlerDelegated\s*\(/, 'Old delegated add handler should be removed');

console.log('PASS: appointment FAB safeguards are present and old fragile handler is removed.');
