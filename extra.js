/* SoC Playground extras: signal help, missions and badges, share links,
   assertion checker, and the SystemVerilog / UVM / register-spec generators. */
(() => {
  const L = window.LAB, T = L.TYPES;

  /* ---------- what each waveform signal means ---------- */
  L.SIG = {
    ACLK: 'The AXI clock. Every signal is sampled on its rising edge.',
    AWVALID: 'Write address valid: the master has a write address ready.', AWREADY: 'Write address ready: the slave accepts the address. A handshake happens when VALID and READY are both 1.',
    AWADDR: 'Write address: where the first beat goes.', AWLEN: 'Burst length minus one. AWLEN = 7 means 8 beats.',
    WVALID: 'Write data valid.', WREADY: 'The slave takes the write data this cycle.', WDATA: 'Write data, 32 bits per beat.', WLAST: 'Marks the last beat of the write burst.',
    BVALID: 'Write response valid: the slave reports how the write went.', BRESP: 'Write response: OKAY, SLVERR (slave error) or DECERR (nobody at that address).',
    ARVALID: 'Read address valid.', ARREADY: 'The slave accepts the read address.', ARADDR: 'Read address.', ARLEN: 'Read burst length minus one.',
    RVALID: 'Read data valid.', RDATA: 'Read data, one beat per cycle when RVALID is 1.', RLAST: 'Marks the last beat of the read burst.', RRESP: 'Read response for this beat.',
    PSEL: 'APB select: the bridge picks one peripheral. High for the whole APB transfer.', PENABLE: 'APB enable: 0 in the setup cycle, 1 in the access cycles.',
    PADDR: 'APB address. It must not change until the transfer ends.', PREADY: 'The peripheral is done. Low means a wait state.',
    PRDATA: 'APB read data, valid in the last access cycle.', PSLVERR: 'APB error, valid in the last access cycle. The bridge turns it into SLVERR on AXI.',
    RID: 'Read ID: tells the master which request this data belongs to. Different IDs can come back out of order.', ARID: 'Read address ID: a tag the master picks for this request.'
  };

  /* ---------- progress, badges and missions ---------- */
  const PK = 'socpg-progress';
  let pmem = {ev: {}};
  const pget = () => { try { return JSON.parse(localStorage.getItem(PK)) || pmem; } catch (e) { return pmem; } };
  const pset = p => { pmem = p; try { localStorage.setItem(PK, JSON.stringify(p)); } catch (e) { /* storage blocked */ } };
  L.BADGES = [
    {id: 'builder', i: '🧱', n: 'Builder', d: 'Built a working SoC with a CPU, memory, bridge and a peripheral', ev: 'build-ok'},
    {id: 'hello', i: '💬', n: 'Hello, SoC', d: 'Printed text on the UART', ev: 'uart-hello'},
    {id: 'irq', i: '⚡', n: 'Interrupt Tamer', d: 'Followed an interrupt from timer to CPU handler', ev: 'irq-flow'},
    {id: 'dma', i: '🚚', n: 'Burst Master', d: 'Made the DMA copy across a 4 KB boundary', ev: 'dma4k'},
    {id: 'ooo', i: '🔀', n: 'Out of Order', d: 'Watched AXI reads return out of order', ev: 'ooo'},
    {id: 'seq', i: '✍️', n: 'Test Writer', d: 'Ran your own test sequence with 5 or more checked steps', ev: 'seq'},
    {id: 'catch', i: '🐞', n: 'Bug Catcher', d: 'Injected a bug and caught it with a test', ev: 'caught'},
    {id: 'detective', i: '🕵️', n: 'Detective', d: 'Found the mystery bug', ev: 'mystery'},
    {id: 'cov', i: '🎯', n: 'Full Coverage', d: 'Reached 100 % functional coverage', ev: 'cov100'},
    {id: 'sva', i: '🛡️', n: 'Assertion Smith', d: 'Built an assertion and watched it fire on a bug', ev: 'sva-fire'},
    {id: 'regress', i: '📊', n: 'Regression Runner', d: 'Ran every bug against every test', ev: 'regress'},
    {id: 'export', i: '📦', n: 'Tape-out Ready', d: 'Exported the RTL or UVM register model', ev: 'export'}
  ];
  L.MISSIONS = [
    {n: 'Build your first SoC', ev: 'build-ok', page: 'build.html', steps: ['Open Build and choose “Empty chip”', 'Drag a CPU into Masters, an SRAM and the bridge into AXI slaves', 'Drag a UART into APB peripherals', 'Design checks show no red problems']},
    {n: 'Say hello', ev: 'uart-hello', page: 'run.html', steps: ['Open Run', 'Pick “Say hello on UART”', 'Watch each byte travel through the bridge to the UART']},
    {n: 'Follow an interrupt', ev: 'irq-flow', page: 'run.html#irqflow', steps: ['Add a timer and an interrupt controller', 'Open Run → Interrupt flow', 'Step through all stages to the end']},
    {n: 'Cross the 4 KB line', ev: 'dma4k', page: 'run.html', steps: ['Add a DMA and a 16 KB SRAM', 'Run “DMA across a 4 KB boundary”', 'See the burst split in the transfer log']},
    {n: 'Out-of-order reads', ev: 'ooo', page: 'run.html#ooo', steps: ['Open Run → Out-of-order reads', 'Play the animation to the end', 'Notice that RID tells the CPU which data is which']},
    {n: 'Write your own test', ev: 'seq', page: 'verify.html#seq', steps: ['Open Verify → My sequence', 'Add at least 5 steps with expected values', 'Run it and get every step checked']},
    {n: 'Catch a bug', ev: 'caught', page: 'verify.html', steps: ['Pick a bug in “Design to test”', 'Run tests until one fails', 'Read the failing row and its waveform']},
    {n: 'Be the detective', ev: 'mystery', page: 'verify.html', steps: ['Pick “Mystery bug”', 'Run tests and read the failures', 'Make the right guess']},
    {n: 'Close coverage', ev: 'cov100', page: 'verify.html', steps: ['Use every testbench part', 'Run every test', 'Reach 100 %']},
    {n: 'Forge an assertion', ev: 'sva-fire', page: 'verify.html#sva', steps: ['Inject “Bridge changes PADDR during wait states”', 'Run a test and select an APB transfer', 'Load the PADDR example in the assertion builder and see it fire']},
    {n: 'Run a regression', ev: 'regress', page: 'regress.html', steps: ['Open Regression', 'Run the full bug × test grid']},
    {n: 'Export for real tools', ev: 'export', page: 'export.html', steps: ['Open Export', 'Copy or download the RTL or the UVM register model']}
  ];
  L.progress = {
    get: pget,
    mark(ev) {
      const p = pget(); if (p.ev[ev]) return [];
      p.ev[ev] = Date.now(); pset(p);
      const got = L.BADGES.filter(b => b.ev === ev);
      if (got.length && window.SOCUI && SOCUI.toast) for (const b of got) SOCUI.toast(`${b.i} Badge earned: <b>${b.n}</b>`, b.d);
      return got;
    },
    reset() { pset({ev: {}}); }
  };

  /* ---------- share links: the design (and an optional hidden bug) in the URL ---------- */
  const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  L.share = {
    link(page, d, extra) { const u = new URL(page, location.href); u.hash = 'd=' + b64e(JSON.stringify({d, ...(extra || {})})); return u.href; },
    read() { const m = location.hash.match(/[#&]d=([A-Za-z0-9_-]+)/); if (!m) return null; try { return JSON.parse(b64d(m[1])); } catch (e) { return null; } }
  };

  /* ---------- assertion checker on waveform cycles ---------- */
  const val = (C, i, sig) => { const v = C[i] && C[i][sig]; return v != null && v !== 0 && v !== false; };
  function term(C, i, t) {
    if (!t || !t.sig) return true;
    if (t.op === '1') return val(C, i, t.sig);
    if (t.op === '0') return !val(C, i, t.sig);
    if (i === 0) return t.op === 'stable';
    if (t.op === 'rose') return !val(C, i - 1, t.sig) && val(C, i, t.sig);
    if (t.op === 'fell') return val(C, i - 1, t.sig) && !val(C, i, t.sig);
    if (t.op === 'stable') return C[i][t.sig] === C[i - 1][t.sig];
    return true;
  }
  const tsva = t => t.op === '1' ? t.sig : t.op === '0' ? '!' + t.sig : `$${t.op}(${t.sig})`;
  L.assertion = {
    text: a => `assert property (@(posedge ACLK) disable iff (!ARESETn)\n  ${[a.a1, a.a2].filter(t => t && t.sig).map(tsva).join(' && ') || '1'} ${a.imp} ${tsva(a.c)})\n  else $error("${a.name || 'assertion failed'}");`,
    check(C, a) {
      const res = {tries: 0, fails: [], passes: []};
      for (let i = 0; i < C.length; i++) {
        if (!(term(C, i, a.a1) && term(C, i, a.a2))) continue;
        const j = a.imp === '|=>' ? i + 1 : i; if (j >= C.length) continue;
        res.tries++; (term(C, j, a.c) ? res.passes : res.fails).push(j);
      }
      return res;
    },
    EXAMPLES: [
      {name: 'APB setup is followed by access', a1: {sig: 'PSEL', op: '1'}, a2: {sig: 'PENABLE', op: '0'}, imp: '|=>', c: {sig: 'PENABLE', op: '1'}},
      {name: 'PADDR stable during APB wait states', a1: {sig: 'PENABLE', op: '1'}, a2: {sig: 'PREADY', op: '0'}, imp: '|=>', c: {sig: 'PADDR', op: 'stable'}},
      {name: 'PSLVERR only when PREADY (good practice)', a1: {sig: 'PSLVERR', op: '1'}, a2: null, imp: '|->', c: {sig: 'PREADY', op: '1'}},
      {name: 'WLAST only with WVALID', a1: {sig: 'WLAST', op: '1'}, a2: null, imp: '|->', c: {sig: 'WVALID', op: '1'}},
      {name: 'RLAST only with RVALID', a1: {sig: 'RLAST', op: '1'}, a2: null, imp: '|->', c: {sig: 'RVALID', op: '1'}}
    ]
  };

  /* ---------- clean up a design read from a file or a link ---------- */
  L.sanitize = o => {
    if (!o || !Array.isArray(o.blocks) || o.blocks.some(b => !b || !T[b.t] || typeof b.id !== 'string')) throw new Error('not a SoC Playground design');
    for (const b of o.blocks) {
      b.name = String(b.name || T[b.t].n).slice(0, 20); b.p = b.p && typeof b.p === 'object' ? b.p : {};
      if (b.base != null) b.base = (+b.base) >>> 0;
      if (b.t === 'custom') b.regs = (Array.isArray(b.regs) ? b.regs : []).filter(r => r && Number.isInteger(r.o)).map(r => ({o: r.o & 0xFFC, n: String(r.n || 'REG').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 10) || 'REG', a: ['RW', 'RO', 'WO', 'W1C'].includes(r.a) ? r.a : 'RW', r: (+r.r || 0) >>> 0, m: 0xFFFFFFFF, d: 'your register'})).slice(0, 16);
    }
    o.arb = o.arb === 'fixed' ? 'fixed' : 'rr'; o.seq = Math.max(o.seq | 0, o.blocks.length + 1);
    return {blocks: o.blocks, arb: o.arb, seq: o.seq};
  };

  /* ---------- generators ---------- */
  const sv32 = v => `32'h${((v >>> 0).toString(16).toUpperCase().padStart(8, '0')).replace(/^(....)/, '$1_')}`;
  const h3 = v => `12'h${v.toString(16).toUpperCase().padStart(3, '0')}`;
  function idents(d) {
    const used = new Set(['SOC', 'TB']), m = {};
    for (const b of d.blocks) { let n = (b.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || b.t.toUpperCase()); if (/^[0-9]/.test(n)) n = 'B_' + n; let k = n, i = 2; while (used.has(k)) k = n + '_' + i++; used.add(k); m[b.id] = k; }
    return m;
  }
  const regId = r => r.n.toUpperCase().replace(/[^A-Z0-9]+/g, '_') || 'REG';
  function regsU(b) { const seen = new Set(); return L.regsOf(b).map(r => { let n = regId(r); while (seen.has(n)) n += '_X'; seen.add(n); return {...r, id: n}; }); }
  const apbBlocks = d => L.windows(d).filter(x => x.side === 'apb').sort((a, b) => a.base - b.base).map(x => x.b);
  const axiBlocks = d => L.windows(d).filter(x => x.side === 'axi').sort((a, b) => a.base - b.base).map(x => x.b);
  const head = what => `// ${what}\n// Generated by SoC Playground from your design. Edit the design and regenerate instead of editing by hand.\n`;

  function genPkg(d) {
    const N = idents(d), w = L.windows(d).sort((a, b) => a.base - b.base), apb = apbBlocks(d), axi = axiBlocks(d);
    let p = head('Address map package') + `package soc_map_pkg;\n\n  // ---- windows ----\n`;
    for (const x of w) p += `  localparam logic [31:0] ${N[x.b.id]}_BASE = ${sv32(x.base)};\n  localparam logic [31:0] ${N[x.b.id]}_SIZE = ${sv32(x.end - x.base + 1)};\n`;
    p += `\n  localparam int NUM_AXI_SLAVES = ${Math.max(1, axi.length)};\n  localparam int NUM_APB_SLAVES = ${Math.max(1, apb.length)};\n`;
    for (const b of apb) { const rs = regsU(b); if (!rs.length) continue; p += `\n  // ---- ${b.name} registers ----\n`; for (const r of rs) p += `  localparam logic [11:0] ${N[b.id]}_${r.id} = ${h3(r.o)};  // ${r.a}\n  localparam logic [31:0] ${N[b.id]}_${r.id}_RESET = ${sv32(r.r & r.m)};\n`; }
    return p + `\nendpackage : soc_map_pkg\n`;
  }
  function genDecoders(d) {
    const N = idents(d), apb = apbBlocks(d), axi = axiBlocks(d);
    const sel = (list, nm) => list.length ? list.map((b, i) => `    if ((addr - ${N[b.id]}_BASE) < ${N[b.id]}_SIZE) sel[${i}] = 1'b1;  // ${b.name}`).join('\n') : `    // no ${nm} slaves in this design`;
    return head('Address decoders') + `module soc_axi_decoder\n  import soc_map_pkg::*;\n(\n  input  logic [31:0]               addr,\n  output logic [NUM_AXI_SLAVES-1:0] sel,\n  output logic                      decerr\n);\n  always_comb begin\n    sel = '0;\n${sel(axi, 'AXI')}\n    decerr = (sel == '0);  // default slave answers DECERR\n  end\nendmodule : soc_axi_decoder\n\n` +
      `module soc_apb_decoder\n  import soc_map_pkg::*;\n(\n  input  logic [31:0]               paddr,\n  input  logic                      psel_in,\n  output logic [NUM_APB_SLAVES-1:0] psel,\n  output logic                      slverr\n);\n  logic [31:0] addr;\n  logic [NUM_APB_SLAVES-1:0] sel;\n  assign addr = paddr;\n  always_comb begin\n    sel = '0;\n${sel(apb, 'APB')}\n    psel   = psel_in ? sel : '0;\n    slverr = psel_in && (sel == '0);  // empty slot behind the bridge\n  end\nendmodule : soc_apb_decoder\n`;
  }
  /* one APB register block per peripheral */
  function genRegBlock(d, b) {
    const N = idents(d), id = N[b.id], rs = regsU(b), W = L.waitOf(b), st = rs.filter(r => r.a !== 'WO');
    const R = n => rs.find(r => r.n === n);
    const m = r => sv32(r.m);
    let s = `// ${b.name}: ${rs.length} registers, ${W} wait state${W === 1 ? '' : 's'}\nmodule ${id.toLowerCase()}_regs\n  import soc_map_pkg::*;\n(\n  input  logic        pclk,\n  input  logic        presetn,\n  input  logic        psel,\n  input  logic        penable,\n  input  logic        pwrite,\n  input  logic [11:0] paddr,\n  input  logic [31:0] pwdata,\n  output logic [31:0] prdata,\n  output logic        pready,\n  output logic        pslverr,\n  input  logic [7:0]  ext_in,   // GPIO pins or interrupt lines\n  output logic [7:0]  ext_out,  // GPIO outputs\n  output logic        irq\n);\n`;
    s += `  localparam int WAIT = ${W};\n  logic [1:0] wcnt;\n  logic       hit, access;\n`;
    for (const r of st) s += `  logic [31:0] r_${r.id};\n`;
    s += `\n  // wait states: hold PREADY low for WAIT access cycles\n  always_ff @(posedge pclk or negedge presetn)\n    if (!presetn)                      wcnt <= '0;\n    else if (psel && penable && !pready) wcnt <= wcnt + 1'b1;\n    else                               wcnt <= '0;\n  assign pready = (wcnt == 2'(WAIT));\n  assign access = psel && penable && pready;\n\n`;
    s += `  always_comb begin\n    case (paddr)\n${rs.map(r => `      ${id}_${r.id}: hit = 1'b1;`).join('\n')}\n      default: hit = 1'b0;\n    endcase\n  end\n  assign pslverr = access && !hit;\n\n`;
    // writes and behaviour
    s += `  always_ff @(posedge pclk or negedge presetn) begin\n    if (!presetn) begin\n${st.map(r => `      r_${r.id} <= ${id}_${r.id}_RESET;`).join('\n') || '      // no stored registers'}\n    end else begin\n`;
    if ((b.t === 'timer' || b.t === 'wdt') && R('COUNT')) { const flag = b.t === 'timer' ? 'INT' : 'FLAG'; s += `      if (r_CTRL[0] && r_COUNT != 0) begin\n        r_COUNT <= r_COUNT - 1;\n        if (r_COUNT == 1) r_${flag} <= 32'h1;\n      end\n`; }
    if (b.t === 'irq') s += `      // PENDING and STATUS follow the interrupt lines; see the read mux\n`;
    s += `      if (access && pwrite) begin\n        case (paddr)\n`;
    for (const r of rs) {
      const reg = `${id}_${r.id}`;
      let body = '';
      if (r.a === 'RW') body = `r_${r.id} <= pwdata & ${m(r)};`;
      else if (r.a === 'W1C') body = `r_${r.id} <= r_${r.id} & ~(pwdata & ${m(r)});`;
      if ((b.t === 'timer' || b.t === 'wdt') && r.n === 'LOAD') body = `begin r_LOAD <= pwdata & ${m(r)}; r_COUNT <= pwdata & ${m(r)}; end`;
      if (b.t === 'wdt' && r.n === 'KICK') body = `if (pwdata[7:0] == 8'h5A) r_COUNT <= r_LOAD;  // only 0x5A reloads`;
      if (b.t === 'uart' && r.n === 'TXDATA') body = `$write("%c", pwdata[7:0]);  // simulation: print the byte`;
      if (b.t === 'i2c' && r.n === 'TXDATA') body = `if (r_CTRL[0]) r_STATUS <= r_STATUS | 32'h1;  // byte sent, DONE`;
      if (b.t === 'dma' && r.n === 'CTRL') body = `if (pwdata[0]) r_STATUS <= r_STATUS | 32'h1;  // the copy engine is modelled in the browser; here start = done`;
      if (body) s += `          ${reg}: ${body}\n`;
    }
    s += `          default: ;\n        endcase\n      end\n    end\n  end\n\n`;
    // read mux
    s += `  always_comb begin\n    prdata = '0;\n    if (psel && !pwrite) begin\n      case (paddr)\n`;
    for (const r of rs) {
      if (r.a === 'WO') continue;
      let v = `r_${r.id}`;
      if (b.t === 'gpio' && r.n === 'IN') v = `{24'h0, (r_OUT[7:0] & r_DIR[7:0]) | (ext_in & ~r_DIR[7:0])}`;
      if (b.t === 'irq' && r.n === 'PENDING') v = `{24'h0, ext_in}`;
      if (b.t === 'irq' && r.n === 'STATUS') v = `{24'h0, ext_in & r_ENABLE[7:0]}`;
      s += `        ${id}_${r.id}: prdata = ${v};\n`;
    }
    s += `        default: prdata = '0;\n      endcase\n    end\n  end\n\n`;
    s += `  assign ext_out = ${b.t === 'gpio' ? "r_OUT[7:0] & r_DIR[7:0]" : "'0"};\n`;
    s += `  assign irq     = ${b.t === 'timer' ? 'r_INT[0]' : b.t === 'wdt' ? 'r_FLAG[0]' : b.t === 'i2c' ? 'r_STATUS[0]' : b.t === 'dma' ? 'r_STATUS[0]' : "1'b0"};\n`;
    return s + `endmodule\n`;
  }
  function genApbSub(d) {
    const N = idents(d), apb = apbBlocks(d), irqB = apb.find(b => b.t === 'irq'), gp = apb.find(b => b.t === 'gpio');
    const src = L.irqSources(d).filter(b => apb.includes(b));
    let s = head('APB subsystem: decoder, register blocks and read mux (the slave side of the bridge)');
    s += `module soc_apb_subsystem\n  import soc_map_pkg::*;\n(\n  input  logic        pclk,\n  input  logic        presetn,\n  input  logic        psel,\n  input  logic        penable,\n  input  logic        pwrite,\n  input  logic [31:0] paddr,\n  input  logic [31:0] pwdata,\n  output logic [31:0] prdata,\n  output logic        pready,\n  output logic        pslverr,\n  input  logic [7:0]  gpio_in,\n  output logic [7:0]  gpio_out,\n  output logic        cpu_irq\n);\n`;
    s += `  logic [NUM_APB_SLAVES-1:0] sel;\n  logic                      hole;\n  logic [31:0] rd [NUM_APB_SLAVES];\n  logic [NUM_APB_SLAVES-1:0] rdy, err, irqs;\n  logic [7:0]  ext_out [NUM_APB_SLAVES];\n  logic [7:0]  irq_lines;\n\n  soc_apb_decoder u_dec (.paddr(paddr), .psel_in(psel), .psel(sel), .slverr(hole));\n\n`;
    if (!apb.length) s += `  assign rd[0] = '0; assign rdy[0] = 1'b1; assign err[0] = 1'b0; assign irqs[0] = 1'b0; assign ext_out[0] = '0;\n`;
    apb.forEach((b, i) => { const ext = b.t === 'gpio' ? 'gpio_in' : b.t === 'irq' ? 'irq_lines' : "8'h0"; s += `  ${N[b.id].toLowerCase()}_regs u_${N[b.id].toLowerCase()} (\n    .pclk, .presetn, .psel(sel[${i}]), .penable, .pwrite, .paddr(paddr[11:0]), .pwdata,\n    .prdata(rd[${i}]), .pready(rdy[${i}]), .pslverr(err[${i}]), .ext_in(${ext}), .ext_out(ext_out[${i}]), .irq(irqs[${i}]));\n\n`; });
    s += `  // interrupt lines in source order: ${src.map((b, k) => `bit ${k} ${b.name}`).join(', ') || 'none'}\n  always_comb begin\n    irq_lines = '0;\n${src.map((b, k) => `    irq_lines[${k}] = irqs[${apb.indexOf(b)}];`).join('\n')}\n  end\n\n`;
    s += `  // read data and response from the selected slave\n  always_comb begin\n    prdata  = '0;\n    pready  = 1'b1;\n    pslverr = hole;\n    for (int i = 0; i < NUM_APB_SLAVES; i++)\n      if (sel[i]) begin\n        prdata  = rd[i];\n        pready  = rdy[i];\n        pslverr = err[i];\n      end\n  end\n\n`;
    s += `  assign gpio_out = ${gp ? `ext_out[${apb.indexOf(gp)}]` : "'0"};\n  assign cpu_irq  = ${irqB ? `|(irq_lines & u_${N[irqB.id].toLowerCase()}.r_ENABLE[7:0])` : '|irq_lines'};\nendmodule : soc_apb_subsystem\n`;
    return s;
  }
  function genTb(d) {
    const N = idents(d), apb = apbBlocks(d);
    let s = head('Directed testbench for the APB subsystem: reset values and read-write patterns');
    s += `module tb;\n  import soc_map_pkg::*;\n  logic clk = 1'b0, rstn = 1'b0;\n  logic psel = 1'b0, penable = 1'b0, pwrite = 1'b0;\n  logic [31:0] paddr = '0, pwdata = '0, prdata;\n  logic pready, pslverr, cpu_irq;\n  logic [7:0] gpio_out;\n  int errors = 0;\n\n  always #5 clk = ~clk;\n\n  soc_apb_subsystem dut (.pclk(clk), .presetn(rstn), .psel, .penable, .pwrite, .paddr, .pwdata,\n    .prdata, .pready, .pslverr, .gpio_in(8'hA5), .gpio_out, .cpu_irq);\n\n`;
    s += `  task automatic apb(input logic wr, input logic [31:0] a, input logic [31:0] wd, output logic [31:0] rdv, output logic er);\n    // drive on the falling edge so the design samples clean values on the rising edge\n    @(negedge clk); psel = 1'b1; pwrite = wr; paddr = a; pwdata = wd;   // setup phase\n    @(negedge clk); penable = 1'b1;                                     // access phase\n    while (!pready) @(negedge clk);                                     // wait states\n    rdv = prdata; er = pslverr;                                         // completes on the next rising edge\n    @(negedge clk); psel = 1'b0; penable = 1'b0;\n  endtask\n\n`;
    s += `  task automatic check(input logic [31:0] a, input logic [31:0] exp, input string what);\n    logic [31:0] v; logic e;\n    apb(1'b0, a, '0, v, e);\n    if (v !== exp || e) begin errors++; $display("FAIL %s: read %h, expected %h", what, v, exp); end\n    else $display("ok   %s = %h", what, v);\n  endtask\n\n`;
    s += `  initial begin\n    logic [31:0] v; logic e;\n    repeat (3) @(posedge clk); rstn = 1'b1;\n\n    // 1. reset values\n`;
    for (const b of apb) for (const r of regsU(b)) { if (r.a === 'WO' || (b.t === 'irq' && r.n !== 'ENABLE') || (b.t === 'gpio' && r.n === 'IN')) continue; s += `    check(${N[b.id]}_BASE + 32'(${N[b.id]}_${r.id}), ${N[b.id]}_${r.id}_RESET, "${b.name}.${r.n} reset");\n`; }
    s += `\n    // 2. read-write registers keep what you write\n`;
    for (const b of apb) for (const r of regsU(b)) { if (r.a !== 'RW' || ((b.t === 'timer' || b.t === 'wdt') && r.n === 'CTRL')) continue; s += `    apb(1'b1, ${N[b.id]}_BASE + 32'(${N[b.id]}_${r.id}), 32'hA5A5_A5A5, v, e);\n    check(${N[b.id]}_BASE + 32'(${N[b.id]}_${r.id}), 32'hA5A5_A5A5 & ${sv32(r.m)}, "${b.name}.${r.n} pattern");\n`; }
    s += `\n    if (errors == 0) $display("TEST PASSED"); else $display("TEST FAILED: %0d errors", errors);\n    $finish;\n  end\nendmodule : tb\n`;
    return s;
  }
  const isVol = (b, r) => (b.t === 'timer' || b.t === 'wdt') && r.n === 'COUNT' || b.t === 'irq' && r.n !== 'ENABLE' || b.t === 'gpio' && r.n === 'IN';
  function genUVM(d) {
    const N = idents(d), apb = apbBlocks(d);
    const acc = a => a === 'W1C' ? 'W1C' : a;
    let s = head('UVM register model for the APB peripherals. Use it with your APB agent and an adapter.') + "`include \"uvm_macros.svh\"\npackage soc_ral_pkg;\n  import uvm_pkg::*;\n\n";
    for (const b of apb) for (const r of regsU(b)) {
      const cn = `${N[b.id].toLowerCase()}_${r.id.toLowerCase()}_reg`;
      s += `  class ${cn} extends uvm_reg;\n    \`uvm_object_utils(${cn})\n    rand uvm_reg_field value;\n    function new(string name = "${cn}");\n      super.new(name, 32, UVM_NO_COVERAGE);\n    endfunction\n    virtual function void build();\n      value = uvm_reg_field::type_id::create("value");\n      value.configure(this, 32, 0, "${acc(r.a)}", ${isVol(b, r) ? 1 : 0}, 32'h${(r.r >>> 0).toString(16).toUpperCase()}, ${r.a === 'WO' ? 0 : 1}, ${r.a === 'RW' ? 1 : 0}, 1);${r.a === 'WO' ? '  // write-only: no reset value to read back' : isVol(b, r) ? '  // changed by hardware: volatile' : ''}\n    endfunction\n  endclass\n\n`;
    }
    for (const b of apb) {
      const bn = `${N[b.id].toLowerCase()}_block`, rs = regsU(b);
      s += `  class ${bn} extends uvm_reg_block;\n    \`uvm_object_utils(${bn})\n${rs.map(r => `    rand ${N[b.id].toLowerCase()}_${r.id.toLowerCase()}_reg r_${r.id.toLowerCase()};`).join('\n')}\n    function new(string name = "${bn}");\n      super.new(name, UVM_NO_COVERAGE);\n    endfunction\n    virtual function void build();\n      default_map = create_map("map", 0, 4, UVM_LITTLE_ENDIAN);\n`;
      for (const r of rs) { const k = r.id.toLowerCase(), v = 'r_' + k; s += `      ${v} = ${N[b.id].toLowerCase()}_${k}_reg::type_id::create("${k}");\n      ${v}.configure(this);\n      ${v}.build();\n      default_map.add_reg(${v}, 'h${r.o.toString(16).toUpperCase()}, "${r.a === 'WO' ? 'WO' : r.a === 'RO' ? 'RO' : 'RW'}");\n`; }
      s += `      lock_model();\n    endfunction\n  endclass\n\n`;
    }
    s += `  // the whole SoC: one sub-block per peripheral at its base address\n  class soc_reg_block extends uvm_reg_block;\n    \`uvm_object_utils(soc_reg_block)\n${apb.map(b => `    rand ${N[b.id].toLowerCase()}_block blk_${N[b.id].toLowerCase()};`).join('\n')}\n    function new(string name = "soc_reg_block");\n      super.new(name, UVM_NO_COVERAGE);\n    endfunction\n    virtual function void build();\n      default_map = create_map("map", 0, 4, UVM_LITTLE_ENDIAN);\n`;
    for (const b of apb) { const k = N[b.id].toLowerCase(), v = 'blk_' + k; s += `      ${v} = ${k}_block::type_id::create("${k}");\n      ${v}.configure(this);\n      ${v}.build();\n      default_map.add_submap(${v}.default_map, 'h${(b.base >>> 0).toString(16).toUpperCase()});\n`; }
    s += `      lock_model();\n    endfunction\n  endclass\n\n`;
    s += `  // a register test: check every reset value through the bus\n  class soc_reset_test extends uvm_test;\n    \`uvm_component_utils(soc_reset_test)\n    soc_reg_block regmodel;\n    function new(string name, uvm_component parent);\n      super.new(name, parent);\n    endfunction\n    virtual function void build_phase(uvm_phase phase);\n      super.build_phase(phase);\n      regmodel = soc_reg_block::type_id::create("regmodel");\n      regmodel.build();\n      // connect regmodel.default_map to your APB agent's sequencer with an adapter here\n    endfunction\n    virtual task run_phase(uvm_phase phase);\n      uvm_reg_hw_reset_seq seq = uvm_reg_hw_reset_seq::type_id::create("seq");\n      phase.raise_objection(this);\n      seq.model = regmodel;\n      seq.start(null);\n      phase.drop_objection(this);\n    endtask\n  endclass\n\nendpackage : soc_ral_pkg\n`;
    return s;
  }
  function genRtl(d) { return [genPkg(d), genDecoders(d), ...apbBlocks(d).map(b => genRegBlock(d, b)), genApbSub(d)].join('\n'); }
  function specCSV(d) {
    const rows = [['Block', 'Base', 'Register', 'Offset', 'Address', 'Access', 'Reset', 'Description']];
    for (const b of apbBlocks(d)) for (const r of L.regsOf(b)) rows.push([b.name, L.HA(b.base), r.n, '0x' + r.o.toString(16).toUpperCase().padStart(3, '0'), L.HA(b.base + r.o), r.a, L.H(r.r), r.d]);
    return rows.map(r => r.map(c => /[",]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n') + '\n';
  }
  L.gen = {pkg: genPkg, decoders: genDecoders, rtl: genRtl, tb: genTb, uvm: genUVM, csv: specCSV, apbBlocks, axiBlocks, regsU};
})();
