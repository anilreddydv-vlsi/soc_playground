/* SoC Playground: drag-and-drop AXI + APB SoC engine.
   Block catalog, design store, address map checks, system model, bugs, tests,
   scoreboard, coverage, testbench effects and waveforms. */
window.LAB = (() => {
  const H = (v, w = 8) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(w, '0');
  const HA = v => { const s = (v >>> 0).toString(16).toUpperCase().padStart(8, '0'); return '0x' + s.slice(0, 4) + '_' + s.slice(4); };
  const KB = n => n >= 1024 ? (n / 1024) + ' KB' : n + ' B';

  /* ---------- block catalog ---------- */
  const R = (o, n, a, r, m, d) => ({o, n, a, r, m, d});
  const TYPES = {
    cpu: {n: 'CPU', k: 'master', max: 1, c: '#818cf8', d: 'Starts single reads and writes'},
    dma: {n: 'DMA', k: 'master', max: 1, c: '#c084fc', d: 'Copies memory with AXI bursts. Set up through registers on APB', wait: 0,
      regs: [R(0x0, 'SRC', 'RW', 0, 0xFFFFFFFC, 'source address'), R(0x4, 'DST', 'RW', 0, 0xFFFFFFFC, 'destination address'), R(0x8, 'LEN', 'RW', 0, 0xFFFC, 'bytes to copy (multiple of 4)'), R(0xC, 'CTRL', 'WO', 0, 0x1, 'write 1 to start'), R(0x10, 'STATUS', 'W1C', 0, 0x3, 'bit 0 done, bit 1 error; write 1 to clear')]},
    sram: {n: 'SRAM', k: 'mem', max: 2, c: '#22d3ee', d: 'Fast on-chip memory', p: {size: [4096, 16384, 65536], wait: [0, 1]}, def: {size: 16384, wait: 0}},
    rom: {n: 'Boot ROM', k: 'mem', max: 1, c: '#38bdf8', d: 'Read-only, pre-loaded. Writes return SLVERR', p: {size: [4096, 16384]}, def: {size: 4096}},
    ddr: {n: 'DDR memory', k: 'mem', max: 1, c: '#2dd4bf', d: 'Large but slow memory', p: {size: [65536, 262144], lat: [4, 8, 16]}, def: {size: 65536, lat: 8}},
    bridge: {n: 'AXI→APB bridge', k: 'bridge', max: 1, c: '#94a3b8', d: 'Creates the APB peripheral bus'},
    uart: {n: 'UART', k: 'per', max: 2, c: '#a78bfa', d: 'Sends text to a terminal', wait: 2,
      regs: [R(0x0, 'CTRL', 'RW', 0, 0x3, 'bit 0 TX enable'), R(0x4, 'STATUS', 'RO', 1, 0x1, 'bit 0 TX empty'), R(0x8, 'TXDATA', 'WO', 0, 0xFF, 'write a byte to send it'), R(0xC, 'BAUD', 'RW', 0x1B2, 0xFFFF, 'baud divider')]},
    gpio: {n: 'GPIO', k: 'per', max: 2, c: '#34d399', d: '8 pins: LEDs and buttons', wait: 0,
      regs: [R(0x0, 'DIR', 'RW', 0, 0xFF, '1 = output'), R(0x4, 'OUT', 'RW', 0, 0xFF, 'output value'), R(0x8, 'IN', 'RO', 0xA5, 0xFF, 'pin levels (inputs read 0xA5)')]},
    timer: {n: 'Timer', k: 'per', max: 2, c: '#fbbf24', d: 'Counts down, raises an interrupt', wait: 1, irq: true,
      regs: [R(0x0, 'CTRL', 'RW', 0, 0x1, 'bit 0 enable'), R(0x4, 'LOAD', 'RW', 0, 0xFFFF, 'start value; also loads COUNT'), R(0x8, 'COUNT', 'RO', 0, 0xFFFF, '−1 per CPU transfer while enabled'), R(0xC, 'INT', 'W1C', 0, 0x1, 'set at 0; write 1 to clear')]},
    wdt: {n: 'Watchdog', k: 'per', max: 1, c: '#fb923c', d: 'Must be kicked or it flags a reset', wait: 1, irq: true,
      regs: [R(0x0, 'CTRL', 'RW', 0, 0x1, 'bit 0 enable'), R(0x4, 'LOAD', 'RW', 0, 0xFFFF, 'timeout; also loads COUNT'), R(0x8, 'KICK', 'WO', 0, 0xFF, 'write 0x5A to reload COUNT'), R(0xC, 'COUNT', 'RO', 0, 0xFFFF, 'counts down while enabled'), R(0x10, 'FLAG', 'W1C', 0, 0x1, 'set when COUNT reaches 0')]},
    irq: {n: 'Interrupt ctrl', k: 'per', max: 1, c: '#f472b6', d: 'Collects interrupts from the other blocks', wait: 0,
      regs: [R(0x0, 'PENDING', 'RO', 0, 0xFF, 'one bit per source'), R(0x4, 'ENABLE', 'RW', 0, 0xFF, 'one bit per source'), R(0x8, 'STATUS', 'RO', 0, 0xFF, 'PENDING AND ENABLE')]},
    i2c: {n: 'I2C ctrl', k: 'per', max: 1, c: '#4ade80', d: 'Sends bytes on an I2C bus', wait: 2, irq: true,
      regs: [R(0x0, 'CTRL', 'RW', 0, 0x1, 'bit 0 enable'), R(0x4, 'ADDR', 'RW', 0, 0x7F, '7-bit target address'), R(0x8, 'TXDATA', 'WO', 0, 0xFF, 'write a byte to send it'), R(0xC, 'STATUS', 'W1C', 0, 0x1, 'bit 0 done')]},
    custom: {n: 'Custom block', k: 'per', max: 2, c: '#e879f9', d: 'Your own registers', p: {wait: [0, 1, 2]}, def: {wait: 0}}
  };
  const CUSTOM_DEFAULT = () => [R(0x0, 'ID', 'RO', 0xC0DE0001, 0xFFFFFFFF, 'block identifier'), R(0x4, 'CFG', 'RW', 0x0, 0xFFFFFFFF, 'configuration'), R(0x8, 'DATA', 'RW', 0x0, 0xFFFFFFFF, 'data'), R(0xC, 'FLAGS', 'W1C', 0x3, 0x3, 'flags; write 1 to clear')];
  const KIND_N = {master: 'Masters', mem: 'Memories', bridge: 'Bridge', per: 'Peripherals'};
  const LIMIT = {mem: 3, per: 8};
  const MEM_BASES = [0x00000000, 0x10000000, 0x20000000], BRIDGE_BASE = 0x40000000, BRIDGE_SIZE = 0x10000;

  /* ---------- design store ---------- */
  const PRESETS = {
    starter: ['cpu', 'sram', 'bridge', 'uart', 'gpio', 'timer'],
    full: ['cpu', 'dma', 'sram', 'rom', 'ddr', 'bridge', 'uart', 'gpio', 'timer', 'wdt', 'irq', 'i2c'],
    empty: []
  };
  function newDesign(preset = 'starter') { const d = {blocks: [], arb: 'rr', seq: 0}; for (const t of PRESETS[preset]) add(d, t); return d; }
  const KEY = 'soclab2-design';
  let memo = null;
  function load() { try { const s = localStorage.getItem(KEY); if (s) return fix(JSON.parse(s)); } catch (e) { /* storage blocked */ } return memo || newDesign('starter'); }
  function save(d) { memo = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage blocked */ } }
  function fix(d) { if (!d || !Array.isArray(d.blocks)) return newDesign('starter'); d.arb = d.arb === 'fixed' ? 'fixed' : 'rr'; d.seq = d.seq || d.blocks.length; d.blocks = d.blocks.filter(b => TYPES[b.t]); return d; }
  const count = (d, t) => d.blocks.filter(b => b.t === t).length;
  const kindCount = (d, k) => d.blocks.filter(b => TYPES[b.t].k === k || (k === 'per' && b.t === 'dma')).length;
  function canAdd(d, t) {
    const T = TYPES[t];
    if (count(d, t) >= T.max) return `Only ${T.max} ${T.n}${T.max > 1 ? ' blocks' : ''} allowed.`;
    if (T.k === 'mem' && kindCount(d, 'mem') >= LIMIT.mem) return 'At most 3 memories.';
    if ((T.k === 'per' || t === 'dma') && kindCount(d, 'per') >= LIMIT.per) return 'At most 8 register blocks behind the bridge.';
    return '';
  }
  function nextBase(d, b) {
    const T = TYPES[b.t];
    if (T.k === 'mem') { for (const base of MEM_BASES) if (!d.blocks.some(x => x !== b && TYPES[x.t].k === 'mem' && x.base === base)) return base; return MEM_BASES[0]; }
    if (T.k === 'bridge') return BRIDGE_BASE;
    for (let i = 0; i < 16; i++) { const base = BRIDGE_BASE + i * 0x1000; if (!d.blocks.some(x => x !== b && (TYPES[x.t].k === 'per' || x.t === 'dma') && x.base === base)) return base; }
    return BRIDGE_BASE;
  }
  function add(d, t) {
    if (canAdd(d, t)) return null;
    const T = TYPES[t], n = count(d, t);
    const b = {id: t + (++d.seq), t, name: n ? T.n + ' ' + (n + 1) : T.n, p: {...(T.def || {})}};
    if (t === 'custom') b.regs = CUSTOM_DEFAULT();
    b.base = T.k === 'master' && t !== 'dma' ? null : nextBase(d, b);
    d.blocks.push(b);
    return b;
  }
  function remove(d, id) { d.blocks = d.blocks.filter(b => b.id !== id); }
  const regsOf = b => b.t === 'custom' ? b.regs : (TYPES[b.t].regs || []);
  const sizeOf = b => { const T = TYPES[b.t]; if (T.k === 'mem') return b.p.size; if (T.k === 'bridge') return BRIDGE_SIZE; if (T.k === 'per' || b.t === 'dma') return 0x1000; return 0; };
  const waitOf = b => b.t === 'custom' ? (b.p.wait || 0) : (TYPES[b.t].wait || 0);

  /* ---------- address map and design checks ---------- */
  function windows(d) {
    return d.blocks.filter(b => b.base != null).map(b => ({b, base: b.base >>> 0, end: (b.base + sizeOf(b) - 1) >>> 0, side: TYPES[b.t].k === 'mem' || TYPES[b.t].k === 'bridge' ? 'axi' : 'apb'}));
  }
  function checks(d) {
    const out = [], w = windows(d), has = t => d.blocks.some(b => b.t === t);
    const pers = d.blocks.filter(b => TYPES[b.t].k === 'per' || b.t === 'dma');
    if (!has('cpu')) out.push({lvl: 'err', msg: 'There is no CPU, so nothing can start a transfer. Drag a CPU onto the masters row.'});
    if (pers.length && !has('bridge')) out.push({lvl: 'err', msg: `${pers.map(b => b.name).join(', ')} need${pers.length === 1 ? 's' : ''} the AXI→APB bridge: their registers live on the APB bus.`});
    if (!d.blocks.some(b => TYPES[b.t].k === 'mem')) out.push({lvl: 'warn', msg: 'There is no memory. Software and the DMA need somewhere to keep data.'});
    for (const x of w) {
      const sz = sizeOf(x.b);
      if (x.base % sz) out.push({lvl: 'err', msg: `${x.b.name}: base ${HA(x.base)} is not aligned to its size (${KB(sz)}).`, id: x.b.id});
      if (x.side === 'apb' && has('bridge') && (x.base < BRIDGE_BASE || x.end > BRIDGE_BASE + BRIDGE_SIZE - 1)) out.push({lvl: 'err', msg: `${x.b.name}: ${HA(x.base)} is outside the bridge window ${HA(BRIDGE_BASE)}–${HA(BRIDGE_BASE + BRIDGE_SIZE - 1)}, so the CPU cannot reach it.`, id: x.b.id});
    }
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) {
      const a = w[i], c = w[j];
      if (a.side !== c.side) continue;
      if (a.base <= c.end && c.base <= a.end) out.push({lvl: 'err', msg: `${a.b.name} and ${c.b.name} overlap (${HA(Math.max(a.base, c.base))}). The decoder cannot know which one to select.`, id: c.b.id});
    }
    for (const b of d.blocks.filter(b => b.p && b.p.off)) out.push({lvl: 'warn', msg: `${b.name} is clock-gated (powered down): every access to it returns SLVERR.`, id: b.id});
    if (has('irq') && !d.blocks.some(b => TYPES[b.t].irq || b.t === 'dma')) out.push({lvl: 'warn', msg: 'The interrupt controller has no sources. Add a timer, watchdog, I2C controller or DMA.'});
    if (has('dma') && d.blocks.filter(b => TYPES[b.t].k === 'mem' && b.t !== 'rom').length === 0) out.push({lvl: 'warn', msg: 'The DMA has no writable memory to copy into.'});
    for (const b of d.blocks.filter(b => b.t === 'custom')) {
      const offs = b.regs.map(r => r.o); if (new Set(offs).size !== offs.length) out.push({lvl: 'err', msg: `${b.name}: two registers share an offset.`, id: b.id});
      if (!b.regs.length) out.push({lvl: 'warn', msg: `${b.name} has no registers.`, id: b.id});
    }
    return out;
  }
  const irqSources = d => d.blocks.filter(b => TYPES[b.t].irq || b.t === 'dma');

  /* ---------- bugs ---------- */
  const on = b => !(b.p && b.p.off);
  const dmaOK = d => d.blocks.some(b => b.t === 'dma') && d.blocks.some(b => b.t === 'bridge') && d.blocks.some(b => TYPES[b.t].k === 'mem' && b.t !== 'rom' && on(b));
  const BUGS = [
    {t: 'ic', id: 'decode', n: 'Second memory window answers as the first', need: d => { const m = d.blocks.filter(b => TYPES[b.t].k === 'mem'); return m.length >= 2 && (on(m[0]) || on(m[1])); }, caught: 'Address map, Register read/write, Random'},
    {t: 'ic', id: 'nodecerr', n: 'Unmapped addresses return OKAY instead of DECERR', caught: 'Error responses, Address map, Random'},
    {t: 'ic', id: 'starve', n: 'Round-robin arbiter starves the DMA', need: d => d.blocks.some(b => b.t === 'dma') && d.blocks.some(b => b.t === 'cpu') && d.arb === 'rr', caught: 'Arbitration, with AXI assertions in the testbench'},
    {t: 'bridge', id: 'noerr', n: 'Bridge drops PSLVERR, so APB errors look like OKAY', caught: 'Error responses, Address map'},
    {t: 'bridge', id: 'paddr', n: 'Bridge changes PADDR during APB wait states', need: d => d.blocks.some(b => TYPES[b.t].k === 'per' && on(b) && waitOf(b) > 0 && regsOf(b).length), caught: 'Any test that touches a slave with wait states, with APB assertions in the testbench'},
    {t: 'sram', id: 'lastword', n: 'Writes to the last word are lost', caught: 'Address map (boundaries)'},
    {t: 'sram', id: 'bit31', n: 'Bit 31 is stored as 0', caught: 'Register read/write, Address map, DMA copy'},
    {t: 'rom', id: 'writable', n: 'ROM accepts writes', caught: 'Error responses, Random'},
    {t: 'ddr', id: 'beat', n: 'Last beat of a read burst repeats the previous beat', need: dmaOK, caught: 'DMA copy out of DDR (bursts only; single reads are fine)'},
    {t: 'uart', id: 'baudrst', n: 'BAUD resets to 0x1B3 instead of 0x1B2', caught: 'Reset values, Address map'},
    {t: 'gpio', id: 'mux', n: 'Reading OUT returns DIR', caught: 'Register read/write, Random'},
    {t: 'timer', id: 'w1c', n: 'INT does not clear when 1 is written', caught: 'Block functions (timer)'},
    {t: 'wdt', id: 'kick', n: 'Any write to KICK reloads, not only 0x5A', caught: 'Block functions (watchdog)'},
    {t: 'irq', id: 'mask', n: 'STATUS ignores ENABLE', need: d => d.blocks.some(b => ['timer', 'wdt', 'i2c'].includes(b.t) && on(b)), caught: 'Block functions (interrupt controller)'},
    {t: 'i2c', id: 'done', n: 'STATUS.done is never set', caught: 'Block functions (I2C)'},
    {t: 'dma', id: 'len', n: 'DMA copies one word too few', need: dmaOK, caught: 'DMA copy'},
    {t: 'dma', id: 'cross', n: 'DMA bursts cross 4 KB boundaries', need: d => dmaOK(d) && d.blocks.some(b => TYPES[b.t].k === 'mem' && on(b) && b.p.size > 4096), caught: 'DMA copy across 4 KB, with AXI assertions in the testbench'},
    {t: 'custom', id: 'ro', n: 'Read-only registers can be written', needB: b => b.regs.some(r => r.a === 'RO'), caught: 'Register read/write'}
  ];
  function bugTargets(d) {
    const out = [];
    for (const g of BUGS) {
      if (g.need && !g.need(d)) continue;
      if (g.t === 'ic') out.push({blk: 'ic', bug: g.id, label: `Interconnect: ${g.n}`, g});
      else for (const b of d.blocks.filter(b => b.t === g.t && on(b) && (!g.needB || g.needB(b)))) out.push({blk: b.id, bug: g.id, label: `${b.name}: ${g.n}`, g});
    }
    return out;
  }

  /* ---------- system model ---------- */
  function system(d, bug) {
    const B = (blk, id) => bug && bug.blk === blk && bug.bug === id;
    const blocks = d.blocks.map(b => ({...b}));
    const st = {}, out = {uart: {}, gpio: {}, i2c: [], dma: []};
    const srcs = irqSources(d);
    for (const b of blocks) {
      const T = TYPES[b.t];
      if (T.k === 'mem') { const m = new Uint32Array(b.p.size / 4); if (b.t === 'rom') for (let i = 0; i < m.length; i++) m[i] = (0xB0070000 | i) >>> 0; st[b.id] = {mem: m}; }
      else if (T.k === 'per' || b.t === 'dma') {
        const r = {}; for (const x of regsOf(b)) r[x.n] = x.r >>> 0;
        if (b.t === 'uart' && B(b.id, 'baudrst')) r.BAUD = 0x1B3;
        if (b.t === 'timer' || b.t === 'wdt') r.COUNT = 0;
        st[b.id] = {r}; if (b.t === 'uart') out.uart[b.id] = [];
      }
    }
    const memWins = blocks.filter(b => TYPES[b.t].k === 'mem');
    function route(a) {
      a >>>= 0;
      const mems = memWins.filter(b => a >= b.base && a <= b.base + b.p.size - 1);
      if (mems.length) { let m = mems[0]; if (bug && bug.blk === 'ic' && bug.bug === 'decode' && memWins.length >= 2 && m === memWins[1]) { const o = a - m.base; if (o < memWins[0].p.size) return {side: 'mem', b: memWins[0], off: o}; } return {side: 'mem', b: m, off: a - m.base}; }
      const br = blocks.find(b => b.t === 'bridge');
      if (br && a >= BRIDGE_BASE && a < BRIDGE_BASE + BRIDGE_SIZE) {
        const p = blocks.find(b => (TYPES[b.t].k === 'per' || b.t === 'dma') && a >= b.base && a < b.base + 0x1000);
        return p ? {side: 'apb', b: p, off: a - p.base, br} : {side: 'apb', b: null, off: 0, br};
      }
      return {side: 'none'};
    }
    const irqLines = () => srcs.map(b => { const r = st[b.id] && st[b.id].r; if (!r) return 0; if (b.t === 'timer') return r.INT & 1; if (b.t === 'wdt') return r.FLAG & 1; if (b.t === 'i2c') return r.STATUS & 1; if (b.t === 'dma') return r.STATUS & 1; return 0; });
    function tick() {
      for (const b of blocks) {
        const r = st[b.id] && st[b.id].r; if (!r) continue;
        if ((b.t === 'timer' || b.t === 'wdt') && (r.CTRL & 1) && r.COUNT > 0) { r.COUNT--; if (r.COUNT === 0) { if (b.t === 'timer') r.INT = 1; else r.FLAG = 1; } }
      }
    }
    function memRead(m, off) { return st[m.id].mem[(off >>> 2) % st[m.id].mem.length]; }
    function memWrite(m, off, v) {
      if (m.t === 'rom' && !B(m.id, 'writable')) return 'SLVERR';
      const i = off >>> 2, mem = st[m.id].mem;
      if (B(m.id, 'lastword') && i === mem.length - 1) return 'OKAY';
      mem[i] = B(m.id, 'bit31') ? (v & 0x7FFFFFFF) >>> 0 : v >>> 0;
      return 'OKAY';
    }
    function regAccess(b, off, w, v) {
      const reg = regsOf(b).find(x => x.o === off);
      if (!reg) return {err: 1, rd: 0};
      const r = st[b.id].r; let rd = 0;
      if (w) {
        if (reg.a === 'RW') r[reg.n] = (v & reg.m) >>> 0;
        else if (reg.a === 'W1C') r[reg.n] = (r[reg.n] & ~(v & reg.m)) >>> 0;
        else if (reg.a === 'RO' && b.t === 'custom' && B(b.id, 'ro')) r[reg.n] = v >>> 0;
        // side effects
        if ((b.t === 'timer' || b.t === 'wdt') && reg.n === 'LOAD') r.COUNT = r.LOAD;
        if (b.t === 'wdt' && reg.n === 'KICK' && ((v & 0xFF) === 0x5A || B(b.id, 'kick'))) r.COUNT = r.LOAD;
        if (b.t === 'uart' && reg.n === 'TXDATA') out.uart[b.id].push(v & 0xFF);
        if (b.t === 'i2c' && reg.n === 'TXDATA') { out.i2c.push({who: b.name, addr: r.ADDR, data: v & 0xFF, en: r.CTRL & 1}); if ((r.CTRL & 1) && !B(b.id, 'done')) r.STATUS |= 1; }
        if (b.t === 'dma' && reg.n === 'CTRL' && (v & 1)) dmaRun(b);
      } else {
        if (reg.a === 'WO') rd = 0;
        else if (b.t === 'gpio' && reg.n === 'IN') rd = ((r.OUT & r.DIR) | (0xA5 & ~r.DIR)) & 0xFF;
        else if (b.t === 'gpio' && reg.n === 'OUT' && B(b.id, 'mux')) rd = r.DIR;
        else if (b.t === 'irq' && reg.n === 'PENDING') rd = irqLines().reduce((a, x, i) => a | (x << i), 0);
        else if (b.t === 'irq' && reg.n === 'STATUS') { const p = irqLines().reduce((a, x, i) => a | (x << i), 0); rd = B(b.id, 'mask') ? p : p & r.ENABLE; }
        else rd = r[reg.n] >>> 0;
      }
      return {err: 0, rd: rd >>> 0};
    }
    /* timer W1C bug: the write must have no effect, so restore INT after the generic W1C */
    const _regAccess = regAccess;
    function regAccessFixed(b, off, w, v) {
      const before = st[b.id] && st[b.id].r ? st[b.id].r.INT : 0;
      const res = _regAccess(b, off, w, v);
      if (w && b.t === 'timer' && B(b.id, 'w1c') && regsOf(b).find(x => x.o === off && x.n === 'INT')) st[b.id].r.INT = before;
      return res;
    }
    /* one CPU single transfer */
    function access(w, a, v) {
      a >>>= 0; v = (v || 0) >>> 0;
      const rt = route(a); let resp = 'OKAY', rd = 0, apb = null;
      if (rt.side === 'none') resp = B('ic', 'nodecerr') ? 'OKAY' : 'DECERR';
      else if (rt.b && rt.b.p && rt.b.p.off) { resp = 'SLVERR'; if (rt.side === 'apb') apb = {wait: 0, err: 1}; }
      else if (rt.side === 'mem') { if (w) resp = memWrite(rt.b, rt.off, v); else rd = memRead(rt.b, rt.off); }
      else {
        const pw = rt.b ? waitOf(rt.b) : 0;
        let err = 1;
        if (rt.b) { const x = regAccessFixed(rt.b, rt.off, w, v); err = x.err; rd = x.rd; }
        apb = {wait: pw, err};
        if (err) { resp = B(rt.br.id, 'noerr') ? 'OKAY' : 'SLVERR'; rd = 0; }
      }
      tick();
      return {resp, rdata: w ? 0 : rd >>> 0, tgt: rt.b ? rt.b.id : (rt.side === 'apb' ? 'bridge-hole' : 'none'), side: rt.side, apb, lat: rt.side === 'mem' ? (rt.b.t === 'ddr' ? rt.b.p.lat : rt.b.t === 'sram' ? rt.b.p.wait : 0) : 0};
    }
    /* DMA engine: read burst, write burst, split at 4 KB unless buggy */
    function dmaRun(b) {
      const r = st[b.id].r; let len = r.LEN & 0xFFFC; if (B(b.id, 'len') && len >= 4) len -= 4;
      let src = r.SRC >>> 0, dst = r.DST >>> 0; const words = len >> 2;
      const bursts = [];
      let left = words;
      while (left > 0) {
        let n = Math.min(16, left);
        if (!B(b.id, 'cross')) { const toS = (0x1000 - (src & 0xFFF)) >> 2, toD = (0x1000 - (dst & 0xFFF)) >> 2; n = Math.min(n, toS, toD); }
        bursts.push({src, dst, n}); src = (src + n * 4) >>> 0; dst = (dst + n * 4) >>> 0; left -= n;
      }
      let err = 0;
      for (const x of bursts) {
        const rs = route(x.src), rd = route(x.dst);
        if (rs.side !== 'mem' || rd.side !== 'mem' || rs.b.p.off || rd.b.p.off || rs.off + x.n * 4 > rs.b.p.size || rd.off + x.n * 4 > rd.b.p.size) { err = 1; out.dma.push({...x, err: 1}); break; }
        const data = [];
        for (let k = 0; k < x.n; k++) data.push(memRead(rs.b, rs.off + 4 * k));
        if (rs.b.t === 'ddr' && B(rs.b.id, 'beat') && x.n > 1) data[x.n - 1] = data[x.n - 2];
        let wr = 'OKAY';
        for (let k = 0; k < x.n; k++) { const q = memWrite(rd.b, rd.off + 4 * k, data[k]); if (q !== 'OKAY') wr = q; }
        out.dma.push({...x, data, srcT: rs.b.id, dstT: rd.b.id, resp: wr, lat: rs.b.t === 'ddr' ? rs.b.p.lat : rs.b.t === 'sram' ? rs.b.p.wait : 0});
        if (wr !== 'OKAY') { err = 1; break; }
      }
      r.STATUS = (r.STATUS | 1 | (err ? 2 : 0)) >>> 0;
    }
    return {d, blocks, st, out, access, route, irqLines, srcs, memWins};
  }

  /* ---------- arbitration between CPU and DMA queues ---------- */
  function arbitrate(nCpu, nDma, mode, starve) {
    const order = []; let c = nCpu, m = nDma, last = 'dma';
    while (c || m) {
      let g;
      if (!c) g = 'dma'; else if (!m) g = 'cpu';
      else if (mode === 'fixed' || starve) g = 'cpu';
      else g = last === 'cpu' ? 'dma' : 'cpu';
      order.push(g); if (g === 'cpu') c--; else m--; last = g;
    }
    return order;
  }
  function maxDmaWait(order) { let w = 0, cur = 0, dmaLeft = order.filter(x => x === 'dma').length; for (const g of order) { if (g === 'dma') { dmaLeft--; cur = 0; } else if (dmaLeft > 0) { cur++; w = Math.max(w, cur); } } return w; }

  /* ---------- AXI + APB waveform for one transfer ---------- */
  function cycles(t, bug) {
    const C = [], push = o => C.push(o);
    const beats = t.beats || 1, wr = t.w, err = t.resp !== 'OKAY';
    const apbRows = !!t.apb;
    const base = () => ({AWVALID: 0, AWREADY: 0, AWADDR: null, AWLEN: null, WVALID: 0, WREADY: 0, WDATA: null, WLAST: 0, BVALID: 0, BRESP: null, ARVALID: 0, ARREADY: 0, ARADDR: null, ARLEN: null, RVALID: 0, RDATA: null, RLAST: 0, RRESP: null, PSEL: 0, PENABLE: 0, PADDR: null, PREADY: 0, PRDATA: null, PSLVERR: 0, ph: ''});
    const data = t.data || [t.w ? t.d : t.rdata];
    if (t.apb) {
      const pw = t.apb.wait, paddr = t.a, perr = t.apb.err;
      const c0 = base(); if (wr) Object.assign(c0, {AWVALID: 1, AWREADY: 1, AWADDR: t.a, AWLEN: 0, WVALID: 1, WDATA: data[0], WLAST: 1}); else Object.assign(c0, {ARVALID: 1, ARREADY: 1, ARADDR: t.a, ARLEN: 0}); c0.ph = 'AXI request'; push(c0);
      const s = base(); if (wr) Object.assign(s, {WVALID: 1, WDATA: data[0], WLAST: 1}); Object.assign(s, {PSEL: 1, PADDR: paddr, ph: 'APB setup'}); push(s);
      for (let i = 0; i < pw; i++) { const x = base(); if (wr) Object.assign(x, {WVALID: 1, WDATA: data[0], WLAST: 1}); Object.assign(x, {PSEL: 1, PENABLE: 1, PADDR: bug === 'paddr' ? (paddr + 4 * (i + 1)) >>> 0 : paddr, ph: 'APB wait'}); push(x); }
      const a = base(); if (wr) Object.assign(a, {WVALID: 1, WREADY: 1, WDATA: data[0], WLAST: 1}); Object.assign(a, {PSEL: 1, PENABLE: 1, PREADY: 1, PADDR: paddr, PSLVERR: perr, PRDATA: wr || perr ? null : t.rdata, ph: 'APB access'}); push(a);
      const e = base(); if (wr) Object.assign(e, {BVALID: 1, BRESP: t.resp}); else Object.assign(e, {RVALID: 1, RDATA: err ? null : t.rdata, RLAST: 1, RRESP: t.resp}); e.ph = 'AXI response'; push(e);
    } else {
      const lat = t.lat || 0;
      const c0 = base(); if (wr) Object.assign(c0, {AWVALID: 1, AWREADY: 1, AWADDR: t.a, AWLEN: beats - 1}); else Object.assign(c0, {ARVALID: 1, ARREADY: 1, ARADDR: t.a, ARLEN: beats - 1}); c0.ph = 'AXI address'; push(c0);
      if (t.resp === 'DECERR' || (t.resp === 'SLVERR' && !t.apb)) {
        if (wr) { const x = base(); Object.assign(x, {WVALID: 1, WREADY: 1, WDATA: data[0], WLAST: 1, ph: 'data'}); push(x); const y = base(); Object.assign(y, {BVALID: 1, BRESP: t.resp, ph: 'response'}); push(y); }
        else { const y = base(); Object.assign(y, {RVALID: 1, RLAST: 1, RRESP: t.resp, ph: 'response'}); push(y); }
      } else if (wr) {
        for (let k = 0; k < beats; k++) { const w = k === 0 ? lat : (t.wait || 0); for (let i = 0; i < w; i++) { const x = base(); Object.assign(x, {WVALID: 1, WDATA: data[k], WLAST: k === beats - 1 ? 1 : 0, ph: 'wait'}); push(x); } const x = base(); Object.assign(x, {WVALID: 1, WREADY: 1, WDATA: data[k], WLAST: k === beats - 1 ? 1 : 0, ph: 'beat ' + k}); push(x); }
        const y = base(); Object.assign(y, {BVALID: 1, BRESP: t.resp, ph: 'response'}); push(y);
      } else {
        for (let i = 0; i < lat; i++) { const x = base(); x.ph = 'latency'; push(x); }
        for (let k = 0; k < beats; k++) { if (k && t.wait) for (let i = 0; i < t.wait; i++) { const x = base(); x.ph = 'wait'; push(x); } const x = base(); Object.assign(x, {RVALID: 1, RDATA: data[k], RLAST: k === beats - 1 ? 1 : 0, RRESP: t.resp, ph: 'beat ' + k}); push(x); }
      }
    }
    const idle = base(); idle.ph = 'idle'; C.push(idle); C.unshift({...base(), ph: 'idle'});
    const rows = wr ? ['ACLK', 'AWVALID', 'AWREADY', 'AWADDR', 'AWLEN', 'WVALID', 'WREADY', 'WDATA', 'WLAST', 'BVALID', 'BRESP'] : ['ACLK', 'ARVALID', 'ARREADY', 'ARADDR', 'ARLEN', 'RVALID', 'RDATA', 'RLAST', 'RRESP'];
    if (apbRows) rows.push('PSEL', 'PENABLE', 'PADDR', 'PREADY', ...(wr ? [] : ['PRDATA']), 'PSLVERR');
    return {rows, C};
  }
  const L_SIG = () => (window.LAB && window.LAB.SIG) || {};
  const BUS = new Set(['RID', 'ARID', 'AWADDR', 'AWLEN', 'WDATA', 'BRESP', 'ARADDR', 'ARLEN', 'RDATA', 'RRESP', 'PADDR', 'PRDATA']);
  function wave(host, wv, o = {}) {
    const {rows, C} = wv, N = C.length, L = 96, R = 10, T = 28, RH = 32;
    const W = Math.max(host.clientWidth - 14, L + R + N * 92), U = (W - L - R) / N, Hh = T + rows.length * RH + 6;
    const X = i => L + i * U; let s = '';
    C.forEach((c, i) => {
      const col = /APB/.test(c.ph) ? 'rgba(167,139,250,.10)' : /wait|latency/.test(c.ph) ? 'rgba(251,191,36,.10)' : /resp/i.test(c.ph) ? 'rgba(52,211,153,.10)' : /beat|data|request|address/.test(c.ph) ? 'rgba(34,211,238,.07)' : 'transparent';
      s += `<rect x="${X(i)}" y="${T - 20}" width="${U}" height="${Hh - T + 16}" fill="${col}"/>`;
      if (i) s += `<line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${Hh}" stroke="#1f2c47" stroke-dasharray="3 4"/>`;
      s += `<text x="${X(i) + U / 2}" y="${T - 6}" text-anchor="middle" fill="${c.ph === 'idle' ? '#64748b' : '#e7eef9'}" font-size="12" font-weight="700">${c.ph}</text>`;
    });
    rows.forEach((nm, ri) => {
      const y0 = T + ri * RH + 4, hi = y0 + 3, lo = y0 + RH - 9, mid = (hi + lo) / 2;
      const apb = nm[0] === 'P';
      const help = (L_SIG()[nm] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      s += `<text x="8" y="${mid + 5}" fill="${apb ? '#c4b5fd' : '#e7eef9'}" font-size="13" font-weight="700" font-family="JetBrains Mono,monospace" class="sig" data-sig="${nm}" tabindex="0" style="cursor:help;text-decoration:underline dotted #4064a3">${help ? `<title>${help}</title>` : ''}${nm}</text>`;
      if (nm === 'ACLK') { let d = ''; for (let i = 0; i < N; i++) d += `${i ? 'L' : 'M'}${X(i)},${lo}L${X(i)},${hi}L${X(i) + U / 2},${hi}L${X(i) + U / 2},${lo}L${X(i + 1)},${lo}`; s += `<path d="${d}" fill="none" stroke="#8fa2c2" stroke-width="2"/>`; return; }
      if (!BUS.has(nm)) {
        let d = '', prev = null;
        C.forEach((c, i) => { const y = c[nm] ? hi : lo; d += i ? `L${X(i)},${prev}L${X(i)},${y}` : `M${X(i)},${y}`; d += `L${X(i + 1)},${y}`; prev = y; });
        const colr = nm === 'PSLVERR' && C.some(c => c.PSLVERR) ? '#f87171' : /READY/.test(nm) ? '#34d399' : apb ? '#a78bfa' : '#22d3ee';
        s += `<path d="${d}" fill="none" stroke="${colr}" stroke-width="2.4"/>`; return;
      }
      for (let i = 0; i < N;) {
        let j = i; while (j + 1 < N && C[j + 1][nm] === C[i][nm]) j++;
        const v = C[i][nm], x1 = X(i) + 3, x2 = X(j + 1) - 3;
        if (v == null) s += `<line x1="${x1}" x2="${x2}" y1="${mid}" y2="${mid}" stroke="#475569" stroke-width="2"/>`;
        else {
          const bad = (nm === 'PADDR' && o.badPaddr && /wait/.test(C[i].ph)) || (/RESP/.test(nm) && v !== 'OKAY');
          const txt = typeof v === 'number' ? (/LEN$|ID$/.test(nm) ? String(v) : (v >>> 0).toString(16).toUpperCase().padStart(8, '0')) : v;
          s += `<path d="M${x1},${mid}L${x1 + 5},${hi}L${x2 - 5},${hi}L${x2},${mid}L${x2 - 5},${lo}L${x1 + 5},${lo}Z" fill="${bad ? 'rgba(248,113,113,.2)' : apb ? 'rgba(167,139,250,.12)' : 'rgba(34,211,238,.1)'}" stroke="${bad ? '#f87171' : apb ? '#c4b5fd' : '#67e8f9'}" stroke-width="1.6"/>`;
          s += `<text x="${(x1 + x2) / 2}" y="${mid + 5}" text-anchor="middle" fill="${bad ? '#fecaca' : '#e7eef9'}" font-size="12.5" font-family="JetBrains Mono,monospace">${txt}</text>`;
        }
        i = j + 1;
      }
    });
    if (o.marks) for (const [i, k] of Object.entries(o.marks)) s += `<rect x="${X(+i) + 2}" y="${T - 22}" width="${U - 4}" height="${Hh - T + 20}" rx="6" fill="none" stroke="${k === 'fail' ? '#f87171' : '#34d399'}" stroke-width="2.5" stroke-dasharray="${k === 'fail' ? '0' : '5 4'}"/><text x="${X(+i) + U / 2}" y="${Hh - 4}" text-anchor="middle" fill="${k === 'fail' ? '#fca5a5' : '#86efac'}" font-size="12" font-weight="800">${k === 'fail' ? '✕ FAIL' : '✓'}</text>`;
    host.innerHTML = `<svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${o.label || 'AXI and APB waveform'}">${s}</svg>`;
  }

  /* ---------- naming helpers ---------- */
  function nameOf(d, a) {
    a >>>= 0;
    const m = d.blocks.find(b => TYPES[b.t].k === 'mem' && a >= b.base && a < b.base + b.p.size); if (m) return `${m.name}[${(a - m.base) >> 2}]`;
    const p = d.blocks.find(b => (TYPES[b.t].k === 'per' || b.t === 'dma') && a >= b.base && a < b.base + 0x1000);
    if (p) { const r = regsOf(p).find(x => x.o === a - p.base); return `${p.name}.${r ? r.n : H(a - p.base, 3) + '?'}`; }
    return 'unmapped';
  }

  /* ---------- tests that adapt to the design ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const Rd = (a, why) => ({w: 0, a: a >>> 0, why}), Wr = (a, v, why) => ({w: 1, a: a >>> 0, d: v >>> 0, why});
  const regA = (b, n) => (b.base + regsOf(b).find(r => r.n === n).o) >>> 0;
  function freeAxi(d) { for (const a of [0x60000000, 0x80000000, 0xF0000000, 0x30000000]) if (!windows(d).some(w => w.side === 'axi' && a >= w.base && a <= w.end)) return a; return 0xFFFFF000; }
  function freeApb(d) { for (let i = 15; i >= 0; i--) { const a = BRIDGE_BASE + i * 0x1000; if (!d.blocks.some(b => (TYPES[b.t].k === 'per' || b.t === 'dma') && b.base === a)) return a; } return null; }
  const TESTS = [
    {id: 'reset', n: 'Reset values', d: 'Read every register and the first word of each memory before anything is written.', gen: d => {
      const o = [];
      for (const b of d.blocks) { if (TYPES[b.t].k === 'mem') o.push(Rd(b.base, `${b.name} after reset`)); else if (TYPES[b.t].k === 'per' || b.t === 'dma') for (const r of regsOf(b)) o.push(Rd(b.base + r.o, `reset value of ${b.name}.${r.n}`)); }
      return o; }},
    {id: 'regs', n: 'Register read/write', d: 'Write patterns to every read-write register and to memory, then read them back. Try to write read-only registers.', gen: d => {
      const o = [];
      for (const p of [0xA5A5A5A5, 0x5A5A5A5A]) for (const b of d.blocks) {
        if (TYPES[b.t].k === 'mem' && b.t !== 'rom') o.push(Wr(b.base, p, 'memory pattern'), Wr(b.base + 4, ~p, 'inverse pattern'), Rd(b.base, 'read back'), Rd(b.base + 4, 'read back'));
        if (TYPES[b.t].k === 'per' || b.t === 'dma') for (const r of regsOf(b)) if (r.a === 'RW') o.push(Wr(b.base + r.o, p & r.m, 'pattern'), Rd(b.base + r.o, `read back ${b.name}.${r.n}`));
      }
      for (const b of d.blocks) if (TYPES[b.t].k === 'per' || b.t === 'dma') for (const r of regsOf(b)) if (r.a === 'RO' && !(b.t === 'irq')) o.push(Wr(b.base + r.o, ~r.r & r.m, 'write to a read-only register'), Rd(b.base + r.o, 'must be unchanged'));
      for (const g of d.blocks.filter(b => b.t === 'gpio')) o.push(Wr(regA(g, 'DIR'), 0x0F, 'pins 3..0 out'), Wr(regA(g, 'OUT'), 0x3C, 'drive'), Rd(regA(g, 'OUT'), 'OUT differs from DIR'), Rd(regA(g, 'IN'), 'pins'));
      return o; }},
    {id: 'map', n: 'Address map', d: 'Write a different value to the first and last word of every window, then read them all back, plus the address just past each one.', gen: d => {
      const o = [], rd = [];
      for (const b of d.blocks) {
        if (TYPES[b.t].k === 'mem') { const last = b.base + b.p.size - 4; if (b.t !== 'rom') o.push(Wr(b.base, 0x11110000 | b.base >>> 28, `first word of ${b.name}`), Wr(last, 0xFFFF0000 | b.base >>> 28, `last word of ${b.name}`)); rd.push(Rd(b.base, `first word of ${b.name}`), Rd(last, `last word of ${b.name}`), Rd(b.base + b.p.size, 'just past ' + b.name)); }
        else if (TYPES[b.t].k === 'per' || b.t === 'dma') { const rs = regsOf(b); if (rs.length) rd.push(Rd(b.base + rs[0].o, `first register of ${b.name}`), Rd(b.base + rs[rs.length - 1].o, `last register of ${b.name}`)); }
      }
      return o.concat(rd); }},
    {id: 'errors', n: 'Error responses', d: 'Unmapped addresses must get DECERR, holes behind the bridge and ROM writes must get SLVERR.', gen: d => {
      const o = [Rd(freeAxi(d), 'no slave here'), Wr(freeAxi(d) + 0x100, 0x1234, 'no slave here')];
      if (d.blocks.some(b => b.t === 'bridge')) { const h = freeApb(d); if (h != null) o.push(Rd(h, 'empty slot behind the bridge'), Wr(h + 4, 1, 'empty slot behind the bridge')); }
      for (const b of d.blocks) if (TYPES[b.t].k === 'per') o.push(Rd(b.base + 0x100, `${b.name} has no register at 0x100`));
      const rom = d.blocks.find(b => b.t === 'rom'); if (rom) o.push(Wr(rom.base, 0xDEAD, 'write to ROM'), Rd(rom.base, 'ROM unchanged'));
      return o; }},
    {id: 'func', n: 'Block functions', d: 'A short scenario per block: timer interrupt, watchdog kick, I2C send, UART text, interrupt masking.', gen: d => {
      const o = [];
      for (const t of d.blocks.filter(b => b.t === 'timer')) o.push(Wr(regA(t, 'LOAD'), 3, 'load 3'), Wr(regA(t, 'CTRL'), 1, 'enable'), Rd(regA(t, 'COUNT'), 'counting'), Rd(regA(t, 'COUNT'), 'counting'), Rd(regA(t, 'INT'), 'INT set'), Wr(regA(t, 'INT'), 1, 'clear INT'), Rd(regA(t, 'INT'), 'INT clear'), Wr(regA(t, 'CTRL'), 0, 'disable'));
      for (const t of d.blocks.filter(b => b.t === 'wdt')) o.push(Wr(regA(t, 'LOAD'), 6, 'timeout 6'), Wr(regA(t, 'CTRL'), 1, 'enable'), Rd(regA(t, 'COUNT'), 'counting'), Wr(regA(t, 'KICK'), 0x00, 'wrong kick value'), Rd(regA(t, 'COUNT'), 'must NOT reload'), Wr(regA(t, 'KICK'), 0x5A, 'correct kick'), Rd(regA(t, 'COUNT'), 'reloaded'), Wr(regA(t, 'LOAD'), 2, 'short timeout'), Rd(regA(t, 'COUNT'), 'no kick now'), Rd(regA(t, 'FLAG'), 'timed out: FLAG set'), Wr(regA(t, 'CTRL'), 0, 'disable'), Wr(regA(t, 'FLAG'), 1, 'clear flag'), Rd(regA(t, 'FLAG'), 'flag clear'));
      for (const t of d.blocks.filter(b => b.t === 'i2c')) o.push(Wr(regA(t, 'CTRL'), 1, 'enable'), Wr(regA(t, 'ADDR'), 0x50, 'target 0x50'), Wr(regA(t, 'TXDATA'), 0x3C, 'send 0x3C'), Rd(regA(t, 'STATUS'), 'done set'), Wr(regA(t, 'STATUS'), 1, 'clear done'), Rd(regA(t, 'STATUS'), 'done clear'));
      for (const t of d.blocks.filter(b => b.t === 'uart')) o.push(Wr(regA(t, 'CTRL'), 1, 'enable'), Wr(regA(t, 'TXDATA'), 79, 'send O'), Wr(regA(t, 'TXDATA'), 75, 'send K'), Rd(regA(t, 'STATUS'), 'TX empty'));
      const ic = d.blocks.find(b => b.t === 'irq'), src = d.blocks.find(b => ['timer', 'wdt', 'i2c'].includes(b.t) && on(b));
      if (ic && src) {
        const raise = src.t === 'i2c' ? [Wr(regA(src, 'CTRL'), 1, 'enable'), Wr(regA(src, 'TXDATA'), 0x11, 'send: DONE raises the interrupt')] : [Wr(regA(src, 'LOAD'), 1, 'short count'), Wr(regA(src, 'CTRL'), 1, 'enable: it fires')];
        const clear = src.t === 'i2c' ? [Wr(regA(src, 'STATUS'), 1, 'clear')] : [Wr(regA(src, 'CTRL'), 0, 'disable'), Wr(regA(src, src.t === 'timer' ? 'INT' : 'FLAG'), 1, 'clear')];
        o.push(Wr(regA(ic, 'ENABLE'), 0, 'mask everything'), ...raise, Rd(regA(ic, 'PENDING'), `${src.name} pending`), Rd(regA(ic, 'STATUS'), 'masked: 0'), Wr(regA(ic, 'ENABLE'), 0xFF, 'unmask'), Rd(regA(ic, 'STATUS'), 'now visible'), ...clear);
      }
      return o; }},
    {id: 'dma', n: 'DMA copy', d: 'Fill memory, let the DMA copy it (also across a 4 KB boundary), then read the destination back.', need: d => d.blocks.some(b => b.t === 'dma') && d.blocks.some(b => b.t === 'bridge'), gen: d => {
      const o = [], dma = d.blocks.find(b => b.t === 'dma');
      const mems = d.blocks.filter(b => TYPES[b.t].k === 'mem');
      const wm = mems.filter(b => b.t !== 'rom' && on(b)).sort((a, b) => b.p.size - a.p.size); if (!wm.length) return o;
      const dst = wm[0];
      const copy = (src, so, len, doff, why) => {
        const sa = src.base + so, da = dst.base + doff;
        if (src.t !== 'rom') for (let k = 0; k < len / 4; k++) o.push(Wr(sa + 4 * k, (0x5EED0000 + k * 0x1111 + so) >>> 0, 'fill source'));
        o.push(Wr(regA(dma, 'SRC'), sa, 'source'), Wr(regA(dma, 'DST'), da, 'destination'), Wr(regA(dma, 'LEN'), len, 'length'), Wr(regA(dma, 'CTRL'), 1, `start: ${why} from ${src.name}`), Rd(regA(dma, 'STATUS'), 'done'), Wr(regA(dma, 'STATUS'), 3, 'clear'));
        for (let k = 0; k < len / 4; k++) o.push(Rd(da + 4 * k, 'check copy'));
      };
      for (const src of mems) {
        const base = src === dst ? 0x800 : 0x100;
        copy(src, 0x0, 0x40, base, 'aligned copy'); copy(src, 0x100, 0x4, base + 0x100, 'one-word copy'); copy(src, 0x200, 0xC, base + 0x200, 'three-word copy');
      }
      const big = mems.find(b => b.p.size > 4096 && on(b));
      if (big) copy(big, 0xFE0, 0x40, dst.p.size > 4096 ? 0x2FE0 % (dst.p.size - 0x40) : 0x7E0, 'copy across 4 KB');
      return o; }},
    {id: 'arb', n: 'Arbitration', d: 'CPU and DMA use the bus at the same time. Every master must get its turn.', need: d => d.blocks.some(b => b.t === 'dma') && d.blocks.some(b => b.t === 'cpu'), gen: () => [{arb: true, cpu: 12, dma: 8, why: 'CPU and DMA compete'}]},
    {id: 'random', n: 'Random', d: 'Constrained-random reads and writes across every window, plus some unmapped addresses.', gen: (d, n = 100, seed = 1) => {
      const r = rng(seed), o = [], w = windows(d).filter(x => !(x.b.t === 'bridge'));
      for (let i = 0; i < n; i++) {
        const wr = r() < 0.5 ? 1 : 0, v = Math.floor(r() * 4294967296) >>> 0; let a;
        if (!w.length || r() < 0.1) a = freeAxi(d) + Math.floor(r() * 64) * 4;
        else { const x = w[Math.floor(r() * w.length)]; if (TYPES[x.b.t].k === 'mem') a = x.base + Math.floor(r() * (x.b.p.size / 4)) * 4; else { const rs = regsOf(x.b); a = rs.length && r() < 0.9 ? x.base + rs[Math.floor(r() * rs.length)].o : x.base + 0x200; } }
        if (wr && TYPES[x2t(d, a)] && x2t(d, a) === 'dma' && (a & 0xFFF) === 0xC) continue; // random never starts the DMA
        o.push({w: wr, a: a >>> 0, d: wr ? v : 0, why: 'random'});
      }
      return o; }}
  ];
  function x2t(d, a) { const p = d.blocks.find(b => b.base != null && a >= b.base && a < b.base + sizeOf(b) && b.t !== 'bridge'); return p ? p.t : ''; }

  /* ---------- testbench components ---------- */
  const TB = [
    {id: 'drv', n: 'Driver', d: 'Turns test items into bus transfers', need: true},
    {id: 'amon', n: 'AXI monitor', d: 'Watches the AXI bus and rebuilds every transfer'},
    {id: 'pmon', n: 'APB monitor', d: 'Watches the peripheral bus behind the bridge'},
    {id: 'ref', n: 'Reference model', d: 'Predicts the right answer from the spec'},
    {id: 'sb', n: 'Scoreboard', d: 'Compares the design with the reference model'},
    {id: 'cov', n: 'Coverage', d: 'Records which features were exercised'},
    {id: 'aax', n: 'AXI assertions', d: '4 KB rule and fair arbitration'},
    {id: 'aapb', n: 'APB assertions', d: 'Signals stable during wait states'}
  ];
  const TB_DEFAULT = ['drv', 'amon', 'ref', 'sb'];

  /* ---------- coverage model built from the design ---------- */
  function covModel(d) {
    const bins = [];
    for (const b of d.blocks) if (b.base != null && b.t !== 'bridge') for (const k of ['R', 'W']) if (!(b.t === 'rom' && k === 'W') || true) bins.push({id: `acc:${b.id}:${k}`, g: 'Block × direction', n: `${b.name} ${k === 'R' ? 'read' : 'write'}`});
    bins.push({id: 'acc:none:R', g: 'Block × direction', n: 'unmapped read'});
    for (const r of ['OKAY', 'SLVERR', 'DECERR']) bins.push({id: 'resp:' + r, g: 'Responses', n: r});
    for (const b of d.blocks) if (TYPES[b.t].k === 'per' || b.t === 'dma') for (const r of regsOf(b)) bins.push({id: `reg:${b.id}:${r.n}`, g: 'Registers', n: `${b.name}.${r.n}`, apb: true});
    for (const b of d.blocks.filter(b => TYPES[b.t].k === 'mem')) for (const e of ['first', 'last']) bins.push({id: `edge:${b.id}:${e}`, g: 'Memory boundaries', n: `${b.name} ${e} word`});
    // only plan what this design can actually do
    if (dmaOK(d)) { for (const k of ['1', '2-4', '5-16']) bins.push({id: 'burst:' + k, g: 'DMA bursts', n: `${k} beat${k === '1' ? '' : 's'}`}); if (d.blocks.some(b => TYPES[b.t].k === 'mem' && on(b) && b.p.size > 4096)) bins.push({id: 'burst:split', g: 'DMA bursts', n: 'split at 4 KB'}); }
    if (d.blocks.some(b => b.t === 'dma') && d.blocks.some(b => b.t === 'cpu')) bins.push({id: 'arb:contend', g: 'Arbitration', n: 'CPU and DMA compete'});
    for (const s of irqSources(d)) if (on(s) && (s.t !== 'dma' || dmaOK(d))) bins.push({id: 'irq:' + s.id, g: 'Interrupts', n: `${s.name} interrupt seen`});
    const hits = Object.fromEntries(bins.map(b => [b.id, 0]));
    const hit = id => { if (id in hits) hits[id]++; };
    const pct = () => bins.length ? Math.round(100 * bins.filter(b => hits[b.id]).length / bins.length) : 0;
    return {bins, hits, hit, pct};
  }

  /* ---------- run ops through design + reference with the testbench in place ---------- */
  function env(d, bug, tb) { return {d, bug, tb: new Set(tb || TB_DEFAULT), dut: system(d, bug), ref: system(d, null), cov: covModel(d), log: [], unchecked: 0, observed: 0}; }
  function run(E, ops, test) {
    const res = [], tb = E.tb, see = tb.has('amon'), check = see && tb.has('ref') && tb.has('sb');
    const bugOn = (blk, id) => E.bug && E.bug.blk === blk && E.bug.bug === id;
    const bridge = E.d.blocks.find(b => b.t === 'bridge');
    for (const op of ops) {
      if (op.arb) {
        const starve = bugOn('ic', 'starve');
        const order = arbitrate(op.cpu, op.dma, E.d.arb, starve), exp = arbitrate(op.cpu, op.dma, E.d.arb, false);
        const wait = maxDmaWait(order), t = {i: E.log.length + 1, test, kind: 'arb', master: 'both', why: op.why, order, exp, wait, mism: [], asserts: []};
        if (tb.has('aax') && E.d.arb === 'rr' && wait > 1) t.asserts.push(`Fairness: the DMA waited ${wait} grants in a row while requesting`);
        if (check && order.join() !== exp.join()) t.mism.push('grant order differs from the arbitration spec');
        t.ok = !t.asserts.length && !t.mism.length;
        if (see) { E.cov.hit('arb:contend'); E.log.push(t); E.observed++; } res.push(t); continue;
      }
      const dmaBefore = E.dut.out.dma.length;
      const e = E.ref.access(op.w, op.a, op.d), g = E.dut.access(op.w, op.a, op.d);
      const t = {i: E.log.length + 1, test, master: 'CPU', w: op.w, a: op.a, d: op.d, why: op.why, resp: g.resp, expResp: e.resp, rdata: g.rdata, exp: e.rdata, tgt: g.tgt, apb: g.apb, lat: g.lat, mism: [], asserts: []};
      if (e.resp !== g.resp) t.mism.push(`response ${g.resp}, expected ${e.resp}`);
      if (!op.w && e.rdata !== g.rdata) t.mism.push(`read ${H(g.rdata)}, expected ${H(e.rdata)}`);
      if (g.apb && g.apb.wait > 0 && bridge && bugOn(bridge.id, 'paddr') && tb.has('aapb') && tb.has('pmon')) t.asserts.push('APB: PADDR changed during a wait state');
      if (!check) { t.unchecked = t.mism.length > 0; t.mism = []; }
      t.ok = !t.mism.length && !t.asserts.length;
      if (see) {
        E.observed++;
        const c = E.cov;
        if (tb.has('cov')) {
          const tgtB = E.d.blocks.find(b => b.id === (E.ref.route(op.a).b || {}).id);
          c.hit(`acc:${tgtB ? tgtB.id : 'none'}:${op.w ? 'W' : 'R'}`); c.hit('resp:' + g.resp);
          if (tgtB && (TYPES[tgtB.t].k === 'per' || tgtB.t === 'dma') && tb.has('pmon')) { const r = regsOf(tgtB).find(x => x.o === op.a - tgtB.base); if (r) c.hit(`reg:${tgtB.id}:${r.n}`); }
          if (tgtB && TYPES[tgtB.t].k === 'mem') { if (op.a === tgtB.base) c.hit(`edge:${tgtB.id}:first`); if (op.a === tgtB.base + tgtB.p.size - 4) c.hit(`edge:${tgtB.id}:last`); }
          E.ref.irqLines().forEach((x, k) => { if (x) c.hit('irq:' + E.ref.srcs[k].id); });
        }
        E.log.push(t);
      }
      res.push(t);
      // DMA bursts started by this write
      for (const x of E.dut.out.dma.slice(dmaBefore)) {
        for (const [w, a, tgt] of [[0, x.src, x.srcT], [1, x.dst, x.dstT]]) {
          const crosses = ((a & 0xFFF) + x.n * 4) > 0x1000;
          const b = {i: E.log.length + 1, test, master: 'DMA', w, a, beats: x.n, data: x.data || [], resp: x.err ? 'SLVERR' : (w ? x.resp : 'OKAY'), expResp: 'OKAY', tgt, lat: w ? 0 : x.lat, why: `DMA ${w ? 'write' : 'read'} burst of ${x.n} beat${x.n > 1 ? 's' : ''}`, mism: [], asserts: []};
          if (crosses && tb.has('aax')) b.asserts.push('AXI: burst crosses a 4 KB boundary');
          b.ok = !b.asserts.length;
          if (see) {
            E.observed++;
            if (tb.has('cov')) { E.cov.hit(x.n === 1 ? 'burst:1' : x.n <= 4 ? 'burst:2-4' : 'burst:5-16'); if (!crosses && ((a & 0xFFF) + x.n * 4) === 0x1000) E.cov.hit('burst:split'); E.cov.hit(`acc:${tgt}:${w ? 'W' : 'R'}`); }
            E.log.push(b);
          }
          res.push(b);
        }
      }
    }
    return res;
  }
  function waveOf(E, t) { return cycles({...t, wait: 0}, E.bug && E.bug.bug === 'paddr' ? 'paddr' : null); }

  return {H, HA, KB, TYPES, KIND_N, LIMIT, BRIDGE_BASE, BRIDGE_SIZE, PRESETS, newDesign, load, save, add, remove, canAdd, regsOf, sizeOf, waitOf, windows, checks, BUGS, bugTargets, system, arbitrate, cycles, wave, nameOf, TESTS, TB, TB_DEFAULT, covModel, env, run, waveOf, irqSources, rng, CUSTOM_DEFAULT};
})();
