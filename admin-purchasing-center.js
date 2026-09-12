/* AZAAD Admin — Purchasing Domain Runtime
   Canonical browser boundary: same-origin /api/purchases.
   Identity: Appwrite HttpOnly session. Data: Neon clinic_purchases.
*/
(() => {
  'use strict';
  if (window.AZAAD_PURCHASING_CENTER) return;
  const ENDPOINT = '/api/purchases';
  const PANEL = 'purchasingEnterprisePanel';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = v => `${Number(v || 0).toLocaleString('en-US',{maximumFractionDigits:2})} EGP`;
  const state = { rows: [], loading: false, bound: false };
  const role = () => String(window.AZAAD?.state?.staff?.role || window.AZAAD?.state?.currentRole || '').toUpperCase().trim();
  const canWrite = () => ['OWNER','ADMIN','MANAGER'].includes(role());
  async function call(method='GET', query='', body) {
    const response = await fetch(`${ENDPOINT}${query}`, { method, credentials:'include', cache:'no-store', headers:{Accept:'application/json','Content-Type':'application/json'}, body:body===undefined?undefined:JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const e = new Error(data?.error || `HTTP ${response.status}`); e.status=response.status; throw e; }
    return data;
  }
  function host(){ return $(PANEL); }
  function shell(){
    const h=host(); if(!h) return null;
    h.innerHTML=`<div class="card"><div class="panel-head"><div><h2>🛒 Purchasing</h2><div class="muted">المشتريات الفعلية — Appwrite identity • Neon data.</div></div><button id="purchasingRefresh" class="btn btn-secondary" type="button">🔄 تحديث</button></div><div id="purchasingSummary" class="items" style="margin-top:12px"></div><div id="purchasingForm" style="margin-top:16px"></div><div id="purchasingList" class="items" style="margin-top:16px"></div></div>`;
    $('purchasingRefresh').onclick=load; renderForm(); return h;
  }
  function renderForm(row=null){
    const f=$('purchasingForm'); if(!f) return;
    if(!canWrite()){f.innerHTML='';return;}
    f.innerHTML=`<div class="card"><h3>${row?'تعديل عملية شراء':'إضافة عملية شراء'}</h3><div class="grid"><input id="purchaseNumber" placeholder="Purchase number" value="${esc(row?.purchase_number)}"><input id="purchaseItem" placeholder="Item / SKU" value="${esc(row?.item_name)}"><input id="purchaseCategory" placeholder="Category" value="${esc(row?.category)}"><input id="purchaseSupplier" placeholder="Supplier / Vendor" value="${esc(row?.supplier)}"><input id="purchaseQty" type="number" min="0.01" step="0.01" placeholder="Quantity" value="${row?.quantity??''}"><input id="purchaseUnit" type="number" min="0" step="0.01" placeholder="Unit price" value="${row?.unit_price??''}"><select id="purchaseMethod"><option value="cash">cash</option><option value="bank_transfer">bank_transfer</option><option value="card">card</option><option value="other">other</option></select><input id="purchaseDate" type="datetime-local" value="${row?.purchased_at?String(row.purchased_at).slice(0,16):''}"></div><textarea id="purchaseNotes" rows="3" placeholder="Notes">${esc(row?.notes)}</textarea><div class="actions" style="margin-top:10px"><button id="purchaseSave" class="btn btn-primary" type="button">💾 ${row?'حفظ التعديل':'حفظ'}</button>${row?'<button id="purchaseCancel" class="btn btn-secondary" type="button">إلغاء</button>':''}</div></div>`;
    if(row?.payment_method) $('purchaseMethod').value=row.payment_method;
    $('purchaseSave').onclick=()=>save(row?.id); if($('purchaseCancel')) $('purchaseCancel').onclick=renderForm;
  }
  async function save(id){
    const item_name=$('purchaseItem')?.value.trim(), quantity=Number($('purchaseQty')?.value), unit_price=Number($('purchaseUnit')?.value);
    if(!item_name||!(quantity>0)||unit_price<0){alert('أدخل الصنف والكمية والسعر بشكل صحيح.');return;}
    const payload={purchase_number:$('purchaseNumber')?.value.trim()||undefined,item_name,category:$('purchaseCategory')?.value.trim()||null,supplier:$('purchaseSupplier')?.value.trim()||null,quantity,unit_price,payment_method:$('purchaseMethod')?.value||'cash',purchased_at:$('purchaseDate')?.value?new Date($('purchaseDate').value).toISOString():new Date().toISOString(),notes:$('purchaseNotes')?.value.trim()||null};
    try{await call(id?'PATCH':'POST',id?`?id=${encodeURIComponent(id)}`:'',payload);renderForm();await load();}catch(e){alert(e.message);}
  }
  async function remove(id){if(!confirm('حذف عملية الشراء؟'))return;try{await call('DELETE',`?id=${encodeURIComponent(id)}`);await load();}catch(e){alert(e.message);}}
  function render(){
    const list=$('purchasingList'),summary=$('purchasingSummary');if(!list||!summary)return;
    const total=state.rows.reduce((n,r)=>n+Number(r.total||0),0);summary.innerHTML=`<div class="items"><div class="item"><strong>Records</strong><strong>${state.rows.length}</strong></div><div class="item"><strong>Total value</strong><strong>${money(total)}</strong></div></div>`;
    if(!state.rows.length){list.innerHTML='<div class="empty">No purchasing records</div>';return;}
    list.innerHTML=state.rows.map(r=>`<div class="item"><div><strong>${esc(r.item_name)}</strong><div class="muted">${esc(r.purchase_number||'')} · ${esc(r.supplier||'—')} · ${esc(r.category||'—')}</div><div class="muted">${esc(r.quantity)} × ${money(r.unit_price)} = ${money(r.total)} · ${esc(r.payment_method||'—')}</div><div class="muted">${esc(r.purchased_at||'')}</div></div>${canWrite()?`<div class="actions"><button class="btn btn-secondary" data-edit="${esc(r.id)}" type="button">تعديل</button><button class="btn btn-danger" data-delete="${esc(r.id)}" type="button">حذف</button></div>`:''}</div>`).join('');
    list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>renderForm(state.rows.find(r=>r.id===b.dataset.edit)));list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete));
  }
  async function load(){
    if(state.loading)return;state.loading=true;const list=$('purchasingList');if(list)list.innerHTML='<div class="empty">⏳ قراءة بيانات المشتريات الفعلية...</div>';
    try{const data=await call('GET');state.rows=Array.isArray(data.purchases)?data.purchases:[];render();}catch(e){if(list)list.innerHTML=`<div class="error">تعذر تحميل Purchasing: ${esc(e.message)}</div>`;}finally{state.loading=false;}
  }
  function activate(){if(!host())return;if(!state.bound){shell();state.bound=true;}void load();}
  window.addEventListener('azaad:admin-panel-activated',e=>{if(e.detail?.panel===PANEL)activate();});
  window.AZAAD_PURCHASING_CENTER=Object.freeze({activate,load});
})();
