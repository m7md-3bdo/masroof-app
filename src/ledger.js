// Masroof Lite v4: pure data functions, also used in the migration tests.
// Do not change old localStorage keys or rewrite the original data during migration.
export const LEGACY_GRADES = [
  { id: 'first', name: 'أولى ثانوي', fee: 150 },
  { id: 'second', name: 'تانية ثانوي', fee: 200 },
];
export const MIN_MONTH = '1900-01';
export const isMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');
export const cashValue = x => { const n = Number(x); return Number.isFinite(n) && n >= 0 ? n : 0; };
export function defaultData() {
  return { groups: [], students: [], payments: [], expenses: [], savings: [], settings: { openingCash: null, openingSavings: 0 } };
}
export function validLegacy(x) {
  return !!x && typeof x === 'object' && ['students', 'payments', 'expenses'].every(k => Array.isArray(x[k]));
}
export function isV4(x) { return validLegacy(x) && Array.isArray(x.groups); }
function latestAt(events, month) {
  return [...(Array.isArray(events) ? events : [])].filter(e => isMonth(e.month) && e.month <= month).sort((a,b) => b.month.localeCompare(a.month))[0];
}
export function migrate(input) {
  if (!validLegacy(input)) throw new Error('ملف غير صالح');
  const base = defaultData();
  const legacy = !Array.isArray(input.groups);
  const knownGrades = new Map(LEGACY_GRADES.map(g => [g.id, g]));
  const allGradeIds = [...new Set((input.students || []).map(s => s.groupId || s.grade).filter(Boolean))];
  const groups = legacy ? allGradeIds.map(id => {
    const model = knownGrades.get(id);
    const fee = model?.fee || cashValue(input.students.find(s => (s.groupId || s.grade) === id)?.fee);
    return { id, name: model?.name || String(id), fee, feeHistory: [{ month: MIN_MONTH, fee }], archivedAt: null };
  }) : input.groups.map(g => {
    const fee = cashValue(g.fee);
    return { ...g, fee, feeHistory: Array.isArray(g.feeHistory) && g.feeHistory.length ? g.feeHistory : [{ month: MIN_MONTH, fee }], archivedAt: g.archivedAt || null };
  });
  const byId = new Map(groups.map(g => [g.id, g]));
  const students = input.students.map(s => {
    const groupId = s.groupId || s.grade;
    const g = byId.get(groupId);
    const joinedAt = isMonth(s.joinedAt) ? s.joinedAt : MIN_MONTH;
    const membership = Array.isArray(s.membership) && s.membership.length ? s.membership : [{ month: joinedAt, groupId }];
    let pricing = Array.isArray(s.pricing) ? s.pricing : [];
    if (legacy && s.fee !== undefined && g && Number(s.fee) !== g.fee) {
      pricing = [{ month: MIN_MONTH, type: 'custom', amount: cashValue(s.fee) }];
    }
    return {
      ...s, groupId, joinedAt, leftAt: s.leftAt || null,
      membership, pricing,
      monthRates: s.monthRates && typeof s.monthRates === 'object' && !Array.isArray(s.monthRates) ? s.monthRates : {},
    };
  });
  return { ...base, groups, students, payments: input.payments, expenses: input.expenses,
    savings: Array.isArray(input.savings) ? input.savings : [],
    settings: { ...base.settings, ...(input.settings || {}) } };
}
export function groupAt(student, month) {
  return latestAt(student.membership, month)?.groupId || student.groupId || student.grade;
}
export function groupFeeAt(group, month) {
  return cashValue(latestAt(group?.feeHistory, month)?.fee ?? group?.fee);
}
export function ruleAt(student, month) {
  if (student?.monthRates && Object.hasOwn(student.monthRates, month)) return student.monthRates[month];
  return latestAt(student?.pricing, month) || { type: 'standard' };
}
export function dueFor(student, month, groups) {
  const group = groups.find(g => g.id === groupAt(student, month));
  const rule = ruleAt(student, month);
  if (rule?.type === 'exempt') return 0;
  return rule?.type === 'custom' ? cashValue(rule.amount) : groupFeeAt(group, month);
}
export function activeInMonth(student, month, groups) {
  if ((student.joinedAt && student.joinedAt > month) || (student.leftAt && student.leftAt <= month)) return false;
  const group = groups.find(g => g.id === groupAt(student, month));
  return !!group && (!group.archivedAt || group.archivedAt > month);
}
export function receivedFor(studentId, month, payments) {
  return payments.filter(p => p.studentId === studentId && p.month === month)
    .reduce((total, p) => total + (Number(p.amount) || 0), 0);
}
export function collectionFor(student, month, db) {
  const due = dueFor(student, month, db.groups);
  const paid = receivedFor(student.id, month, db.payments);
  return { due, paid, remaining: Math.max(0, due - paid), exempt: ruleAt(student, month)?.type === 'exempt', overpaid: paid > due };
}
// Dues and arrears only count active students; receipts retain historical payments.
export function monthlyCollectionSummary(db, month, groupId) {
  const students = db.students.filter(s => groupId === undefined || groupAt(s, month) === groupId);
  const ids = new Set(students.map(s => s.id));
  const totals = { due: 0, paid: 0, remaining: 0 };
  for (const s of students) {
    if (!activeInMonth(s, month, db.groups)) continue;
    const c = collectionFor(s, month, db);
    totals.due += c.due;
    totals.remaining += c.remaining;
  }
  totals.paid = db.payments.filter(p => p.month === month && (groupId === undefined || ids.has(p.studentId)))
    .reduce((total, p) => total + (Number(p.amount) || 0), 0);
  return totals;
}
export function totalUncollected(db, month) {
  return monthlyCollectionSummary(db, month).remaining;
}

