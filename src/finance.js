// وظائف بسيطة مستقلة عن React، من غير أي مكتبات إضافية.
export function monthBefore(ym) {
  const match = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!match) return '';
  const [year, month] = [Number(match[1]), Number(match[2])];
  if (month < 1 || month > 12) return '';
  return `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}`;
}
export function daysInMonth(ym) {
  const match = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!match) return 0;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return 0;
  return new Date(Number(match[1]), month, 0).getDate();
}
export function monthComparison(expenses, selectedMonth, now = new Date()) {
  const previous = monthBefore(selectedMonth);
  const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isOngoing = selectedMonth === todayMonth;
  const isFuture = selectedMonth > todayMonth;
  const cutoff = isOngoing ? now.getDate() : daysInMonth(selectedMonth);
  const previousCutoff = isOngoing ? Math.min(cutoff, daysInMonth(previous)) : daysInMonth(previous);
  const totalFor = (ym, days) => expenses.filter(e =>
    typeof e?.date === 'string' && e.date.slice(0, 7) === ym && Number(e.date.slice(8, 10)) <= days
  ).reduce((total, e) => total + (Number(e?.amount) || 0), 0);
  const current = totalFor(selectedMonth, cutoff);
  const earlier = totalFor(previous, previousCutoff);
  return { current, earlier, previous, isOngoing, isFuture, cutoff, previousCutoff,
    difference: current - earlier, percent: earlier > 0 ? ((current - earlier) / earlier) * 100 : null,
    max: Math.max(current, earlier, 1) };
}
export function duplicateExpense(expense, date, id) {
  return { ...expense, id, date }; // الأصل بدون تغيير، والمعرّف جديد دائماً
}
export function getExpenseVisual(expense) {
  const cat = String(expense?.category || '').toLowerCase();
  const desc = String(expense?.description || '').toLowerCase();
  if (cat.includes('مواصلات')) return 'transport';
  if (cat.includes('كلية')) return 'study';
  if (cat.includes('اشتراك')) return 'subscription';
  if (cat.includes('خروج')) return 'outing';
  if (cat.includes('مشتريات')) return 'shopping';
  if (cat.includes('أكل') || cat.includes('شرب')) return 'food';
  if (/مواصلات|موقف|ميكروباص|تاكسي|اوبر|أوبر|اتوبيس|أتوبيس|قطر|مترو/.test(desc)) return 'transport';
  if (/كلية|جامعة|محاضرة|مذكرة|كتب|ملازم|طباعة/.test(desc)) return 'study';
  if (/جيم|تمرين|بروتين/.test(desc)) return 'fitness';
  if (/نت|انترنت|إنترنت|باقة|شحن|اشتراك/.test(desc)) return 'subscription';
  if (/حلويات|بقلاوة|ايس كريم|آيس كريم|أكل|فطار|غدا|عشا|قهوة|عصير|سندوتش|مطعم/.test(desc)) return 'food';
  if (/دوا|صيدلية|دكتور|فرشاة|معجون|علاج/.test(desc)) return 'wellness';
  if (/بنطلون|لبس|تيشيرت|شراء|سماعة|موبايل|شاشة|سكرين/.test(desc)) return 'shopping';
  if (/خروجة|صحاب|فسحة|سينما/.test(desc)) return 'outing';
  return 'misc';
}
export function backupIsDue(lastBackup, now = Date.now(), days = 7) {
  if (!lastBackup) return true;
  const timestamp = Date.parse(lastBackup);
  return !Number.isFinite(timestamp) || now - timestamp >= days * 24 * 60 * 60 * 1000;
}
