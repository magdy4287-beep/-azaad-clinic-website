/* Azaad Clinic — shared clinical permission gate */
window.AZAAD_CLINICAL_PERMISSION_GATE = (() => {
  const FN = 'https://derofsthjivlkcdnojww.supabase.co/functions/v1/azaad-clinical-assessments';
  async function token(){
    if (window.AZAAD_PATIENT_SESSION?.getAccessToken) return await window.AZAAD_PATIENT_SESSION.getAccessToken();
    return sessionStorage.getItem('azaad_admin_token') || '';
  }
  async function get(){
    const t = await token();
    if (!t) throw new Error('جلسة الطبيب غير موجودة.');
    const r = await fetch(FN,{headers:{Authorization:`Bearer ${t}`,Accept:'application/json'},cache:'no-store'});
    const d = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(d.error || 'تعذر التحقق من صلاحيات الطبيب.');
    return d.permissions || {};
  }
  return {get};
})();