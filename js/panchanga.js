/**
 * Vedic pañcāṅga + planetary positions.
 * Lahiri (Chitrapaksha) ayanāṃśa matches generate.py:
 * official epoch 1956-03-21 JD 2435553.5, 23°15′00″, plus IAU 2006 precession in longitude.
 * Apparent geocentric ecliptic of date via astronomy-engine (GeoVector + aberration + ECT).
 */
import * as Astronomy from '../vendor/astronomy/astronomy.js';

const NAKSHATRAS = [
  ['Aśvinī', '阿湿毗尼'], ['Bharaṇī', '婆罗尼'], ['Kṛttikā', '昴宿'],
  ['Rohiṇī', '毕宿'], ['Mṛgaśīrṣa', '参宿'], ['Ārdrā', '井宿'],
  ['Punarvasu', '鬼宿'], ['Puṣya', '柳宿'], ['Aśleṣā', '星宿'],
  ['Maghā', '张宿'], ['Pūrva Phalgunī', '翼宿'], ['Uttara Phalgunī', '轸宿'],
  ['Hasta', '角宿'], ['Citrā', '亢宿'], ['Svātī', '氐宿'],
  ['Viśākhā', '房宿'], ['Anurādhā', '心宿'], ['Jyeṣṭhā', '尾宿'],
  ['Mūla', '箕宿'], ['Pūrva Āṣāḍhā', '斗宿'], ['Uttara Āṣāḍhā', '女宿'],
  ['Śravaṇa', '虚宿'], ['Dhaniṣṭhā', '危宿'], ['Śatabhiṣaj', '室宿'],
  ['Pūrva Bhādrapadā', '壁宿'], ['Uttara Bhādrapadā', '奎宿'], ['Revatī', '娄宿'],
];

const RASIS = [
  ['Meṣa', '白羊'], ['Vṛṣabha', '金牛'], ['Mithuna', '双子'],
  ['Karka', '巨蟹'], ['Siṃha', '狮子'], ['Kanyā', '室女'],
  ['Tulā', '天秤'], ['Vṛścika', '天蝎'], ['Dhanu', '人马'],
  ['Makara', '摩羯'], ['Kumbha', '宝瓶'], ['Mīna', '双鱼'],
];

const TITHI_NAMES = [
  'Pratipadā', 'Dvitīyā', 'Tṛtīyā', 'Caturthī', 'Pañcamī',
  'Ṣaṣṭhī', 'Saptamī', 'Aṣṭamī', 'Navamī', 'Daśamī',
  'Ekādaśī', 'Dvādaśī', 'Trayodaśī', 'Caturdaśī', 'Pūrṇimā',
];
const KRISHNA_15 = 'Amāvāsyā';

const YOGAS = [
  'Viṣkambha', 'Prīti', 'Āyuṣmān', 'Saubhāgya', 'Śobhana',
  'Atigaṇḍa', 'Sukarman', 'Dhṛti', 'Śūla', 'Gaṇḍa',
  'Vṛddhi', 'Dhruva', 'Vyāghāta', 'Harṣaṇa', 'Vajra',
  'Siddhi', 'Vyatīpāta', 'Varīyas', 'Parigha', 'Śiva',
  'Siddha', 'Sādhya', 'Śubha', 'Śukla', 'Brahman',
  'Indra', 'Vaidhṛti',
];

const KARANAS_REPEAT = ['Bava', 'Bālava', 'Kaulava', 'Taitila', 'Gara', 'Vaṇij', 'Viṣṭi'];
const KARANA_SPECIAL = { 0: 'Kiṃstughna', 57: 'Śakuni', 58: 'Catuṣpāda', 59: 'Nāga' };

const VARAS = [
  ['Ravivāra', '星期日', 'Sunday'],
  ['Somavāra', '星期一', 'Monday'],
  ['Maṅgalavāra', '星期二', 'Tuesday'],
  ['Budhavāra', '星期三', 'Wednesday'],
  ['Guruvāra', '星期四', 'Thursday'],
  ['Śukravāra', '星期五', 'Friday'],
  ['Śanivāra', '星期六', 'Saturday'],
];

const PLANETS = [
  ['sun', '太阳', 'Sūrya', Astronomy.Body.Sun],
  ['moon', '太阴', 'Candra', Astronomy.Body.Moon],
  ['mercury', '水星', 'Budha', Astronomy.Body.Mercury],
  ['venus', '金星', 'Śukra', Astronomy.Body.Venus],
  ['earth', '地球', 'Pṛthivī', Astronomy.Body.Earth],
  ['mars', '火星', 'Maṅgala', Astronomy.Body.Mars],
  ['jupiter', '木星', 'Guru', Astronomy.Body.Jupiter],
  ['saturn', '土星', 'Śani', Astronomy.Body.Saturn],
  ['uranus', '天王星', 'Uranus', Astronomy.Body.Uranus],
  ['neptune', '海王星', 'Neptune', Astronomy.Body.Neptune],
];

