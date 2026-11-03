import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'masroof-ui-v1';
const GRADES = [
  { id: 'first', name: 'أولى ثانوي', fee: 150 },
  { id: 'second', name: 'تانية ثانوي', fee: 200 },
];
const CATEGORIES = ['مواصلات', 'أكل وشرب', 'مشتريات', 'اشتراكات', 'صحة', 'متفرقات'];
const ACTIVITIES = ['كلية', 'جيم', 'خروجة', 'البيت', 'شخصي', 'غير محدد'];
const nfmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const money = (n) => `${nfmt.format(Number(n) || 0)} ج`;
const id = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthOf = (date) => String(date).slice(0, 7);
const monthLabel = (month) => {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(new Date(year, m - 1, 1));
};
const isActiveIn = (student, month) => student.joinedAt <= month && (!student.leftAt || student.leftAt > month);
const sum = (items, key) => items.reduce((acc, item) => acc + Number(key ? item[key] : item || 0), 0);
const emptyData = () => ({ students: [], payments: [], expenses: [] });
const validData = (value) => value && Array.isArray(value.students) && Array.isArray(value.payments) && Array.isArray(value.expenses);
function loadData() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const parsed = existing ? JSON.parse(existing) : emptyData();
    return validData(parsed) ? parsed : emptyData();
  } catch { return emptyData(); }
}

function Icon({ name, size = 20, stroke = 1.8 }) {
  const props = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const shapes = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20"/><path d="M16 5.4a3 3 0 0 1 0 5.3M17.5 15.2A4.6 4.6 0 0 1 21 19.6V20"/></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13"/><path d="M16 13h5v5h-5a2.5 2.5 0 0 1 0-5Z"/><path d="M16.5 15.5h.01"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 15 4-5 3 2 6-7"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    check: <path d="m4 12 5 5L20 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <><path d="M19 12H5M12 5l-7 7 7 7"/></>,
    down: <><path d="M12 4v16m-6-6 6 6 6-6"/></>,
    up: <><path d="M12 20V4m-6 6 6-6 6 6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    x: <path d="M5 5l14 14M19 5 5 19"/>,
    edit: <><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13 7 4 4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 17v4h16v-4"/></>,
    download: <><path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 18v3h16v-3"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5-5L5 21"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
    dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>{shapes[name] || shapes.info}</svg>;
}

