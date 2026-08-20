/* ============================================================
   AZAAD CLINIC — SCHEDULING ACTIONS CONTRACT V1
   Purpose: one canonical, side-effect-free contract for scheduling
   mutations. Backend handlers remain the only mutation boundary.
   ============================================================ */
(function (global) {
  'use strict';

  const ACTION = Object.freeze({
    BOOK: 'book',
    RESCHEDULE: 'reschedule',
    CANCEL: 'cancel',
    NO_SHOW: 'no_show',
    TRANSFER: 'transfer',
    ASSIGN_WAITING: 'assign_waiting',
  });

  const TERMINAL = new Set(['cancelled', 'no_show']);
  const ACTIVE = new Set(['pending', 'confirmed']);

  const FRONT_DESK_RULES = new Set([ACTION.BOOK, ACTION.RESCHEDULE, ACTION.CANCEL, ACTION.NO_SHOW, ACTION.TRANSFER, ACTION.ASSIGN_WAITING]);

  const ROLE_RULES = Object.freeze({
    DOCTOR: new Set([ACTION.BOOK, ACTION.RESCHEDULE, ACTION.NO_SHOW]),
    FRONT_DESK: FRONT_DESK_RULES,
    SECRETARY: FRONT_DESK_RULES,
    RECEPTION: FRONT_DESK_RULES,
    RECEPTIONIST: FRONT_DESK_RULES,
    CASHIER: new Set([ACTION.BOOK, ACTION.RESCHEDULE]),
    ADMIN: new Set(Object.values(ACTION)),
    ADMINISTRATOR: new Set(Object.values(ACTION)),
    MANAGER: new Set(Object.values(ACTION)),
    OWNER: new Set(Object.values(ACTION)),
  });

  function normalizeRole(role) {
    return String(role || '').trim().toUpperCase();
  }

  function isKnownAction(action) {
    return Object.values(ACTION).includes(String(action || '').trim());
  }

  function canRoleAct(role, action) {
    const rules = ROLE_RULES[normalizeRole(role)];
    return Boolean(rules && rules.has(action));
  }

  function canDoctorAct(authenticatedDoctorId, appointmentDoctorId, role, action) {
    if (!canRoleAct(role, action)) return false;
    const normalized = normalizeRole(role);
    if (normalized !== 'DOCTOR') return true;
    return Boolean(authenticatedDoctorId && appointmentDoctorId &&
      String(authenticatedDoctorId) === String(appointmentDoctorId));
  }

  function validatePatientIdentity(input) {
    if (!input || typeof input !== 'object') return { ok: false, reason: 'missing_patient' };
    if (!input.patient_id) return { ok: false, reason: 'missing_patient_id' };
    if (!input.mrn) return { ok: false, reason: 'missing_mrn' };
    return { ok: true };
  }

  function validateSlot(input) {
    if (!input || typeof input !== 'object') return { ok: false, reason: 'missing_slot' };
    if (!input.doctor_id) return { ok: false, reason: 'missing_doctor' };
    if (!input.service_id) return { ok: false, reason: 'missing_service' };
    if (!input.date) return { ok: false, reason: 'missing_date' };
    if (!input.start_time) return { ok: false, reason: 'missing_start_time' };
    return { ok: true };
  }

  function validateTransition(action, currentStatus) {
    const status = String(currentStatus || '').toLowerCase();
    if (!isKnownAction(action)) return { ok: false, reason: 'unknown_action' };
    if (action === ACTION.BOOK || action === ACTION.ASSIGN_WAITING) return { ok: true };
    if (!ACTIVE.has(status)) return { ok: false, reason: 'appointment_not_active' };
    if ([ACTION.RESCHEDULE, ACTION.CANCEL, ACTION.NO_SHOW, ACTION.TRANSFER].includes(action)) return { ok: true };
    return { ok: false, reason: 'unsupported_transition' };
  }

  function validateAction(input) {
    if (!input || typeof input !== 'object') return { ok: false, reason: 'invalid_request' };
    if (!isKnownAction(input.action)) return { ok: false, reason: 'unknown_action' };
    if (!input.authenticated_user_id) return { ok: false, reason: 'authentication_required' };
    if (!canRoleAct(input.role, input.action)) return { ok: false, reason: 'role_not_authorized' };
    const doctorCheck = canDoctorAct(input.authenticated_doctor_id, input.appointment_doctor_id, input.role, input.action);
    if (normalizeRole(input.role) === 'DOCTOR' && !doctorCheck) return { ok: false, reason: 'doctor_scope_denied' };
    const patient = validatePatientIdentity(input.patient);
    if (!patient.ok && input.action !== ACTION.CANCEL && input.action !== ACTION.NO_SHOW) return patient;
    const transition = validateTransition(input.action, input.current_status);
    if (!transition.ok) return transition;
    if ([ACTION.BOOK, ACTION.RESCHEDULE, ACTION.TRANSFER, ACTION.ASSIGN_WAITING].includes(input.action)) {
      const slot = validateSlot(input.slot);
      if (!slot.ok) return slot;
    }
    return { ok: true };
  }

  global.AzaadSchedulingActions = Object.freeze({
    ACTION,
    TERMINAL,
    ACTIVE,
    ROLE_RULES,
    normalizeRole,
    isKnownAction,
    canRoleAct,
    canDoctorAct,
    validatePatientIdentity,
    validateSlot,
    validateTransition,
    validateAction,
  });
})(window);
