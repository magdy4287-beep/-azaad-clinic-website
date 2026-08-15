/* Azaad Clinic — Central Scheduling Center V1
 * Read/compose layer. Appointment mutations remain behind the existing booking boundary.
 */
(function(global){'use strict';const api=global.AzaadScheduling;if(!api)return;
function buildSlot(appointment,availability){const a=appointment||{},v=availability||{};return{doctor_id:a.doctor_id||v.doctor_id||null,date:a.appointment_date||a.date||v.date||null,start_time:a.start_time||v.start_time||null,end_time:a.end_time||v.end_time||null,patient_id:a.patient_id||null,mrn:a.mrn||null,appointment_id:a.id||a.appointment_id||null,service_id:a.service_id||null,status:api.normalizeStatus(a.status||v.status)};}
function groupByDoctor(slots){return(slots||[]).reduce((g,s)=>{const k=String(s.doctor_id||'unassigned');(g[k]||(g[k]=[])).push(s);return g;},{});}
function sortSlots(slots){return[...(slots||[])].sort((a,b)=>String(a.start_time||'').localeCompare(String(b.start_time||'')));}
global.AzaadCentralScheduling=Object.freeze({buildSlot,groupByDoctor,sortSlots});})(window);
