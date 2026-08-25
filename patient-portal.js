(() => {
  'use strict';
  const auth = document.getElementById('patientAuth');
  const app = document.getElementById('patientApp');
  const signIn = document.getElementById('patientSignIn');
  const error = document.getElementById('patientAuthError');

  // The portal deliberately does not create a Supabase client or fabricate patient data.
  // A deployed patient-auth/session bridge must provide window.AZAAD_PATIENT_SESSION.
  function getSession() {
    const session = window.AZAAD_PATIENT_SESSION;
    if (!session || session.authenticated !== true || !session.patientId) return null;
    return session;
  }

  function showUnauthenticated(message) {
    auth.classList.remove('hidden');
    app.classList.add('hidden');
    error.textContent = message || 'Please sign in to continue.';
  }

  async function loadPortal() {
    const session = getSession();
    if (!session) return showUnauthenticated();
    auth.classList.add('hidden');
    app.classList.remove('hidden');
    document.getElementById('patientStatus').textContent = 'Authenticated. Patient data boundary is active.';
    document.getElementById('patientName').textContent = session.patientName || 'Patient Portal';
    // Data rendering is intentionally gated until the canonical patient backend contract
    // exposes a patient-scoped read API. Never substitute mock records here.
    ['patientBookings','patientInvoices','patientVisits','patientFollowups'].forEach(id => {
      document.getElementById(id).textContent = 'Patient data service not yet provisioned.';
    });
  }

  signIn.addEventListener('click', () => {
    const handler = window.AZAAD_PATIENT_SIGN_IN;
    if (typeof handler !== 'function') {
      showUnauthenticated('Patient authentication service is not configured.');
      return;
    }
    Promise.resolve(handler()).then(loadPortal).catch(() => showUnauthenticated('Sign-in failed.'));
  });

  document.addEventListener('DOMContentLoaded', loadPortal, { once: true });
})();