// Search normalization is only for matching; saved names are never changed.
export function normalizeStudentName(name) {
  return String(name ?? '').normalize('NFKC').replace(/\p{M}/gu, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/ـ/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}
const arabicNames = new Intl.Collator('ar', { sensitivity: 'base' });
export function rankStudents(students) {
  return [...students].sort((a, b) => arabicNames.compare(a.name, b.name) ||
    String(a.id).localeCompare(String(b.id))).map((student, index) => ({ student, number: index + 1 }));
}
export function searchRankedStudents(ranked, query) {
  const term = normalizeStudentName(query);
  return ranked.filter(({ student }) => normalizeStudentName(student.name).includes(term));
}
// Preserve older entries. Replacing an entry at the same effective month is intentional.
export function atEffectiveMonth(events, event) {
  return [...(events || []).filter(e => e.month !== event.month), event].sort((a,b) => a.month.localeCompare(b.month));
}
export function setStudentPrice(student, month, type, amount, duration = 'future') {
  const rule = type === 'custom' ? { type, amount: cashValue(amount) } : { type };
  if (duration === 'one') {
    return { ...student, monthRates: { ...(student.monthRates || {}), [month]: rule } };
  }
  const monthRates = { ...(student.monthRates || {}) };
  delete monthRates[month];
  return { ...student, pricing: atEffectiveMonth(student.pricing, { month, ...rule }), monthRates };
}
export function setGroupPrice(group, month, fee) {
  return { ...group, fee: cashValue(fee), feeHistory: atEffectiveMonth(group.feeHistory, { month, fee: cashValue(fee) }) };
}
export function setStudentGroup(student, month, groupId) {
  return { ...student, groupId, membership: atEffectiveMonth(student.membership, { month, groupId }) };
}
export function canDeleteStudent(student, payments) { return !payments.some(p => p.studentId === student.id); }
export function canDeleteGroup(group, students) {
  return !students.some(s => s.groupId === group.id || (s.membership || []).some(m => m.groupId === group.id));
}
