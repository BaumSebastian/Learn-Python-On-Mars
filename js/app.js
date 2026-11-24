/* Page logic: missions, editors, buttons, messages, progress. */
(function () {
  'use strict';

  var LEVELS = window.LEVELS, DOCS = window.COMMAND_DOCS, I18N = window.I18N;
  var DELAYS = [700, 420, 240, 110, 20];
  var TRACKS = ['rover', 'heli'];

  function $(id) { return document.getElementById(id); }

  /* ---------- saved progress (kept in the browser, per PC) ---------- */

  var store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem('rover.' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem('rover.' + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    }
  };

  /* index.html?reset clears the saved progress and code on this PC, e.g. before the next class.
   * The page then reloads without ?reset, so that a later reload does not clear things again. */
  var justReset = false;

  /* Deletes progress, stars and all programs saved on this PC. The chosen language stays. */
  function clearSaved() {
    try {
      Object.keys(window.localStorage).forEach(function (key) {
        if (key.indexOf('rover.') === 0 && key !== 'rover.lang') window.localStorage.removeItem(key);
      });
      window.sessionStorage.setItem('rover.resetDone', '1');
    } catch (e) { /* storage not available: nothing to clear */ }
  }

  if (/[?&]reset\b/.test(window.location.search)) {
    clearSaved();
    window.location.replace(window.location.href.split('?')[0]);
    return;
  }
  try {
    justReset = window.sessionStorage.getItem('rover.resetDone') === '1';
    window.sessionStorage.removeItem('rover.resetDone');
  } catch (e) { /* ignore */ }

  var lang = store.get('lang', null);
  if (lang !== 'en' && lang !== 'de') {
    lang = ((navigator.language || 'en').toLowerCase().indexOf('de') === 0) ? 'de' : 'en';
  }
  var levelIndex = Math.max(0, Math.min(LEVELS.length - 1, store.get('level', 0) | 0));
  var progress = store.get('progress', {});
  var mode = 'idle'; // idle | running | paused
  var runToken = 0;
  var runLines = { main: null, rover: null };
  var errLines = { main: null, rover: null };

  function t(key, vars) {
    var text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.split('{' + name + '}').join(String(vars[name]));
      });
    }
    return text;
  }
  function L(obj) { return obj ? (obj[lang] || obj.en || '') : ''; }
  function level() { return LEVELS[levelIndex]; }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- tracks: the rover missions and the helicopter missions ---------- */

  function trackOf(lv) { return lv.track || 'rover'; }
  function isDual(lv) { return !!lv.roverCode; }

  /* Positions in LEVELS of all missions of one track. */
  function trackLevels(track) {
    var list = [];
    LEVELS.forEach(function (lv, i) { if (trackOf(lv) === track) list.push(i); });
    return list;
  }

  function levelLabel(index) {
    var track = trackOf(LEVELS[index]);
    var pos = trackLevels(track).indexOf(index) + 1;
    return track === 'heli' ? 'H' + pos : String(pos);
  }

  /* ---------- game, runner, editors ---------- */

  var game = new window.Game($('game'), $('stage'));

  var config = window.ROVER_CONFIG || {};
  if (config.logo) {
    game.setLogo(config.logo);
    var brandLogo = $('brandLogo');
    brandLogo.onload = function () { brandLogo.hidden = false; };
    brandLogo.alt = config.logoTitle || '';
    brandLogo.title = config.logoTitle || '';
    brandLogo.src = config.logo;
  }

  var runner = new window.Runner(game, {
    onLine: function (actor, line) { markRunLine(panelOf(actor), line); },
    onOutput: function (text) { appendOutput(text); },
    onAction: function () { updateHud(); }
  });

  var pythonMode = { name: 'python', version: 3, extra_builtins: window.Runner.COMMANDS };

  var editor = window.CodeMirror.fromTextArea($('code'), {
    mode: pythonMode,
    theme: 'rover',
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    extraKeys: {
      Tab: function (cm) {
        if (cm.somethingSelected()) cm.indentSelection('add');
        else cm.replaceSelection('    ', 'end');
      },
      'Shift-Tab': function (cm) { cm.indentSelection('subtract'); },
      Backspace: function (cm) {
        if (cm.somethingSelected()) return window.CodeMirror.Pass;
        var cur = cm.getCursor(), before = cm.getLine(cur.line).slice(0, cur.ch);
        if (cur.ch === 0 || /[^ ]/.test(before)) return window.CodeMirror.Pass;
        var target = Math.floor((cur.ch - 1) / 4) * 4;
        cm.replaceRange('', { line: cur.line, ch: target }, cur);
      },
      'Ctrl-Enter': function () { onRun(); },
      'Cmd-Enter': function () { onRun(); },
      'Ctrl-Space': function (cm) { showHints(cm); },
      'Ctrl-/': 'toggleComment'
    }
  });

  /* The rover's fixed program in the helicopter missions: readable, not editable. */
  var roverEditor = window.CodeMirror.fromTextArea($('roverCode'), {
    mode: pythonMode,
    theme: 'rover',
    lineNumbers: true,
    lineWrapping: true,
    readOnly: 'nocursor'
  });

  var panels = { main: editor, rover: roverEditor };

  /* Which code panel shows the program of this vehicle? */
  function panelOf(actor) {
    return (isDual(level()) && actor === 'rover') ? 'rover' : 'main';
  }

  /* ---------- autocomplete ---------- */

  var KEYWORDS = ['for', 'in', 'range()', 'if', 'else:', 'elif', 'while', 'def', 'not', 'and', 'or',
    'True', 'False', 'return', 'print()', 'len()', 'abs()', 'append()', 'remove()'];
  var HINTS_BY_DOC = {
    move_right: ['move_right()'], move_left: ['move_left()'], move_up: ['move_up()'], move_down: ['move_down()'],
    collect: ['collect()'], is_sample: ['is_sample()'], scan: ['scan()'],
    can_move: ['can_move_right()', 'can_move_left()', 'can_move_up()', 'can_move_down()'],
    move: ['move()'], get_pos: ['get_x()', 'get_y()'],
    fly: ['fly_right()', 'fly_left()', 'fly_up()', 'fly_down()'],
    drop: ['drop()'], wait: ['wait()'], battery: ['battery()'],
    take_photo: ['take_photo()'], mark: ['mark()'], heli_pos: ['get_x()', 'get_y()'],
    get_plan: ['get_plan()'], send: ['send()'], take_thermal: ['take_thermal()'], small_photo: ['take_photo()']
  };

  /* Commands introduced up to the current mission, within its track. */
  function unlockedDocs() {
    var keys = [], list = trackLevels(trackOf(level()));
    for (var i = 0; i < list.length && list[i] <= levelIndex; i++) {
      keys = keys.concat(LEVELS[list[i]].api || []);
    }
    return keys;
  }

  function hintItems() {
    var items = [];
    unlockedDocs().forEach(function (key) {
      (HINTS_BY_DOC[key] || []).forEach(function (text) {
        items.push({ text: text, desc: L(DOCS[key]) });
      });
    });
    KEYWORDS.forEach(function (word) { items.push({ text: word, desc: '' }); });
    return items;
  }

  function roverHint(cm) {
    var cur = cm.getCursor(), line = cm.getLine(cur.line), start = cur.ch;
    while (start > 0 && /\w/.test(line.charAt(start - 1))) start--;
    var word = line.slice(start, cur.ch);
    if (!word) return null;
    var bracketFollows = line.charAt(cur.ch) === '(';
    var list = [];
    hintItems().forEach(function (item) {
      if (item.text.indexOf(word) !== 0 || item.text === word) return;
      var insert = (bracketFollows && /\(\)$/.test(item.text)) ? item.text.slice(0, -2) : item.text;
      list.push({
        text: insert,
        render: function (el) {
          var name = document.createElement('span');
          name.textContent = item.text;
          el.appendChild(name);
          if (item.desc) {
            var desc = document.createElement('span');
            desc.className = 'hint-desc';
            desc.textContent = item.desc;
            el.appendChild(desc);
          }
        }
      });
    });
    if (!list.length) return null;
    return { list: list, from: window.CodeMirror.Pos(cur.line, start), to: cur };
  }

  function showHints(cm) {
    cm.showHint({ hint: roverHint, completeSingle: false });
  }

  editor.on('inputRead', function (cm, change) {
    if (change.origin !== '+input' || cm.state.completionActive) return;
    if (!/^[A-Za-z_]$/.test(change.text[0] || '')) return;
    var cur = cm.getCursor(), type = cm.getTokenTypeAt(cur);
    if (type && /comment|string/.test(type)) return;
    var line = cm.getLine(cur.line), start = cur.ch;
    while (start > 0 && /\w/.test(line.charAt(start - 1))) start--;
    if (cur.ch - start >= 2) showHints(cm);
  });

  var saveTimer = null;
  editor.on('change', function () {
    clearErrLine('main');
    updateLineCount();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { store.set('code.' + level().id, editor.getValue()); }, 300);
  });

  /* ---------- line counting and stars ---------- */

  function countLines(code) {
    var n = 0;
    code.split('\n').forEach(function (raw) {
      var line = raw.replace(/#.*$/, '').trim().replace(/;+$/, '');
      if (!line) return;
      n += 1 + (line.match(/;/g) || []).length;
    });
    return n;
  }

  /* What the stars of a mission are measured in: lines of code, or battery used. */
  function measure(lv, code) {
    if (lv.starMetric === 'battery') {
      var h = game.world.heli;
      return h ? h.capacity - h.battery : 0;
    }
    return countLines(code);
  }

  /* [most for 3 stars, most for 2 stars]. A mission with a random field can work them out per run. */
  function starLimits(lv) {
    return (typeof lv.stars === 'function') ? lv.stars(game.world) : lv.stars;
  }

  function starsFor(lv, value) {
    if (!lv.stars) return 0;
    var limits = starLimits(lv);
    if (value <= limits[0]) return 3;
    if (value <= limits[1]) return 2;
    return 1;
  }

  /* Builds the field of a mission. build() returns the rows, or {rows, world} with extra settings. */
  function loadField(lv) {
    var built = lv.build(Math.random), opts = {}, key;
    for (key in (lv.world || {})) opts[key] = lv.world[key];
    if (built.world) for (key in built.world) opts[key] = built.world[key];
    game.load(built.rows || built, opts);
  }

  function starsHtml(count) {
    var html = '';
    for (var i = 1; i <= 3; i++) html += (i <= count) ? '★' : '<span class="off">★</span>';
    return html;
  }

  /* ---------- console ---------- */

  var consoleEl = $('console');

  function clearConsole() { consoleEl.innerHTML = ''; }

  function log(kind, html) {
    var div = document.createElement('div');
    div.className = kind;
    div.innerHTML = html;
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function appendOutput(text) {
    var last = consoleEl.lastElementChild;
    if (!last || last.className !== 'out') {
      last = document.createElement('div');
      last.className = 'out';
      consoleEl.appendChild(last);
    }
    last.textContent += text;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  /* panel: 'main' (the student's program) or 'rover' (the rover's fixed program) */
  function problem(text, line, pythonMessage, panel) {
    panel = panel || 'main';
    var where = '';
    if (line) {
      var place = t('atLine', { n: line });
      if (panel === 'rover') place = t('roverProgram') + ', ' + place;
      else if (isDual(level())) place = t('yourProgram') + ', ' + place;
      where = '<b>' + escapeHtml(place) + ':</b> ';
    }
    log('err', where + escapeHtml(text));
    if (pythonMessage) log('py', escapeHtml(pythonMessage));
    if (line) {
      clearErrLine(panel);
      var cm = panels[panel];
      if (line >= 1 && line <= cm.lineCount()) {
        errLines[panel] = cm.addLineClass(line - 1, 'background', 'err-line');
        cm.scrollIntoView({ line: line - 1, ch: 0 }, 40);
      }
    }
  }

  /* ---------- editor line marks ---------- */

  function markRunLine(panel, line) {
    clearRunLine(panel);
    var cm = panels[panel];
    if (line < 1 || line > cm.lineCount()) return;
    runLines[panel] = cm.addLineClass(line - 1, 'background', 'run-line');
    cm.scrollIntoView({ line: line - 1, ch: 0 }, 40);
  }
  function clearRunLine(panel) {
    if (runLines[panel]) {
      panels[panel].removeLineClass(runLines[panel], 'background', 'run-line');
      runLines[panel] = null;
    }
  }
  function clearErrLine(panel) {
    if (errLines[panel]) {
      panels[panel].removeLineClass(errLines[panel], 'background', 'err-line');
      errLines[panel] = null;
    }
  }
  function clearRunLines() { clearRunLine('main'); clearRunLine('rover'); }
  function clearErrLines() { clearErrLine('main'); clearErrLine('rover'); }

  /* ---------- rendering of texts ---------- */

  function renderNav() {
    var nav = $('levelNav'), track = trackOf(level());
    nav.innerHTML = '';
    trackLevels(track).forEach(function (i) {
      var lv = LEVELS[i], p = progress[lv.id] || {};
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn' + (i === levelIndex ? ' current' : '') + (p.done ? ' done' : '');
      btn.title = levelLabel(i) + '. ' + L(lv.title);
      var mini;
      if (lv.stars) {
        mini = '<span class="mini">';
        for (var s = 1; s <= 3; s++) mini += (s <= (p.stars || 0)) ? '<span class="on">★</span>' : '★';
        mini += '</span>';
      } else {
        mini = '<span class="mini check">' + (p.done ? '✓' : '') + '</span>';
      }
      btn.innerHTML = '<span class="num">' + levelLabel(i) + '</span>' + mini;
      btn.addEventListener('click', function () { loadLevel(i); });
      nav.appendChild(btn);
    });
    TRACKS.forEach(function (name) {
      var button = $(name === 'rover' ? 'trackRover' : 'trackHeli');
      button.className = (name === track) ? 'active' : '';
    });
  }

  function renderTask() {
    var lv = level(), p = progress[lv.id] || {};
    var count = trackLevels(trackOf(lv)).length;
    $('taskNum').textContent = t('mission') + ' ' + levelLabel(levelIndex) + ' / ' + count;
    $('taskTitle').textContent = L(lv.title);
    $('taskStars').innerHTML = lv.stars ? starsHtml(p.stars || 0) : '';
    $('taskStory').innerHTML = L(lv.story);
    $('taskConcept').innerHTML = lv.concept ? '<span class="tag">' + escapeHtml(t('newConcept')) + '</span>' + L(lv.concept) : '';
    $('taskHintLabel').textContent = t('hint');
    $('taskHintBody').innerHTML = L(lv.hint);
    $('hudNote').textContent = lv.random ? t('randomNote') : '';
  }

  function renderCommands() {
    var box = $('commands');
    box.innerHTML = '';
    var fresh = level().api || [];
    unlockedDocs().forEach(function (key) {
      var doc = DOCS[key];
      var row = document.createElement('div');
      row.className = 'cmd';
      row.innerHTML = '<code>' + escapeHtml(doc.text) + '</code>' +
        (fresh.indexOf(key) !== -1 ? '<span class="badge">' + escapeHtml(t('isNew')) + '</span>' : '') +
        '<span class="desc">' + escapeHtml(L(doc)) + '</span>';
      row.addEventListener('click', function () {
        if (mode !== 'idle') return;
        editor.replaceSelection(doc.text, 'end');
        editor.focus();
      });
      box.appendChild(row);
    });
  }

  /* Shows or hides the rover's program, depending on the kind of mission. */
  function renderPanels() {
    var lv = level(), dual = isDual(lv);
    document.querySelector('.layout').classList.toggle('dual', dual);
    $('editors').classList.toggle('dual', dual);
    $('roverPanel').hidden = !dual;
    $('lblYourCode').hidden = !dual;
    $('lblYourCode').textContent = t('yourHeliProgram');
    $('lblRoverCode').textContent = t('roverProgramLocked');
    if (dual) {
      roverEditor.setValue(L(lv.roverCode));
      roverEditor.refresh();
    }
    editor.refresh();
  }

  function renderStatic() {
    document.documentElement.lang = lang;
    document.title = t('appTitle');
    $('appTitle').textContent = t('appTitle');
    $('trackRover').textContent = t('trackRover');
    $('trackRover').title = t('trackRoverHelp');
    $('trackHeli').textContent = t('trackHeli');
    $('trackHeli').title = t('trackHeliHelp');
    $('btnStop').textContent = '■ ' + t('stop');
    $('btnReset').textContent = t('reset');
    $('btnResetCode').textContent = t('resetCode');
    $('btnResetAll').textContent = t('resetAll');
    $('btnResetAll').title = t('resetAllHelp');
    $('btnSolution').textContent = t('solution');
    $('lblSpeed').textContent = t('speed');
    $('lblOutput').textContent = t('output');
    $('lblCrystals').textContent = t('crystals');
    $('lblBattery').textContent = t('battery');
    $('lblLines').textContent = t('lines');
    $('lblCommands').textContent = t('commands');
    $('lblCommandsHelp').textContent = t('commandsHelp');
    var buttons = document.querySelectorAll('.lang-toggle button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].className = buttons[i].getAttribute('data-lang') === lang ? 'active' : '';
    }
    renderButtons();
  }

  function renderButtons() {
    $('btnRun').textContent = '▶ ' + (mode === 'paused' ? t('resume') : t('run'));
    $('btnStep').textContent = (mode === 'running') ? t('pause') : t('step');
    $('btnRun').disabled = (mode === 'running');
    $('btnStop').disabled = (mode === 'idle');
    $('btnResetCode').disabled = (mode !== 'idle');
    $('btnSolution').disabled = (mode !== 'idle');
  }

  function updateHud() {
    var w = game.world;
    if (!w) return;
    $('hudItemCrystals').hidden = (w.goal === 'deliver');
    $('hudCrystals').textContent = w.collected + ' / ' + w.total;
    $('hudItemBattery').hidden = !w.heli;
    if (w.heli) $('hudBattery').textContent = w.heli.battery + ' / ' + w.heli.capacity;
    $('lblSteps').textContent = w.heli ? t('ticks') : t('steps');
    $('hudSteps').textContent = String(w.heli ? w.ticks : w.steps);
  }

  function updateLineCount() {
    $('hudLines').textContent = String(countLines(editor.getValue()));
  }

  /* ---------- missions ---------- */

  function resetField() {
    loadField(level());
    updateHud();
  }

  function loadLevel(index) {
    stopRun();
    clearTimeout(saveTimer);
    levelIndex = index;
    var lv = level();
    store.set('level', index);
    store.set('level.' + trackOf(lv), index);
    var saved = store.get('code.' + lv.id, null);
    clearErrLines();
    editor.setValue(typeof saved === 'string' ? saved : L(lv.starter));
    clearTimeout(saveTimer);
    editor.clearHistory();
    editor.setCursor(editor.lineCount(), 0);
    renderNav();
    renderTask();
    renderCommands();
    renderPanels();
    $('taskHint').open = false;
    document.querySelector('.task').scrollTop = 0;
    hideOverlay();
    clearConsole();
    log('info', escapeHtml(t('ready')));
    resetField();
    editor.refresh();
  }

  function setTrack(track) {
    if (track === trackOf(level())) return;
    var list = trackLevels(track);
    if (!list.length) return;
    var last = store.get('level.' + track, list[0]) | 0;
    loadLevel(list.indexOf(last) !== -1 ? last : list[0]);
  }

  function setLang(next) {
    if (next === lang) return;
    var lv = level();
    var untouched = editor.getValue() === L(lv.starter);
    lang = next;
    store.set('lang', lang);
    if (untouched) editor.setValue(L(lv.starter));
    renderStatic();
    renderNav();
    renderTask();
    renderCommands();
    if (mode === 'idle') renderPanels();
    updateHud();
  }

  /* ---------- running ---------- */

  function setMode(next) {
    mode = next;
    editor.setOption('readOnly', mode !== 'idle');
    renderButtons();
  }

  function stopRun() {
    runToken++;
    if (runner.running) runner.stop();
    clearRunLines();
    setMode('idle');
  }

  function start(paused) {
    if (runner.running) return;
    var lv = level();
    hideOverlay();
    clearConsole();
    clearRunLines();
    clearErrLines();
    resetField();
    var code = editor.getValue();
    store.set('code.' + lv.id, code);
    var lint = window.Runner.lint(code);
    if (lint) {
      problem(t('lintParens', { name: lint.name }), lint.line);
      return;
    }
    var token = ++runToken;
    setMode(paused ? 'paused' : 'running');
    log('info', escapeHtml(paused ? t('pausedAt') : t('running')));
    runner.delay = DELAYS[($('speed').value | 0) - 1];
    runner.run(code, { paused: paused, roverCode: isDual(lv) ? roverEditor.getValue() : undefined }).then(function (result) {
      if (token !== runToken) return;
      setMode('idle');
      finish(result, code);
    });
  }

  function onRun() {
    if (mode === 'idle') start(false);
    else if (mode === 'paused') { setMode('running'); runner.resume(); }
  }

  function onStep() {
    if (mode === 'idle') start(true);
    else if (mode === 'running') { runner.pause(); setMode('paused'); log('info', escapeHtml(t('pausedAt'))); }
    else runner.step();
  }

  function finish(result, code) {
    var lv = level();
    updateHud();
    clearRunLines();
    if (result.status === 'success') {
      var value = measure(lv, code), stars = starsFor(lv, value);
      var p = progress[lv.id] || {};
      progress[lv.id] = { done: true, stars: Math.max(p.stars || 0, stars) };
      store.set('progress', progress);
      renderNav();
      renderTask();
      log('ok', escapeHtml(t(lv.starMetric === 'battery' ? 'successConsoleBattery' : 'successConsole', { n: value })));
      showOverlay(lv, value, stars);
    } else if (result.status === 'incomplete') {
      if (game.world.goal === 'deliver') log('warn', escapeHtml(t('incompleteDeliver')));
      else log('warn', escapeHtml(t('incomplete', { n: game.remaining() })));
    } else if (result.status === 'crash') {
      problem(t(result.key, result.vars), result.line, null, result.actor ? panelOf(result.actor) : 'main');
    } else if (result.status === 'error') {
      var key = 'err' + result.type;
      problem(I18N.en[key] ? t(key) : t('errGeneric'), result.line, result.message, panelOf(result.actor));
    } else if (result.status === 'stopped') {
      log('info', escapeHtml(t('stopped')));
    }
  }

  /* ---------- success overlay ---------- */

  function nextInTrack() {
    var list = trackLevels(trackOf(level()));
    var pos = list.indexOf(levelIndex);
    return (pos !== -1 && pos < list.length - 1) ? list[pos + 1] : -1;
  }

  function showOverlay(lv, value, stars) {
    var last = nextInTrack() === -1, battery = lv.starMetric === 'battery';
    $('ovTitle').textContent = t('successTitle');
    $('ovStars').innerHTML = lv.stars ? starsHtml(stars) : '';
    $('ovLines').textContent = lv.stars ? t(battery ? 'successBattery' : 'successLines', { n: value }) : '';
    var info;
    if (!lv.stars) info = t('successSandbox');
    else if (stars === 3) info = t(battery ? 'successBestBattery' : 'successBest');
    else info = t(battery ? 'successMoreBattery' : 'successMore', { n: starLimits(lv)[0] });
    if (last) info += ' ' + t(trackOf(lv) === 'heli' ? 'allDoneHeli' : 'allDone');
    $('ovInfo').textContent = info;
    $('ovNext').textContent = t('next') + ' ▶';
    $('ovNext').hidden = last;
    $('ovStay').textContent = t('improve');
    $('overlay').hidden = false;
  }

  function hideOverlay() { $('overlay').hidden = true; }

  /* ---------- events ---------- */

  $('btnRun').addEventListener('click', onRun);
  $('btnStep').addEventListener('click', onStep);
  $('btnStop').addEventListener('click', function () {
    if (runner.running) runner.stop();
  });
  $('btnReset').addEventListener('click', function () {
    stopRun();
    hideOverlay();
    clearErrLines();
    resetField();
  });
  $('btnResetCode').addEventListener('click', function () {
    if (!window.confirm(t('resetCodeConfirm'))) return;
    editor.setValue(L(level().starter));
    editor.focus();
  });
  $('btnResetAll').addEventListener('click', function () {
    if (!window.confirm(t('resetAllConfirm'))) return;
    stopRun();
    clearTimeout(saveTimer);
    clearSaved();
    window.location.reload();
  });
  $('btnSolution').addEventListener('click', function () {
    var solutions = window.SOLUTIONS || {};
    if (solutions[level().id]) editor.setValue(solutions[level().id]);
  });
  $('speed').addEventListener('input', function () {
    runner.delay = DELAYS[($('speed').value | 0) - 1];
    store.set('speed', $('speed').value | 0);
  });
  $('ovNext').addEventListener('click', function () {
    var next = nextInTrack();
    if (next !== -1) loadLevel(next);
  });
  $('ovStay').addEventListener('click', function () {
    hideOverlay();
    editor.focus();
  });
  var langButtons = document.querySelectorAll('.lang-toggle button');
  for (var b = 0; b < langButtons.length; b++) {
    langButtons[b].addEventListener('click', function (ev) { setLang(ev.currentTarget.getAttribute('data-lang')); });
  }
  var trackButtons = document.querySelectorAll('.track-toggle button');
  for (var k = 0; k < trackButtons.length; k++) {
    trackButtons[k].addEventListener('click', function (ev) { setTrack(ev.currentTarget.getAttribute('data-track')); });
  }
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { game.resize(); editor.refresh(); roverEditor.refresh(); }, 80);
  });

  /* Teacher mode: open index.html?teacher to get a Solution button. */
  if (/[?&]teacher\b/.test(window.location.search)) {
    var script = document.createElement('script');
    script.src = 'teacher/solutions.js';
    script.onload = function () { $('btnSolution').hidden = false; };
    document.body.appendChild(script);
  }

  /* ---------- start ---------- */

  var savedSpeed = store.get('speed', 3) | 0;
  if (savedSpeed >= 1 && savedSpeed <= 5) $('speed').value = savedSpeed;
  renderStatic();
  loadLevel(levelIndex);
  if (justReset) log('ok', escapeHtml(t('resetDone')));

  /* Used for automated checks: runs code on a mission at full speed. */
  window.RoverApp = {
    levels: LEVELS,
    countLines: countLines,
    test: function (index, code) {
      var lv = LEVELS[index];
      loadField(lv);
      runner.delay = 0;
      return runner.run(code, { roverCode: lv.roverCode ? lv.roverCode.en : undefined }).then(function (result) {
        result.lines = countLines(code);
        result.value = measure(lv, code);
        result.stars = starsFor(lv, result.value);
        result.steps = game.world.steps;
        result.ticks = game.world.ticks;
        result.left = game.remaining();
        return result;
      });
    }
  };
})();
