(() => {
  'use strict';

  const form = document.getElementById('bookingForm');
  const name = document.getElementById('name');
  const phone = document.getElementById('phone');
  if (!form || !name || !phone) return;

  const language = () => {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    const lang = String(document.documentElement.lang || '').toLowerCase();
    return lang === 'en' || lang.startsWith('en-') ? 'en' : 'ar';
  };

  const copy = () => language() === 'en'
    ? {
        name: 'Please enter your full three-part name.',
        phone: 'Please enter your mobile phone number.',
        phoneInvalid: 'Please enter a valid mobile phone number.'
      }
    : {
        name: 'من فضلك اكتب اسمك الثلاثي بالكامل.',
        phone: 'من فضلك اكتب رقم الموبايل.',
        phoneInvalid: 'من فضلك أدخل رقم موبايل صحيح.'
      };

  const threePartName = (value) =>
    String(value || '').trim().split(/\s+/).filter(Boolean).length >= 3;

  const validPhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  };

  function validate() {
    const c = copy();
    const nameValue = String(name.value || '').trim();
    const phoneValue = String(phone.value || '').trim();

    name.setCustomValidity(nameValue ? (threePartName(nameValue) ? '' : c.name) : c.name);
    phone.setCustomValidity(phoneValue ? (validPhone(phoneValue) ? '' : c.phoneInvalid) : c.phone);
  }

  [name, phone].forEach((input) => {
    input.addEventListener('input', validate);
    input.addEventListener('change', validate);
  });

  form.addEventListener('invalid', validate, true);
  window.addEventListener('azaad:language-changed', validate);
  window.addEventListener('azaadLanguageChanged', validate);
  window.addEventListener('storage', (event) => {
    if (event.key === 'azaadClinicLanguage') validate();
  });

  validate();
})();
