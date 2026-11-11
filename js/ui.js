const placeInput = document.getElementById('place-input');
const suggest = document.getElementById('place-suggest');
const inpLat = document.getElementById('inp-lat');
const inpLon = document.getElementById('inp-lon');
const inpDate = document.getElementById('inp-date');
const inpTime = document.getElementById('inp-time');
const inpTz = document.getElementById('inp-tz');
const toastEl = document.getElementById('toast');

let cities = [];
let chosenPlace = '北京';
let suggestItems = [];
let activeIdx = -1;

function toast(msg, ms = 2400) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('on'), ms);
}

function loadCities() {
  return fetch('data/cities.json').then((r) => r.json()).then((d) => { cities = d; });
}

function norm(s) {
  return (s || '').toLowerCase().replace(/\s+/g, '');
}

function searchCities(q) {
  q = (q || '').trim();
  if (!q) return cities.slice(0, 8);
  // "37.33, 116.57" or "37.33 116.57"
  const m = q.match(/^(-?\d+(\.\d+)?)\s*[,，\s]\s*(-?\d+(\.\d+)?)$/);
  if (m) {
    return [{ n: '自定义经纬度', f: `北纬 ${m[1]}°  东经 ${m[3]}°`, a: +m[1], o: +m[3], custom: true }];
  }
  const nq = norm(q);
  const scored = [];
  for (const c of cities) {
    const hay = `${c.n} ${c.f} ${c.p || ''} ${c.alias || ''}`;
    const idx = hay.indexOf(q);
    const idx2 = norm(hay).indexOf(nq);
    if (idx < 0 && idx2 < 0) continue;
    let s = 0;
    if (c.n === q || c.n === q + '市' || c.n === q + '区') s += 100;
    if (c.n.startsWith(q)) s += 40;
    if ((c.alias || '').includes(q)) s += 30;
    s += Math.max(0, 20 - Math.max(idx, idx2));
    scored.push([s, c]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, 18).map((x) => x[1]);
}

function renderSuggest(list) {
  suggestItems = list;
  activeIdx = list.length ? 0 : -1;
  if (!list.length) { suggest.classList.remove('on'); suggest.innerHTML = ''; return; }
  suggest.innerHTML = list.map((c, i) =>
    `<div data-i="${i}" class="${i === activeIdx ? 'active' : ''}"><b>${c.n}</b><small>${c.f}　${c.a.toFixed(3)}°N ${c.o.toFixed(3)}°E</small></div>`
  ).join('');
  suggest.classList.add('on');
}

function applyCity(c) {
  chosenPlace = c.custom ? `${c.a}°N, ${c.o}°E` : (c.n || c.f);
  placeInput.value = c.f || c.n;
  inpLat.value = Number(c.a).toFixed(4);
  inpLon.value = Number(c.o).toFixed(4);
  suggest.classList.remove('on');
}

placeInput.addEventListener('input', () => renderSuggest(searchCities(placeInput.value)));
placeInput.addEventListener('focus', () => renderSuggest(searchCities(placeInput.value)));
placeInput.addEventListener('keydown', (e) => {
  if (!suggest.classList.contains('on')) return;
  if (e.key === 'ArrowDown') { activeIdx = Math.min(suggestItems.length - 1, activeIdx + 1); }
  else if (e.key === 'ArrowUp') { activeIdx = Math.max(0, activeIdx - 1); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIdx >= 0) applyCity(suggestItems[activeIdx]);
    return;
  } else if (e.key === 'Escape') { suggest.classList.remove('on'); return; }
  else return;
  [...suggest.children].forEach((el, i) => el.classList.toggle('active', i === activeIdx));
  e.preventDefault();
});
suggest.addEventListener('mousedown', (e) => {
  const row = e.target.closest('div[data-i]');
  if (row) applyCity(suggestItems[+row.dataset.i]);
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.field.place')) suggest.classList.remove('on');
});

