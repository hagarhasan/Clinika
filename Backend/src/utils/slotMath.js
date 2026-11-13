'use strict';
const { timeToSec, secToTime, floorMinute, naiveMs } = require('./time');

function expandDay({ day, schedules, booked, stepSec, doctorClinicId, clinicIds, cutoff }) {
  const out = [];
  for (const sch of schedules) {
    const clinicId = sch.clinic_id || doctorClinicId || null;
    if (clinicIds && !clinicIds.has(clinicId)) continue;
    let cur = timeToSec(sch.start_time);
    const end = timeToSec(sch.end_time);
    while (cur + stepSec <= end) {
      const startT = secToTime(floorMinute(cur));
      if (naiveMs(day, cur) > cutoff) {
        out.push({ start_time: startT, end_time: secToTime(cur + stepSec), is_available: !booked.has(startT), clinic_id: clinicId });
      }
      cur += stepSec;
    }
  }
  return out;
}

module.exports = { expandDay };
