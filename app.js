(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = prefersReduced.matches;
  try { if (localStorage.getItem('kings-motion') === 'off') paused = true; } catch (_) {}
  const motion = $('.motion-toggle');
  function syncMotion() { motion.setAttribute('aria-pressed', String(paused)); motion.title = paused ? 'Resume decorative motion' : 'Pause decorative motion'; $('.motion-icon').textContent = paused ? '▷' : 'Ⅱ'; document.body.classList.toggle('paused', paused); }
  syncMotion();
  motion.addEventListener('click', () => { paused = !paused; syncMotion(); try { localStorage.setItem('kings-motion', paused ? 'off' : 'on'); } catch (_) {} });
  prefersReduced.addEventListener('change', e => { paused = e.matches; syncMotion(); });
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } }), { threshold: .06 });
  $$('.reveal').forEach(el => revealObserver.observe(el));
  document.body.classList.add('js-ready');
  const chapters = $$('.chapter'), navLinks = $$('.chapter-nav a');
  let scrollQueued = false;
  function updateScroll() {
    let current = chapters[0].id;
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top < innerHeight * .4) current = chapter.id;
    navLinks.forEach(a => { const active = a.hash === '#' + current; a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    const total = document.documentElement.scrollHeight - innerHeight;
    $('.reading-progress span').style.width = Math.max(0, Math.min(100, (scrollY / Math.max(1, total)) * 100)) + '%'; scrollQueued = false;
  }
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  addEventListener('resize', updateScroll); updateScroll();
  const jerseySpace = $('#jersey-space'), tilt = $('.jersey-tilt');
  jerseySpace.addEventListener('pointermove', event => {
    if (paused || event.pointerType === 'touch') return;
    const r = jerseySpace.getBoundingClientRect(), x = (event.clientX - r.left) / r.width - .5, y = (event.clientY - r.top) / r.height - .5;
    tilt.style.transform = `rotateZ(${8 + x * 5}deg) rotateY(${x * 22}deg) rotateX(${-y * 12}deg)`;
  });
  jerseySpace.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
  const jerseyDialog = $('#jersey-dialog'), sourcesDialog = $('#sources-dialog'); let dialogOpener;
  function openDialog(dialog, opener) { dialogOpener = opener; dialog.showModal(); }
  $$('.jersey-trigger').forEach(b => b.addEventListener('click', () => openDialog(jerseyDialog, b)));
  $('#sources-trigger').addEventListener('click', e => openDialog(sourcesDialog, e.currentTarget));
  $$('dialog').forEach(dialog => {
    $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { if (dialogOpener) dialogOpener.focus(); });
  });
  $('#brand-input').addEventListener('input', e => { $('#sponsor-name').textContent = e.target.value.trim() || 'YOUR LOGO HERE'; });
  $$('[data-kit]').forEach(button => button.addEventListener('click', () => {
    const front = button.dataset.kit === 'front'; $('#kit-artwork').src = `assets/kit-original-${front ? 'front' : 'back'}.png`;
    $('#kit-artwork').alt = `Original purple Kings FC home jersey ${front ? 'front' : 'back'} from the supplied range plan`;
    $('#sponsor-placement').hidden = !front; $('#kit-flat').style.transform = `perspective(1000px) rotateY(${front ? -8 : 8}deg)`;
    $$('[data-kit]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  }));
  const tabs = $$('[role="tab"]');
  function selectTab(tab) { tabs.forEach(b => { const active = b === tab; b.setAttribute('aria-selected', String(active)); b.tabIndex = active ? 0 : -1; $('#' + b.getAttribute('aria-controls')).hidden = !active; }); updateScroll(); }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => { let j; if (event.key === 'ArrowRight') j = (i + 1) % tabs.length; else if (event.key === 'ArrowLeft') j = (i + tabs.length - 1) % tabs.length; else if (event.key === 'Home') j = 0; else if (event.key === 'End') j = tabs.length - 1; if (j !== undefined) { event.preventDefault(); selectTab(tabs[j]); tabs[j].focus(); } });
  });
  // Projected 3D geographic network. It represents project connections, not reach.
  const canvas = $('#globe'), ctx = canvas.getContext('2d'); if (!ctx) return;
  const radians = Math.PI / 180;
  const locations = [
    { name: 'SACRAMENTO', lat: 38.5816, lon: -121.4944, key: 'sacramento' }, { name: 'SEOUL', lat: 37.5665, lon: 126.978, key: 'seoul' },
    { name: 'PARIS', lat: 48.8566, lon: 2.3522 }, { name: 'TOKYO', lat: 35.6762, lon: 139.6503 },
    { name: 'BANGKOK', lat: 13.7563, lon: 100.5018 }, { name: 'QINHUANGDAO', lat: 39.9354, lon: 119.6005 }
  ];
  const globeText = {
    sacramento: ['38.5816° N / 121.4944° W', 'The Kings, Street Soccer USA, and the community at the center of it all.'],
    seoul: ['37.5665° N / 126.9780° E', 'Nivelcrack’s home. Football, fashion, and creative culture, connected internationally.'],
    global: ['ONE GAME / MANY COMMUNITIES', 'Paris. Tokyo. Bangkok. Qinhuangdao. Real cities in Nivelcrack’s history of international activations.']
  };
  let width = 600, height = 600, rotation = 122 * radians, targetRotation = rotation, selected = 'sacramento', visible = false, last = 0;
  function resizeGlobe() { const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  new ResizeObserver(resizeGlobe).observe(canvas);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  $$('[data-globe]').forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.globe; const dest = selected === 'sacramento' ? 121.4944 : selected === 'seoul' ? -126.978 : -70; targetRotation = dest * radians;
    while (targetRotation - rotation > Math.PI) targetRotation -= 2 * Math.PI;
    while (targetRotation - rotation < -Math.PI) targetRotation += 2 * Math.PI;
    if (paused) rotation = targetRotation;
    $$('[data-globe]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    $('#globe-place').textContent = globeText[selected][0]; $('#globe-story').textContent = globeText[selected][1]; drawGlobe(0);
  }));
  function xyz(lat, lon) { const a = lat * radians, b = lon * radians; return [Math.cos(a) * Math.sin(b), -Math.sin(a), Math.cos(a) * Math.cos(b)]; }
  function projected(point) { const [x, y, z] = point; const a = x * Math.cos(rotation) + z * Math.sin(rotation), b = -x * Math.sin(rotation) + z * Math.cos(rotation), tilt = -.16; const py = y * Math.cos(tilt) - b * Math.sin(tilt), pz = y * Math.sin(tilt) + b * Math.cos(tilt); const radius = Math.min(width * .42, height * .40), perspective = 2.9 / (2.9 - pz * .15); return [width / 2 + a * radius * perspective, height / 2 + py * radius * perspective, pz]; }
  function line(points, color, weight = .6) { ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.beginPath(); let drawing = false; for (const pt of points) { const p = projected(pt); if (p[2] > -.03) { if (drawing) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); drawing = true; } else drawing = false; } ctx.stroke(); }
  const latitudes = [], longitudes = [];
  for (let lat = -75; lat <= 75; lat += 15) { const points = []; for (let lon = -180; lon <= 180; lon += 3) points.push(xyz(lat, lon)); latitudes.push(points); }
  for (let lon = -180; lon < 180; lon += 15) { const points = []; for (let lat = -90; lat <= 90; lat += 3) points.push(xyz(lat, lon)); longitudes.push(points); }
  const dots = [], goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 1350; i++) { const y = 1 - (i / 1349) * 2, r = Math.sqrt(1 - y * y), t = goldenAngle * i; dots.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
  function drawGlobe(time) {
    ctx.clearRect(0, 0, width, height); const radius = Math.min(width * .42, height * .40);
    const gradient = ctx.createRadialGradient(width / 2, height / 2, radius * .2, width / 2, height / 2, radius * 1.3); gradient.addColorStop(0, 'rgba(89,45,133,.11)'); gradient.addColorStop(1, 'rgba(89,45,133,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(185,150,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI); ctx.stroke();
    latitudes.forEach(p => line(p, 'rgba(185,150,255,.19)')); longitudes.forEach(p => line(p, 'rgba(185,150,255,.19)'));
    for (const point of dots) { const p = projected(point); if (p[2] < 0) continue; ctx.fillStyle = `rgba(185,150,255,${.15 + p[2] * .35})`; ctx.beginPath(); ctx.arc(p[0], p[1], .9 + p[2] * .6, 0, Math.PI * 2); ctx.fill(); }
    const from = xyz(locations[0].lat, locations[0].lon);
    locations.slice(1).forEach(loc => { const to = xyz(loc.lat, loc.lon), points = []; for (let j = 0; j <= 60; j++) { const t = j / 60, q = from.map((v, i) => v * (1 - t) + to[i] * t), length = Math.hypot(...q), lift = 1 + Math.sin(Math.PI * t) * .28; points.push(q.map(v => v / length * lift)); } line(points, 'rgba(223,255,0,.5)', .8); });
    locations.forEach((loc, i) => { const p = projected(xyz(loc.lat, loc.lon)); if (p[2] < .02) return; const active = loc.key === selected; ctx.fillStyle = active ? '#dfff00' : '#f2eee5'; ctx.beginPath(); ctx.arc(p[0], p[1], active ? 5 : 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = active ? 'rgba(223,255,0,.4)' : 'rgba(242,238,229,.25)'; ctx.beginPath(); ctx.arc(p[0], p[1], active ? 12 + (paused ? 0 : Math.sin(time / 500) * 2) : 8, 0, Math.PI * 2); ctx.stroke(); if (active || (selected === 'global' && i !== 5 && i !== 3) || (selected === 'seoul' && i === 3)) { ctx.font = `11px "Martian Mono",monospace`; ctx.fillStyle = active ? '#dfff00' : '#f2eee5'; const textWidth = ctx.measureText(loc.name).width; const tx = p[0] + 15 + textWidth > width ? p[0] - textWidth - 15 : p[0] + 15; ctx.fillText(loc.name, tx, p[1] + (i === 3 ? 20 : 4)); } });
  }
  function animate(time) { requestAnimationFrame(animate); if (!visible || time - last < 32) return; last = time; if (!paused) { rotation += (targetRotation - rotation) * .06; if (selected === 'global') targetRotation += .002; } drawGlobe(time); }
  resizeGlobe(); drawGlobe(0); requestAnimationFrame(animate);
})();
