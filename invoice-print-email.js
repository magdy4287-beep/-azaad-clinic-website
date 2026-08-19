/* AZAAD — Invoice Print / Email Actions
 * Free-only implementation: printing is native browser print; email opens
 * the patient's mail client with a structured invoice summary. It never
 * sends silently or exposes service credentials in the browser.
 */
(() => {
  'use strict';
  const tr=(a,e)=>((document.documentElement.lang||'ar').toLowerCase().startsWith('en')?e:a);
  const text=()=>document.getElementById('mc')?.innerText||'';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  function add(){const mc=document.getElementById('mc'), modal=document.getElementById('modal');if(!mc||!modal)return;const box=modal.querySelector('.modalbox');if(!box||box.querySelector('#invoicePrintBtn'))return;const bar=box.querySelector('.actions');if(!bar)return;const wrap=document.createElement('span');wrap.className='actions';wrap.style.marginInlineStart='auto';wrap.innerHTML=`<button id="invoicePrintBtn" class="btn primary" type="button">🖨️ ${tr('طباعة','Print')}</button><button id="invoiceEmailBtn" class="btn secondary" type="button">📧 ${tr('إرسال بالإيميل','Email')}</button>`;bar.appendChild(wrap);document.getElementById('invoicePrintBtn').onclick=printInvoice;document.getElementById('invoiceEmailBtn').onclick=emailInvoice;}
  function printInvoice(){const body=text();const w=window.open('','_blank','noopener,noreferrer,width=900,height=800');if(!w)return;w.document.write(`<!doctype html><html lang="${document.documentElement.lang||'ar'}"><head><meta charset="utf-8"><title>${tr('فاتورة عيادة أزاد','Azaad Clinic Invoice')}</title><style>body{font-family:Arial,Tahoma,sans-serif;direction:${document.documentElement.dir||'rtl'};padding:30px;color:#17214f}h1{margin-top:0}.invoice{white-space:pre-wrap;line-height:1.9;border:1px solid #ddd;border-radius:12px;padding:22px}@media print{button{display:none}}</style></head><body><h1>🏥 AZAAD CLINIC</h1><div class="invoice">${esc(body)}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();}
  function emailInvoice(){const body=text();const email=prompt(tr('أدخل بريد المريض لإرسال الفاتورة من برنامج البريد:','Enter the patient email to open your mail client:'));if(!email?.trim())return;const subject=encodeURIComponent(tr('فاتورة عيادة أزاد','Azaad Clinic Invoice'));const message=encodeURIComponent(tr(`مرحبًا،\n\nمرفق/أدناه ملخص فاتورتك من عيادة أزاد:\n\n${body}\n\nمع تحيات عيادة أزاد.`,`Hello,\n\nPlease find your Azaad Clinic invoice summary below:\n\n${body}\n\nRegards, Azaad Clinic.`));window.location.href=`mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${message}`;}
  const obs=new MutationObserver(add);obs.observe(document.body,{subtree:true,childList:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
})();