function currentInput() {
  let time = (inpTime.value || '00:00:00').trim().replace(/：/g, ':');
  if (/^\d{1,2}:\d{2}$/.test(time)) time += ':00';
  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(time)) throw new Error('时间请写成 14:30:00 这样的24小时格式');
  const [hh, mm, ss] = time.split(':').map((x) => x.padStart(2, '0'));
  if (+hh>23 || +mm>59 || +ss>59) throw new Error('时间超出范围');
  time = `${hh}:${mm}:${ss}`;
  inpTime.value = time;
  const lat = parseFloat(inpLat.value);
  const lon = parseFloat(inpLon.value);
  if (!inpDate.value) throw new Error('请填写日期');
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('纬度要在 -90 到 90 之间');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('经度要在 -180 到 180 之间');
  return {
    date: inpDate.value,
    time,
    timeZone: inpTz.value,
    lat, lon,
    place: chosenPlace || placeInput.value || '自定义地点',
  };
}

function doGenerate() {
  if (!window.Starchart) { toast('星空还在加载，请稍候'); return; }
  try {
    const input = currentInput();
    const chart = window.Starchart.applyInput(input);
    toast(`已生成　${chart.datetime_local.slice(0, 19).replace('T', ' ')}　${chart.place}`);
  } catch (err) {
    console.error(err);
    toast(err.message || String(err));
  }
}

document.getElementById('btn-generate').addEventListener('click', doGenerate);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doGenerate();
});

function defaultShotName() {
  try {
    const c = window.Starchart && window.Starchart.getChart();
    const d = (c ? c.datetime_local : inpDate.value + 'T' + inpTime.value).slice(0, 19).replace(/[:T]/g, '-');
    const p = (c && c.place) || chosenPlace || '星空图';
    return `印占星空图_${d}_${p}.png`;
  } catch { return '印占星空图.png'; }
}

async function saveShot() {
  document.documentElement.classList.add('snapshot');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    if (window.desktop && window.desktop.saveScreenshot) {
      const res = await window.desktop.saveScreenshot(defaultShotName());
      if (res && res.ok) toast('截图已保存');
      else if (res && res.canceled) { /* noop */ }
      else toast((res && res.error) || '保存失败');
    } else {
      // browser fallback
      const canvas = document.querySelector('#stage canvas');
      if (!canvas) throw new Error('还没有画面');
      const a = document.createElement('a');
      a.download = defaultShotName();
      a.href = canvas.toDataURL('image/png');
      a.click();
      toast('截图已下载');
    }
  } catch (err) {
    console.error(err);
    toast('保存失败：' + (err.message || err));
  } finally {
    document.documentElement.classList.remove('snapshot');
  }
}
document.getElementById('btn-save').addEventListener('click', saveShot);

function syncToolbarOffset() {
  const tb = document.getElementById('toolbar');
  if (!tb) return;
  const h = Math.ceil(tb.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--toolbar-h', `${h}px`);
}
syncToolbarOffset();
window.addEventListener('resize', syncToolbarOffset);
if (window.ResizeObserver) {
  const tb = document.getElementById('toolbar');
  if (tb) new ResizeObserver(syncToolbarOffset).observe(tb);
}

const toolbarToggle = document.getElementById('btn-toolbar-toggle');
toolbarToggle?.addEventListener('click', () => {
  const open = document.body.classList.toggle('toolbar-open');
  toolbarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  toolbarToggle.textContent = open ? '收起' : '设置';
  requestAnimationFrame(syncToolbarOffset);
});

const panel = document.getElementById('panel');
const panelToggle = document.getElementById('btn-panel-toggle');
panelToggle?.addEventListener('click', () => {
  if (window.matchMedia('(min-width: 821px)').matches) return;
  const open = panel.classList.toggle('open');
  panelToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

function setPlace(name) {
  if (name) chosenPlace = name;
}

loadCities().catch((e) => console.warn('cities', e));

window.StarchartUI = { currentInput, doGenerate, saveShot, toast, setPlace };