function Modal({ title, subtitle, children, onClose, wide = false }) {
  useEffect(() => {
    function esc(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-top"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="إغلاق"><Icon name="x"/></button></div>
      {children}
    </section>
  </div>;
}

function Status({ paid, fee, archived = false }) {
  if (archived) return <span className="status muted">متوقف</span>;
  if (paid >= fee && fee > 0) return <span className="status success"><i/>مدفوع</span>;
  if (paid > 0) return <span className="status warning"><i/>جزئي</span>;
  return <span className="status neutral"><i/>لم يدفع</span>;
}

function StudentEditor({ initial, grade, month, onSave, onClose, onToggle }) {
  const [name, setName] = useState(initial?.name || '');
  const [selectedGrade, setSelectedGrade] = useState(initial?.grade || grade || 'second');
  const [fee, setFee] = useState(initial?.fee ?? GRADES.find(g => g.id === (grade || 'second')).fee);
  const [joinedAt, setJoinedAt] = useState(initial?.joinedAt || month);
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('اكتب اسم الطالب.');
    if (Number(fee) <= 0) return setError('الشهرية لازم تكون أكبر من صفر.');
    const result = onSave({ name: name.trim(), grade: selectedGrade, fee: Number(fee), joinedAt });
    if (result) setError(result);
  }
  return <Modal title={initial ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'} subtitle="الاسم والشهرية فقط؛ لا يوجد حضور أو غياب." onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <label>اسم الطالب<input autoFocus value={name} placeholder="اكتب الاسم" onChange={e => setName(e.target.value)}/></label>
      <div className="two-fields"><label>الدفعة<select value={selectedGrade} onChange={e => { const v = e.target.value; setSelectedGrade(v); if (!initial) setFee(GRADES.find(g => g.id === v).fee); }}>
        {GRADES.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}
      </select></label><label>الشهرية (جنيه)<input type="number" min="1" step="1" value={fee} onChange={e => setFee(e.target.value)}/></label></div>
      <label>من شهر<input type="month" value={joinedAt} onChange={e => setJoinedAt(e.target.value)} required/></label>
      {initial && <p className="field-note">تغيير الشهرية هيغيّر المبلغ المطلوب للشهور المعروضة؛ المدفوعات القديمة هتفضل محفوظة.</p>}
      {error && <p className="error-msg">{error}</p>}
      {initial && <div className="archive-action"><button type="button" onClick={() => onToggle(initial)}>{initial.leftAt ? 'إعادة تفعيل الطالب' : 'إيقاف الطالب من الشهر المحدد'}</button><small>هيفضل سجل التحصيلات القديم زي ما هو.</small></div>}
      <div className="form-actions"><button type="button" className="btn subtle" onClick={onClose}>إلغاء</button><button className="btn primary" type="submit">{initial ? 'حفظ التعديلات' : 'إضافة الطالب'}</button></div>
    </form>
  </Modal>;
}

function BulkEditor({ grade, month, onSave, onClose }) {
  const [selectedGrade, setSelectedGrade] = useState(grade || 'second');
  const [names, setNames] = useState('');
  const [error, setError] = useState('');
  const lines = names.split(/\n/).map(x => x.trim()).filter(Boolean);
  function submit(e) {
    e.preventDefault();
    if (!lines.length) return setError('اكتب اسمًا واحدًا على الأقل.');
    const result = onSave(lines, selectedGrade, month);
    if (result) setError(result);
  }
  return <Modal title="إضافة أسماء دفعة كاملة" subtitle="انسخ الأسماء من عندك، وكل اسم في سطر لوحده." onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <label>الدفعة<select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>{GRADES.map(g => <option value={g.id} key={g.id}>{g.name} — {money(g.fee)}</option>)}</select></label>
      <label>أسماء الطلبة<textarea rows="9" value={names} onChange={e => setNames(e.target.value)} placeholder={'اسم الطالب الأول\nاسم الطالب الثاني\nاسم الطالب الثالث'} /></label>
      <div className="form-hint"><span>عدد الأسماء: <b>{lines.length}</b></span><span>الشهرية الافتراضية: {money(GRADES.find(g => g.id === selectedGrade).fee)}</span></div>
      {error && <p className="error-msg">{error}</p>}
      <div className="form-actions"><button type="button" className="btn subtle" onClick={onClose}>إلغاء</button><button type="submit" className="btn primary">إضافة الأسماء</button></div>
    </form>
  </Modal>;
}

function PaymentEditor({ student, month, payments, onAdd, onDelete, onClose }) {
  const records = payments.filter(p => p.studentId === student.id && p.month === month).sort((a,b) => b.date.localeCompare(a.date));
  const paid = sum(records, 'amount');
  const due = Math.max(0, student.fee - paid);
  const [amount, setAmount] = useState(due);
  const [date, setDate] = useState(localDate());
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError('اكتب مبلغ صحيح أكبر من صفر.');
    if (value > due) return setError(`المتبقي ${money(due)} فقط. لو فيه زيادة هنضيف دعمها في نسخة لاحقة.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('حدد تاريخ الاستلام.');
    onAdd({ studentId: student.id, month, amount: value, date, memo: memo.trim() });
    onClose();
  }
  return <Modal title={`شهرية ${student.name}`} subtitle={`${GRADES.find(g => g.id === student.grade)?.name || ''} · ${monthLabel(month)}`} onClose={onClose}>
    <div className="payment-summary"><div><span>قيمة الشهرية</span><strong>{money(student.fee)}</strong></div><div><span>المدفوع</span><strong>{money(paid)}</strong></div><div><span>الباقي</span><strong className="due-number">{money(due)}</strong></div></div>
    {due > 0 && <form className="form-stack" onSubmit={submit}>
      <label>المبلغ اللي استلمته<input type="number" min="1" max={due} step="0.01" autoFocus value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <button type="button" className="tiny-action" onClick={() => setAmount(due)}>تحصيل باقي الشهرية بالكامل ({money(due)})</button>
      <div className="two-fields"><label>تاريخ استلام الفلوس<input type="date" value={date} onChange={e => setDate(e.target.value)} required/></label><label>ملاحظة (اختياري)<input value={memo} onChange={e => setMemo(e.target.value)} placeholder="مثلاً: دفع جزء"/></label></div>
      <p className="field-note">لو بتسجل شهرية قديمة، اختار شهر الاستحقاق من أعلى الصفحة، وحدد هنا يوم استلام الفلوس الفعلي.</p>
      {error && <p className="error-msg">{error}</p>}
      <div className="form-actions"><button type="button" className="btn subtle" onClick={onClose}>إلغاء</button><button className="btn primary" type="submit">تسجيل التحصيل</button></div>
    </form>}
    {records.length > 0 && <div className="records-box"><h3>سجل الدفعات ({records.length})</h3>{records.map(p => <div className="record-item" key={p.id}><div><b>{money(p.amount)}</b><span>{p.date}{p.memo ? ` · ${p.memo}` : ''}</span></div><button className="icon-button danger-icon" title="حذف الدفعة" aria-label="حذف الدفعة" onClick={() => { if (window.confirm('متأكد إنك عايز تحذف الدفعة دي؟')) onDelete(p.id); }}><Icon name="trash" size={17}/></button></div>)}</div>}
    {!due && <div className="settled-message"><Icon name="check" size={18}/> الشهرية مدفوعة بالكامل.</div>}
  </Modal>;
}

function ExpenseEditor({ onSave, onClose }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('متفرقات');
  const [activity, setActivity] = useState('غير محدد');
  const [date, setDate] = useState(localDate());
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return setError('لازم تدخل مبلغ أكبر من صفر.');
    onSave({ amount: amountNumber, description: description.trim(), category, activity, date });
    onClose();
  }
  return <Modal title="مصروف جديد" subtitle="تقدر تسجل حتى 5 أو 10 جنيه من غير ما تكتب وصف." onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <label>المبلغ (جنيه)<input autoFocus type="number" min="0.01" step="0.01" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <div className="two-fields"><label>نوع المصروف<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label><label>النشاط<select value={activity} onChange={e => setActivity(e.target.value)}>{ACTIVITIES.map(a => <option key={a}>{a}</option>)}</select></label></div>
      <label>وصف اختياري<input value={description} placeholder="مثلاً: فطار / قهوة / مش لازم تكتب حاجة" onChange={e => setDescription(e.target.value)}/></label>
      <label>التاريخ<input type="date" value={date} onChange={e => setDate(e.target.value)} required/></label>
      {error && <p className="error-msg">{error}</p>}
      <div className="form-actions"><button type="button" className="btn subtle" onClick={onClose}>إلغاء</button><button className="btn primary" type="submit">حفظ المصروف</button></div>
    </form>
  </Modal>;
}

function StatCard({ eyebrow, value, detail, icon, tone = '' }) {
  return <article className={`stat-card ${tone}`}><div className="stat-head"><span>{eyebrow}</span><span className="stat-icon"><Icon name={icon} size={19}/></span></div><strong>{value}</strong><p>{detail}</p></article>;
}

function Empty({ title, description, button, action }) {
  return <div className="empty"><div className="empty-mark"><Icon name="users" size={28}/></div><h3>{title}</h3><p>{description}</p>{button && <button onClick={action} className="btn primary"><Icon name="plus" size={17}/>{button}</button>}</div>;
}

export default function App() {
  const [db, setDb] = useState(loadData);
  const [screen, setScreen] = useState('students');
  const [month, setMonth] = useState(monthOf(localDate()));
  const [grade, setGrade] = useState('second');
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
    catch { setToast('تعذّر حفظ البيانات في المتصفح. اعمل نسخة احتياطية الآن.'); }
  }, [db]);
  const notify = (message) => setToast(message);

  const activeStudents = useMemo(() => db.students.filter(s => isActiveIn(s, month)), [db.students, month]);
  const monthPayments = useMemo(() => db.payments.filter(p => p.month === month), [db.payments, month]);
  const monthlyCash = useMemo(() => db.payments.filter(p => monthOf(p.date) === month), [db.payments, month]);
  const monthlyExpenses = useMemo(() => db.expenses.filter(e => monthOf(e.date) === month), [db.expenses, month]);
  const cashIncome = sum(monthlyCash, 'amount');
  const cashSpent = sum(monthlyExpenses, 'amount');
  const monthExpected = sum(activeStudents, 'fee');
  const obligationPaid = sum(monthPayments.filter(p => activeStudents.some(s => s.id === p.studentId)), 'amount');
  const monthUncollected = Math.max(0, monthExpected - obligationPaid);
  const filteredGradeStudents = db.students.filter(s => (grade === 'all' || s.grade === grade) && (isActiveIn(s, month) || (includeArchived && s.leftAt && s.leftAt <= month)));
  const visibleStudents = filteredGradeStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase().trim()));
  const gradeActive = activeStudents.filter(s => grade === 'all' || s.grade === grade);
  const gradePaid = sum(monthPayments.filter(p => gradeActive.some(s => s.id === p.studentId)), 'amount');
  const gradeExpected = sum(gradeActive, 'fee');
  const gradeOutstanding = Math.max(0, gradeExpected - gradePaid);
  const paidCount = gradeActive.filter(s => sum(monthPayments.filter(p => p.studentId === s.id), 'amount') >= s.fee).length;
  const progress = gradeExpected > 0 ? Math.min(100, 100 * gradePaid / gradeExpected) : 0;
  const dueFor = (s) => Math.max(0, Number(s.fee) - sum(monthPayments.filter(p => p.studentId === s.id), 'amount'));
  const paidFor = (s) => sum(monthPayments.filter(p => p.studentId === s.id), 'amount');
  const newestPayments = [...db.payments].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 4);
  const netCash = cashIncome - cashSpent;

  function saveStudent(fields) {
    const duplicate = db.students.some(s => s.id !== modal?.student?.id && s.grade === fields.grade && s.name.trim().toLowerCase() === fields.name.toLowerCase());
    if (duplicate) return 'الاسم ده موجود بالفعل في نفس الدفعة.';
    if (modal?.student) setDb(d => ({ ...d, students: d.students.map(s => s.id === modal.student.id ? { ...s, ...fields } : s) }));
    else setDb(d => ({ ...d, students: [...d.students, { id: id(), ...fields, leftAt: null }] }));
    setModal(null); notify(modal?.student ? 'تم تعديل بيانات الطالب.' : 'تم إضافة الطالب.');
    return null;
  }
  function saveBulk(names, gradeId, joinedAt) {
    const existing = new Set(db.students.filter(s => s.grade === gradeId).map(s => s.name.trim().toLowerCase()));
    const unique = [...new Set(names.map(s => s.toLowerCase()))];
    if (unique.length !== names.length) return 'فيه أسماء مكررة في القائمة. امسح التكرار الأول.';
    if (names.some(name => existing.has(name.toLowerCase()))) return 'فيه أسماء مسجلة بالفعل في نفس الدفعة. امسح الأسماء المكررة.';
    const fee = GRADES.find(g => g.id === gradeId).fee;
    const added = names.map(name => ({ id: id(), name, grade: gradeId, fee, joinedAt, leftAt: null }));
    setDb(d => ({ ...d, students: [...d.students, ...added] }));
    setGrade(gradeId); setIncludeArchived(false); setModal(null); notify(`تم إضافة ${names.length} طالب.`);
    return null;
  }
  function addPayment(record) { setDb(d => ({ ...d, payments: [...d.payments, { ...record, id: id() }] })); notify(`تم تسجيل تحصيل ${money(record.amount)}.`); }
  function deletePayment(paymentId) { setDb(d => ({ ...d, payments: d.payments.filter(p => p.id !== paymentId) })); notify('تم حذف الدفعة.'); }
  function addExpense(record) { setDb(d => ({ ...d, expenses: [...d.expenses, { ...record, id: id() }] })); notify(`تم إضافة مصروف ${money(record.amount)}.`); }
  function deleteExpense(expenseId) { if (window.confirm('متأكد من حذف المصروف؟')) { setDb(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== expenseId) })); notify('تم حذف المصروف.'); } }
  function toggleStudent(s) {
    const archive = !s.leftAt;
    const changed = archive ? { leftAt: month } : { leftAt: null };
    if (archive && !window.confirm(`إيقاف ${s.name} بداية من ${monthLabel(month)}؟ سجلات الدفع القديمة مش هتتمسح.`)) return;
    setDb(d => ({ ...d, students: d.students.map(x => x.id === s.id ? { ...x, ...changed } : x) }));
    notify(archive ? 'تم إيقاف الطالب مع الاحتفاظ بالسجل.' : 'تم تفعيل الطالب مرة تانية.');
    setModal(null);
  }
  function backup() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...db }, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `masroof-backup-${localDate()}.json`); notify('اتصدرت النسخة الاحتياطية. احفظها في مكان آمن.');
  }
  function downloadBlob(blob, filename) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
  async function restore(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const content = JSON.parse(await file.text());
      if (!validData(content)) throw new Error('invalid');
      if (window.confirm('استرجاع النسخة هيمسح بيانات النسخة الحالية ويستبدلها بالملف. متأكد؟')) {
        setDb({ students: content.students, payments: content.payments, expenses: content.expenses });
        notify('تم استرجاع البيانات بنجاح.');
      }
    } catch { notify('الملف مش نسخة احتياطية صحيحة من مصروف.'); }
    e.target.value = '';
  }
  function csvExport() {
    const rows = [['التاريخ', 'النوع', 'الاسم أو الوصف', 'التصنيف', 'النشاط', 'شهر الشهرية', 'المبلغ']];
    monthlyCash.forEach(p => rows.push([p.date, 'دخل', db.students.find(s => s.id === p.studentId)?.name || 'طالب سابق', 'شهرية', '', p.month, p.amount]));
    monthlyExpenses.forEach(e => rows.push([e.date, 'مصروف', e.description || 'بدون وصف', e.category, e.activity, '', -Number(e.amount)]));
    const content = '\uFEFF' + rows.map(row => row.map(x => { const value = String(x ?? ''); const safe = /^[=+@-]/.test(value) && !/^-?\d+(\.\d+)?$/.test(value) ? `\'${value}` : value; return `"${safe.replace(/"/g, '""')}"`; }).join(',')).join('\r\n');
    downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), `masroof-${month}.csv`);
    notify('تم تصدير حركة الشهر CSV.');
  }
  function summaryText() {
    return `تقرير مصروف — ${monthLabel(month)}\nالمقبوض نقدًا: ${money(cashIncome)}\nالمصروفات: ${money(cashSpent)}\nصافي حركة الشهر: ${money(netCash)}\nالشهريات المطلوبة: ${money(monthExpected)}\nالمتبقي من شهريات الشهر: ${money(monthUncollected)}`;
  }
  async function copySummary() { try { await navigator.clipboard.writeText(summaryText()); notify('تم نسخ الملخص.'); } catch { notify('المتصفح منع النسخ؛ جرّب من localhost أو HTTPS.'); } }
  function exportImage() {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 680;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f6f5f2'; ctx.fillRect(0, 0, 1200, 680);
    ctx.fillStyle = '#fff'; ctx.fillRect(50, 50, 1100, 580);
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = '#152b25';
    ctx.font = 'bold 46px Tahoma, Arial, sans-serif'; ctx.fillText('مصروف.', 1080, 138);
    ctx.font = '28px Tahoma, Arial, sans-serif'; ctx.fillStyle = '#69746e'; ctx.fillText(`ملخص ${monthLabel(month)}`, 1080, 193);
    const items = [
      ['المقبوض نقدًا خلال الشهر', money(cashIncome)],
      ['مصروفات الشهر', money(cashSpent)],
      ['صافي حركة الشهر', money(netCash)],
      ['الشهريات المطلوبة', money(monthExpected)],
      ['المتبقي من شهريات الشهر', money(monthUncollected)],
    ];
    items.forEach(([label, value], i) => {
      const y = 260 + i * 64;
      ctx.fillStyle = '#535e59'; ctx.font = '24px Tahoma, Arial, sans-serif'; ctx.fillText(label, 1060, y);
      ctx.textAlign = 'left'; ctx.fillStyle = '#1b3028'; ctx.font = 'bold 27px Tahoma, Arial, sans-serif'; ctx.fillText(value, 110, y);
      ctx.textAlign = 'right';
      if (i < items.length - 1) { ctx.strokeStyle = '#eceeea'; ctx.beginPath(); ctx.moveTo(100, y + 18); ctx.lineTo(1100, y + 18); ctx.stroke(); }
    });
    canvas.toBlob(blob => { if (blob) { downloadBlob(blob, `masroof-summary-${month}.png`); notify('تم تصدير صورة الملخص.'); } }, 'image/png');
  }

  const menu = [
    { key: 'dashboard', name: 'نظرة عامة', icon: 'dashboard' },
    { key: 'students', name: 'الطلبة والشهريات', icon: 'users' },
    { key: 'expenses', name: 'المصاريف', icon: 'wallet' },
    { key: 'reports', name: 'التقارير', icon: 'chart' },
  ];
  const pageTitle = menu.find(m => m.key === screen)?.name;
  const go = (key) => { setScreen(key); setMenuOpen(false); setSearch(''); };

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-square"><span>م</span></div><div><strong>مَصروف<span>.</span></strong><small>فلوسك بشكل أوضح</small></div></div>
      <div className="side-label">القائمة الرئيسية</div>
      <nav className="side-nav">{menu.map(item => <button key={item.key} onClick={() => go(item.key)} className={`nav-item ${screen === item.key ? 'active' : ''}`}><Icon name={item.icon} size={19}/><span>{item.name}</span>{screen === item.key && <span className="active-dot"/>}</button>)}</nav>
      <div className="side-bottom"><div className="local-notice"><Icon name="info" size={18}/><div><strong>نسخة تجريبية محلية</strong><p>احفظ نسخة احتياطية. المزامنة السحابية لسه مش مفعّلة.</p></div></div><button className="backup-side" onClick={backup}><Icon name="download" size={18}/> تنزيل نسخة احتياطية</button></div>
    </aside>
    {menuOpen && <button className="mobile-shade" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-title"><button className="mobile-menu icon-button" aria-label="فتح القائمة" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button><span>المساحة الشخصية</span><b>/</b><strong>{pageTitle}</strong></div><div className="topbar-actions"><span className="today-label">{new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span><button className="icon-button top-backup" title="نسخة احتياطية" aria-label="نسخة احتياطية" onClick={backup}><Icon name="download" size={20}/></button></div></header>
      <div className="main-content">
        <div className="page-head"><div className="page-heading"><p className="eyebrow">دفترك المالي</p><h1>{pageTitle}</h1><p className="page-description">{screen === 'students' ? 'كل طالب، كل شهرية، وكل جنيه استلمته — في مكان واحد.' : screen === 'expenses' ? 'سجّل أي مبلغ، حتى المصاريف الصغيرة جدًا.' : screen === 'reports' ? 'أرقام واضحة تساعدك تفهم فين فلوسك بتروح.' : 'اعرف فلوسك دخلت منين وراحت فين.'}</p></div><div className="page-controls"><label className="month-picker"><Icon name="calendar" size={18}/><input aria-label="اختيار الشهر" type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)}/></label><button className="btn primary" onClick={() => setModal({ type: screen === 'expenses' ? 'expense' : 'student' })}><Icon name="plus" size={18}/>{screen === 'expenses' ? 'مصروف جديد' : 'إضافة طالب'}</button></div></div>

        {screen === 'students' && <>
          <div className="grade-switch"><div className="seg-tabs">{[{ id:'second', name:'تانية ثانوي' },{ id:'first', name:'أولى ثانوي' },{ id:'all', name:'كل الطلبة' }].map(g => <button key={g.id} onClick={() => { setGrade(g.id); setSearch(''); }} className={grade === g.id ? 'selected' : ''}>{g.name}{g.id !== 'all' && <span>{db.students.filter(s => s.grade === g.id && isActiveIn(s, month)).length}</span>}</button>)}</div><button className="text-action bulk-trigger" onClick={() => setModal({ type: 'bulk' })}><Icon name="layers" size={17}/> إضافة أسماء دفعة كاملة</button></div>
          <section className="stats-grid">
            <StatCard eyebrow="المطلوب للشهر" value={money(gradeExpected)} icon="receipt" detail={`${gradeActive.length} طالب في الدفعة`}/>
            <StatCard eyebrow="المحصّل من شهريات الشهر" value={money(gradePaid)} icon="wallet" detail="حتى لو استلمت الفلوس في شهر تاني" tone="green-card"/>
            <StatCard eyebrow="لسه هتتحصّل" value={money(gradeOutstanding)} icon="clock" detail="من شهريات الشهر المحدد"/>
            <StatCard eyebrow="دفعوا بالكامل" value={`${paidCount} / ${gradeActive.length}`} icon="users" detail={`${gradeActive.length - paidCount} طالب لسه مش مكمل الشهرية`}/>
          </section>
          <div className="section-grid">
            <section className="panel student-panel"><div className="panel-heading"><div><h2>قائمة الطلبة</h2><p>{grade === 'all' ? 'جميع الدفعات' : GRADES.find(g => g.id === grade)?.name} — {monthLabel(month)}</p></div><div className="list-tools"><label className="search-box"><Icon name="search" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم الطالب"/></label></div></div>
              {db.students.length === 0 ? <Empty title="لسه مفيش طلبة مسجلين" description="ضيف أسماء الـ 16 طالب بتوع تانية ثانوي دفعة واحدة، وبعدها الـ 7 بتوع أولى ثانوي." button="إضافة الأسماء بالجملة" action={() => setModal({ type: 'bulk' })}/> : <>
                {visibleStudents.length ? <div className="table-wrapper"><table className="data-table"><thead><tr><th>الطالب</th><th>حالة الشهرية</th><th>المدفوع</th><th>المتبقي</th><th aria-label="إجراءات"></th></tr></thead><tbody>{visibleStudents.map((s, index) => { const paid = paidFor(s); const due = dueFor(s); const archived = !isActiveIn(s, month); return <tr key={s.id}><td><div className="student-info"><span className="avatar">{s.name.charAt(0)}</span><div><strong>{s.name}</strong><small>{grade === 'all' ? GRADES.find(g => g.id === s.grade)?.name : `طالب ${index + 1}`}</small></div></div></td><td><Status paid={paid} fee={s.fee} archived={archived}/></td><td className="money-cell">{money(paid)} <small>من {money(s.fee)}</small></td><td className={`money-cell ${due ? 'has-due' : ''}`}>{money(due)}</td><td><div className="row-actions"><button className="btn small outlined" onClick={() => setModal({ type: 'payment', student: s })}>{archived ? 'السجل' : due ? 'تحصيل' : 'تفاصيل'}</button><button className="icon-button" aria-label={`تعديل ${s.name}`} title="تعديل بيانات الطالب" onClick={() => setModal({ type: 'student', student: s })}><Icon name="edit" size={17}/></button></div></td></tr>; })}</tbody></table></div> : <Empty title="مفيش نتائج بالشروط دي" description="جرّب اسم تاني أو اعرض الطلبة المتوقفين."/>}
                <div className="table-footer"><label className="checkbox-line"><input type="checkbox" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)}/> إظهار الطلبة المتوقفين</label><span>المعروض: {visibleStudents.length} طالب</span></div>
              </>}
            </section>
            <aside className="right-column"><section className="panel collection-panel"><div className="small-heading"><h2>نسبة التحصيل</h2><span>{Math.round(progress)}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }}/></div><div className="ratio-foot"><span>المحصّل: {money(gradePaid)}</span><span>من {money(gradeExpected)}</span></div><div className="collection-insight"><Icon name="info" size={17}/><p>المبلغ المطلوب مش معناه إن الفلوس كلها دخلت معاك. الرصيد النقدي بيتحسب بتاريخ الاستلام الفعلي.</p></div></section>
              <section className="panel mini-ledger"><div className="small-heading"><h2>فلوس الشهر الفعلية</h2><button className="text-action" onClick={() => go('dashboard')}>التفاصيل <Icon name="arrow" size={15}/></button></div><div className="ledger-row"><span><i className="ledger-dot green"/>دخل استلمته</span><strong>{money(cashIncome)}</strong></div><div className="ledger-row"><span><i className="ledger-dot rust"/>مصروفات</span><strong>{money(cashSpent)}</strong></div><div className="ledger-total"><span>صافي حركة الشهر</span><strong className={netCash < 0 ? 'red-text' : ''}>{money(netCash)}</strong></div><p className="ledger-note">الصافي ده مش رصيدك الكلي؛ لأنه لا يشمل فلوس كانت معاك من قبل.</p></section>
            </aside>
          </div>
        </>}

        {screen === 'dashboard' && <>
          <section className="stats-grid"><StatCard eyebrow="دخل استلمته خلال الشهر" value={money(cashIncome)} icon="wallet" detail="حسب تاريخ استلام كل دفعة" tone="green-card"/><StatCard eyebrow="مصروفات الشهر" value={money(cashSpent)} icon="receipt" detail={`${monthlyExpenses.length} عملية صرف`}/><StatCard eyebrow="صافي حركة الشهر" value={money(netCash)} icon="chart" detail="الدخل النقدي ناقص المصاريف"/><StatCard eyebrow="شهريات لسه مطلوبة" value={money(monthUncollected)} icon="clock" detail="للشهر المحدد"/></section>
          <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>ملخص الدفعات</h2><p>حالة طلبتك في {monthLabel(month)}</p></div><button className="text-action" onClick={() => go('students')}>إدارة الشهريات <Icon name="arrow" size={16}/></button></div><div className="grade-summary">{GRADES.map(g => { const students = activeStudents.filter(s => s.grade === g.id); const expected = sum(students,'fee'); const collected = sum(monthPayments.filter(p => students.some(s => s.id === p.studentId)),'amount'); return <div key={g.id} className="grade-row"><div className="grade-row-title"><strong>{g.name}</strong><small>{students.length} طالب</small></div><div className="grade-row-amount"><strong>{money(collected)}</strong><small>من {money(expected)}</small></div><div className="progress-track"><span style={{ width: `${expected ? Math.min(100, collected/expected*100) : 0}%` }}/></div></div>; })}</div></section><section className="panel"><div className="panel-heading"><div><h2>آخر التحصيلات</h2><p>آخر 4 عمليات مسجلة</p></div></div>{newestPayments.length ? newestPayments.map(p => <div className="activity-row" key={p.id}><span className="activity-icon"><Icon name="down" size={17}/></span><div><strong>{db.students.find(s => s.id === p.studentId)?.name || 'طالب سابق'}</strong><small>{p.date} · شهرية {p.month}</small></div><b>{money(p.amount)}</b></div>) : <p className="empty-inline">مفيش تحصيلات لحد دلوقتي.</p>}</section></div>
          <div className="home-note"><Icon name="info" size={18}/><span>لو قبضت شهرية متأخرة من أكتوبر في نوفمبر، هتظهر ضمن دخل نوفمبر النقدي، وضمن تحصيل شهرية أكتوبر.</span></div>
        </>}

        {screen === 'expenses' && <>
          <section className="stats-grid slim-grid"><StatCard eyebrow="إجمالي مصروفات الشهر" value={money(cashSpent)} icon="wallet" detail={`${monthlyExpenses.length} عملية`}/><StatCard eyebrow="متوسط يومي منذ بداية الشهر" value={money(cashSpent / (month === monthOf(localDate()) ? new Date().getDate() : new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()))} icon="chart" detail="على عدد الأيام المنقضية"/><StatCard eyebrow="المقبوض خلال الشهر" value={money(cashIncome)} icon="down" detail="جميع الشهريات المستلمة"/><StatCard eyebrow="صافي حركة الشهر" value={money(netCash)} icon="receipt" detail="التحصيل النقدي ناقص المصروفات"/></section>
          <section className="panel expense-panel"><div className="panel-heading"><div><h2>سجل المصروفات</h2><p>اختار نشاط وممكن تسيب الوصف فاضي.</p></div><button className="btn outlined" onClick={() => setModal({ type: 'expense' })}><Icon name="plus" size={17}/> أضف مصروف</button></div>{monthlyExpenses.length ? <div className="table-wrapper"><table className="data-table"><thead><tr><th>المصروف</th><th>النوع</th><th>النشاط</th><th>التاريخ</th><th>المبلغ</th><th></th></tr></thead><tbody>{[...monthlyExpenses].sort((a,b) => b.date.localeCompare(a.date)).map(e => <tr key={e.id}><td><strong>{e.description || 'بدون وصف'}</strong></td><td>{e.category}</td><td>{e.activity}</td><td className="date-cell">{e.date}</td><td className="money-cell">{money(e.amount)}</td><td><button title="حذف المصروف" className="icon-button danger-icon" aria-label="حذف المصروف" onClick={() => deleteExpense(e.id)}><Icon name="trash" size={17}/></button></td></tr>)}</tbody></table></div> : <Empty title="مفيش مصاريف في الشهر ده" description="سجل حتى المصاريف الصغيرة من غير وصف، عشان الحساب يطلع مضبوط." button="سجّل أول مصروف" action={() => setModal({ type:'expense' })}/>}</section>
        </>}

        {screen === 'reports' && <>
          <section className="stats-grid"><StatCard eyebrow="المقبوض نقدًا" value={money(cashIncome)} icon="down" detail={monthLabel(month)}/><StatCard eyebrow="المصروفات" value={money(cashSpent)} icon="up" detail={monthLabel(month)}/><StatCard eyebrow="صافي حركة الشهر" value={money(netCash)} icon="chart" detail="من غير رصيد افتتاحي"/><StatCard eyebrow="متبقي تحصيل شهريات" value={money(monthUncollected)} icon="clock" detail="لشهر الاستحقاق"/></section>
          <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>المصاريف حسب التصنيف</h2><p>إجمالي شهر {monthLabel(month)}</p></div></div><div className="bar-list">{CATEGORIES.map(c => ({ name: c, amount: sum(monthlyExpenses.filter(e => e.category === c),'amount') })).filter(x => x.amount > 0).sort((a,b) => b.amount-a.amount).map(x => <div className="bar-item" key={x.name}><div className="bar-item-label"><span>{x.name}</span><b>{money(x.amount)}</b></div><div className="bar-track"><span style={{width: `${x.amount/Math.max(cashSpent, 1)*100}%`}}/></div></div>)}{!monthlyExpenses.length && <p className="empty-inline">هتظهر المقارنة هنا لما تسجل مصاريف.</p>}</div></section><section className="panel"><div className="panel-heading"><div><h2>تصدير تقريرك</h2><p>خد ملخص الشهر بصيغ مختلفة</p></div></div><div className="export-list"><button onClick={exportImage}><Icon name="image" size={20}/><span>تصدير صورة PNG</span><Icon name="download" size={17}/></button><button onClick={csvExport}><Icon name="receipt" size={20}/><span>تصدير العمليات CSV</span><Icon name="download" size={17}/></button><button onClick={copySummary}><Icon name="copy" size={20}/><span>نسخ ملخص الشهر</span><Icon name="copy" size={17}/></button><button onClick={backup}><Icon name="download" size={20}/><span>نسخة احتياطية كاملة JSON</span><Icon name="download" size={17}/></button><button onClick={() => fileInput.current?.click()}><Icon name="upload" size={20}/><span>استيراد نسخة احتياطية</span><Icon name="arrow" size={17}/></button></div></section></div>
          <div className="home-note"><Icon name="info" size={18}/><span>التقرير المالي بيعتمد على تاريخ قبض الفلوس الفعلي، حتى لو الشهرية تخص شهر مختلف.</span></div>
        </>}
        <footer className="footer">مَصروف <span>·</span> نسخة أولى للتجربة — بدون ربط سحابي حاليًا</footer>
      </div>
    </main>
    {toast && <div className="toast" role="status"><span>{toast}</span><button aria-label="إغلاق الإشعار" onClick={() => setToast('')}><Icon name="x" size={16}/></button></div>}
    {modal?.type === 'student' && <StudentEditor initial={modal.student} grade={grade === 'all' ? 'second' : grade} month={month} onSave={saveStudent} onToggle={toggleStudent} onClose={() => setModal(null)}/>}
    {modal?.type === 'bulk' && <BulkEditor grade={grade === 'all' ? 'second' : grade} month={month} onSave={saveBulk} onClose={() => setModal(null)}/>}
    {modal?.type === 'payment' && <PaymentEditor student={modal.student} month={month} payments={db.payments} onAdd={addPayment} onDelete={deletePayment} onClose={() => setModal(null)}/>}
    {modal?.type === 'expense' && <ExpenseEditor onSave={addExpense} onClose={() => setModal(null)}/>}
    <input hidden ref={fileInput} type="file" accept="application/json,.json" onChange={restore}/>
  </div>;
}
