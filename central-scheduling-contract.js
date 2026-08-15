/* Azaad Clinic — Central Scheduling Contract V1 */
(function (global) {
  'use strict';
  const STATUS = Object.freeze({AVAILABLE:'available',CONFIRMED:'confirmed',PENDING:'pending',NO_SHOW:'no_show',CANCELLED:'cancelled',CLOSED:'closed'});
  const DISPLAY = Object.freeze({
    available:{icon:'🟢',label:'Available'}, confirmed:{icon:'🔵',label:'Confirmed'}, pending:{icon:'🟡',label:'Pending confirmation'},
    no_show:{icon:'🟠',label:'No-show'}, cancelled:{icon:'🔴',label:'Cancelled'}, closed:{icon:'⚫',label:'Closed / Holiday'}
  });
  function normalizeStatus(value){const v=String(value||'').trim().toLowerCase();if(['booked','confirmed','scheduled'].includes(v))return STATUS.CONFIRMED;if(['pending_confirmation','awaiting_confirmation'].includes(v))return STATUS.PENDING;if(['no-show','noshow'].includes(v))return STATUS.NO_SHOW;if(['cancelled','canceled'].includes(v))return STATUS.CANCELLED;if(['closed','holiday','blocked'].includes(v))return STATUS.CLOSED;return v||STATUS.AVAILABLE;}
  function toDateKey(value){const d=value instanceof Date?value:new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10);}
  function validateSlot(slot){if(!slot||typeof slot!=='object')return{ok:false,reason:'invalid_slot'};if(!slot.doctor_id)return{ok:false,reason:'missing_doctor'};if(!slot.date)return{ok:false,reason:'missing_date'};if(!slot.start_time)return{ok:false,reason:'missing_start_time'};const status=normalizeStatus(slot.status);if(status!==STATUS.AVAILABLE&&!slot.appointment_id)return{ok:false,reason:'booked_slot_requires_appointment'};return{ok:true,date:toDateKey(slot.date),status};}
  function canDoctorViewSlot(authenticatedDoctorId,slot){return Boolean(authenticatedDoctorId&&slot&&String(authenticatedDoctorId)===String(slot.doctor_id));}
  global.AzaadScheduling=Object.freeze({STATUS,DISPLAY,normalizeStatus,toDateKey,validateSlot,canDoctorViewSlot});
})(window);
