(() => {
  'use strict';
  const money=v=>Number(v||0).toLocaleString('en-EG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function enhance(){
    const modal=document.getElementById('modal'); const mc=document.getElementById('mc'); if(!modal||!mc)return;
    const observer=new MutationObserver(()=>{
      const current=mc.innerHTML; if(!current||mc.dataset.enhanced===current)return;
      mc.dataset.enhanced=current;
      const actions=document.createElement('div'); actions.className='actions'; actions.style.marginTop='14px'; actions.innerHTML='<button id="azaadInvoicePrint" class="btn primary">🖨️ طباعة الفاتورة</button><span class="muted">🔒 الفاتورة غير قابلة للتعديل التشغيلي؛ التعديلات المالية محصورة بالإدارة/المالك.</span>';
      mc.appendChild(actions);
      document.getElementById('azaadInvoicePrint').onclick=()=>{
        const w=window.open('','_blank'); if(!w)return;
        w.document.write(`<html><head><title>AZAAD Invoice</title><style>body{font-family:Arial;padding:30px;color:#172033}.box{border:1px solid #ddd;border-radius:12px;padding:15px;margin:10px 0}</style></head><body dir="rtl"><h1>🏥 AZAAD Clinic — Invoice</h1><div class="box">${mc.innerHTML.replace(/<button[^>]*>.*?<\/button>/g,'')}</div><p>Printed: ${esc(new Date().toLocaleString('ar-EG'))}</p></body></html>`); w.document.close(); w.print();
      };
    });
    observer.observe(mc,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
