/* Library — classic script (no modules) so it runs identically on file:// and GitHub Pages. */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = { local: 'library.local.entries.v1', pins: 'library.pins.v1', recents: 'library.recents.v1', notes: 'library.notes.v1' };
  var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  // Every node is built with createElement + textContent; user strings never touch innerHTML.
  function el(tag, cls, text, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }
  function btn(label, act, id, list, extra) {
    var a = { type: 'button', 'data-act': act, 'data-id': id, 'data-list': list, 'data-k': list + ':' + id + ':' + act };
    for (var k in extra || {}) a[k] = extra[k];
    return el('button', 'action', label, a);
  }
  // Only http(s) URLs may become links.
  function safeUrl(u) {
    try { var p = new URL(String(u)).protocol; return p === 'http:' || p === 'https:'; } catch (e) { return false; }
  }

  /* ---------- storage (every access guarded) ---------- */
  var storage = {
    broken: false,
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { this.fail(); return d; }
    },
    set: function (k, v) {
      if (this.broken) return false;
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { this.fail(); return false; }
    },
    remove: function (k) { try { localStorage.removeItem(k); } catch (e) { this.fail(); } },
    fail: function () { this.broken = true; if (!bannerDismissed) $('banner').hidden = false; }
  };
  var bannerDismissed = false;

  /* ---------- state ---------- */
  var seed = Array.isArray(window.LIBRARY_DATA) ? window.LIBRARY_DATA : [];
  var local = storage.get(KEYS.local, []);
  var pins = storage.get(KEYS.pins, []);
  var recents = storage.get(KEYS.recents, []);
  var notes = storage.get(KEYS.notes, {});
  if (!Array.isArray(local)) local = [];
  if (!Array.isArray(pins)) pins = [];
  if (!Array.isArray(recents)) recents = [];
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) notes = {};
  storage.set('library.probe', 1); storage.remove('library.probe'); // surface failures at load
  var state = { q: '', cat: '', editing: null }; // editing = { id, list, draft }

  function all() { return seed.concat(local); }
  function byTitle(a, b) { return a.title.localeCompare(b.title); }
  function haystack(e) {
    return [e.title, e.description, (e.tags || []).join(' '), e.domain, e.url].join('\n').toLowerCase();
  }
  function matches(e) {
    if (state.cat && e.category !== state.cat) return false;
    return !state.q || haystack(e).indexOf(state.q) !== -1;
  }
  function categories() {
    var c = {};
    all().forEach(function (e) { c[e.category] = (c[e.category] || 0) + 1; });
    return c;
  }

  /* ---------- rendering ---------- */
  function row(e, i, list) {
    var pinned = pins.indexOf(e.id) !== -1, note = notes[e.id], ok = safeUrl(e.url);
    var ed = state.editing && state.editing.id === e.id && state.editing.list === list ? state.editing : null;
    var li = el('li'), art = el('article', 'entry');
    art.appendChild(el('div', 'idx', pad(i + 1)));

    var main = el('div'), line = el('div');
    if (pinned || note) {
      line.appendChild(el('span', 'dot', null, { role: 'img', 'aria-label': [pinned && 'Pinned', note && 'Has note'].filter(Boolean).join(', ') }));
    }
    line.appendChild(ok
      ? el('a', 'title', e.title, { href: e.url, target: '_blank', rel: 'noopener noreferrer', 'data-act': 'open', 'data-id': e.id, 'data-k': list + ':' + e.id + ':t' })
      : el('span', 'title', e.title));
    main.appendChild(line);
    main.appendChild(el('p', 'desc', e.description || '', { title: e.description || '' }));
    if (note && !ed) main.appendChild(el('p', 'note-saved', note));
    if (ed) {
      var box = el('div', 'note-box');
      box.appendChild(el('label', null, 'Note for ' + e.title, { for: 'note-' + list + e.id }));
      var ta = el('textarea', null, null, { id: 'note-' + list + e.id, rows: '3', placeholder: 'Add a private note…', 'data-k': list + ':' + e.id + ':ta' });
      ta.value = ed.draft;
      box.appendChild(ta);
      var acts = el('div', 'actions');
      acts.appendChild(btn('SAVE NOTE', 'note-save', e.id, list));
      acts.appendChild(btn('CANCEL', 'note-cancel', e.id, list));
      box.appendChild(acts);
      main.appendChild(box);
    }
    art.appendChild(main);

    var meta = el('div', 'meta');
    meta.appendChild(el('div', 'cat', e.category));
    meta.appendChild(el('div', 'dom', e.domain));
    if (e.local) meta.appendChild(el('span', 'local', 'LOCAL'));
    art.appendChild(meta);

    var acts2 = el('div', 'actions');
    if (ok) acts2.appendChild(el('a', 'action primary', 'OPEN', { href: e.url, target: '_blank', rel: 'noopener noreferrer', 'data-act': 'open', 'data-id': e.id, 'aria-label': 'Open ' + e.title + ' in a new tab', 'data-k': list + ':' + e.id + ':o' }));
    acts2.appendChild(btn('COPY', 'copy', e.id, list, { 'aria-label': 'Copy link to ' + e.title }));
    var pb = btn(pinned ? 'UNPIN' : 'PIN', 'pin', e.id, list, { 'aria-pressed': String(pinned), 'aria-label': (pinned ? 'Unpin ' : 'Pin ') + e.title });
    if (pinned) pb.prepend(el('span', 'dot sq', null, { 'aria-hidden': 'true' }));
    acts2.appendChild(pb);
    var nb = btn('NOTE', 'note', e.id, list, { 'aria-expanded': String(!!ed), 'aria-label': (note ? 'Edit note for ' : 'Add note to ') + e.title });
    if (note) nb.append(el('span', 'dot end', null, { 'aria-hidden': 'true' }));
    acts2.appendChild(nb);
    art.appendChild(acts2);
    li.appendChild(art);
    return li;
  }

  function fill(ol, entries, list) {
    var frag = document.createDocumentFragment();
    entries.forEach(function (e, i) { frag.appendChild(row(e, i, list)); });
    ol.replaceChildren(frag);
  }

  function render(focusK) {
    var a = document.activeElement, sel = a && a.tagName === 'TEXTAREA' ? [a.selectionStart, a.selectionEnd] : null;
    var keep = focusK || (a && a.dataset && a.dataset.k);
    var everything = all(), cats = categories(), names = Object.keys(cats).sort();
    var shown = everything.filter(matches).sort(byTitle);
    var pinned = shown.filter(function (e) { return pins.indexOf(e.id) !== -1; });
    var recent = recents.map(function (id) { return shown.filter(function (e) { return e.id === id; })[0]; })
      .filter(Boolean).slice(0, 5);

    $('count').replaceChildren(everything.length + ' entries', el('span', 'cats', ' · ' + names.length + ' categories'));
    $('foot-count').textContent = everything.length + ' entries';
    $('foot-text').textContent = 'Stored in this browser only · nothing syncs' + (local.length ? ' · ' + local.length + ' local' : '');

    // category select + chips (kept in sync)
    var opts = [el('option', null, 'All categories', { value: '' })];
    names.forEach(function (n) { opts.push(el('option', null, n, { value: n })); });
    $('cat').replaceChildren.apply($('cat'), opts);
    $('cat').value = state.cat;
    var chips = [chip('All (' + everything.length + ')', '')];
    names.forEach(function (n) { chips.push(chip(n + ' (' + cats[n] + ')', n)); });
    $('chips').replaceChildren.apply($('chips'), chips);
    $('cat-list').replaceChildren.apply($('cat-list'), names.map(function (n) { return el('option', null, null, { value: n }); }));

    $('firstrun').hidden = !!(pins.length || recents.length);

    // sections
    $('pinned').hidden = !pinned.length;
    $('n-pinned').textContent = pinned.length;
    fill($('pinned-list'), pinned, 'p');
    $('recent').hidden = !recent.length;
    $('recent-sum').textContent = recent.length + (recent.length === 1 ? ' entry' : ' entries');
    fill($('recent-list'), recent, 'r');
    $('n-all').textContent = shown.length;
    fill($('list'), shown, 'a');

    var none = !shown.length;
    $('empty').hidden = !none;
    $('clear-btn').hidden = !everything.length;
    $('empty-msg').textContent = everything.length ? 'Nothing matches that. Clear search or filters.' : 'No entries yet. Add one, or put it in data.js.';

    if (keep) {
      var t = document.querySelector('[data-k="' + keep + '"]');
      if (t) { t.focus(); if (sel && t.tagName === 'TEXTAREA') t.setSelectionRange(sel[0], sel[1]); }
    }
    return shown.length;
  }

  function chip(label, cat) {
    return el('button', 'chip', label, { type: 'button', 'data-act': 'chip', 'data-cat': cat, 'data-k': 'chip:' + cat, 'aria-pressed': String(state.cat === cat) });
  }

  /* ---------- feedback ---------- */
  var statusTimer;
  function say(msg) {
    var s = $('status'); s.textContent = '';
    clearTimeout(statusTimer); statusTimer = setTimeout(function () { s.textContent = msg; }, 30);
  }

  function copyText(text) {
    function fallback() {
      var prev = document.activeElement, ta = el('textarea', 'sr', null, { 'aria-hidden': 'true', tabindex: '-1' });
      ta.value = text; document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); if (prev && prev.focus) prev.focus();
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  /* ---------- actions ---------- */
  function persist(key, val) { storage.set(key, val); }

  function recordOpen(id) {
    recents = [id].concat(recents.filter(function (x) { return x !== id; })).slice(0, 10);
    persist(KEYS.recents, recents);
    setTimeout(function () { render(); }, 0); // after the browser's link activation
  }

  function togglePin(id, list) {
    var i = pins.indexOf(id);
    if (i === -1) pins.push(id); else pins.splice(i, 1);
    persist(KEYS.pins, pins);
    render(list + ':' + id + ':pin');
  }

  function toggleNote(id, list) {
    var open = state.editing && state.editing.id === id && state.editing.list === list;
    state.editing = open ? null : { id: id, list: list, draft: notes[id] || '' };
    render(open ? list + ':' + id + ':note' : list + ':' + id + ':ta');
  }

  function saveNote() {
    var ed = state.editing; if (!ed) return;
    if (ed.draft.trim()) notes[ed.id] = ed.draft; else delete notes[ed.id];
    persist(KEYS.notes, notes);
    state.editing = null;
    render(ed.list + ':' + ed.id + ':note');
    say(notes[ed.id] ? 'Note saved.' : 'Note removed.');
  }

  function cancelNote() {
    var ed = state.editing; if (!ed) return;
    state.editing = null;
    render(ed.list + ':' + ed.id + ':note');
  }

  function copyLink(b, id) {
    var e = all().filter(function (x) { return x.id === id; })[0]; if (!e) return;
    copyText(e.url).then(function (ok) {
      say(ok ? 'Link copied.' : 'Could not copy link.');
      if (!ok) return;
      b.textContent = 'COPIED';
      setTimeout(function () { if (b.isConnected) b.textContent = 'COPY'; }, 1200);
    });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reveal(n) {
    var r = n.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    n.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  function exportJson() {
    var text = JSON.stringify(all(), null, 2), good = false;
    try { good = Array.isArray(JSON.parse(text)); } catch (e) { good = false; }
    if (!good) { say('Export failed: data did not validate.'); return; }
    copyText(text).then(function (ok) {
      if (ok) { say('JSON copied (' + all().length + ' entries).'); return; }
      var ta = $('export-ta'); ta.value = text;
      $('export-dlg').showModal(); ta.focus(); ta.select();
      say('Clipboard unavailable. Copy the JSON from the dialog.');
    });
  }
  var xdlg = $('export-dlg');
  $('export-copy').addEventListener('click', function () {
    var b = this, ta = $('export-ta');
    copyText(ta.value).then(function (ok) {
      ta.focus(); ta.select();
      say(ok ? 'JSON copied.' : 'Could not copy JSON. Select all and copy by hand.');
      if (!ok) return;
      b.textContent = 'COPIED'; setTimeout(function () { b.textContent = 'COPY'; }, 1200);
    });
  });
  $('export-close').addEventListener('click', function () { xdlg.close(); });
  xdlg.addEventListener('close', function () { $('export-btn').focus(); });

  function clearFilters() {
    state.q = ''; state.cat = ''; $('q').value = '';
    render(); $('q').focus(); reveal($('q'));
  }

  function setCat(c) { state.cat = c; render(); say(shownCount() + ' entries.'); }
  function shownCount() { return all().filter(matches).length; }

  /* ---------- events ---------- */
  var debounce;
  $('q').addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      state.q = $('q').value.trim().toLowerCase();
      var n = render();
      say(n + (n === 1 ? ' entry matches.' : ' entries match.'));
    }, 90);
  });
  $('cat').addEventListener('change', function () { setCat($('cat').value); });

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]'); if (!t) return;
    var act = t.dataset.act, id = t.dataset.id, list = t.dataset.list;
    if (act === 'open') recordOpen(id);
    else if (act === 'copy') copyLink(t, id);
    else if (act === 'pin') togglePin(id, list);
    else if (act === 'note') toggleNote(id, list);
    else if (act === 'note-save') saveNote();
    else if (act === 'note-cancel') cancelNote();
    else if (act === 'chip') setCat(t.dataset.cat);
  });
  document.addEventListener('auxclick', function (ev) {
    var t = ev.target.closest('a[data-act="open"]'); if (t) recordOpen(t.dataset.id);
  });
  document.addEventListener('input', function (ev) {
    if (state.editing && ev.target.tagName === 'TEXTAREA' && ev.target.dataset.k) state.editing.draft = ev.target.value;
  });
  $('clear-btn').addEventListener('click', clearFilters);
  $('banner-x').addEventListener('click', function () { bannerDismissed = true; $('banner').hidden = true; $('add-btn').focus(); });
  $('export-btn').addEventListener('click', exportJson);

  // keyboard
  function titles() {
    return Array.prototype.filter.call(document.querySelectorAll('.list a.title'), function (a) { return a.offsetParent !== null; });
  }
  function isTyping(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }

  document.addEventListener('keydown', function (ev) {
    var t = ev.target, dlg = $('dlg');
    if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (dlg.open || xdlg.open) return; // native dialog handles Escape and focus trap

    if (ev.key === 'Escape') {
      if (t.tagName === 'SELECT') return;
      if ($('q').value) { clearTimeout(debounce); $('q').value = ''; state.q = ''; render(); say('Search cleared.'); }
      else if (state.editing) cancelNote();
      else if (t && t.blur) t.blur();
      return;
    }
    if (ev.key === '/' && !isTyping(t)) { ev.preventDefault(); $('q').focus(); $('q').select(); reveal($('q')); return; }

    var list = titles();
    if (t === $('q') && ev.key === 'ArrowDown') {
      if (list.length) { ev.preventDefault(); list[0].focus(); }
      return;
    }
    if (t.matches && t.matches('.list a.title') && !isTyping(t)) {
      var d = ev.key === 'ArrowDown' || ev.key === 'j' ? 1 : ev.key === 'ArrowUp' || ev.key === 'k' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      list[(list.indexOf(t) + d + list.length) % list.length].focus();
    }
  });

  /* ---------- add-entry dialog ---------- */
  var dlg = $('dlg'), form = $('add-form');
  $('add-btn').addEventListener('click', function () {
    form.reset(); $('add-err').textContent = '';
    dlg.showModal(); form.elements.title.focus();
  });
  $('add-cancel').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', function () { $('add-btn').focus(); });
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = form.elements, title = f.title.value.trim(), url = f.url.value.trim(), err = $('add-err');
    if (!title) { err.textContent = 'Title is required.'; f.title.focus(); return; }
    if (!url) { err.textContent = 'URL is required.'; f.url.focus(); return; }
    if (!safeUrl(url)) { err.textContent = 'URL must start with http:// or https://.'; f.url.focus(); return; }
    local.push({
      id: 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: title, url: url, category: f.category.value.trim() || 'Uncategorised',
      domain: new URL(url).hostname, description: f.description.value.trim(),
      tags: f.tags.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      added: new Date().toISOString().slice(0, 10), local: true
    });
    persist(KEYS.local, local);
    render();
    dlg.close();
    say('Entry added locally.');
  });

  /* ---------- clock ---------- */
  function tick() {
    var d = new Date();
    $('clock').textContent = DAYS[d.getDay()] + ' ' + pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  tick(); setInterval(tick, 30000);

  render();
})();