export function norm360(x) {
  const y = x % 360;
  return y < 0 ? y + 360 : y;
}

export function dms(deg) {
  const sign = deg < 0 ? '-' : '';
  deg = Math.abs(deg);
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = (deg - d - m / 60) * 3600;
  return `${sign}${d}°${String(m).padStart(2, '0')}′${s.toFixed(2).padStart(5, '0')}″`;
}

export function lahiriAyanamsa(jdTt) {
  const t0 = 2435553.5;
  const a0 = 23.25;
  const precLon = (jd) => {
    const T = (jd - 2451545.0) / 36525.0;
    const as_ = (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T ** 3
      - 0.000023857 * T ** 4 - 0.0000000383 * T ** 5);
    return as_ / 3600.0;
  };
  return norm360(a0 + precLon(jdTt) - precLon(t0));
}

export function obliquityIau2006(jdTt) {
  const T = (jdTt - 2451545.0) / 36525.0;
  return (23.43927944444444
    - 0.01301021361111111 * T
    - 5.086111111111111e-8 * T * T
    + 5.565e-7 * T ** 3);
}

function karanaName(index) {
  if (Object.prototype.hasOwnProperty.call(KARANA_SPECIAL, index)) return KARANA_SPECIAL[index];
  if (index >= 1 && index <= 56) return KARANAS_REPEAT[(index - 1) % 7];
  return KARANA_SPECIAL[index] || '?';
}

function tithiPack(elong) {
  const raw = norm360(elong) / 12.0;
  const idx = Math.floor(raw);
  const frac = raw - idx;
  const n = idx + 1;
  let paksha, paksha_zh, name;
  if (n <= 15) {
    paksha = 'Śukla';
    paksha_zh = '白分';
    name = n < 15 ? TITHI_NAMES[n - 1] : TITHI_NAMES[14];
  } else {
    paksha = 'Kṛṣṇa';
    paksha_zh = '黑分';
    const k = n - 15;
    name = k === 15 ? KRISHNA_15 : TITHI_NAMES[k - 1];
  }
  return { number: n, name, paksha, paksha_zh, fraction: frac, label: `${n}  ${paksha} ${name}` };
}

function sectorPack(lon, names, width) {
  const raw = norm360(lon) / width;
  let idx = Math.floor(raw);
  const frac = raw - idx;
  if (idx >= names.length) idx = names.length - 1;
  const entry = names[idx];
  const name = Array.isArray(entry) ? entry[0] : entry;
  const zh = Array.isArray(entry) && entry.length > 1 ? entry[1] : '';
  const out = { index: idx + 1, name, fraction: frac, longitude: norm360(lon) };
  if (zh) out.name_zh = zh;
  if (width >= 20) {
    out.label = name;
  } else {
    out.pada = Math.floor(frac * 4) + 1;
    out.label = `${name}  pāda ${out.pada}`;
  }
  return out;
}

function sakaNational(dtLocal) {
  const y = dtLocal.year, m = dtLocal.month, d = dtLocal.day;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const newyearDay = leap ? 21 : 22;
  const after = m > 3 || (m === 3 && d >= newyearDay);
  const saka = after ? y - 78 : y - 79;
  const vikram = saka + 135;
  return { saka, vikram, era: 'Śaka', label: `Śaka ${saka}` };
}

/** Interpret wall-clock y-m-d H:M:S in an IANA time zone as a UTC Date. */
export function zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const asUtc = (ms) => {
    const p = {};
    for (const x of dtf.formatToParts(new Date(ms))) p[x.type] = x.value;
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  };
  let utc = naive - (asUtc(naive) - naive);
  utc = naive - (asUtc(utc) - utc);
  return new Date(utc);
}

export function formatInZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const p = {};
  for (const x of dtf.formatToParts(date)) p[x.type] = x.value;
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour, minute: +p.minute, second: +p.second,
    isoDate: `${p.year}-${p.month}-${p.day}`,
    isoTime: `${p.hour}:${p.minute}:${p.second}`,
  };
}

