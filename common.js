/* SoC Playground: shared helpers (sidebar, quiz, copy buttons) */
window.UI = (() => {
  const hex = (v, w = 2) => '0x' + v.toString(16).toUpperCase().padStart(w, '0');
  const bin = (v, w = 8) => v.toString(2).padStart(w, '0');

  /* sidebar: "Pages" heading + this page's section links (desktop only, via CSS) */
  function sidebar() {
    const s = document.querySelector('.series'), t = document.querySelector('nav.toc');
    if (!s) return;
    const home = s.querySelector('.home');
    const ph = document.createElement('span'); ph.className = 'sh'; ph.textContent = 'Pages'; home.after(ph);
    if (!t) return;
    const h = document.createElement('span'); h.className = 'sh'; h.textContent = 'On this page'; s.appendChild(h);
    for (const a of t.querySelectorAll('a')) {
      if (!(a.getAttribute('href') || '').startsWith('#')) continue;
      const c = a.cloneNode(true); c.className = 'sec'; s.appendChild(c);
    }
  }

  /* quiz: Q = [[question, [options], correctIndex, explanation], ...] */
  function quiz(el, Q) {
    el.innerHTML = Q.map((q, i) => `<div class="q" data-q="${i}"><p>${i + 1}. ${q[0]}</p><div class="opts">${q[1].map((o, j) => `<button type="button" data-j="${j}">${o}</button>`).join('')}</div><div class="exp" hidden>${q[3]}</div></div>`).join('');
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const box = b.closest('.q'), q = Q[box.dataset.q];
      for (const x of box.querySelectorAll('button')) x.classList.remove('right', 'wrong');
      b.classList.add(+b.dataset.j === q[2] ? 'right' : 'wrong');
      box.querySelectorAll('button')[q[2]].classList.add('right');
      box.querySelector('.exp').hidden = false;
    });
  }

  /* copy buttons: <button data-copy="id"> copies the text of #id */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const t = document.getElementById(b.dataset.copy).textContent;
    const done = m => { b.textContent = m; setTimeout(() => b.textContent = 'Copy', 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => done('Copied'), () => done('Select & copy'));
    else done('Select & copy');
  });

  document.addEventListener('DOMContentLoaded', sidebar);
  return { hex, bin, quiz };
})();
