/* AZAAD CLINIC — Central Appointment Status Model
 * UI labels must resolve through the project's existing translation layer.
 * This module contains canonical status keys only; it never stores translated text.
 */
(function (global) {
  'use strict';
  const STATUS = Object.freeze({
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    ARRIVED_EARLY: 'ARRIVED_EARLY',
    CHECKED_IN: 'CHECKED_IN',
    LATE: 'LATE',
    NO_SHOW: 'NO_SHOW',
    NO_SHOW_RECOVERED: 'NO_SHOW_RECOVERED',
    IN_CLINIC: 'IN_CLINIC',
    WITH_DOCTOR: 'WITH_DOCTOR',
    VISIT_COMPLETED: 'VISIT_COMPLETED',
    LEFT_CLINIC: 'LEFT_CLINIC',
    CANCELLED: 'CANCELLED'
  });

  const META = Object.freeze({
    PENDING: { icon: '⏳', key: 'appointment.status.pending', canEdit: true },
    CONFIRMED: { icon: '🟢', key: 'appointment.status.confirmed', canEdit: true },
    ARRIVED_EARLY: { icon: '⏰', key: 'appointment.status.arrivedEarly', canEdit: true },
    CHECKED_IN: { icon: '🚪', key: 'appointment.status.checkedIn', canEdit: true },
    LATE: { icon: '🕐', key: 'appointment.status.late', canEdit: true },
    NO_SHOW: { icon: '❌', key: 'appointment.status.noShow', canEdit: true },
    NO_SHOW_RECOVERED: { icon: '↩️', key: 'appointment.status.noShowRecovered', canEdit: true },
    IN_CLINIC: { icon: '🏥', key: 'appointment.status.inClinic', canEdit: true },
    WITH_DOCTOR: { icon: '🧑‍⚕️', key: 'appointment.status.withDoctor', canEdit: true },
    VISIT_COMPLETED: { icon: '✅', key: 'appointment.status.visitCompleted', canEdit: true },
    LEFT_CLINIC: { icon: '🚶', key: 'appointment.status.leftClinic', canEdit: true },
    CANCELLED: { icon: '🚫', key: 'appointment.status.cancelled', canEdit: false }
  });

  function isBeforeScheduled(now, scheduled) { return new Date(now).getTime() < new Date(scheduled).getTime(); }
  function deriveArrivalStatus(now, scheduled, noShow) {
    if (noShow) return STATUS.NO_SHOW_RECOVERED;
    return isBeforeScheduled(now, scheduled) ? STATUS.ARRIVED_EARLY : STATUS.CHECKED_IN;
  }

  global.AZAAD_APPOINTMENT_STATUS = Object.freeze({ STATUS, META, isBeforeScheduled, deriveArrivalStatus });
})(window);
