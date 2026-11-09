import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORE = 'masroof-lite-v2';
const OLD_STORE = 'masroof-ui-v1';
const GRADES = [{ id: 'first', name: 'أولى ثانوي', fee: 150 }, { id: 'second', name: 'تانية ثانوي', fee: 200 }];
const CATEGORIES = ['متفرقات', 'كلية', 'مواصلات', 'أكل وشرب', 'خروجات', 'مشتريات', 'اشتراكات'];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const toMonth = d => String(d || '').slice(0,7);
const currentMonth = () => toMonth(today());
const uid = () => globalThis.crypto?.randomUUID?.() || `m${Date.now()}-${Math.random().toString(36).slice(2)}`;
const number = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);
const money = n => `${number(n)} ج`;
const fullMoney = n => `${number(n)} جنيه`;
const monthLabel = m => { if (!/^\d{4}-\d{2}$/.test(m||'')) return m; const [y,mm]=m.split('-').map(Number); return new Intl.DateTimeFormat('ar-EG-u-nu-latn',{month:'long',year:'numeric'}).format(new Date(y,mm-1,1)); };
const dateLabel = iso => { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso||'')) return String(iso||''); const [y,m,d]=iso.split('-').map(Number); return new Intl.DateTimeFormat('ar-EG-u-nu-latn',{day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d)); };
const sum = (arr, field='amount') => arr.reduce((n,x)=>n+(Number(x?.[field])||0),0);
const blank = () => ({ students:[], payments:[], expenses:[], savings:[], settings:{ openingCash:null, openingSavings:0 } });
const valid = x => x && ['students','payments','expenses'].every(k=>Array.isArray(x[k]));
function hydrate(x) {
  return { ...blank(), students:x.students, payments:x.payments, expenses:x.expenses,
    savings:Array.isArray(x.savings)?x.savings:[], settings:{...blank().settings,...(x.settings||{})} };
}
function load() {
  try {
    const now=localStorage.getItem(STORE);
    if (now) { const d=JSON.parse(now); if (valid(d)) return hydrate(d); }
    const old=localStorage.getItem(OLD_STORE);
    if (old) { const d=JSON.parse(old); if(valid(d)) return hydrate(d); }
  } catch { /* Invalid data is never overwritten until the user saves something. */ }
  return blank();
}
function Icon({name,size=20}) {
 const shapes = {
  plus:<path d="M12 5v14M5 12h14"/>,
  receipt:<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
  wallet:<><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13M16 13h5v5h-5a2.5 2.5 0 0 1 0-5Z"/></>,
  home:<><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></>,
  people:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5v1"/></>,
  copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  bank:<><path d="M3 10h18M5 10V20M10 10V20M14 10V20M19 10V20M3 20h18M3 7l9-5 9 5"/></>,
  gear:<><circle cx="12" cy="12" r="3"/><path d="m10 2-.5 2.3-2.2 1L5.3 4 3.5 6.8l1.7 1.6-.3 2.4L2.5 12l1.2 3.2 2.3-.3 1.6 1.8-.7 2.2 3.1 1.6 1.4-2 2.4-.1 1.7 1.8 2.9-2-.8-2.1 1.3-2 2.4.2L22 12l-2.1-1.4-.5-2.3 1.5-1.8L18.3 4l-2 1-2.2-.7L13.5 2z"/></>,
  check:<path d="m4 12 5 5L20 6"/>,
  trash:<><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
  edit:<><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13 7 4 4"/></>,
  close:<path d="M5 5l14 14M19 5 5 19"/>,
  arrow:<path d="M5 12h14m-7-7 7 7-7 7"/>,
  down:<><path d="M12 4v16m-6-6 6 6 6-6"/></>,
  up:<><path d="M12 20V4m-6 6 6-6 6 6"/></>,
  download:<><path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/></>,
  upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  warning:<><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name]||shapes.info}</svg>;
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
function StudentForm({student,grade,month,save,close}){
 const [name,setName]=useState(student?.name||''); const [g,setG]=useState(student?.grade||grade);const [fee,setFee]=useState(student?.fee??GRADES.find(x=>x.id===grade)?.fee??200); const [joinedAt,setJoinedAt]=useState(student?.joinedAt||month);
 const [error,setError]=useState('');
 function submit(e){e.preventDefault();if(!name.trim())return setError('اكتب اسم الطالب.');if(!(Number(fee)>0))return setError('الشهرية لازم تكون أكبر من صفر.');const problem=save({id:student?.id||uid(),name:name.trim(),grade:g,fee:Number(fee),joinedAt,leftAt:student?.leftAt||null});if(problem)return setError(problem);close();}
 return <Modal title={student?'تعديل الطالب':'طالب جديد'} onClose={close}><form className="form" onSubmit={submit}>
 <label>اسم الطالب<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الطالب"/></label>
 <div className="form-line"><label>الدفعة<select value={g} onChange={e=>{setG(e.target.value);if(!student)setFee(GRADES.find(x=>x.id===e.target.value).fee);}}>{GRADES.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>الشهرية<input type="number" min="1" value={fee} onChange={e=>setFee(e.target.value)}/></label></div>
 <label>من شهر<input type="month" value={joinedAt} onChange={e=>setJoinedAt(e.target.value)} required/></label>
 {error&&<p className="form-error">{error}</p>}<div className="form-actions"><button className="btn secondary" type="button" onClick={close}>إلغاء</button><button className="btn primary">حفظ</button></div>
 </form></Modal>;
}
function BulkForm({grade,month,add,close}){
 const [raw,setRaw]=useState(''); const [error,setError]=useState(''); const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 function submit(e){e.preventDefault();if(!lines.length)return setError('اكتب اسم على الأقل.');const issue=add(lines,grade,month);if(issue)return setError(issue);close();}
 return <Modal title="إضافة أسماء دفعة مرة واحدة" onClose={close}><form className="form" onSubmit={submit}>
 <p className="helper">كل اسم في سطر لوحده. الشهرية الافتراضية: {money(GRADES.find(x=>x.id===grade).fee)}.</p>
 <label>الأسماء<textarea rows="8" autoFocus value={raw} onChange={e=>setRaw(e.target.value)} placeholder={'أحمد محمد\nمريم علي\n...'} /></label>
 <p className="helper">عدد الأسماء: {lines.length}</p>{error&&<p className="form-error">{error}</p>}
 <div className="form-actions"><button type="button" className="btn secondary" onClick={close}>إلغاء</button><button className="btn primary">إضافة الطلبة</button></div></form></Modal>;
}
function PaymentForm({student,month,payments,add,remove,close}){
 const list=payments.filter(p=>p.studentId===student.id&&p.month===month).sort((a,b)=>b.date.localeCompare(a.date));
 const paid=sum(list),due=Math.max(0,student.fee-paid);
 const [amount,setAmount]=useState(due||''); const [date,setDate]=useState(today()); const [note,setNote]=useState('');const [error,setError]=useState('');
 function submit(e){e.preventDefault();const v=Number(amount);if(!(v>0)||v>due)return setError(`اكتب مبلغ أكبر من صفر وحتى ${money(due)}.`);add({id:uid(),studentId:student.id,month,amount:v,date,memo:note.trim()});close();}
 return <Modal title={`شهرية ${student.name}`} onClose={close}><div className="pay-summary"><span>المطلوب: <b>{money(student.fee)}</b></span><span>اتدفع: <b>{money(paid)}</b></span><span>الباقي: <b>{money(due)}</b></span></div>
 {due>0&&<form className="form" onSubmit={submit}><label>المبلغ اللي استلمته<input autoFocus type="number" min="0.01" max={due} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><div className="form-line"><label>تاريخ استلام الفلوس<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>ملاحظة <small>اختياري</small><input value={note} onChange={e=>setNote(e.target.value)} placeholder="مثلاً جزء من الشهرية"/></label></div><p className="helper">لو شهرية نوفمبر اتدفعت في أكتوبر، اختار أكتوبر في تاريخ الاستلام.</p>{error&&<p className="form-error">{error}</p>}<button className="btn primary wide">تسجيل التحصيل</button></form>}
 {list.length>0&&<div className="history"><h3>الدفعات المسجلة</h3>{list.map(p=><div className="history-row" key={p.id}><div><b>{money(p.amount)}</b><small>{dateLabel(p.date)} {p.memo?`• ${p.memo}`:''}</small></div><button className="icon-btn danger" type="button" aria-label="حذف الدفعة" onClick={()=>{if(window.confirm('تحذف الدفعة دي؟'))remove(p.id);}}><Icon name="trash" size={17}/></button></div>)}</div>}
 {due===0&&<p className="success-note"><Icon name="check" size={17}/> الشهرية مدفوعة بالكامل</p>}
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
function studentIsActive(s,m){return (!s.joinedAt||s.joinedAt<=m)&&(!s.leftAt||s.leftAt>m);}

export default function App(){
 const [db,setDb]=useState(load);
 const [screen,setScreen]=useState('home');const [month,setMonth]=useState(currentMonth);const [grade,setGrade]=useState('second');
 const [modal,setModal]=useState(null);const [toast,setToast]=useState('');const [saveError,setSaveError]=useState(false);const [viewAll,setViewAll]=useState(false);
 const inputRef=useRef();const firstSave=useRef(true);
 useEffect(()=>{
  try{localStorage.setItem(STORE,JSON.stringify(db));setSaveError(false);}catch{setSaveError(true);}
  if(firstSave.current) firstSave.current=false;
 },[db]);
 const incomeAll=sum(db.payments),expenseAll=sum(db.expenses),saveMove=sum(db.savings);
 const saved=(Number(db.settings.openingSavings)||0)+saveMove;
 const cash=db.settings.openingCash===null?null:Number(db.settings.openingCash)+incomeAll-expenseAll-saveMove;
 const monthlyExpenses=useMemo(()=>db.expenses.filter(e=>toMonth(e.date)===month).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id))),[db.expenses,month]);
 const monthlySpend=sum(monthlyExpenses);
 const monthlyIncome=sum(db.payments.filter(p=>toMonth(p.date)===month));
 const active=db.students.filter(s=>studentIsActive(s,month));
 const paidFor=s=>sum(db.payments.filter(p=>p.studentId===s.id&&p.month===month));
 const uncollected=sum(active.map(s=>Math.max(0,Number(s.fee)-paidFor(s))).map(amount=>({amount})));
 const people=active.filter(s=>s.grade===grade).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
 const paidPeople=people.filter(s=>paidFor(s)>=Number(s.fee)).length;
 const allMonthExpenses=viewAll?monthlyExpenses:monthlyExpenses.slice(0,6);
 const message=t=>{setToast(t);};
 function updateExpense(item){setDb(d=>({...d,expenses:[...d.expenses.filter(e=>e.id!==item.id),item]}));message('اتحفظ المصروف.');}
 function removeExpense(item){if(window.confirm(`تمسح مصروف ${money(item.amount)}؟`)){setDb(d=>({...d,expenses:d.expenses.filter(e=>e.id!==item.id)}));message('المصروف اتمسح.');}}
 function addStudent(s){if(db.students.some(x=>x.id!==s.id&&x.grade===s.grade&&x.name.trim()===s.name.trim()))return 'الاسم ده موجود في نفس الدفعة.';setDb(d=>({...d,students:[...d.students.filter(x=>x.id!==s.id),s]}));message('الطالب اتحفظ.');return null;}
 function bulkAdd(names,g,m){const normalized=names.map(x=>x.toLocaleLowerCase());if(new Set(normalized).size!==names.length)return 'فيه أسماء مكررة في اللي كتبته.';const existed=new Set(db.students.filter(s=>s.grade===g).map(x=>x.name.toLocaleLowerCase()));if(normalized.some(x=>existed.has(x)))return 'فيه أسماء مسجلة بالفعل في الدفعة.';const fee=GRADES.find(x=>x.id===g).fee;setDb(d=>({...d,students:[...d.students,...names.map(name=>({id:uid(),name,grade:g,fee,joinedAt:m,leftAt:null}))]}));message(`${names.length} طالب اتضافوا.`);return null;}
 function toggleStudent(s){if(!window.confirm(s.leftAt?'ترجّع الطالب نشط؟':'توقف الطالب من الشهر المحدد؟ سجلاته القديمة هتفضل موجودة.'))return;setDb(d=>({...d,students:d.students.map(x=>x.id===s.id?{...x,leftAt:s.leftAt?null:month}:x)}));}
 function addPayment(p){setDb(d=>({...d,payments:[...d.payments,p]}));message('الشهرية اتسجلت.');}
 function deletePayment(id){setDb(d=>({...d,payments:d.payments.filter(p=>p.id!==id)}));message('اتحذفت الدفعة.');}
 function savingsSave(tx){if(tx.amount<0&&Math.abs(tx.amount)>saved)return 'المبلغ اللي هترجعه أكبر من اللي محوشه.';setDb(d=>({...d,savings:[...d.savings,tx]}));message(tx.amount>0?'اتسجل التحويش.':'اترجعت الفلوس للمتاح.');return null;}
 function balanceSave(currentCash,currentSaved){const nonOpeningCash=incomeAll-expenseAll-saveMove;const openingCash=currentCash-nonOpeningCash;const openingSavings=currentSaved-saveMove;setDb(d=>({...d,settings:{...d.settings,openingCash,openingSavings}}));message('اتظبط الرصيد الحالي.');}
 function expenseText(){return `📒 مصاريف ${monthLabel(month)}\n${[...monthlyExpenses].reverse().map(e=>`• ${e.description||e.category||'مصروف'}: ${fullMoney(e.amount)} — ${dateLabel(e.date)}`).join('\n')||'• مفيش مصاريف مسجلة'}\n————\nالإجمالي: ${fullMoney(monthlySpend)}`;}
 async function copyExpenses(){const ok=await copyText(expenseText());message(ok?'اتنسخت مصروفات الشهر بالتواريخ.':'النسخ اتمنع من المتصفح. جرّبه من رابط HTTPS.');}
 function backup(){downloadFile(JSON.stringify({version:2,exportedAt:new Date().toISOString(),...db},null,2),`masroof-backup-${today()}.json`);message('النسخة الاحتياطية اتنزّلت. احتفظ بيها بره المتصفح.');}
 async function restore(e){const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!valid(parsed))throw Error('wrong data');if(window.confirm('الاسترجاع هيستبدل البيانات الحالية كلها. اتأكد إنك واخد نسخة من الحالية الأول.')){setDb(hydrate(parsed));message('اتسترجعت البيانات.');}}catch{message('الملف مش نسخة صالحة من مصروف.');}e.target.value='';}
 function removeSaving(id){if(window.confirm('تحذف حركة التحويش دي؟'))setDb(d=>({...d,savings:d.savings.filter(x=>x.id!==id)}));}
 const tabs=[['home','الرئيسية','home'],['expenses','المصاريف','receipt'],['students','الشهريات','people'],['savings','التحويش','bank'],['settings','إعدادات','gear']];
 return <div className="app">
  <header className="topbar"><div className="head-wrap"><div className="identity"><img src="/icons/masroof-192.png" alt="أيقونة مصروف"/><div><strong>مصروف<span>.</span></strong><small>فلوسك، ببساطة</small></div></div><div className="head-month"><Icon name="calendar" size={18}/><input type="month" aria-label="اختيار الشهر" value={month} onChange={e=>{setMonth(e.target.value);setViewAll(false);}}/></div></div></header>
  <div className="layout"><nav className="nav-desktop" aria-label="القائمة الرئيسية">{tabs.map(([key,title,icon])=><button key={key} className={screen===key?'active':''} onClick={()=>{setScreen(key);setViewAll(false);}}><Icon name={icon} size={20}/>{title}</button>)}</nav>
  <main className="content">
    {saveError&&<div className="alert"><Icon name="warning"/> المتصفح مش قادر يحفظ التغييرات. نزّل نسخة احتياطية حالًا.</div>}
    {screen==='home'&&<>
     <div className="page-heading"><div><p className="eyebrow">{monthLabel(month)}</p><h1>أهلًا بيك في مصروف</h1><p>كل اللي محتاج تعرفه عن فلوسك، من غير تعقيد.</p></div></div>
     <section className="hero"><div><span className="hero-label">المتاح تصرفه دلوقتي</span><strong className="hero-value">{cash===null?'—':number(cash)} <small>جنيه</small></strong>{cash===null?<button className="hero-inline" onClick={()=>setModal({type:'balance'})}>حدد رصيدك الحالي <Icon name="arrow" size={16}/></button>:<span className="hero-sub">مستبعد منه المبلغ المحوش</span>}</div><div className="hero-side"><span>محوش لحد دلوقتي</span><strong>{money(saved)}</strong><button onClick={()=>setModal({type:'savings'})}>حوش مبلغ <Icon name="plus" size={15}/></button></div></section>
     <div className="stats"><div className="stat"><span>صرفت الشهر ده</span><strong>{money(monthlySpend)}</strong><small>{monthlyExpenses.length} عملية</small></div><div className="stat"><span>دخل استلمته الشهر ده</span><strong>{money(monthlyIncome)}</strong><small>حسب تاريخ الاستلام</small></div><div className="stat"><span>شهريات لسه مطلوبة</span><strong>{money(uncollected)}</strong><small>غير محسوبة في الرصيد</small></div></div>
     <div className="main-actions"><button className="btn primary large" onClick={()=>setModal({type:'expense'})}><Icon name="plus"/> إضافة مصروف</button><button className="btn secondary large" onClick={copyExpenses}><Icon name="copy"/> نسخ المصروفات</button></div>
     <section className="panel"><div className="panel-head"><h2>آخر المصروفات</h2><button className="link-btn" onClick={()=>setScreen('expenses')}>عرض الكل <Icon name="arrow" size={15}/></button></div><ExpenseRows expenses={monthlyExpenses.slice(0,5)} edit={e=>setModal({type:'expense',item:e})} remove={removeExpense}/>{monthlyExpenses.length===0&&<div className="empty"><Icon name="receipt" size={30}/><b>لسه مفيش مصاريف في الشهر ده</b><p>سجل أول مصروف، حتى لو 10 جنيه.</p></div>}</section>
    </>}
    {screen==='expenses'&&<><div className="page-heading"><div><p className="eyebrow">{monthLabel(month)}</p><h1>المصاريف</h1><p>التاريخ مكتوب تحت كل مصروف، والنسخ بيجمع الشهر كله.</p></div><strong className="page-total">{money(monthlySpend)}</strong></div>
    <div className="main-actions"><button className="btn primary" onClick={()=>setModal({type:'expense'})}><Icon name="plus"/> مصروف جديد</button><button className="btn secondary" onClick={copyExpenses}><Icon name="copy"/> نسخ مصروفات الشهر</button></div>
    <section className="panel expense-panel"><div className="panel-head"><h2>سجل {monthLabel(month)}</h2><small>{monthlyExpenses.length} مصروف</small></div>{monthlyExpenses.length?<ExpenseRows expenses={allMonthExpenses} edit={e=>setModal({type:'expense',item:e})} remove={removeExpense}/>:<div className="empty"><b>مفيش مصروفات مسجلة</b><p>اضغط «مصروف جديد» وابدأ.</p></div>}{monthlyExpenses.length>6&&!viewAll&&<button className="more-btn" onClick={()=>setViewAll(true)}>عرض باقي المصروفات ({monthlyExpenses.length-6})</button>}</section>
    <p className="note">الزرار بينسخ التاريخ، الوصف، قيمة كل مصروف، وإجمالي الشهر — جاهز للصق في واتساب أو النوتس.</p>
    </>}
    {screen==='students'&&<><div className="page-heading"><div><p className="eyebrow">{monthLabel(month)}</p><h1>شهريات الطلبة</h1><p>اختار دفعة، واضغط تحصيل جنب اللي دفع.</p></div></div>
    <div className="seg grade-seg">{GRADES.map(g=><button key={g.id} onClick={()=>setGrade(g.id)} className={grade===g.id?'selected':''}>{g.name}</button>)}</div>
    <div className="grade-card"><div><span>الطلبة اللي دفعوا</span><strong>{paidPeople} <small>من {people.length}</small></strong></div><div><span>المتبقي من الدفعة</span><strong>{money(sum(people.map(s=>({amount:Math.max(0,s.fee-paidFor(s))}))))}</strong></div></div>
    <div className="main-actions"><button className="btn primary" onClick={()=>setModal({type:'student'})}><Icon name="plus"/> إضافة طالب</button><button className="btn secondary" onClick={()=>setModal({type:'bulk'})}>إضافة أسماء بالجملة</button></div>
    <section className="panel"><div className="panel-head"><h2>{GRADES.find(g=>g.id===grade).name}</h2><small>{people.length} طالب</small></div>{people.length?people.map(s=>{const paid=paidFor(s),done=paid>=s.fee;return <div className="student-row" key={s.id}><div className="student-avatar">{s.name.trim().charAt(0)}</div><div className="student-name"><strong>{s.name}</strong><small>{done?'دفع الشهرية كاملة':paid>0?`دفع ${money(paid)} من ${money(s.fee)}`:`مستحق ${money(s.fee)}`}</small></div><button className={done?'paid-btn':'collect-btn'} onClick={()=>setModal({type:'payment',student:s})}>{done?<><Icon name="check" size={16}/> مدفوع</>:'تحصيل'}</button><button className="icon-btn student-edit" aria-label="تعديل الطالب" onClick={()=>setModal({type:'student',student:s})}><Icon name="edit" size={17}/></button></div>;}):<div className="empty"><Icon name="people" size={32}/><b>لسه مفيش طلبة</b><p>ضيف الأسماء مرة واحدة، وبعد كده علم على اللي يدفع.</p></div>}</section>
    {db.students.some(s=>s.grade===grade&&s.leftAt)&&<details className="panel folded"><summary>الطلبة المتوقفين</summary>{db.students.filter(s=>s.grade===grade&&s.leftAt).map(s=><div className="history-row" key={s.id}><div><b>{s.name}</b><small>متوقف من {monthLabel(s.leftAt)}</small></div><button className="btn secondary tiny" onClick={()=>toggleStudent(s)}>إعادة تفعيل</button></div>)}</details>}
    </>}
    {screen==='savings'&&<><div className="page-heading"><div><p className="eyebrow">تحويشك</p><h1>فلوس على جنب</h1><p>أي مبلغ بتحوشه مش بيتحسب مصروف.</p></div></div><section className="savings-card"><span>إجمالي التحويش الحالي</span><strong>{money(saved)}</strong><p>فلوس منفصلة عن المتاح للصرف.</p></section><div className="main-actions"><button className="btn primary" onClick={()=>setModal({type:'savings'})}><Icon name="plus"/> حوش أو رجّع مبلغ</button><button className="btn secondary" onClick={()=>setModal({type:'balance'})}><Icon name="edit"/> ظبط الرصيد</button></div><section className="panel"><div className="panel-head"><h2>حركات التحويش</h2><small>{db.savings.length} حركة</small></div>{db.savings.length?[...db.savings].sort((a,b)=>b.date.localeCompare(a.date)).map(x=><div className="history-row" key={x.id}><div><b>{x.amount>0?'حوشّت':'رجّعت'} {money(Math.abs(x.amount))}</b><small>{dateLabel(x.date)}{x.note?` • ${x.note}`:''}</small></div><button className="icon-btn danger" aria-label="حذف الحركة" onClick={()=>removeSaving(x.id)}><Icon name="trash" size={17}/></button></div>):<div className="empty"><b>لسه مفيش حركات تحويش</b><p>ممكن تظبط المبلغ المحوش حاليًا من زر «ظبط الرصيد».</p></div>}</section></>}
    {screen==='settings'&&<><div className="page-heading"><div><h1>الإعدادات والنسخ الاحتياطية</h1><p>بياناتك محفوظة محليًا على الجهاز والمتصفح ده.</p></div></div><section className="panel settings-panel"><h2>الفلوس والحساب</h2><p>لو بدأت استخدام الموقع في نص الشهر، حدّد الفلوس اللي معاك بالفعل بعد المصاريف القديمة.</p><button className="btn secondary" onClick={()=>setModal({type:'balance'})}><Icon name="edit"/> ضبط الرصيد المتاح والتحويش</button></section><section className="panel settings-panel"><h2>حماية بياناتك</h2><p><strong>مهم:</strong> مفيش مزامنة سحابية في النسخة دي. مسح بيانات المتصفح أو تغيير الجهاز ممكن يضيّع البيانات. نزّل نسخة احتياطية بعد كل تحديث مهم.</p><div className="main-actions"><button className="btn primary" onClick={backup}><Icon name="download"/> تنزيل نسخة JSON</button><button className="btn secondary" onClick={()=>inputRef.current?.click()}><Icon name="upload"/> استرجاع نسخة</button></div></section><section className="panel settings-panel"><h2>تثبيت الاختصار على الموبايل</h2><p>من Chrome افتح رابط الموقع، واضغط القائمة (⋮) ثم «Add to Home screen» أو «Install app». هتظهر أيقونة مصروف الفحمي والبرتقالي.</p><div className="icon-sample"><img src="/icons/masroof-192.png" alt="أيقونة مصروف"/><span>مصروف</span></div></section></>}
    <footer>مصروف — نسخة خفيفة بدون حسابات أو مزامنة سحابية</footer>
  </main></div>
  <nav className="nav-mobile" aria-label="التنقل">{tabs.map(([key,title,icon])=><button key={key} onClick={()=>{setScreen(key);setViewAll(false);window.scrollTo({top:0,behavior:'instant'});}} className={screen===key?'active':''}><Icon name={icon} size={20}/><span>{title}</span></button>)}</nav>
  {toast&&<div className="toast" role="status"><span>{toast}</span><button onClick={()=>setToast('')} aria-label="إغلاق"><Icon name="close" size={15}/></button></div>}
  {modal?.type==='expense'&&<ExpenseForm item={modal.item} save={updateExpense} close={()=>setModal(null)}/>}
  {modal?.type==='student'&&<StudentForm student={modal.student} grade={grade} month={month} save={addStudent} close={()=>setModal(null)}/>}
  {modal?.type==='bulk'&&<BulkForm grade={grade} month={month} add={bulkAdd} close={()=>setModal(null)}/>}
  {modal?.type==='payment'&&<PaymentForm student={modal.student} month={month} payments={db.payments} add={addPayment} remove={deletePayment} close={()=>setModal(null)}/>}
  {modal?.type==='savings'&&<SavingsForm save={savingsSave} close={()=>setModal(null)}/>}
  {modal?.type==='balance'&&<BalanceForm cash={cash} saved={saved} onSave={balanceSave} close={()=>setModal(null)}/>}
  <input ref={inputRef} hidden type="file" accept=".json,application/json" onChange={restore}/>
 </div>;
}
function ExpenseRows({expenses,edit,remove}){
 return <div className="expense-list">{expenses.map(e=><div className="expense-row" key={e.id}><span className="expense-marker"><Icon name="receipt" size={17}/></span><div className="expense-detail"><strong>{e.description||e.category||'مصروف'}</strong><small>{dateLabel(e.date)}{e.description&&e.category&&e.category!=='متفرقات'?` • ${e.category}`:''}</small></div><b className="expense-amount">{money(e.amount)}</b><button className="icon-btn" aria-label="تعديل المصروف" title="تعديل" onClick={()=>edit(e)}><Icon name="edit" size={17}/></button><button className="icon-btn danger" aria-label="حذف المصروف" title="حذف" onClick={()=>remove(e)}><Icon name="trash" size={16}/></button></div>)}</div>;
}
