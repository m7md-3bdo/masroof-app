import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, dueFor, collectionFor, activeInMonth, totalUncollected, setStudentPrice, setStudentGroup, setGroupPrice, groupAt, canDeleteStudent, canDeleteGroup } from './ledger.js';
const OLD = {
  students: [
    { id: 'a', name: 'علي', grade: 'first', fee: 150, joinedAt: '2026-09', leftAt: null },
    { id: 'b', name: 'محمد', grade: 'second', fee: 100, joinedAt: '2026-09', leftAt: null },
  ], payments: [ { id: 'p', studentId: 'a', month: '2026-10', date: '2026-09-25', amount: 150 } ],
  expenses: [{ id: 'e', amount: 10, date: '2026-10-01', description: 'عصير' }],
  savings: [{ id: 's', amount: 100, date: '2026-10-10' }], settings: { openingCash: 500, openingSavings: 25 },
};
const data = migrate(OLD);
test('migrate actual v3 shape without changing input or dropping amounts', () => {
  assert.equal(OLD.students[0].groupId, undefined);
  assert.equal(data.groups.length, 2);
  assert.deepEqual(data.payments, OLD.payments);
  assert.deepEqual(data.expenses, OLD.expenses);
  assert.deepEqual(data.savings, OLD.savings);
  assert.deepEqual(data.settings, OLD.settings);
  assert.equal(dueFor(data.students[0], '2026-11', data.groups), 150);
  assert.equal(dueFor(data.students[1], '2026-11', data.groups), 100);
  assert.equal(totalUncollected(data, '2026-10'), 100);
});
test('exemption means zero due, not overdue; historic months unchanged', () => {
  const s = setStudentPrice(data.students[0], '2026-11', 'exempt', 0, 'future');
  const db = { ...data, students: [s, data.students[1]] };
  assert.equal(dueFor(s, '2026-10', db.groups), 150);
  assert.deepEqual(collectionFor(s, '2026-11', db), { due: 0, paid: 0, remaining: 0, exempt: true, overpaid: false });
  assert.equal(dueFor(s, '2026-12', db.groups), 0);
  assert.equal(totalUncollected(db, '2026-11'), 100);
});
test('one month discount resets to base after month', () => {
  const s = setStudentPrice(data.students[0], '2026-11', 'custom', 50, 'one');
  assert.equal(dueFor(s, '2026-11', data.groups), 50);
  assert.equal(dueFor(s, '2026-12', data.groups), 150);
});
test('group price and moving groups only change selected month onwards', () => {
  const moved = setStudentGroup(data.students[0], '2026-12', 'second');
  assert.equal(groupAt(moved, '2026-11'), 'first');
  assert.equal(groupAt(moved, '2026-12'), 'second');
  const group = setGroupPrice(data.groups[0], '2026-11', 300);
  const groups = [group, data.groups[1]];
  assert.equal(dueFor(data.students[0], '2026-10', groups), 150);
  assert.equal(dueFor(data.students[0], '2026-11', groups), 300);
  assert.equal(dueFor(moved, '2026-12', groups), 200);
});
test('archiving student and group stops future dues but preserves past payments', () => {
  const student = { ...data.students[0], leftAt: '2026-11' };
  assert.equal(activeInMonth(student, '2026-10', data.groups), true);
  assert.equal(activeInMonth(student, '2026-11', data.groups), false);
  const groups = data.groups.map(g => g.id === 'first' ? { ...g, archivedAt: '2026-11' } : g);
  assert.equal(activeInMonth(data.students[0], '2026-11', groups), false);
  assert.equal(activeInMonth(data.students[0], '2026-10', groups), true);
});
test('hard delete blocked if student has payments or group was ever used', () => {
  assert.equal(canDeleteStudent(data.students[0], data.payments), false);
  assert.equal(canDeleteStudent(data.students[1], data.payments), true);
  assert.equal(canDeleteGroup(data.groups[0], data.students), false);
  assert.equal(canDeleteGroup({ id:'other' }, data.students), true);
});
test('v4 imported backups remain compatible', () => {
  const roundtrip = migrate(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(roundtrip, data);
});
