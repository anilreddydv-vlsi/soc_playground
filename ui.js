/* SoC Playground: drag and drop helper and the SoC diagram used on every page */
window.SOCUI = (() => {
  const L = window.LAB;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  /* Pointer-based drag and drop: works with mouse, pen and touch.
     make(el, {data, accept(zoneEl, data), drop(zoneEl, data), click(data), placed}) */
  let active = null;
  function make(el, o) {
    el.addEventListener('pointerdown', e => {
      if (e.button > 0 || el.getAttribute('aria-disabled') === 'true') return;
      active = {el, o, x: e.clientX, y: e.clientY, id: e.pointerId, drag: false, ghost: null, zone: null};
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      const a = active; if (!a || a.el !== el || a.id !== e.pointerId) return;
      if (!a.drag && Math.hypot(e.clientX - a.x, e.clientY - a.y) > 7) start(a);
      if (!a.drag) return;
      e.preventDefault();
      a.cx = e.clientX; a.cy = e.clientY;
      a.ghost.style.left = e.clientX + 'px'; a.ghost.style.top = e.clientY + 'px';
      hover(a);
    });
    const end = (e, cancel) => {
      const a = active; if (!a || a.el !== el) return;
      active = null;
      if (a.drag) {
        a.ghost.remove(); document.body.classList.remove('dragging', 'dragging-placed');
        for (const z of document.querySelectorAll('[data-zone]')) z.classList.remove('ok', 'no', 'over');
        if (!cancel && a.zone && (!o.accept || o.accept(a.zone, o.data))) o.drop(a.zone, o.data);
        else if (!cancel && a.zone && o.reject) o.reject(a.zone, o.data);
      } else if (!cancel && o.click) o.click(o.data);
    };
    el.addEventListener('pointerup', e => end(e, false));
    el.addEventListener('pointercancel', e => end(e, true));
    el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && o.click && el.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); o.click(o.data); } });
  }
  function hover(a) {
    const hit = document.elementFromPoint(a.cx, a.cy);
    const z = hit && hit.closest('[data-zone]');
    if (a.zone && a.zone !== z) a.zone.classList.remove('over');
    a.zone = z; if (z) z.classList.add('over');
  }
  /* keep scrolling while the finger or mouse rests near the top or bottom edge */
  function edgeScroll() {
    const a = active; if (!a || !a.drag) return;
    const edge = Math.min(110, innerHeight * 0.18);
    let v = 0;
    if (a.cy < edge) v = -Math.ceil(18 * (1 - a.cy / edge));
    else if (a.cy > innerHeight - edge) v = Math.ceil(18 * (1 - (innerHeight - a.cy) / edge));
    if (v) { scrollBy(0, v); hover(a); }
    requestAnimationFrame(edgeScroll);
  }
  function start(a) {
    a.drag = true; a.cx = a.x; a.cy = a.y; requestAnimationFrame(edgeScroll);
    const g = a.el.cloneNode(true); g.classList.add('ghost'); g.removeAttribute('id'); g.setAttribute('aria-hidden', 'true');
    document.body.appendChild(g); a.ghost = g;
    document.body.classList.add('dragging'); if (a.o.placed) document.body.classList.add('dragging-placed');
    for (const z of document.querySelectorAll('[data-zone]')) z.classList.add(!a.o.accept || a.o.accept(z, a.o.data) ? 'ok' : 'no');
  }

  /* ---------- SoC diagram ---------- */
  const T = L.TYPES;
  function card(b, d, o) {
    const t = T[b.t], bugged = o.bugs && o.bugs.has(b.id);
    let info = '';
    if (t.k === 'mem') info = `${L.KB(b.p.size)}${b.t === 'ddr' ? ` · latency ${b.p.lat}` : b.t === 'sram' ? ` · wait ${b.p.wait}` : ''}`;
    else if (t.k === 'per') info = `${L.regsOf(b).length} registers · wait ${L.waitOf(b)}`;
    else if (b.t === 'bridge') info = 'APB window 64 KB';
    else if (b.t === 'cpu') info = 'single reads/writes';
    else if (b.t === 'dma') info = 'bursts · regs at ' + L.HA(b.base);
    const base = b.base != null && b.t !== 'dma' ? `<code>${L.HA(b.base)}</code>` : '';
    return `<div class="pb${b.p && b.p.off ? ' off' : ''}${o.err && o.err.has(b.id) ? ' err' : ''}${o.sel === b.id ? ' sel' : ''}" role="button" tabindex="0" data-id="${b.id}" style="--c:${t.c}" aria-label="${esc(b.name)}${o.edit ? ', open settings, or drag to remove' : ''}">${bugged ? '<span class="bugdot" title="bug injected">🐞</span>' : ''}<b>${esc(b.name)}${b.p && b.p.off ? ' · OFF' : ''}</b>${base}<small>${info}</small></div>`;
  }
  function diagram(host, d, o = {}) {
    const by = k => d.blocks.filter(b => T[b.t].k === k);
    const masters = by('master'), axi = d.blocks.filter(b => T[b.t].k === 'mem' || T[b.t].k === 'bridge'), pers = by('per');
    const dma = d.blocks.find(b => b.t === 'dma'), bridge = d.blocks.find(b => b.t === 'bridge');
    const zone = (k, title, sub, list, extra = '') => `<div class="zone" data-zone="${k}"><h4>${title}<span>${sub}</span></h4><div class="slots">${list.map(b => card(b, d, o)).join('')}${extra}${list.length || extra ? '' : `<div class="empty">${o.edit ? 'Drop blocks here' : 'Empty'}</div>`}</div></div>`;
    const dmaReg = dma ? `<div class="pb ghostreg" style="--c:${T.dma.c}"><b>DMA config</b><code>${L.HA(dma.base)}</code><small>5 registers · set up the DMA</small></div>` : '';
    host.innerHTML = `<div class="chip2"><span class="tag">YOUR SoC</span>
      ${zone('master', 'Masters', 'start transfers · CPU, DMA', masters)}
      <div class="busbar" id="${o.pre || ''}ic">AXI interconnect<small>arbiter (${d.arb === 'fixed' ? 'fixed priority, CPU first' : 'round robin'}) · address decoder · unmapped → DECERR</small></div>
      ${zone('mem', 'AXI slaves', 'memories and the bridge', axi)}
      <div class="busbar apb${bridge ? '' : ' off'}" id="${o.pre || ''}apb">${bridge ? 'APB bus' : 'No APB bus yet'}<small>${bridge ? 'behind the bridge · ' + L.HA(L.BRIDGE_BASE) + ' to ' + L.HA(L.BRIDGE_BASE + L.BRIDGE_SIZE - 1) + ' · empty slot → SLVERR' : 'drag the AXI→APB bridge into AXI slaves'}</small></div>
      ${zone('per', 'APB peripherals', 'registers, 4 KB each', pers, dmaReg)}
    </div>`;
  }
  const zoneKind = t => ({master: 'master', mem: 'mem', bridge: 'mem', per: 'per'})[T[t].k];
  function highlight(host, tr, d, pre = '') {
    for (const x of host.querySelectorAll('.pb.on,.busbar.on')) x.classList.remove('on');
    if (!tr) return;
    const q = id => host.querySelector(`.pb[data-id="${id}"]`);
    const m = d.blocks.find(b => b.t === (tr.master === 'DMA' ? 'dma' : 'cpu')); if (m && q(m.id)) q(m.id).classList.add('on');
    const ic = host.querySelector('#' + pre + 'ic'); if (ic) ic.classList.add('on');
    if (tr.apb || tr.side === 'apb') { const br = d.blocks.find(b => b.t === 'bridge'); if (br && q(br.id)) q(br.id).classList.add('on'); const ap = host.querySelector('#' + pre + 'apb'); if (ap) ap.classList.add('on'); }
    if (tr.tgt && q(tr.tgt)) q(tr.tgt).classList.add('on');
    if (tr.tgt && d.blocks.find(b => b.id === tr.tgt && b.t === 'dma')) { const g = host.querySelector('.ghostreg'); if (g) g.classList.add('on'); }
  }
  /* banner when the saved design has problems */
  function designBanner(el, d) {
    const c = L.checks(d), errs = c.filter(x => x.lvl === 'err');
    el.innerHTML = errs.length ? `<div class="chk"><div class="err"><b>Your SoC has ${errs.length} problem${errs.length > 1 ? 's' : ''}.</b> ${esc(errs[0].msg)} <a href="build.html">Fix it on the Build page</a>.</div></div>` : '';
    return errs.length;
  }
  /* ---------- final block diagram (SVG with wires) ---------- */
  function blockDiagram(d, title) {
    const by = f => d.blocks.filter(f);
    const masters = by(b => T[b.t].k === 'master');
    const axi = by(b => T[b.t].k === 'mem' || T[b.t].k === 'bridge');
    const dma = d.blocks.find(b => b.t === 'dma'), bridge = d.blocks.find(b => b.t === 'bridge');
    const pers = by(b => T[b.t].k === 'per'); if (dma && bridge) pers.push({...dma, id: 'dmacfg', name: 'DMA config', cfg: true});
    const nA = axi.length + 1, W = Math.max(1200, pers.length * 152 + 80, nA * 190 + 80);
    const F = 'font-family="Inter,system-ui,Segoe UI,Arial,sans-serif"', M = 'font-family="JetBrains Mono,Consolas,monospace"';
    const xs = (n, bw) => { const gap = Math.min(40, (W - 80 - n * bw) / Math.max(1, n - 1)); const tot = n * bw + (n - 1) * gap; return Array.from({length: n}, (_, i) => (W - tot) / 2 + i * (bw + gap)); };
    const bwOf = n => Math.min(200, (W - 80) / n - 14);
    let s = '';
    const lay = {m: {}, a: {}, p: {}, yI: 0, yB: 0};
    const box = (x, y, w, h, c, name, l2, l3, dash) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#0c1424" stroke="${c}" stroke-width="2.5"${dash ? ' stroke-dasharray="7 5"' : ''}/><text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" fill="${c}" font-size="17" font-weight="800" ${F}>${esc(name)}</text>` + (l2 ? `<text x="${x + w / 2}" y="${y + 48}" text-anchor="middle" fill="#e2e8f0" font-size="12.5" ${M}>${esc(l2)}</text>` : '') + (l3 ? `<text x="${x + w / 2}" y="${y + 67}" text-anchor="middle" fill="#94a3b8" font-size="12.5" ${F}>${esc(l3)}</text>` : '');
    const wire = (x1, y1, x2, y2, c = '#4064a3', w = 3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;
    const rng = b => `${L.HA(b.base)} – ${L.HA(b.base + L.sizeOf(b) - 1)}`;
    // title
    s += `<text x="40" y="44" fill="#e7eef9" font-size="24" font-weight="800" ${F}>${esc(title || 'My SoC')}</text><text x="40" y="68" fill="#8fa2c2" font-size="14" ${F}>${d.blocks.length} blocks · AXI interconnect with ${d.arb === 'fixed' ? 'fixed-priority' : 'round-robin'} arbiter${bridge ? ' · APB bus behind the bridge' : ''}</text>`;
    // masters
    const yM = 100, hM = 80, bwM = 210, mx = xs(Math.max(1, masters.length), bwM);
    const yI = 230, hI = 54, yA = 340, hA = 84, yP = 520, hP = 84, yB = 470;
    masters.forEach((b, i) => { const x = mx[i]; lay.m[b.id] = {x: x + bwM / 2, y: yM + hM, bx: x, by: yM, w: bwM, h: hM}; s += wire(x + bwM / 2, yM + hM, x + bwM / 2, yI) + box(x, yM, bwM, hM, T[b.t].c, b.name, b.t === 'cpu' ? 'AXI master' : 'AXI master · bursts', b.t === 'cpu' ? 'single reads and writes' : 'copies memory'); });
    if (!masters.length) s += `<text x="${W / 2}" y="${yM + 45}" text-anchor="middle" fill="#f87171" font-size="15" ${F}>No master: add a CPU</text>`;
    // interconnect
    s += `<rect x="40" y="${yI}" width="${W - 80}" height="${hI}" rx="14" fill="#1e1b4b" stroke="#6366f1" stroke-width="2.5"/><text x="${W / 2}" y="${yI + 24}" text-anchor="middle" fill="#e0e7ff" font-size="17" font-weight="800" ${F}>AXI interconnect</text><text x="${W / 2}" y="${yI + 43}" text-anchor="middle" fill="#a5b4fc" font-size="13" ${F}>arbiter · address decoder · AW W B AR R channels</text>`;
    // AXI slaves + default slave
    const bwA = bwOf(nA), ax = xs(nA, bwA);
    [...axi, {t: 'def'}].forEach((b, i) => {
      const x = ax[i], cx = x + bwA / 2; lay.a[b.t === 'def' ? 'none' : b.id] = {x: cx, y: yA, bx: x, by: yA, w: bwA, h: hA}; s += wire(cx, yI + hI, cx, yA);
      if (b.t === 'def') s += box(x, yA, bwA, hA, '#f87171', 'Default slave', 'unmapped addresses', 'answers DECERR', true);
      else s += box(x, yA, bwA, hA, b.p.off ? '#64748b' : T[b.t].c, b.name + (b.p.off ? ' (off)' : ''), rng(b), b.t === 'bridge' ? 'AXI slave → APB master' : b.t === 'ddr' ? `${L.KB(b.p.size)} · latency ${b.p.lat}` : `${L.KB(b.p.size)}${b.t === 'rom' ? ' · read-only' : ''}`);
    });
    let H = yA + hA + 40;
    if (bridge) {
      const bx = ax[axi.indexOf(bridge)] + bwA / 2;
      s += wire(bx, yA + hA, bx, yB, '#7c3aed');
      s += `<rect x="40" y="${yB - 8}" width="${W - 80}" height="16" rx="8" fill="#2e1065" stroke="#a78bfa" stroke-width="2"/><text x="48" y="${yB - 16}" fill="#c4b5fd" font-size="13" font-weight="700" ${F}>APB bus  ·  PSEL PENABLE PADDR PWRITE PWDATA PRDATA PREADY PSLVERR</text>`;
      if (pers.length) {
        const bwP = Math.min(190, bwOf(pers.length)), px = xs(pers.length, bwP);
        pers.forEach((b, i) => { const x = px[i], cx = x + bwP / 2; lay.p[b.cfg ? 'dmacfg' : b.id] = {x: cx, y: yP, bx: x, by: yP, w: bwP, h: hP}; s += wire(cx, yB + 8, cx, yP, '#7c3aed') + box(x, yP, bwP, hP, b.p && b.p.off ? '#64748b' : T[b.t].c, b.name + (b.p && b.p.off ? ' (off)' : ''), L.HA(b.base), b.cfg ? '5 registers · sets up DMA' : `${L.regsOf(b).length} registers · wait ${L.waitOf(b)}`, b.cfg);
          if (T[b.t].irq || b.cfg) s += `<text x="${cx}" y="${yP + hP + 18}" text-anchor="middle" fill="#f472b6" font-size="12" font-weight="700" ${F}>⚡ interrupt</text>`; });
      } else s += `<text x="${W / 2}" y="${yP + 40}" text-anchor="middle" fill="#64748b" font-size="15" ${F}>No peripherals yet</text>`;
      H = yP + hP + 40;
      const ic = d.blocks.find(b => b.t === 'irq');
      if (ic && masters.length) s += `<text x="${W - 40}" y="${H + 4}" text-anchor="end" fill="#f472b6" font-size="13" ${F}>⚡ interrupts go to ${esc(ic.name)}, which signals the CPU</text>`;
      H += 20;
    } else if (by(b => T[b.t].k === 'per').length) { s += `<text x="${W / 2}" y="${H}" text-anchor="middle" fill="#f87171" font-size="15" ${F}>Peripherals need the AXI→APB bridge</text>`; H += 30; }
    lay.yI = yI; lay.hI = hI; lay.yA = yA; lay.hA = hA; lay.yB = yB; lay.bridge = bridge && bridge.id; blockDiagram.lay = lay;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Block diagram of ${esc(title || 'my SoC')}"><rect width="${W}" height="${H}" fill="#060a14"/>${s}</svg>`;
  }
  /* put the diagram in host with download buttons */
  function finalDiagram(host, d, o = {}) {
    host.innerHTML = `<div class="wavebox fdsvg" style="padding:10px">${blockDiagram(d, o.title || 'My SoC')}</div>` + (o.noButtons ? '' : `<div class="chips" style="margin-top:10px"><button type="button" class="ex" id="fdpng">⬇ Download PNG</button><button type="button" class="ex" id="fdsv">⬇ Download SVG</button></div>`);
    host._lay = blockDiagram.lay;
    if (o.noButtons) return;
    const svgTxt = () => host.querySelector('svg').outerHTML;
    const save = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    host.querySelector('#fdsv').onclick = () => save(URL.createObjectURL(new Blob([svgTxt()], {type: 'image/svg+xml'})), 'my-soc-diagram.svg');
    host.querySelector('#fdpng').onclick = () => {
      const svg = host.querySelector('svg'), w = +svg.getAttribute('width'), h = +svg.getAttribute('height'), img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0); save(c.toDataURL('image/png'), 'my-soc-diagram.png'); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgTxt());
    };
  }
  /* ---------- animated packet along the wires of the final diagram ---------- */
  function pulse(host, tr, d, done) {
    const svg = host.querySelector('svg'), lay = host._lay; if (!svg || !lay) { if (done) done(); return; }
    for (const g of svg.querySelectorAll('.pk')) g.remove();
    const NS = 'http://www.w3.org/2000/svg';
    const m = d.blocks.find(b => b.t === (tr.master === 'DMA' ? 'dma' : 'cpu')); const M = m && lay.m[m.id]; if (!M) { if (done) done(); return; }
    const pts = [[M.x, M.y], [M.x, lay.yI + lay.hI / 2]];
    let tgtBox = null;
    if (tr.side === 'apb' || tr.apb) {
      const br = lay.a[lay.bridge]; pts.push([br.x, lay.yI + lay.hI / 2], [br.x, lay.yA + lay.hA], [br.x, lay.yB]);
      const P = lay.p[tr.tgt] || (d.blocks.find(b => b.id === tr.tgt && b.t === 'dma') ? lay.p.dmacfg : null);
      if (P) { pts.push([P.x, lay.yB], [P.x, P.y]); tgtBox = P; } else tgtBox = br;
    } else { const A = lay.a[tr.tgt] || lay.a.none; pts.push([A.x, lay.yI + lay.hI / 2], [A.x, A.y]); tgtBox = A; }
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'pk'); svg.appendChild(g);
    const ok = tr.resp === 'OKAY', col = tr.master === 'DMA' ? '#c084fc' : '#22d3ee';
    const hl = document.createElementNS(NS, 'rect'); for (const [k, v] of Object.entries({x: tgtBox.bx - 4, y: tgtBox.by - 4, width: tgtBox.w + 8, height: tgtBox.h + 8, rx: 15, fill: 'none', stroke: ok ? '#34d399' : '#f87171', 'stroke-width': 4, opacity: 0})) hl.setAttribute(k, v); g.appendChild(hl);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 9); dot.setAttribute('fill', col); dot.setAttribute('stroke', '#fff'); dot.setAttribute('stroke-width', 2); dot.style.filter = `drop-shadow(0 0 8px ${col})`; g.appendChild(dot);
    const lab = document.createElementNS(NS, 'text'); lab.setAttribute('font-size', 13); lab.setAttribute('font-weight', 800); lab.setAttribute('fill', '#fff'); lab.setAttribute('font-family', 'JetBrains Mono,monospace'); g.appendChild(lab);
    const segs = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); tot += l; }
    const at = f => { let dd = f * tot; for (let i = 0; i < segs.length; i++) { if (dd <= segs[i] || i === segs.length - 1) { const k = segs[i] ? Math.min(1, dd / segs[i]) : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } dd -= segs[i]; } return pts[pts.length - 1]; };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, D = reduce ? 1 : (host._speed || 900);
    const t0 = performance.now();
    const label = `${tr.w ? 'WR' : 'RD'}${tr.beats > 1 ? '×' + tr.beats : ''}`;
    function frame(now) {
      const t = Math.min(1, (now - t0) / D);
      let f, txt, c = col;
      if (t < 0.5) { f = t / 0.5; txt = label; } else { f = 1 - (t - 0.5) / 0.5; txt = tr.resp; c = ok ? '#34d399' : '#f87171'; }
      const [x, y] = at(f); dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('fill', c); dot.style.filter = `drop-shadow(0 0 8px ${c})`;
      lab.setAttribute('x', x + 14); lab.setAttribute('y', y - 10); lab.textContent = txt;
      hl.setAttribute('opacity', t > 0.42 && t < 0.75 ? 1 : 0);
      if (t < 1) requestAnimationFrame(frame); else { g.remove(); if (done) done(); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- toasts ---------- */
  function toast(html, sub) {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<div>${html}</div>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    box.appendChild(t); setTimeout(() => t.classList.add('out'), 4800); setTimeout(() => t.remove(), 5400);
  }

  /* ---------- guided tour: steps = [[selector, title, text], ...] ---------- */
  function tour(steps, key) {
    let i = 0; const ov = document.createElement('div'); ov.className = 'tour'; document.body.appendChild(ov);
    const tip = document.createElement('div'); tip.className = 'tourtip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-label', 'Guided tour'); document.body.appendChild(tip);
    let ring = document.createElement('div'); ring.className = 'tourring'; document.body.appendChild(ring);
    const end = () => { ov.remove(); tip.remove(); ring.remove(); removeEventListener('resize', show); try { localStorage.setItem(key, '1'); } catch (e) { /* storage blocked */ } };
    function show() {
      const [sel, h, txt] = steps[i], el = document.querySelector(sel);
      if (el) { el.scrollIntoView({block: 'center', behavior: 'instant'}); const r = el.getBoundingClientRect(); Object.assign(ring.style, {left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: Math.min(r.height, innerHeight - 40) + 12 + 'px'}); }
      tip.innerHTML = `<b>${i + 1} / ${steps.length} · ${h}</b><p>${txt}</p><div class="chips"><button type="button" class="act" id="tn">${i + 1 < steps.length ? 'Next →' : 'Start building ✓'}</button><button type="button" id="ts">Skip tour</button></div>`;
      const r = el ? el.getBoundingClientRect() : {bottom: 100, top: 100, left: 20};
      const below = r.bottom + 16 + 180 < innerHeight;
      Object.assign(tip.style, {left: Math.max(12, Math.min(innerWidth - 352, r.left)) + 'px', top: (below ? r.bottom + 16 : Math.max(12, r.top - 196)) + 'px'});
      tip.querySelector('#tn').onclick = () => { i++; if (i >= steps.length) end(); else show(); };
      tip.querySelector('#ts').onclick = end; tip.querySelector('#tn').focus();
    }
    addEventListener('resize', show); show();
  }
  const seen = k => { try { return !!localStorage.getItem(k); } catch (e) { return true; } };

  /* ---------- signal help under a waveform: click a signal name ---------- */
  function sigHelp(wave, out) {
    const f = e => { const t = e.target.closest('.sig'); if (!t || (e.type === 'keydown' && e.key !== 'Enter')) return; out.innerHTML = `<b class="mono">${t.dataset.sig}</b> · ${esc(L.SIG[t.dataset.sig] || 'Clock or bus signal.')}`; };
    wave.addEventListener('click', f); wave.addEventListener('keydown', f);
  }

  /* ---------- a design shared in the link replaces the saved one ---------- */
  const shared = L.share ? L.share.read() : null;
  if (shared && shared.d) { try { L.save(L.sanitize(shared.d)); addEventListener('DOMContentLoaded', () => toast('🔗 Loaded the design from your link', shared.bug ? 'Your trainer also hid a bug in it. Open Verify to find it.' : 'It is now saved in this browser.')); } catch (e) { /* bad link: keep the saved design */ } }

  /* sidebar progress: badges earned */
  addEventListener('DOMContentLoaded', () => {
    const s = document.querySelector('.series .home'); if (!s || !L.progress) return;
    const n = Object.keys(L.progress.get().ev).filter(e => L.BADGES.some(b => b.ev === e)).length;
    const a = document.createElement('a'); a.href = 'missions.html'; a.className = 'prog'; a.innerHTML = `<span>🏅 ${n} / ${L.BADGES.length} badges</span><i style="width:${Math.round(100 * n / L.BADGES.length)}%"></i>`; s.after(a);
  });
  return {make, diagram, highlight, zoneKind, designBanner, esc, blockDiagram, finalDiagram, pulse, toast, tour, seen, sigHelp, shared};
})();