function isoOffset(date, timeZone) {
  const wall = formatInZone(date, timeZone);
  const wallUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const offMin = Math.round((wallUtc - date.getTime()) / 60000);
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

function apparentEcliptic(body, time) {
  const vec = Astronomy.GeoVector(body, time, true);
  const ecl = Astronomy.Ecliptic(vec);
  const eq = Astronomy.EquatorFromVector(vec);
  const dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  return {
    lon: ecl.elon,
    lat: ecl.elat,
    dist,
    ra: eq.ra * 15, // hours -> degrees
    dec: eq.dec,
  };
}

function helioEcliptic(body, time) {
  if (body === Astronomy.Body.Sun) return { lon: 0, lat: 0, dist: 0 };
  const hv = Astronomy.HelioVector(body, time);
  const ecl = Astronomy.Ecliptic(hv);
  const dist = Math.sqrt(hv.x * hv.x + hv.y * hv.y + hv.z * hv.z);
  return { lon: ecl.elon, lat: ecl.elat, dist };
}

function findSunrises(lat, lon, aroundUtc) {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const start = new Date(aroundUtc.getTime() - 36 * 3600 * 1000);
  const rises = [];
  let cursor = start;
  for (let i = 0; i < 6; i++) {
    const ev = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, cursor, 2.2);
    if (!ev) break;
    const d = ev.date;
    if (rises.length && Math.abs(d.getTime() - rises[rises.length - 1].getTime()) < 1000) break;
    rises.push(d);
    cursor = new Date(d.getTime() + 60 * 1000);
  }
  return rises;
}

/**
 * @param {object} opts
 * @param {Date} opts.utc  instant (UTC Date)
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {string} opts.place
 * @param {string} [opts.timeZone='Asia/Shanghai']
 */
