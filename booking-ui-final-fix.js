(() => {
  'use strict';

  // Single-owner booking confirmation guard.
  // app.js owns the success message + booking number. This module owns only
  // the WhatsApp CTA and canonicalizes its container so duplicate renderers
  // cannot leave duplicate success/booking-number content behind.
  const KEY = '__AZAAD_BOOKING_UI_FINAL_FIX_V6__';
  if (window[KEY]) return;
  const state = { timer: null, running: false, success: false, context: null };
  window[KEY] = state;

  const $ = (id) => document.getElementById(id);
  const lang = () => {
    try {
      const v = localStorage.getItem('azaadClinicLanguage');
      if (v === 'ar' || v === 'en') return v;
    } catch (_) {}
    return String(document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'ar';
  };
  const copy = () => lang() === 'en' ? {
    instruction: 'Please click here 👇 to send the appointment to the clinic',
    button: 'Send the appointment to the clinic via WhatsApp',
    ready: 'WhatsApp will open with the message ready. Press “Send” inside WhatsApp to send the appointment to the clinic.'
  } : {
    instruction: 'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة',
    button: 'إرسال الموعد إلى العيادة عبر WhatsApp',
    ready: 'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الموعد إلى العيادة.'
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const time12 = (v) => {
    const m = String(v || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return String(v || '');
    let h = Number(m[1]);
    if (h < 0 || h > 23) return String(v || '');
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m[2]} ${p}`;
  };
  function capture() {
    const selected = document.querySelector('#slots .slot.selected');
    state.context = {
      doctor: $('doctor')?.selectedOptions?.[0]?.textContent?.trim() || '',
      service: $('service')?.selectedOptions?.[0]?.textContent?.trim() || '',
      date: $('date')?.value || '', time: selected?.dataset?.slot || '',
      mode: $('mode')?.value || 'clinic', name: $('name')?.value?.trim() || '',
      phone: $('phone')?.value?.trim() || '', email: $('email')?.value?.trim() || '', notes: $('notes')?.value?.trim() || ''
    };
  }
  function succeeded() {
    const text = String(document.body?.innerText || '');
    return /تم إنشاء الحجز بنجاح|تم تأكيد الحجز|booking created successfully|رقم الحجز|Booking number|\bAZD-[A-Z0-9-]{6,}\b/i.test(text);
  }
  function code() {
    const text = String(document.body?.innerText || '');
    return text.match(/\bAZD-[A-Z0-9-]{6,}\b/i)?.[0] || '';
  }
  async function clinicWhatsApp() {
    try {
      const r = await fetch('https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-public-clinic-data?api=data&_=' + Date.now(), {cache:'no-store',headers:{Accept:'application/json'}});
      if (r.ok) {
        const s = (await r.json())?.settings || {};
        const n = String(s.whatsapp || s.whatsapp_number || s.whatsapp_phone || s.phone_whatsapp || '').replace(/\D/g,'');
        if (n) return n;
      }
    } catch (_) {}
    return '201140526294';
  }
  function message(c) {
    const en = lang() === 'en', x = state.context || {};
    const service = (x.service || (en ? 'Service' : 'الخدمة')).replace(/\s+—?\s*\d+\s*(?:دقيقة|minutes?)\s*$/i,'');
    const mode = x.mode === 'online' ? (en ? 'Online' : 'جلسة أونلاين') : (en ? 'In-clinic' : 'داخل العيادة');
    return [
      `🏥 ${en ? 'New appointment from Azaad Clinic website' : 'موعد جديد من موقع عيادة آزاد'}`,
      `📌 ${en ? 'Booking number' : 'رقم الحجز'}: ${code() || (en ? 'Not available' : 'غير متوفر')}`,
      `👤 ${en ? 'Patient name' : 'اسم المريض'}: ${x.name || (en ? 'Not specified' : 'غير محدد')}`,
      `📱 ${en ? 'Phone' : 'رقم الهاتف'}: ${x.phone || (en ? 'Not specified' : 'غير محدد')}`,
      `👨‍⚕️ ${en ? 'Doctor' : 'الطبيب'}: ${x.doctor || (en ? 'Doctor' : 'الطبيب')}`,
      `🩺 ${en ? 'Service' : 'الخدمة'}: ${service}`,
      `📅 ${en ? 'Date' : 'التاريخ'}: ${x.date || (en ? 'Not specified' : 'غير محدد')}`,
      `⏰ ${en ? 'Time' : 'الوقت'}: ${time12(x.time) || (en ? 'Not specified' : 'غير محدد')}`,
      `💻 ${en ? 'Session type' : 'نوع الجلسة'}: ${mode}`,
      ...(x.email ? [`📧 ${en ? 'Email' : 'البريد الإلكتروني'}: ${x.email}`] : []),
      ...(x.notes ? [`📝 ${en ? 'Notes' : 'ملاحظات'}: ${x.notes}`] : [])
    ].join('\n');
  }
  function sanitizeRawKeys() {
    const en = lang() === 'en';
    const map = en ? {
      bookingCreated:'Booking created successfully', bookingNumber:'Booking number', whatsappTitle:'Booking created successfully',
      whatsappDescription:'To complete the booking process, send the appointment details to the clinic WhatsApp.',
      sendToWhatsApp:'Send the appointment to the clinic via WhatsApp',
      whatsappReady:'WhatsApp will open with the message ready. Press “Send” inside WhatsApp to send the appointment to the clinic.'
    } : {
      bookingCreated:'تم إنشاء الحجز بنجاح', bookingNumber:'رقم الحجز', whatsappTitle:'تم إنشاء الحجز بنجاح',
      whatsappDescription:'لإكمال إجراءات الحجز، اضغط الزر التالي لإرسال تفاصيل الموعد إلى WhatsApp العيادة.',
      sendToWhatsApp:'إرسال الموعد إلى العيادة عبر WhatsApp',
      whatsappReady:'بعد فتح WhatsApp ستظهر الرسالة جاهزة. اضغط «إرسال» داخل WhatsApp لإرسال الموعد إلى العيادة.'
    };
    const root = $('bookingForm')?.parentElement || document.body;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes=[];
    while(w.nextNode()) nodes.push(w.currentNode);
    for(const n of nodes){
      let t=n.nodeValue||'', changed=false;
      for(const [k,v] of Object.entries(map)){const re=new RegExp(`\\b${k}\\b`,'g'); if(re.test(t)){t=t.replace(re,v);changed=true;}}
      if(changed)n.nodeValue=t;
    }
  }
  async function ensure() {
    if (!state.success || !state.context) return;
    let box = $('whatsappBookingStep');
    const existing = $('sendBookingWhatsApp');
    if (box && existing) {
      if (!existing.getAttribute('href')) {
        const n = await clinicWhatsApp();
        existing.setAttribute('href', `https://wa.me/${n}?text=${encodeURIComponent(message())}`);
      }
      sanitizeRawKeys();
      return;
    }
    if (!box) {
      box=document.createElement('div'); box.id='whatsappBookingStep';
      box.style.cssText='margin-top:20px;padding:20px;border-radius:14px;background:#f1fbf5;border:1px solid #ccebd8;';
      const form=$('bookingForm'); if(form?.parentNode) form.parentNode.insertBefore(box,form.nextSibling);
    }
    const c=copy();
    const n=await clinicWhatsApp();
    const url=`https://wa.me/${n}?text=${encodeURIComponent(message())}`;
    box.innerHTML=`<div style="text-align:center"><span data-booking-whatsapp-instruction="true" style="display:block;font-size:18px;font-weight:700;line-height:1.8;margin:8px 0 12px">${esc(c.instruction)}</span><a id="sendBookingWhatsApp" data-azaad-whatsapp-cta="true" href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;font-size:16px;min-height:52px">${esc(c.button)}</a><p data-booking-whatsapp-ready="true" style="font-size:13px;color:#666;margin-top:12px;line-height:1.7">${esc(c.ready)}</p></div>`;
    box.dir=lang()==='en'?'ltr':'rtl';
    const source=document.querySelector('.booking-submit'); const btn=$('sendBookingWhatsApp');
    if(source&&btn){const s=getComputedStyle(source); btn.style.background=s.background;btn.style.backgroundColor=s.backgroundColor;btn.style.color='#fff';btn.style.border=s.border;btn.style.borderRadius=s.borderRadius;btn.style.fontFamily=s.fontFamily;btn.style.fontSize=s.fontSize;btn.style.fontWeight=s.fontWeight;btn.style.padding=s.padding;btn.style.boxShadow=s.boxShadow;}
    sanitizeRawKeys();
  }
  function refresh(){
    if(state.running)return; state.running=true;
    try{sanitizeRawKeys();if(!state.success&&succeeded())state.success=true;if(state.success)void ensure();}
    finally{state.running=false;}
  }
  function schedule(){if(state.timer)return;state.timer=setTimeout(()=>{state.timer=null;refresh();},60);}
  function init(){
    const form=$('bookingForm');
    if(form) {
      form.addEventListener('submit',capture,true);
      const observerRoot = form.parentElement || form;
      try{new MutationObserver(schedule).observe(observerRoot,{childList:true,subtree:true,characterData:true});}catch(_){ }
    }
    window.addEventListener('azaa:language-changed',schedule);
    window.addEventListener('azaadLanguageChanged',schedule);
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();