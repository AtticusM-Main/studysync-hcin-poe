(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const MODULES = [
    ['COMS101', 'Introduction to Computer Science'],
    ['INFS202', 'Information Systems'],
    ['MATH201', 'Linear Algebra'],
    ['STAT200', 'Statistics for Business'],
    ['PHYS110', 'Physics for Engineers'],
    ['ACCT101', 'Financial Accounting'],
    ['HCIN201', 'Human-Computer Interaction']
  ];

  /* ---------- Toasts (visibility of system status, undo) ---------- */
  function toast(message, opts = {}) {
    let area = $('.toast-area');
    if (!area) {
      area = document.createElement('div');
      area.className = 'toast-area';
      area.setAttribute('role', 'status');
      area.setAttribute('aria-live', 'polite');
      document.body.appendChild(area);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (opts.type || '');
    const span = document.createElement('span');
    span.textContent = message;
    t.appendChild(span);
    if (opts.undo) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Undo';
      b.addEventListener('click', () => { opts.undo(); t.remove(); });
      t.appendChild(b);
    }
    area.appendChild(t);
    // Toasts with an action stay longer and pause while hovered or focused (WCAG 2.2.1 Timing adjustable)
    const life = opts.undo ? 12000 : (opts.time || 6000);
    let timer = setTimeout(() => t.remove(), life);
    const hold = () => clearTimeout(timer);
    const resume = () => { clearTimeout(timer); timer = setTimeout(() => t.remove(), 4000); };
    t.addEventListener('mouseenter', hold);
    t.addEventListener('focusin', hold);
    t.addEventListener('mouseleave', resume);
    t.addEventListener('focusout', resume);
  }
  window.toast = toast;

  /* ---------- Confirmation dialog (error prevention) ---------- */
  function confirmDialog(title, text, okLabel, onOk) {
    const d = document.createElement('dialog');
    d.setAttribute('aria-labelledby', 'cd-title');
    d.innerHTML = '<h2 id="cd-title"></h2><p></p><div class="form-actions">' +
      '<button type="button" class="btn ghost" data-cancel>Cancel</button>' +
      '<button type="button" class="btn danger" data-ok></button></div>';
    $('h2', d).textContent = title;
    $('p', d).textContent = text;
    $('[data-ok]', d).textContent = okLabel;
    document.body.appendChild(d);
    d.showModal();
    $('[data-cancel]', d).addEventListener('click', () => { d.close(); d.remove(); });
    $('[data-ok]', d).addEventListener('click', () => { d.close(); d.remove(); onOk(); });
    d.addEventListener('cancel', () => d.remove());
  }

  /* ---------- Header: menu, notifications, accessibility tools ---------- */
  const menuBtn = $('.menu-toggle');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const nav = $('.main-nav');
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
  }

  const bell = $('#bell');
  if (bell) {
    const pop = $('#notif-pop');
    bell.addEventListener('click', () => {
      const show = pop.hidden;
      pop.hidden = !show;
      bell.setAttribute('aria-expanded', show);
      const dot = $('.badge-dot', bell);
      if (show && dot) dot.remove();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !pop.hidden) { pop.hidden = true; bell.setAttribute('aria-expanded', false); bell.focus(); }
    });
  }

  /* Accessibility preferences are remembered across pages and visits (POE update) */
  const store = {
    get(k) { try { return localStorage.getItem('ss-' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('ss-' + k, v); } catch (e) { /* storage blocked */ } }
  };
  let scale = parseFloat(store.get('scale')) || 1;
  const bigger = $('#text-bigger');
  const smaller = $('#text-smaller');
  const contrast = $('#contrast');
  const applyScale = () => {
    scale = Math.round(scale * 10) / 10;
    document.documentElement.style.setProperty('--font-scale', scale);
    store.set('scale', scale);
    if (bigger) bigger.disabled = scale >= 1.4;
    if (smaller) smaller.disabled = scale <= .9;
  };
  applyScale();
  if (store.get('contrast') === '1') {
    document.body.classList.add('high-contrast');
    if (contrast) contrast.setAttribute('aria-pressed', 'true');
  }
  if (bigger) bigger.addEventListener('click', () => { scale = Math.min(1.4, scale + .1); applyScale(); toast('Text size ' + Math.round(scale * 100) + '%. Saved for every page.', { time: 2500 }); });
  if (smaller) smaller.addEventListener('click', () => { scale = Math.max(.9, scale - .1); applyScale(); toast('Text size ' + Math.round(scale * 100) + '%. Saved for every page.', { time: 2500 }); });
  if (contrast) contrast.addEventListener('click', () => {
    const on = document.body.classList.toggle('high-contrast');
    contrast.setAttribute('aria-pressed', on);
    store.set('contrast', on ? '1' : '0');
    toast('High contrast ' + (on ? 'on' : 'off') + '.', { time: 2500 });
  });

  /* ---------- Getting-started tips (learnability) ---------- */
  const onboard = $('#onboard');
  if (onboard) {
    if (store.get('onboarded') === '1') onboard.hidden = true;
    $('#onboard-close').addEventListener('click', () => {
      onboard.hidden = true;
      store.set('onboarded', '1');
      toast('Tips hidden. Your dashboard is all set.', { time: 3000 });
      $('#main').focus();
    });
  }

  /* ---------- Module search with drop-down suggestions (behaviour) ---------- */
  const search = $('#module-search');
  if (search) {
    const list = $('#module-suggestions');
    let idx = -1;
    const render = () => {
      const q = search.value.trim().toUpperCase();
      list.innerHTML = '';
      idx = -1;
      if (!q) { list.hidden = true; search.setAttribute('aria-expanded', false); return; }
      const hits = MODULES.filter(m => m[0].includes(q) || m[1].toUpperCase().includes(q));
      if (!hits.length) {
        const li = document.createElement('li');
        li.textContent = 'No modules match "' + search.value + '". Try a code such as COMS101.';
        list.appendChild(li);
      }
      hits.forEach((m, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.id = 'sug-' + i;
        li.innerHTML = '<b>' + m[0] + '</b> – ' + m[1];
        li.addEventListener('mousedown', e => { e.preventDefault(); pick(m); });
        list.appendChild(li);
      });
      list.hidden = false;
      search.setAttribute('aria-expanded', true);
    };
    const pick = m => {
      search.value = m[0];
      list.hidden = true;
      search.setAttribute('aria-expanded', false);
      filterGroups(m[0]);
    };
    search.addEventListener('input', () => { render(); filterGroups(search.value.trim().toUpperCase()); });
    search.addEventListener('keydown', e => {
      const items = $$('li[role="option"]', list);
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); idx = (idx + 1) % items.length; }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; }
      else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); items[idx].dispatchEvent(new MouseEvent('mousedown')); return; }
      else if (e.key === 'Escape') { list.hidden = true; return; }
      else return;
      items.forEach((li, i) => li.setAttribute('aria-selected', i === idx));
      search.setAttribute('aria-activedescendant', items[idx].id);
    });
    search.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 120));
  }

  function filterGroups(code) {
    const cards = $$('[data-module]');
    if (!cards.length) return;
    let shown = 0;
    cards.forEach(c => {
      const hit = !code || c.dataset.module.includes(code) || (c.dataset.title || '').toUpperCase().includes(code);
      c.hidden = !hit;
      if (hit) shown++;
    });
    const status = $('#result-count');
    if (status) status.textContent = shown + (shown === 1 ? ' group found' : ' groups found');
  }

  /* ---------- Quick Join (efficiency) ---------- */
  $$('[data-join]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.join;
      btn.disabled = true;
      btn.innerHTML = '<span class="loading" aria-hidden="true"></span> Joining…';
      setTimeout(() => {
        btn.textContent = 'Joined ✓';
        btn.classList.add('secondary');
        toast('Welcome to ' + name + '! 🎉 You\'re now part of the group.', { type: 'success' });
      }, 800);
    });
  });

  /* ---------- Create group form: disable submit until valid ---------- */
  const createBtn = $('#open-create');
  const createDlg = $('#create-dialog');
  if (createBtn && createDlg) {
    createBtn.addEventListener('click', () => createDlg.showModal());
    const form = $('form', createDlg);
    const submit = $('[type="submit"]', form);
    const name = $('#g-name');
    const mod = $('#g-module');
    const err = $('#g-name-err');
    const check = () => {
      const nameOk = name.value.trim().length >= 4;
      const modOk = mod.value !== '';
      name.setAttribute('aria-invalid', name.value.length > 0 && !nameOk);
      err.textContent = name.value.length > 0 && !nameOk ? 'Please use at least 4 characters for the group name.' : '';
      submit.disabled = !(nameOk && modOk);
    };
    name.addEventListener('input', check);
    mod.addEventListener('change', check);
    check();
    $('[data-cancel]', form).addEventListener('click', () => createDlg.close());
    form.addEventListener('submit', e => {
      e.preventDefault();
      const grid = $('#group-grid');
      const card = document.createElement('article');
      card.className = 'card group-card';
      card.dataset.module = mod.value;
      card.dataset.title = name.value;
      card.innerHTML = '<div class="row"><h3></h3><span class="chip green">New</span></div>' +
        '<div class="chips"><span class="chip"></span></div><p class="meta">1 member · You are the organiser</p>' +
        '<a class="btn small" href="group.html">Open workspace</a>';
      $('h3', card).textContent = name.value.trim();
      $('.chip', card).textContent = mod.value;
      grid.prepend(card);
      createDlg.close();
      form.reset();
      check();
      toast('Study group created. Invite classmates to get started!', { type: 'success' });
    });
  }

  /* ---------- Filter chips ---------- */
  $$('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.closest('[data-filter-group]');
      $$('.filter-chip', group).forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      const v = chip.dataset.filter;
      $$('[data-type]').forEach(r => { r.hidden = v !== 'all' && r.dataset.type !== v; });
      const status = $('#filter-status');
      if (status) status.textContent = 'Showing ' + (v === 'all' ? 'all resources' : v + ' resources');
    });
  });

  /* ---------- Tabs ---------- */
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const select = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
        if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length]);
      });
    });
  });

  /* ---------- Chat ---------- */
  const chatForm = $('#chat-form');
  if (chatForm) {
    const log = $('#chat-log');
    const input = $('#chat-input');
    const send = $('[type="submit"]', chatForm);
    const sync = () => { send.disabled = !input.value.trim(); };
    input.addEventListener('input', sync);
    sync();
    log.scrollTop = log.scrollHeight;
    chatForm.addEventListener('submit', e => {
      e.preventDefault();
      const m = document.createElement('div');
      m.className = 'msg me';
      m.innerHTML = '<span class="avatar sm" aria-hidden="true">TM</span><div class="bubble"><div class="who">You · just now</div><div></div></div>';
      $('.bubble div:last-child', m).textContent = input.value.trim();
      log.appendChild(m);
      input.value = '';
      sync();
      log.scrollTop = log.scrollHeight;
      setTimeout(() => {
        const r = document.createElement('div');
        r.className = 'msg';
        r.innerHTML = '<span class="avatar sm c2" aria-hidden="true">LK</span><div class="bubble"><div class="who">Lebo K. · just now</div><div>Great point! Let\'s add it to the whiteboard. ✏️</div></div>';
        log.appendChild(r);
        log.scrollTop = log.scrollHeight;
      }, 1200);
    });
  }

  /* ---------- Whiteboard ---------- */
  const canvas = $('#whiteboard');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width; canvas.height = r.height;
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.fillStyle = '#1f2937'; ctx.font = '16px Segoe UI, sans-serif';
      ctx.fillText('Q3: Show that det(AB) = det(A)·det(B)', 16, 28);
      ctx.strokeStyle = '#1d4ed8';
      ctx.beginPath(); ctx.moveTo(16, 40); ctx.lineTo(300, 40); ctx.stroke();
      ctx.fillStyle = '#0f766e'; ctx.fillText('Step 1: expand along first row ✔', 16, 70);
    };
    const tabBtn = $('#t-board');
    if (tabBtn) tabBtn.addEventListener('click', () => setTimeout(fit, 0));
    let drawing = false;
    let colour = '#1d4ed8';
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', e => { drawing = true; const [x, y] = pos(e); ctx.strokeStyle = colour; ctx.beginPath(); ctx.moveTo(x, y); });
    canvas.addEventListener('pointermove', e => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); });
    ['pointerup', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => { drawing = false; }));
    $$('.swatch').forEach(s => s.addEventListener('click', () => {
      colour = s.dataset.colour;
      $$('.swatch').forEach(x => x.setAttribute('aria-pressed', x === s));
    }));
    $('#wb-clear').addEventListener('click', () => {
      confirmDialog('Clear the whiteboard?', 'Everyone in the group will see an empty board. This cannot be undone.', 'Clear board', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        toast('Whiteboard cleared.');
      });
    });
  }

  /* ---------- Discussion posts: delete with undo ---------- */
  $$('[data-delete-post]').forEach(btn => {
    btn.addEventListener('click', () => {
      const post = btn.closest('.post');
      confirmDialog('Delete this post?', 'The post will be removed from the discussion board. You can undo this straight afterwards.', 'Delete post', () => {
        post.hidden = true;
        toast('Post deleted.', { undo: () => { post.hidden = false; toast('Post restored.'); } });
      });
    });
  });

  /* ---------- Report content ---------- */
  $$('[data-report]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = $('#report-dialog');
      d.showModal();
      $('[data-cancel]', d).onclick = () => d.close();
      $('form', d).onsubmit = e => { e.preventDefault(); d.close(); toast('Thanks for helping keep StudySync respectful. A moderator will review this.', { type: 'success' }); };
    });
  });

  /* ---------- Ratings ---------- */
  $$('.stars input').forEach(r => r.addEventListener('change', () => {
    toast('Thanks! You rated this ' + r.value + ' out of 5.', { type: 'success', time: 3000 });
  }));

  /* ---------- Add friend ---------- */
  $$('[data-friend]').forEach(btn => btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on);
    btn.textContent = on ? 'Request sent ✓' : 'Add friend';
    if (on) toast('Friend request sent to ' + btn.dataset.friend + '.');
  }));

  /* ---------- Upload with progress ---------- */
  const upForm = $('#upload-form');
  if (upForm) {
    const file = $('#u-file');
    const title = $('#u-title');
    const mod = $('#u-module');
    const btn = $('[type="submit"]', upForm);
    const bar = $('#upload-bar');
    const barWrap = $('#upload-progress');
    const msg = $('#upload-status');
    const check = () => { btn.disabled = !(title.value.trim().length >= 3 && mod.value && file.value); };
    [title, mod, file].forEach(el => el.addEventListener('input', check));
    check();
    upForm.addEventListener('submit', e => {
      e.preventDefault();
      btn.disabled = true;
      barWrap.hidden = false;
      let p = 0;
      const timer = setInterval(() => {
        p += 8;
        bar.style.width = Math.min(p, 100) + '%';
        barWrap.setAttribute('aria-valuenow', Math.min(p, 100));
        msg.textContent = 'Uploading… ' + Math.min(p, 100) + '%';
        if (p >= 100) {
          clearInterval(timer);
          msg.innerHTML = '✅ Uploaded successfully. You earned <b>+10 reputation points</b> – thank you for sharing!';
          toast('Resource uploaded. +10 reputation points!', { type: 'success' });
        }
      }, 140);
    });
  }

  /* ---------- Log study hours (dashboard) ---------- */
  const hoursForm = $('#hours-form');
  if (hoursForm) {
    let total = 12;
    const goal = 20;
    const input = $('#hours-input');
    const btn = $('[type="submit"]', hoursForm);
    const bar = $('#hours-bar');
    const txt = $('#hours-text');
    const err = $('#hours-err');
    const check = () => {
      const v = parseFloat(input.value);
      const ok = v > 0 && v <= 12;
      err.textContent = input.value && !ok ? 'Enter a number between 0.5 and 12.' : '';
      input.setAttribute('aria-invalid', !!input.value && !ok);
      btn.disabled = !ok;
    };
    input.addEventListener('input', check);
    check();
    hoursForm.addEventListener('submit', e => {
      e.preventDefault();
      total += parseFloat(input.value);
      const pct = Math.min(100, Math.round(total / goal * 100));
      bar.style.width = pct + '%';
      $('#hours-progress').setAttribute('aria-valuenow', pct);
      txt.textContent = total + ' of ' + goal + ' hours this week (' + pct + '%)';
      toast(total >= goal ? 'Goal reached! Amazing effort this week! 🏆' : 'Logged! Every session counts – keep it up. 💪', { type: 'success' });
      input.value = '';
      check();
    });
  }

  /* ---------- Focus timer (POE update: time, emotion, goal tracking) ---------- */
  const tStart = $('#timer-start');
  if (tStart) {
    const face = $('#timer-face');
    const bar = $('#timer-bar');
    const status = $('#timer-status');
    const reset = $('#timer-reset');
    let length = 25 * 60, left = length, tick = null;
    const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const draw = () => {
      face.textContent = fmt(left);
      bar.style.width = Math.round((length - left) / length * 100) + '%';
      document.title = (tick ? fmt(left) + ' · ' : '') + 'Dashboard – StudySync';
    };
    const stop = () => { clearInterval(tick); tick = null; };
    const finish = () => {
      stop();
      const hrs = length / 3600;
      const form = $('#hours-form');
      if (form) { $('#hours-input').value = Math.round(hrs * 2) / 2 || 0.5; $('#hours-input').dispatchEvent(new Event('input')); }
      status.textContent = 'Session complete! 🎉 Take a 5-minute break – stretch, drink water. Your time is ready to log below.';
      tStart.textContent = '▶ Start again';
      left = length; draw();
    };
    tStart.addEventListener('click', () => {
      if (tick) {
        stop();
        tStart.textContent = '▶ Resume';
        status.textContent = 'Paused at ' + fmt(left) + '. Resume when you are ready.';
      } else {
        tick = setInterval(() => { left--; draw(); if (left <= 0) finish(); }, 1000);
        tStart.textContent = '❚❚ Pause';
        status.textContent = 'Focusing… you\'ve got this. Notifications are muted during the session. 🔕';
        reset.disabled = false;
      }
      draw();
    });
    reset.addEventListener('click', () => {
      stop(); left = length; draw();
      tStart.textContent = '▶ Start';
      reset.disabled = true;
      status.textContent = 'Timer reset. Ready when you are.';
    });
    $$('.mode-chip').forEach(c => c.addEventListener('click', () => {
      $$('.mode-chip').forEach(x => x.setAttribute('aria-pressed', x === c));
      stop();
      length = left = parseInt(c.dataset.minutes, 10) * 60;
      tStart.textContent = '▶ Start'; reset.disabled = true;
      status.textContent = c.dataset.minutes + '-minute session selected.';
      draw();
    }));
    window.ssTimerDemo = secs => { left = secs; draw(); }; // used only to capture report screenshots
    draw();
  }

  /* ---------- Shared notes with presence and autosave (social, co-editing) ---------- */
  const notes = $('#notes-area');
  if (notes) {
    const save = $('#save-state');
    const presence = $('#presence-text');
    let saveTimer = null, remoteDone = false;
    notes.addEventListener('input', () => {
      save.textContent = 'Saving…';
      save.className = 'save-state busy';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { save.textContent = '✓ All changes saved'; save.className = 'save-state'; }, 900);
    });
    const remote = () => {
      if (remoteDone) return;
      remoteDone = true;
      presence.textContent = 'Sipho D. is typing…';
      setTimeout(() => {
        notes.value += '• Example: factorial(n) = n × factorial(n − 1), base case factorial(0) = 1.  — added by Sipho D.\n';
        presence.textContent = 'You and Sipho D. are editing';
        toast('Sipho D. added an example to the shared notes.', { time: 3500 });
      }, 1800);
    };
    const notesTab = $('#t-notes');
    if (notesTab) notesTab.addEventListener('click', () => setTimeout(remote, 600));
  }

  /* ---------- Chat reactions (social + emotional) ---------- */
  const addReactions = msg => {
    const bubble = $('.bubble', msg);
    if (!bubble || $('.reactions', bubble)) return;
    const wrap = document.createElement('div');
    wrap.className = 'reactions';
    [['👍', 'Agree'], ['💡', 'Helpful'], ['🙏', 'Thanks']].forEach(([emo, name]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'react';
      b.setAttribute('aria-pressed', 'false');
      b.dataset.count = '0';
      b.innerHTML = '<span aria-hidden="true">' + emo + '</span> <span class="n"></span>';
      b.setAttribute('aria-label', 'React ' + name);
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        const n = parseInt(b.dataset.count, 10) + (on ? 1 : -1);
        b.dataset.count = n;
        b.setAttribute('aria-pressed', on);
        $('.n', b).textContent = n || '';
        b.setAttribute('aria-label', 'React ' + name + (n ? ', ' + n : ''));
      });
      wrap.appendChild(b);
    });
    bubble.appendChild(wrap);
  };
  $$('#chat-log .msg:not(.me)').forEach(addReactions);
  const chatLog = $('#chat-log');
  if (chatLog) new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.classList && n.classList.contains('msg') && !n.classList.contains('me')) addReactions(n);
  }))).observe(chatLog, { childList: true });

  /* ---------- Module chips on profile (personalisation) ---------- */
  $$('[data-module-toggle]').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    toast((on ? 'Added ' : 'Removed ') + b.dataset.moduleToggle + (on ? ' to' : ' from') + ' your dashboard.', { time: 3000 });
  }));
})();
