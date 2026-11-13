import test from 'node:test';
import assert from 'node:assert/strict';
import {monthBefore,monthComparison,duplicateExpense,getExpenseVisual,backupIsDue} from './finance.js';

test('previous month works across year boundary',()=>assert.equal(monthBefore('2026-01'),'2025-12'));
test('repeat expense gets fresh id and current date without mutating original',()=>{
  const original={id:'abc',description:'مواصلات',amount:30,date:'2026-10-05',category:'مواصلات'};
  const next=duplicateExpense(original,'2026-11-13','xyz');
  assert.deepEqual(next,{...original,id:'xyz',date:'2026-11-13'});
  assert.equal(original.date,'2026-10-05');
});
test('compare ongoing month uses same elapsed days',()=>{
 const expenses=[{date:'2026-11-01',amount:20},{date:'2026-11-12',amount:30},{date:'2026-10-12',amount:50},{date:'2026-10-30',amount:500}];
 const compared=monthComparison(expenses,'2026-11',new Date(2026,10,13));
 assert.equal(compared.current,50);assert.equal(compared.earlier,50);assert.equal(compared.cutoff,13);assert.equal(compared.previousCutoff,13);
});
test('compare previous finished months including all days',()=>{
 const expenses=[{date:'2026-10-31',amount:20},{date:'2026-09-30',amount:40}];
 const compared=monthComparison(expenses,'2026-10',new Date(2026,10,13));
 assert.equal(compared.current,20);assert.equal(compared.earlier,40);assert.equal(compared.difference,-20);
});
test('first month of year comparison works',()=>{
 const compared=monthComparison([{date:'2025-12-13',amount:60},{date:'2026-01-13',amount:40}],'2026-01',new Date(2026,0,13));
 assert.equal(compared.earlier,60);assert.equal(compared.current,40);
});
test('smart category icon detects description if category is miscellaneous',()=>{
 assert.equal(getExpenseVisual({category:'متفرقات',description:'بقلاوة'}),'food');
 assert.equal(getExpenseVisual({category:'مواصلات',description:'اي حاجه'}),'transport');
});
test('backup reminder waits seven days and handles missing/invalid records',()=>{
 const now=new Date('2026-11-13T10:00:00Z').valueOf();
 assert.equal(backupIsDue(null,now),true);
 assert.equal(backupIsDue('bad',now),true);
 assert.equal(backupIsDue('2026-11-07T10:00:00Z',now),false);
 assert.equal(backupIsDue('2026-11-06T10:00:00Z',now),true);
});
