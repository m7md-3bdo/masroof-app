import React, { useEffect, useMemo, useRef, useState } from 'react';
import { monthComparison, duplicateExpense, getExpenseVisual, backupIsDue } from './finance.js';
import { FA_ICONS } from './fa-icons.js';
import { defaultData, validLegacy, isV4, migrate, isMonth,
  activeInMonth, groupAt, ruleAt, dueFor, groupFeeAt, collectionFor,
  totalUncollected, atEffectiveMonth, setStudentPrice, setStudentGroup,
  setGroupPrice, canDeleteStudent, canDeleteGroup } from './ledger.js';

const STORE = 'masroof-lite-v4';
const OLD_STORE = 'masroof-lite-v2';
const OLDER_STORE = 'masroof-ui-v1';
const LAST_BACKUP = 'masroof-lite-last-backup-v3';
const BACKUP_DISMISS = 'masroof-lite-backup-dismiss-v3';
const storageRead = key => { try { return localStorage.getItem(key); } catch { return null; } };
const storageWrite = (key, val) => { try { localStorage.setItem(key, val); } catch {} };
const CATEGORIES = ['متفرقات', 'كلية', 'مواصلات', 'أكل وشرب', 'خروجات', 'مشتريات', 'اشتراكات'];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const toMonth = d => String(d || '').slice(0,7);
const currentMonth = () => toMonth(today());
const uid = () => globalThis.crypto?.randomUUID?.() || `m${Date.now()}-${Math.random().toString(36).slice(2)}`;
const number = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);
const money = n => `${number(n)} ج`;
const fullMoney = n => `${number(n)} جنيه`;
const monthLabel = m => { if (!isMonth(m)) return m || ''; const [y,mm]=m.split('-').map(Number); return new Intl.DateTimeFormat('ar-EG-u-nu-latn',{month:'long',year:'numeric'}).format(new Date(y,mm-1,1)); };
const dateLabel = iso => { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso||'')) return String(iso||''); const [y,m,d]=iso.split('-').map(Number); return new Intl.DateTimeFormat('ar-EG-u-nu-latn',{day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d)); };
const sum = (arr, field='amount') => arr.reduce((n,x)=>n+(Number(x?.[field])||0),0);
function readInitial() {
  try {
    const newest = localStorage.getItem(STORE);
    if (newest !== null) {
      const parsed = JSON.parse(newest);
      if (!isV4(parsed)) return { db: defaultData(), blocked: true, migrated: false };
      return { db: migrate(parsed), blocked: false, migrated: false };
    }
    for (const key of [OLD_STORE, OLDER_STORE]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!validLegacy(parsed)) continue;
        return { db: migrate(parsed), blocked: false, migrated: true };
      }
    }
    return { db: defaultData(), blocked: false, migrated: false };
  } catch {
    return { db: defaultData(), blocked: true, migrated: false };
  }
}
function Icon({name, size=20}) {
  const [width,height,paths] = FA_ICONS[name] || FA_ICONS.info;
  return <svg width={size} height={size} viewBox={`0 0 ${width} ${height}`} fill="currentColor" aria-hidden="true" focusable="false" style={{flexShrink:0}}>{Array.isArray(paths)?paths.map((d,i)=><path d={d} key={i}/>):<path d={paths}/>}</svg>;
}
function Modal({title,children,onClose}){
  useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
  return <div className="shade" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="dialog" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-head"><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق"><Icon name="close"/></button></div>{children}</section></div>;
}
function ExpenseForm({item,save,close}){
 const [amount,setAmount]=useState(item?.amount??'');
 const [description,setDescription]=useState(item?.description||'');
 const [category,setCategory]=useState(item?.category||'متفرقات');
 const [date,setDate]=useState(item?.date||today());
 const [error,setError]=useState('');
 function submit(e){e.preventDefault(); if(!(Number(amount)>0)||!Number.isFinite(Number(amount)))return setError('اكتب مبلغ صحيح.');if(!date)return setError('اختار تاريخ المصروف.');save({id:item?.id||uid(),amount:Number(amount),description:description.trim(),category,date,activity:item?.activity||''});close();}
 return <Modal title={item?'تعديل المصروف':'إضافة مصروف'} onClose={close}><form onSubmit={submit} className="form">
  <label>المبلغ بالجنيه<input autoFocus type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="مثلاً 30" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
  <label>المصروف كان إيه؟ <small>اختياري</small><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="حلويات، مواصلات، يوم في الكلية..."/></label>
  <div className="form-line"><label>التصنيف<select value={category} onChange={e=>setCategory(e.target.value)}>{[...new Set([category,...CATEGORIES])].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>التاريخ<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label></div>
  {error&&<p className="form-error">{error}</p>}
  <div className="form-actions"><button className="btn secondary" type="button" onClick={close}>إلغاء</button><button className="btn primary" type="submit">{item?'حفظ التعديل':'حفظ المصروف'}</button></div>
 </form></Modal>;
}
function GroupForm({ group, month, save, close }) {
  const [name, setName] = useState(group?.name || '');
  const [fee, setFee] = useState(group ? groupFeeAt(group, month) : '');
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('اكتب اسم المجموعة أو الباقة.');
    if (fee === '' || !Number.isFinite(Number(fee)) || Number(fee) < 0) return setError('اكتب سعرًا صحيحًا. ممكن يكون صفر.');
    const issue = save(group, name.trim(), Number(fee));
    if (issue) return setError(issue);
    close();
  }
  return <Modal title={group ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'} onClose={close}>
    <form className="form" onSubmit={submit}>
      <label>اسم المجموعة / الباقة<input autoFocus required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="مثلاً ثالثة إعدادي أو Premium"/></label>
      <label>سعر الاشتراك الافتراضي بالجنيه<input type="number" min="0" step="0.01" required value={fee} onChange={e=>setFee(e.target.value)} placeholder="مثلاً 200"/></label>
      <p className="helper">{group ? `تغيير السعر هيبدأ من ${monthLabel(month)}، ومش هيغيّر مستحقات الشهور السابقة.` : 'تقدر تضيف أي عدد من المجموعات، وتحدد سعرًا مختلفًا لحالات خاصة.'}</p>
      {error&&<p className="form-error">{error}</p>}
      <div className="form-actions"><button type="button" className="btn secondary" onClick={close}>إلغاء</button><button className="btn primary">حفظ</button></div>
    </form>
  </Modal>;
}
function StudentForm({ student, groups, defaultGroup, month, save, close }) {
  const [name, setName] = useState(student?.name || '');
  const [groupId, setGroupId] = useState(student ? groupAt(student, month) : defaultGroup);
  const [joinedAt, setJoinedAt] = useState(student?.joinedAt || month);
  const initialRule = student ? ruleAt(student, month) : { type: 'standard' };
  const [type, setType] = useState(initialRule?.type || 'standard');
  const [custom, setCustom] = useState(initialRule?.type === 'custom' ? String(initialRule.amount) : '');
  const [duration, setDuration] = useState(student?.monthRates?.[month] ? 'one' : 'future');
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('اكتب اسم الطالب أو العميل.');
    if (!groupId || !groups.some(g=>g.id===groupId)) return setError('اختار مجموعة.');
    if (!isMonth(joinedAt)) return setError('اختار شهر بداية صحيح.');
    if (type === 'custom' && (custom === '' || !Number.isFinite(Number(custom)) || Number(custom) < 0)) return setError('اكتب سعرًا خاصًا صحيحًا.');
    const issue = save({ name: name.trim(), groupId, joinedAt, type, custom: Number(custom), duration }, student);
    if (issue) return setError(issue);
    close();
  }
  const selectedGroup = groups.find(g=>g.id===groupId);
  const effective = type === 'exempt' ? 0 : type === 'custom' ? Number(custom || 0) : groupFeeAt(selectedGroup, month);
  return <Modal title={student ? 'تعديل الطالب / العميل' : 'إضافة طالب / عميل'} onClose={close}>
    <form className="form" onSubmit={submit}>
      <label>الاسم<input autoFocus required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الطالب أو العميل"/></label>
      <div className="form-line">
        <label>المجموعة / الباقة<select value={groupId || ''} onChange={e=>setGroupId(e.target.value)} required>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label>من شهر<input type="month" value={joinedAt} onChange={e=>setJoinedAt(e.target.value)} required/></label>
      </div>
      <label>حالة الاشتراك<select value={type} onChange={e=>setType(e.target.value)}>
        <option value="standard">عادي — سعر المجموعة ({money(groupFeeAt(selectedGroup, month))})</option>
        <option value="custom">سعر خاص</option>
        <option value="exempt">معفى — بدون اشتراك</option>
      </select></label>
      {type==='custom'&&<label>المبلغ المستحق الخاص<input type="number" min="0" step="0.01" required value={custom} onChange={e=>setCustom(e.target.value)} placeholder="مثلاً 100"/></label>}
      <label>مدة تطبيق السعر<select value={duration} onChange={e=>setDuration(e.target.value)}>
        <option value="future">من {monthLabel(month)} والشهور التالية</option>
        <option value="one">شهر {monthLabel(month)} فقط</option>
      </select></label>
      <div className="fee-preview">المستحق في {monthLabel(month)}: <strong>{money(effective)}</strong></div>
      <p className="helper">الحالات المعفاة مش هتتحسب متأخرات. التعديلات من الشهر المعروض، والشهور الأقدم تفضل بسعرها.</p>
      {error&&<p className="form-error">{error}</p>}
      <div className="form-actions"><button className="btn secondary" type="button" onClick={close}>إلغاء</button><button className="btn primary">حفظ</button></div>
    </form>
  </Modal>;
}
function BulkForm({ group, month, add, close }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const names = raw.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  function submit(e) { e.preventDefault(); if (!names.length) return setError('اكتب اسم واحد على الأقل.'); const issue = add(names, group.id, month); if (issue) return setError(issue); close(); }
  return <Modal title={`إضافة أسماء في ${group.name}`} onClose={close}><form className="form" onSubmit={submit}>
    <p className="helper">كل اسم في سطر مستقل. السعر الافتراضي: {money(groupFeeAt(group, month))}.</p>
    <label>الأسماء<textarea rows="8" autoFocus value={raw} onChange={e=>setRaw(e.target.value)} placeholder={'أحمد محمد\nمريم علي\n...'} /></label>
    <p className="helper">عدد الأسماء: {names.length}</p>
    {error&&<p className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" className="btn secondary" onClick={close}>إلغاء</button><button className="btn primary">إضافة الأسماء</button></div>
  </form></Modal>;
}
function PaymentForm({ student, month, db, add, remove, close }) {
  const entries = db.payments.filter(p=>p.studentId===student.id && p.month===month).sort((a,b)=>b.date.localeCompare(a.date));
  const { due, paid, remaining, exempt, overpaid } = collectionFor(student,month,db);
  const [amount,setAmount] = useState(String(remaining || ''));
  const [date,setDate] = useState(today());
  const [note,setNote] = useState('');
  const [error,setError] = useState('');
  function submit(e) {
    e.preventDefault(); const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > remaining) return setError(`اكتب مبلغًا من 0.01 إلى ${money(remaining)}.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('اختار تاريخ الاستلام.');
    add({ id: uid(), studentId:student.id, month, amount:value, date, memo:note.trim() }); close();
  }
  return <Modal title={`تحصيل ${student.name}`} onClose={close}>
    <div className="pay-summary"><span>المستحق<b>{money(due)}</b></span><span>استلمت<b>{money(paid)}</b></span><span>الباقي<b>{money(remaining)}</b></span></div>
    {exempt&&<p className="success-note"><Icon name="check" size={17}/> معفى من اشتراك الشهر ده</p>}
    {overpaid&&<p className="form-error modal-message">تنبيه: المقبوض أكبر من المستحق الحالي. الدفعات القديمة محفوظة، راجع السعر أو المدفوعات.</p>}
    {remaining>0&&<form className="form" onSubmit={submit}>
      <label>المبلغ اللي استلمته<input autoFocus type="number" inputMode="decimal" min="0.01" max={remaining} step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <div className="form-line"><label>تاريخ القبض<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>ملاحظة <small>اختياري</small><input value={note} onChange={e=>setNote(e.target.value)}/></label></div>
      <p className="helper">تاريخ القبض هو اليوم اللي استلمت فيه الفلوس، حتى لو الاشتراك يخص شهر تاني.</p>
      {error&&<p className="form-error">{error}</p>}
      <button className="btn primary wide">تسجيل التحصيل</button>
    </form>}
    {entries.length>0&&<div className="history"><h3>الدفعات المسجلة</h3>{entries.map(p=><div className="history-row" key={p.id}><div><b>{money(p.amount)}</b><small>{dateLabel(p.date)} {p.memo?`• ${p.memo}`:''}</small></div><button className="icon-btn danger" aria-label="حذف الدفعة" onClick={()=>{if(window.confirm('تحذف الدفعة دي؟'))remove(p.id);}}><Icon name="trash" size={17}/></button></div>)}</div>}
    {!exempt && remaining === 0 && !overpaid && <p className="success-note"><Icon name="check" size={17}/> الاشتراك مدفوع بالكامل</p>}
  </Modal>;
}
function SavingsForm({save,close}){
 const [kind,setKind]=useState('deposit');const [amount,setAmount]=useState('');const [date,setDate]=useState(today());const [note,setNote]=useState('');const [error,setError]=useState('');
 function submit(e){e.preventDefault();if(!(Number(amount)>0))return setError('اكتب مبلغ أكبر من صفر.');const issue=save({id:uid(),amount:Number(amount)*(kind==='deposit'?1:-1),date,note:note.trim()});if(issue)return setError(issue);close();}
 return <Modal title="حركة تحويش" onClose={close}><form className="form" onSubmit={submit}><div className="seg"><button type="button" className={kind==='deposit'?'selected':''} onClick={()=>setKind('deposit')}>حوش مبلغ</button><button type="button" className={kind==='withdraw'?'selected':''} onClick={()=>setKind('withdraw')}>رجّع مبلغ للصرف</button></div><label>المبلغ<input autoFocus type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="مثلاً 300"/></label><div className="form-line"><label>التاريخ<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>ملاحظة <small>اختياري</small><input value={note} onChange={e=>setNote(e.target.value)} placeholder="تحويش نوفمبر"/></label></div>{error&&<p className="form-error">{error}</p>}<p className="helper">التحويش نقل فلوس من الصرف للادخار، ومش بيتحسب مصروف.</p><div className="form-actions"><button type="button" className="btn secondary" onClick={close}>إلغاء</button><button className="btn primary">حفظ الحركة</button></div></form></Modal>;
}
function BalanceForm({cash,saved,onSave,close}){
 const [c,setC]=useState(cash===null?'':String(cash));const [s,setS]=useState(String(saved));const [error,setError]=useState('');
 function submit(e){e.preventDefault();if(c===''||s===''||!Number.isFinite(Number(c))||!Number.isFinite(Number(s))||Number(s)<0)return setError('اكتب رصيدًا متاحًا صحيحًا وتحويشًا غير سالب.');onSave(Number(c),Number(s));close();}
 return <Modal title="تظبيط الرصيد الحالي" onClose={close}><form className="form" onSubmit={submit}><p className="helper">اكتب الفلوس المتاحة معاك <b>دلوقتي</b>، والفلوس اللي محوشها بالفعل. ده بيضبط نقطة البداية من غير ما يحسب التحويش كمصروف.</p><label>المتاح تصرفه حاليًا<input autoFocus type="number" step="0.01" value={c} onChange={e=>setC(e.target.value)} placeholder="مثلاً 900"/></label><label>المبلغ المحوش حاليًا<input type="number" min="0" step="0.01" value={s} onChange={e=>setS(e.target.value)} placeholder="مثلاً 1000"/></label>{error&&<p className="form-error">{error}</p>}<div className="form-actions"><button className="btn secondary" type="button" onClick={close}>إلغاء</button><button className="btn primary">حفظ الرصيد</button></div></form></Modal>;
}
function downloadFile(content,filename,type='application/json;charset=utf-8'){
 const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function copyText(value){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(value);return true;}catch { /* fallback below */ }}
 const ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.left='-9999px';document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();return ok;
}
export default function App() {
  const initialRef = useRef(null);
  if (!initialRef.current) initialRef.current = readInitial();
  const [db,setDb] = useState(initialRef.current.db);
  const [blocked,setBlocked] = useState(initialRef.current.blocked);
  const [screen,setScreen] = useState('home');
  const [month,setMonth] = useState(currentMonth);
  const [groupId,setGroupId] = useState('second');
  const [modal,setModal] = useState(null);
  const [toast,setToast] = useState('');
  const [saveError,setSaveError] = useState(false);
  const [viewAll,setViewAll] = useState(false);
  const [lastBackupAt,setLastBackupAt] = useState(()=>storageRead(LAST_BACKUP));
  const [backupDismissedAt,setBackupDismissedAt] = useState(()=>Number(storageRead(BACKUP_DISMISS))||0);
  const inputRef = useRef();
  useEffect(()=>{
    if (blocked) return;
    try { localStorage.setItem(STORE, JSON.stringify(db)); setSaveError(false); }
    catch { setSaveError(true); }
  },[db,blocked]);
  const monthlyExpenses = useMemo(()=>db.expenses.filter(e=>toMonth(e.date)===month).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id))),[db.expenses,month]);
  const monthlySpend = sum(monthlyExpenses);
  const compare = useMemo(()=>monthComparison(db.expenses,month),[db.expenses,month]);
  const monthlyIncome = sum(db.payments.filter(p=>toMonth(p.date)===month));
  const incomeAll = sum(db.payments), expenseAll = sum(db.expenses), saveMove = sum(db.savings);
  const saved = (Number(db.settings.openingSavings)||0)+saveMove;
  const cash = db.settings.openingCash===null ? null : Number(db.settings.openingCash)+incomeAll-expenseAll-saveMove;
  const uncollected = totalUncollected(db,month);
  const hasRecords = db.expenses.length>0 || db.students.length>0 || db.groups.length>0 || db.payments.length>0 || db.savings.length>0 || db.settings.openingCash!==null;
  const showBackupReminder = hasRecords && backupIsDue(lastBackupAt) && Date.now()-backupDismissedAt>24*60*60*1000;
  const visibleGroups = db.groups.filter(g=>!g.archivedAt || g.archivedAt>month);
  const archivedGroups = db.groups.filter(g=>g.archivedAt && g.archivedAt<=month);
  const group = visibleGroups.find(g=>g.id===groupId) || visibleGroups[0] || null;
  const people = db.students.filter(s=>group && groupAt(s,month)===group.id && activeInMonth(s,month,db.groups)).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  const archivedPeople = db.students.filter(s=>group && groupAt(s,month)===group.id && s.leftAt && s.leftAt<=month);
  const groupDue = sum(people.map(s=>({amount:collectionFor(s,month,db).remaining})));
  const groupExpected = sum(people.map(s=>({amount:collectionFor(s,month,db).due})));
  const groupReceived = sum(db.payments.filter(p=>p.month===month && db.students.some(s=>s.id===p.studentId && groupAt(s,month)===group?.id))); // Keep receipts even if a student later stopped.
  const payerCount = people.filter(s=>dueFor(s,month,db.groups)>0).length;
  const paidCount = people.filter(s=>{const c=collectionFor(s,month,db);return c.due>0 && c.remaining===0;}).length;
  const exemptCount = people.filter(s=>ruleAt(s,month)?.type==='exempt').length;
  const allMonthExpenses = viewAll ? monthlyExpenses : monthlyExpenses.slice(0,6);
  const message=t=>setToast(t);
  function updateExpense(item) { setDb(d=>({...d,expenses:[...d.expenses.filter(e=>e.id!==item.id),item]})); message('اتحفظ المصروف.'); }
  function repeatExpense(item) { setDb(d=>({...d,expenses:[...d.expenses,duplicateExpense(item,today(),uid())]})); if(month!==currentMonth())setMonth(currentMonth());message(`اتكرر مصروف ${money(item.amount)} بتاريخ النهارده.`); }
  function removeExpense(item) { if(window.confirm(`تمسح مصروف ${money(item.amount)}؟`)){setDb(d=>({...d,expenses:d.expenses.filter(e=>e.id!==item.id)})); message('اتحذف المصروف.');} }
  function saveGroup(existing,name,fee) {
    if(db.groups.some(g=>g.id!==existing?.id && g.name.trim().toLowerCase()===name.toLowerCase())) return 'الاسم ده موجود عندك بالفعل.';
    if(existing){setDb(d=>({...d,groups:d.groups.map(g=>g.id===existing.id?setGroupPrice({...g,name},month,fee):g)}));}
    else {const id=uid();setDb(d=>({...d,groups:[...d.groups,{id,name,fee,feeHistory:[{month:'1900-01',fee}],archivedAt:null}]}));setGroupId(id);}
    message(existing?'اتعدلت المجموعة.':'المجموعة اتضافت.');return null;
  }
  function toggleGroup(g) {
    if(g.archivedAt){if(!window.confirm('ترجع المجموعة نشطة من جديد؟'))return;
      setDb(d=>({...d,groups:d.groups.map(x=>x.id===g.id?{...x,archivedAt:null}:x)}));setGroupId(g.id);message('رجعت المجموعة.');return;}
    if(!window.confirm(`توقف مجموعة «${g.name}» بداية من ${monthLabel(month)}؟ التحصيل القديم هيفضل محفوظ.`))return;
    setDb(d=>({...d,groups:d.groups.map(x=>x.id===g.id?{...x,archivedAt:month}:x)})); message('المجموعة اتوقفت.');
  }
  function deleteGroup(g) {
    if(!canDeleteGroup(g,db.students))return message('المجموعة فيها سجل طلبة؛ أوقفها بدل حذفها عشان التاريخ يفضل محفوظ.');
    if(!window.confirm(`تحذف مجموعة «${g.name}» نهائيًا؟`))return;
    setDb(d=>({...d,groups:d.groups.filter(x=>x.id!==g.id)})); message('المجموعة اتحذفت.');
  }
  function saveStudent(form,existing) {
    const {name,groupId:selected,joinedAt,type,custom,duration}=form;
    if(db.students.some(s=>s.id!==existing?.id && groupAt(s,month)===selected && s.name.trim().toLowerCase()===name.toLowerCase() && activeInMonth(s,month,db.groups))) return 'الاسم ده موجود بالفعل في المجموعة.';
    let result;
    if(existing){result={...existing,name,joinedAt}; if(groupAt(existing,month)!==selected)result=setStudentGroup(result,month,selected);}
    else {result={id:uid(),name,groupId:selected,grade:selected,joinedAt,leftAt:null,membership:[{month:joinedAt,groupId:selected}],pricing:[],monthRates:{}};}
    // Editing an individual changes only the displayed month and/or future months.
    result=setStudentPrice(result,month,type,custom,duration);
    setDb(d=>({...d,students:[...d.students.filter(s=>s.id!==result.id),result]}));
    message(existing?'اتعدلت بيانات الطالب.':'اتضاف الطالب.');return null;
  }
  function bulkAdd(names,g,m) {
    const lower=names.map(x=>x.toLocaleLowerCase('ar'));
    if(new Set(lower).size!==names.length)return 'فيه أسماء مكررة في القائمة.';
    const namesInGroup=new Set(db.students.filter(s=>groupAt(s,m)===g && activeInMonth(s,m,db.groups)).map(s=>s.name.toLocaleLowerCase('ar')));
    if(lower.some(x=>namesInGroup.has(x)))return 'بعض الأسماء متسجلة بالفعل في المجموعة.';
    setDb(d=>({...d,students:[...d.students,...names.map(name=>({id:uid(),name,groupId:g,grade:g,joinedAt:m,leftAt:null,membership:[{month:m,groupId:g}],pricing:[],monthRates:{}}))]}));
    message(`اتضاف ${names.length} اسم.`);return null;
  }
  function toggleStudent(s) {
    const question=s.leftAt?'ترجع الطالب نشط؟':'توقف الطالب من الشهر المعروض؟ سجلات التحصيل القديمة هتفضل محفوظة.';
    if(!window.confirm(question))return;
    setDb(d=>({...d,students:d.students.map(x=>x.id===s.id?{...x,leftAt:s.leftAt?null:month}:x)}));
    message(s.leftAt?'اتفعّل الطالب من جديد.':'اتوقف الطالب.');
  }
  function deleteStudent(s) {
    if(!canDeleteStudent(s,db.payments))return message('مينفعش حذف طالب عنده دفعات مسجلة؛ استخدم «إيقاف» بدلًا من الحذف.');
    if(!window.confirm(`تحذف «${s.name}» نهائيًا؟ الحذف مناسب للأسماء اللي اتضافت بالغلط بس.`))return;
    setDb(d=>({...d,students:d.students.filter(x=>x.id!==s.id)}));message('اتحذف الطالب.');
  }
  function addPayment(p) { setDb(d=>({...d,payments:[...d.payments,p]}));message('اتسجل التحصيل.'); }
  function deletePayment(id) { setDb(d=>({...d,payments:d.payments.filter(p=>p.id!==id)}));message('اتحذفت الدفعة.'); }
  function savingsSave(tx) {if(tx.amount<0&&Math.abs(tx.amount)>saved)return 'المبلغ اللي هترجعه أكبر من اللي محوشه.';setDb(d=>({...d,savings:[...d.savings,tx]}));message(tx.amount>0?'اتسجل التحويش.':'اترجعت الفلوس للمتاح.');return null;}
  function balanceSave(currentCash,currentSaved) {const nonOpeningCash=incomeAll-expenseAll-saveMove;setDb(d=>({...d,settings:{...d.settings,openingCash:currentCash-nonOpeningCash,openingSavings:currentSaved-saveMove}}));message('اتظبط الرصيد.');}
  function expenseText(){return `📒 مصاريف ${monthLabel(month)}\n${[...monthlyExpenses].reverse().map(e=>`• ${e.description||e.category||'مصروف'}: ${fullMoney(e.amount)} — ${dateLabel(e.date)}`).join('\n')||'• مفيش مصاريف مسجلة'}\n————\nالإجمالي: ${fullMoney(monthlySpend)}`;}
  async function copyExpenses() { const ok=await copyText(expenseText());message(ok?'اتنسخت مصروفات الشهر بالتواريخ.':'النسخ اتمنع من المتصفح. جرّبه من رابط HTTPS.'); }
  function backup() {
    try {downloadFile(JSON.stringify({version:4,exportedAt:new Date().toISOString(),...db},null,2),`masroof-v4-backup-${today()}.json`);
      const stamp=new Date().toISOString();storageWrite(LAST_BACKUP,stamp);setLastBackupAt(stamp);
      message('بدأ تنزيل النسخة. اتأكد إن ملف JSON موجود في التنزيلات.');}
    catch { message('حصلت مشكلة في تجهيز النسخة. جرّب تاني.'); }
  }
  function dismissBackup(){const stamp=Date.now();storageWrite(BACKUP_DISMISS,String(stamp));setBackupDismissedAt(stamp);}
  async function restore(e) {
    const file=e.target.files?.[0];if(!file)return;
    try {
      const parsed=JSON.parse(await file.text()); if(!validLegacy(parsed))throw Error('invalid');
      const candidate=migrate(parsed);
      const label=`الملف فيه ${candidate.students.length} اسم و${candidate.payments.length} دفعة و${candidate.expenses.length} مصروف. استرجاعه هيستبدل البيانات الحالية في النسخة الجديدة. تكمل؟`;
      if(window.confirm(label)){
        if(!blocked && hasRecords) {
          try {downloadFile(JSON.stringify({version:4,exportedAt:new Date().toISOString(),...db},null,2),`masroof-before-restore-${today()}.json`);}catch{}
        }
        setDb(candidate); setBlocked(false);setGroupId(candidate.groups[0]?.id||'');message('اتسترجعت النسخة بنجاح.');
      }
    } catch { message('الملف مش نسخة صالحة من مصروف.'); }
    e.target.value='';
  }
  function removeSaving(id){if(window.confirm('تحذف حركة التحويش دي؟'))setDb(d=>({...d,savings:d.savings.filter(x=>x.id!==id)}));}
  const tabs=[['home','الرئيسية','home'],['expenses','المصاريف','receipt'],['students','المجموعات','groups'],['savings','التحويش','bank'],['settings','إعدادات','gear']];
  if(blocked)return <div className="recovery"><Icon name="warning" size={32}/><h1>فيه مشكلة في قراءة البيانات المحفوظة</h1><p>علشان ما نمسحش بياناتك بالغلط، أوقفنا الحفظ مؤقتًا. استرجع نسخة JSON سليمة، أو ارجع للنسخة القديمة واعمل Backup.</p><button className="btn primary" onClick={()=>inputRef.current?.click()}>استرجاع نسخة احتياطية</button><input hidden ref={inputRef} type="file" accept=".json,application/json" onChange={restore}/>{toast&&<p>{toast}</p>}</div>;
  return <div className="app">
    <header className="topbar"><div className="head-wrap">
      <div className="identity"><img src="/icons/masroof-192.png" alt="أيقونة مصروف"/><div><strong>مصروف<span>.</span></strong><small>فلوسك، ببساطة</small></div></div>
      <div className="head-month"><Icon name="calendar" size={17}/><input type="month" aria-label="اختيار الشهر" value={month} onChange={e=>{setMonth(e.target.value);setViewAll(false);}}/></div>
    </div></header>
    <div className="layout">
      <nav className="nav-desktop" aria-label="القائمة الرئيسية">{tabs.map(([key,title,icon])=><button key={key} className={screen===key?'active':''} onClick={()=>{setScreen(key);setViewAll(false);}}><Icon name={icon} size={19}/>{title}</button>)}</nav>
      <main className="content">
        {saveError&&<div className="alert"><Icon name="warning"/> المتصفح مش قادر يحفظ التغييرات. نزّل نسخة احتياطية حالًا.</div>}
        {initialRef.current.migrated&&<div className="migration-note"><Icon name="check" size={16}/><span>لقينا بيانات النسخة القديمة ونقلناها للنسخة الجديدة. قبل أي تعديل، نزّل نسخة احتياطية من الإعدادات.</span><button onClick={backup}>تنزيل نسخة</button></div>}
        {showBackupReminder&&(screen==='home'||screen==='settings')&&<div className="backup-reminder" role="status"><div className="reminder-text"><Icon name="warning" size={19}/><div><strong>محتاج نسخة احتياطية</strong><small>{lastBackupAt?'عدّى أسبوع على آخر محاولة تنزيل نسخة.':'مفيش نسخة احتياطية مسجلة على المتصفح ده.'} بياناتك محلية على الجهاز ده بس.</small></div></div><div className="reminder-actions"><button className="btn secondary tiny" onClick={backup}><Icon name="download" size={15}/> نزّل نسخة</button><button className="reminder-later" onClick={dismissBackup}>بعدين</button></div></div>}
        {screen==='home'&&<>
          <div className="page-heading"><div><p className="eyebrow">{monthLabel(month)}</p><h1>أهلًا بيك في مصروف</h1><p>كل اللي محتاج تعرفه عن فلوسك، من غير تعقيد.</p></div></div>
          <section className="hero"><div><span className="hero-label">المتاح تصرفه دلوقتي</span><strong className="hero-value">{cash===null?'—':number(cash)} <small>جنيه</small></strong>{cash===null?<button className="hero-inline" onClick={()=>setModal({type:'balance'})}>حدد رصيدك الحالي <Icon name="arrow" size={16}/></button>:<span className="hero-sub">مستبعد منه المبلغ المحوش</span>}</div><div className="hero-side"><span>محوش لحد دلوقتي</span><strong>{money(saved)}</strong><button onClick={()=>setModal({type:'savings'})}>حوش مبلغ <Icon name="plus" size={15}/></button></div></section>
          <div className="stats"><div className="stat"><span>صرفت الشهر ده</span><strong>{money(monthlySpend)}</strong><small>{monthlyExpenses.length} عملية</small></div><div className="stat"><span>دخل استلمته الشهر ده</span><strong>{money(monthlyIncome)}</strong><small>بحسب تاريخ استلام الفلوس</small></div><div className="stat"><span>اشتراكات لسه مطلوبة</span><strong>{money(uncollected)}</strong><small>من غير المعفيين والمتوقفين</small></div></div>
          <div className="main-actions"><button className="btn primary large" onClick={()=>setModal({type:'expense'})}><Icon name="plus"/> إضافة مصروف</button><button className="btn secondary large" onClick={copyExpenses}><Icon name="copy"/> نسخ المصروفات</button></div>
          <section className="panel"><div className="panel-head"><h2>آخر المصروفات</h2><button className="link-btn" onClick={()=>setScreen('expenses')}>عرض الكل <Icon name="arrow" size={15}/></button></div><ExpenseRows expenses={monthlyExpenses.slice(0,5)} edit={e=>setModal({type:'expense',item:e})} remove={removeExpense} repeat={repeatExpense}/>{monthlyExpenses.length===0&&<div className="empty"><Icon name="receipt" size={30}/><b>لسه مفيش مصاريف في الشهر ده</b><p>سجل أول مصروف، حتى لو 10 جنيه.</p></div>}</section>
        </>}
        {screen==='expenses'&&<>
          <div className="page-heading"><div><p className="eyebrow">{monthLabel(month)}</p><h1>المصاريف</h1><p>التاريخ مكتوب تحت كل مصروف، والنسخ بيجمع الشهر كله.</p></div><strong className="page-total">{money(monthlySpend)}</strong></div>
          <div className="main-actions"><button className="btn primary" onClick={()=>setModal({type:'expense'})}><Icon name="plus"/> مصروف جديد</button><button className="btn secondary" onClick={copyExpenses}><Icon name="copy"/> نسخ مصروفات الشهر</button></div>
          <section className="panel expense-panel"><div className="panel-head"><h2>سجل {monthLabel(month)}</h2><small>{monthlyExpenses.length} مصروف</small></div>{monthlyExpenses.length?<ExpenseRows expenses={allMonthExpenses} edit={e=>setModal({type:'expense',item:e})} remove={removeExpense} repeat={repeatExpense}/>:<div className="empty"><b>مفيش مصروفات مسجلة</b><p>اضغط «مصروف جديد» وابدأ.</p></div>}{monthlyExpenses.length>6&&!viewAll&&<button className="more-btn" onClick={()=>setViewAll(true)}>عرض باقي المصروفات ({monthlyExpenses.length-6})</button>}</section>
          <MonthCompare data={compare} month={month}/>
          <p className="note">تقدر تكرر أي مصروف بتاريخ النهارده أو تنسخ كل المصاريف بالتواريخ والإجمالي.</p>
        </>}
        {screen==='students'&&<>
          <div className="page-heading"><div><p className="eyebrow">{monthLabel(month)}</p><h1>المجموعات والتحصيل</h1><p>إنت اللي بتحدد أسماء المجموعات وأسعارها، من غير عدد ثابت.</p></div></div>
          <div className="main-actions group-actions"><button className="btn primary" onClick={()=>setModal({type:'group'})}><Icon name="plus"/> مجموعة جديدة</button>{group&&<button className="btn secondary" onClick={()=>setModal({type:'group',group})}><Icon name="edit"/> تعديل المجموعة</button>}</div>
          {visibleGroups.length>0?<>
            <div className="group-tabs" role="tablist" aria-label="اختيار مجموعة">{visibleGroups.map(g=><button key={g.id} type="button" role="tab" aria-selected={group?.id===g.id} className={group?.id===g.id?'selected':''} onClick={()=>setGroupId(g.id)}><Icon name="groups" size={14}/><span>{g.name}</span><small>{money(groupFeeAt(g,month))}</small></button>)}</div>
            {group&&<>
              <div className="grade-card summary-four"><div><span>المستحق للشهر</span><strong>{money(groupExpected)}</strong><small className="tiny-note">بعد الحالات الخاصة</small></div><div><span>اللي اتسدد</span><strong>{money(groupReceived)}</strong><small className="tiny-note">{paidCount} سددوا من {payerCount}</small></div><div><span>المتبقي للتحصيل</span><strong>{money(groupDue)}</strong><small className="tiny-note">لا يشمل المعفيين</small></div><div><span>الحالات المعفاة</span><strong>{exemptCount}</strong><small className="tiny-note">من {people.length} اسم نشط</small></div></div>
              <div className="main-actions"><button className="btn primary" onClick={()=>setModal({type:'student'})}><Icon name="userPlus"/> إضافة طالب / عميل</button><button className="btn secondary" onClick={()=>setModal({type:'bulk'})}>إضافة أسماء بالجملة</button></div>
              <section className="panel"><div className="panel-head"><h2>{group.name}</h2><small>{people.length} اسم</small></div>
                {people.length?people.map(s=>{
                  const c=collectionFor(s,month,db);
                  const label=c.exempt?'معفى من الاشتراك':c.overpaid?'مدفوع زيادة — راجع السعر':c.remaining===0?'مدفوع بالكامل':c.paid>0?`دفع ${money(c.paid)} من ${money(c.due)}`:`مستحق ${money(c.due)}`;
                  return <div className="student-row" key={s.id}><div className="student-avatar">{s.name.trim().charAt(0)}</div><div className="student-name"><strong>{s.name}</strong><small>{label}</small></div>
                    <button className={(c.exempt||c.remaining===0)?'paid-btn':'collect-btn'} onClick={()=>setModal({type:'payment',student:s})} title="عرض المدفوعات أو إضافة تحصيل">{c.exempt?<><Icon name="check" size={14}/> معفى</>:c.remaining===0?<><Icon name="check" size={14}/> تم</>:'تحصيل'}</button>
                    <button className="icon-btn" aria-label={`تعديل ${s.name}`} title="تعديل" onClick={()=>setModal({type:'student',student:s})}><Icon name="edit" size={15}/></button>
                    <button className="icon-btn" aria-label={`إيقاف ${s.name}`} title="إيقاف (أرشفة)" onClick={()=>toggleStudent(s)}><Icon name="archive" size={15}/></button>
                    <button className="icon-btn danger" aria-label={`حذف ${s.name}`} title={canDeleteStudent(s,db.payments)?'حذف اسم أُضيف بالخطأ':'عنده دفعات؛ استخدم إيقاف'} onClick={()=>deleteStudent(s)}><Icon name="trash" size={15}/></button>
                  </div>;
                }):<div className="empty"><Icon name="people" size={30}/><b>المجموعة دي لسه فاضية</b><p>ضيف أول اسم أو الصق قائمة الأسماء مرة واحدة.</p></div>}
              </section>
              {archivedPeople.length>0&&<details className="panel folded"><summary>الطلبة / العملاء المتوقفين ({archivedPeople.length})</summary>{archivedPeople.map(s=><div className="history-row" key={s.id}><div><b>{s.name}</b><small>متوقف بداية من {monthLabel(s.leftAt)}</small></div><div className="row-actions"><button className="btn secondary tiny" onClick={()=>toggleStudent(s)}><Icon name="restore" size={13}/> رجّعه</button>{canDeleteStudent(s,db.payments)&&<button className="icon-btn danger" onClick={()=>deleteStudent(s)} title="حذف نهائي"><Icon name="trash" size={14}/></button>}</div></div>)}</details>}
              <div className="group-options"><button className="link-btn" onClick={()=>toggleGroup(group)}><Icon name="archive" size={14}/> إيقاف المجموعة</button>{canDeleteGroup(group,db.students)&&<button className="link-btn destructive" onClick={()=>deleteGroup(group)}><Icon name="trash" size={14}/> حذف المجموعة الفاضية</button>}</div>
            </>}
          </>:<div className="panel empty group-empty"><Icon name="groups" size={32}/><b>لسه مفيش مجموعات نشطة</b><p>ضيف مجموعة باسم تختاره، زي ثالثة ثانوي أو باقة Premium.</p><button className="btn primary" onClick={()=>setModal({type:'group'})}>إضافة أول مجموعة</button></div>}
          {archivedGroups.length>0&&<details className="panel folded"><summary>المجموعات المتوقفة ({archivedGroups.length})</summary>{archivedGroups.map(g=><div className="history-row" key={g.id}><div><b>{g.name}</b><small>متوقفة من {monthLabel(g.archivedAt)}</small></div><button className="btn secondary tiny" onClick={()=>toggleGroup(g)}><Icon name="restore" size={13}/> إعادة تفعيل</button></div>)}</details>}
          <p className="note">الإعفاء والسعر الخاص من «تعديل» جنب اسم الطالب. الدفع الجزئي من زر «تحصيل». أرشفة الطالب بتحفظ سجلاته القديمة.</p>
        </>}
        {screen==='savings'&&<>
          <div className="page-heading"><div><p className="eyebrow">تحويشك</p><h1>فلوس على جنب</h1><p>أي مبلغ بتحوشه مش بيتحسب مصروف.</p></div></div>
          <section className="savings-card"><span>إجمالي التحويش الحالي</span><strong>{money(saved)}</strong><p>فلوس منفصلة عن المتاح للصرف.</p></section>
          <div className="main-actions"><button className="btn primary" onClick={()=>setModal({type:'savings'})}><Icon name="plus"/> حوش أو رجّع مبلغ</button><button className="btn secondary" onClick={()=>setModal({type:'balance'})}><Icon name="edit"/> ظبط الرصيد</button></div>
          <section className="panel"><div className="panel-head"><h2>حركات التحويش</h2><small>{db.savings.length} حركة</small></div>{db.savings.length?[...db.savings].sort((a,b)=>b.date.localeCompare(a.date)).map(x=><div className="history-row" key={x.id}><div><b>{x.amount>0?'حوشّت':'رجّعت'} {money(Math.abs(x.amount))}</b><small>{dateLabel(x.date)}{x.note?` • ${x.note}`:''}</small></div><button className="icon-btn danger" aria-label="حذف الحركة" onClick={()=>removeSaving(x.id)}><Icon name="trash" size={17}/></button></div>):<div className="empty"><b>لسه مفيش حركات تحويش</b><p>تقدر تظبط رصيد التحويش من زر «ظبط الرصيد».</p></div>}</section>
        </>}
        {screen==='settings'&&<>
          <div className="page-heading"><div><h1>الإعدادات والنسخ الاحتياطية</h1><p>بياناتك محفوظة محليًا على الجهاز والمتصفح ده.</p></div></div>
          <section className="panel settings-panel"><h2>الفلوس والحساب</h2><p>لو بدأت استخدام الموقع في نص الشهر، حدّد رصيدك الحالي الفعلي من هنا.</p><button className="btn secondary" onClick={()=>setModal({type:'balance'})}><Icon name="edit"/> ضبط الرصيد المتاح والتحويش</button></section>
          <section className="panel settings-panel"><h2>حماية بياناتك</h2><p><strong>مهم:</strong> مفيش مزامنة بين الأجهزة. كل جهاز ومتصفح له بياناته المستقلة. بيانات الموقع ممكن تضيع لو مسحت التخزين؛ نزّل نسخة JSON واحفظها في مكان آمن.</p><div className="main-actions"><button className="btn primary" onClick={backup}><Icon name="download"/> تنزيل نسخة JSON</button><button className="btn secondary" onClick={()=>inputRef.current?.click()}><Icon name="upload"/> استرجاع نسخة</button></div><p className="backup-meta">{lastBackupAt?`آخر محاولة تنزيل نسخة: ${new Date(lastBackupAt).toLocaleDateString('ar-EG-u-nu-latn')}`:'لسه مفيش نسخة احتياطية مسجلة.'}</p></section>
          <section className="panel settings-panel"><h2>تثبيت الاختصار على الموبايل أو التابلت</h2><p>افتح رابط الموقع في Chrome واختار «Add to Home screen» أو «Install app». الاختصار على جهاز تاني مش هيشارك نفس البيانات تلقائيًا.</p><div className="icon-sample"><img src="/icons/masroof-192.png" alt="أيقونة مصروف"/><span>مصروف</span></div></section>
        </>}
        <footer>Masroof Lite v4 — بدون حسابات أو مزامنة سحابية · Font Awesome Free</footer>
      </main>
    </div>
    <nav className="nav-mobile" aria-label="التنقل">{tabs.map(([key,title,icon])=><button key={key} onClick={()=>{setScreen(key);setViewAll(false);window.scrollTo({top:0,behavior:'instant'});}} className={screen===key?'active':''}><Icon name={icon} size={19}/><span>{title}</span></button>)}</nav>
    {toast&&<div className="toast" role="status"><span>{toast}</span><button onClick={()=>setToast('')} aria-label="إغلاق"><Icon name="close" size={15}/></button></div>}
    {modal?.type==='expense'&&<ExpenseForm item={modal.item} save={updateExpense} close={()=>setModal(null)}/>}
    {modal?.type==='group'&&<GroupForm group={modal.group} month={month} save={saveGroup} close={()=>setModal(null)}/>}
    {modal?.type==='student'&&<StudentForm student={modal.student} groups={visibleGroups} defaultGroup={group?.id||''} month={month} save={saveStudent} close={()=>setModal(null)}/>}
    {modal?.type==='bulk'&&group&&<BulkForm group={group} month={month} add={bulkAdd} close={()=>setModal(null)}/>}
    {modal?.type==='payment'&&<PaymentForm student={modal.student} db={db} month={month} add={addPayment} remove={deletePayment} close={()=>setModal(null)}/>}
    {modal?.type==='savings'&&<SavingsForm save={savingsSave} close={()=>setModal(null)}/>}
    {modal?.type==='balance'&&<BalanceForm cash={cash} saved={saved} onSave={balanceSave} close={()=>setModal(null)}/>}
    <input ref={inputRef} hidden type="file" accept=".json,application/json" onChange={restore}/>
  </div>;
}
const expenseVisuals={
  transport:['bus','مواصلات'], study:['book','كلية ودراسة'], food:['food','أكل وشرب'],
  shopping:['bag','مشتريات'], subscription:['wifi','اشتراكات'], outing:['cup','خروجات'],
  fitness:['dumbbell','رياضة'], wellness:['heart','صحة'], misc:['sparkle','متفرقات']
};
function ExpenseRows({expenses,edit,remove,repeat}){
 return <div className="expense-list">{expenses.map(e=>{const type=getExpenseVisual(e);const [icon,label]=expenseVisuals[type];return <div className="expense-row" key={e.id}>
 <span className={`expense-marker expense-${type}`} title={label}><Icon name={icon} size={17}/></span>
 <div className="expense-detail"><strong>{e.description||e.category||'مصروف'}</strong><small>{dateLabel(e.date)}{e.description&&e.category&&e.category!=='متفرقات'?` • ${e.category}`:''}</small></div>
 <b className="expense-amount">{money(e.amount)}</b>
 <button className="icon-btn repeat-btn" aria-label={`تكرار مصروف ${e.description||e.category||money(e.amount)} بتاريخ اليوم`} title="تكرار المصروف اليوم" onClick={()=>repeat(e)}><Icon name="repeat" size={17}/></button>
 <button className="icon-btn" aria-label="تعديل المصروف" title="تعديل" onClick={()=>edit(e)}><Icon name="edit" size={17}/></button>
 <button className="icon-btn danger" aria-label="حذف المصروف" title="حذف" onClick={()=>remove(e)}><Icon name="trash" size={16}/></button>
 </div>;})}</div>;
}
function MonthCompare({data,month}){
 if(data.isFuture)return null;
 const {current,earlier,previous,isOngoing,cutoff,previousCutoff,difference,percent,max}=data;
 return <section className="panel compare-panel" aria-label="مقارنة المصروفات بين الشهور">
   <div className="panel-head"><h2><Icon name="chart" size={19}/> مقارنة الشهور</h2><small>{isOngoing?'لنفس عدد الأيام':'شهر كامل'}</small></div>
   <div className="compare-content">
     <div className="compare-line"><div className="compare-label"><span>{monthLabel(month)}{isOngoing?` (1–${cutoff})`:''}</span><b>{money(current)}</b></div><div className="compare-track"><span className="compare-bar current" style={{width:`${current/max*100}%`}}/></div></div>
     <div className="compare-line"><div className="compare-label"><span>{monthLabel(previous)}{isOngoing?` (1–${previousCutoff})`:''}</span><b>{money(earlier)}</b></div><div className="compare-track"><span className="compare-bar previous" style={{width:`${earlier/max*100}%`}}/></div></div>
     <p className="compare-foot">{earlier===0?'مفيش مصاريف مسجلة للشهر السابق، فالمقارنة مش كافية للحكم على صرفك.':difference===0?'مصروفك مساوي للشهر السابق في الفترة المقارنة.':`${difference>0?'صرفت زيادة':'وفّرت'} ${money(Math.abs(difference))} (${number(Math.abs(percent))}%) عن الفترة السابقة.`}</p>
   </div>
 </section>;
}