export function compute({ utc, lat, lon, place, timeZone = 'Asia/Shanghai' }) {
  const time = Astronomy.MakeTime(utc);
  // astronomy-engine stores tt/ut as days since J2000, not full Julian Day.
  const jdTt = time.tt + 2451545.0;
  const jdUt = time.ut + 2451545.0;
  const ayan = lahiriAyanamsa(jdTt);
  const eps = obliquityIau2006(jdTt);

  const sun = apparentEcliptic(Astronomy.Body.Sun, time);
  const moon = apparentEcliptic(Astronomy.Body.Moon, time);
  const sunSid = norm360(sun.lon - ayan);
  const moonSid = norm360(moon.lon - ayan);
  const elong = norm360(moonSid - sunSid);

  const tithi = tithiPack(elong);
  const nak = sectorPack(moonSid, NAKSHATRAS, 360 / 27);
  const yoga = sectorPack(norm360(sunSid + moonSid), YOGAS.map((n) => [n, '']), 360 / 27);
  const kRaw = norm360(elong) / 6;
  const kIdx = Math.floor(kRaw);
  const karana = {
    index: kIdx + 1,
    name: karanaName(kIdx),
    fraction: kRaw - kIdx,
    label: karanaName(kIdx),
  };

  const wall = formatInZone(utc, timeZone);
  const offset = isoOffset(utc, timeZone);
  const isoLocal = `${wall.isoDate}T${wall.isoTime}${offset}`;

  const rises = findSunrises(lat, lon, utc);
  let prevRise = null, nextRise = null;
  for (const d of rises) {
    if (d.getTime() <= utc.getTime()) prevRise = d;
    else if (!nextRise) nextRise = d;
  }
  const riseForVara = prevRise || utc;
  const riseLocal = formatInZone(riseForVara, timeZone);
  const riseDate = new Date(Date.UTC(riseLocal.year, riseLocal.month - 1, riseLocal.day));
  const wd = riseDate.getUTCDay(); // Sun=0, based on local calendar date of sunrise
  // weekday of the local sunrise date
  const riseWeekday = new Date(`${riseLocal.isoDate}T12:00:00${offset}`).getUTCDay
    ? (function () {
        // Use the local Y-M-D of sunrise; JS Date with noon UTC is wrong near zone edges.
        // Civil weekday of (year,month,day) in Gregorian:
        const y = riseLocal.year, m = riseLocal.month, d = riseLocal.day;
        const t = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        // This is weekday of that civil date as if UTC, which equals the weekday of that Y-M-D.
        return t.getUTCDay();
      }())
    : wd;

  const civilParts = wall;
  const civilDate = new Date(Date.UTC(civilParts.year, civilParts.month - 1, civilParts.day, 12, 0, 0));
  const civilWd = civilDate.getUTCDay(); // Sun=0
  const beforeSunrise = civilWd !== riseWeekday;
  const note = beforeSunrise
    ? `按日出起算 · 日出前仍属${VARAS[riseWeekday][1]}`
    : '按日出起算';

  const pad = (n) => String(n).padStart(2, '0');
  const isoFromParts = (p, off) =>
    `${p.isoDate}T${p.isoTime}${off || isoOffset(riseForVara, timeZone)}`;

  const vara = {
    index: riseWeekday + 1,
    name: VARAS[riseWeekday][0],
    name_zh: VARAS[riseWeekday][1],
    name_en: VARAS[riseWeekday][2],
    label: VARAS[riseWeekday][0],
    convention: 'sunrise',
    sunrise_local: isoFromParts(riseLocal, isoOffset(riseForVara, timeZone)),
    next_sunrise_local: nextRise ? isoFromParts(formatInZone(nextRise, timeZone), isoOffset(nextRise, timeZone)) : null,
    civil_weekday: VARAS[civilWd][1],
    before_sunrise: beforeSunrise,
    note,
  };

  const era = sakaNational(wall);
  const sunRasi = sectorPack(sunSid, RASIS, 30);
  const moonRasi = sectorPack(moonSid, RASIS, 30);

  const T = (jdTt - 2451545.0) / 36525.0;
  const nodeTrop = norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T);
  const rahuSid = norm360(nodeTrop - ayan);
  const ketuSid = norm360(rahuSid + 180);

  const bodies = [];
  for (const [key, zh, sa, body] of PLANETS) {
    if (key === 'earth') {
      const h = helioEcliptic(Astronomy.Body.Earth, time);
      bodies.push({
        id: key, name_zh: zh, name_sa: sa,
        geo_lon: 0, geo_lat: 0, geo_ra: 0, geo_dec: 0, geo_dist: 0, sidereal_lon: 0,
        helio_lon: h.lon, helio_lat: h.lat, helio_dist: h.dist,
      });
      continue;
    }
    const g = apparentEcliptic(body, time);
    let h;
    if (key === 'moon') h = helioEcliptic(Astronomy.Body.Earth, time);
    else if (key === 'sun') h = { lon: 0, lat: 0, dist: 0 };
    else h = helioEcliptic(body, time);
    const sid = norm360(g.lon - ayan);
    const packR = sectorPack(sid, RASIS, 30);
    const packN = sectorPack(sid, NAKSHATRAS, 360 / 27);
    bodies.push({
      id: key, name_zh: zh, name_sa: sa,
      geo_lon: g.lon, geo_lat: g.lat, geo_ra: g.ra, geo_dec: g.dec,
      geo_dist: g.dist, sidereal_lon: sid,
      helio_lon: h.lon, helio_lat: h.lat, helio_dist: h.dist,
      rasi: packR.name, nakshatra: packN.name, sidereal_dms: dms(sid),
    });
  }
  for (const [nid, zh, sa, sid, trop] of [
    ['rahu', '罗睺', 'Rāhu', rahuSid, nodeTrop],
    ['ketu', '计都', 'Ketu', ketuSid, norm360(nodeTrop + 180)],
  ]) {
    bodies.push({
      id: nid, name_zh: zh, name_sa: sa,
      geo_lon: trop, geo_lat: 0, geo_ra: null, geo_dec: null, geo_dist: null,
      sidereal_lon: sid, helio_lon: null, helio_lat: null, helio_dist: null,
      sidereal_dms: dms(sid),
    });
  }

  return {
    datetime_local: isoLocal,
    datetime_utc: utc.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    timezone: timeZone,
    place,
    latitude: lat,
    longitude: lon,
    jd_tt: jdTt,
    jd_ut: jdUt,
    obliquity: eps,
    ayanamsa: { name: 'Lahiri (Chitrapaksha)', value: ayan, dms: dms(ayan) },
    tithi,
    nakshatra: nak,
    yoga: { index: yoga.index, name: yoga.name, fraction: yoga.fraction, longitude: yoga.longitude, pada: yoga.pada, label: yoga.label },
    karana,
    vara,
    era,
    sun: {
      tropical_lon: sun.lon, sidereal_lon: sunSid,
      dms: dms(sunSid), rasi: sunRasi, latitude: sun.lat,
    },
    moon: {
      tropical_lon: moon.lon, sidereal_lon: moonSid,
      dms: dms(moonSid), rasi: moonRasi, nakshatra: nak, latitude: moon.lat,
    },
    bodies,
    ephemeris: 'astronomy-engine (VSOP87 / ILE) · Lahiri as in generate.py',
  };
}

export function computeFromInputs({ date, time, timeZone, lat, lon, place }) {
  const [y, mo, d] = date.split('-').map(Number);
  const [hh, mm, ss] = (time || '00:00:00').split(':').map(Number);
  const utc = zonedTimeToUtc(y, mo, d, hh || 0, mm || 0, ss || 0, timeZone || 'Asia/Shanghai');
  return compute({ utc, lat: +lat, lon: +lon, place, timeZone: timeZone || 'Asia/Shanghai' });
}
