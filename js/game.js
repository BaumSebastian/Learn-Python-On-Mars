/* Rover world: grid state, rules and canvas drawing. No Python knowledge in here. */
(function () {
  'use strict';

  var DIRS = {
    right: { dx: 1, dy: 0, angle: 0 },
    down: { dx: 0, dy: 1, angle: Math.PI / 2 },
    left: { dx: -1, dy: 0, angle: Math.PI },
    up: { dx: 0, dy: -1, angle: -Math.PI / 2 }
  };

  /* Thrown when the rover breaks a rule; `gameKey` names the message to show. */
  function GameError(key, vars) {
    this.gameKey = key;
    this.vars = vars || null;
    this.message = 'rover: ' + key;
  }
  GameError.prototype = Object.create(Error.prototype);

  /* Deterministic pseudo-random 0..1 so the terrain looks the same on every redraw. */
  function hash(x, y, n) {
    var h = Math.imul(x + 11, 374761393) ^ Math.imul(y + 7, 668265263) ^ Math.imul(n + 3, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 10000) / 10000;
  }

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  /* What the rover is meant to collect, as scan() names it. */
  var WANTED = 'ice';

  function Game(canvas, stage) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stage = stage;
    this.world = null;
    this.view = { x: 0, y: 0, angle: 0 };
    this.tween = null;
    this.heliView = { x: 0, y: 0 };
    this.heliTween = null;
    this.effects = [];
    this.animMs = 200;
    this.cell = 48;
    this.margin = 22;
    this.logo = null;
    this._raf = null;
  }

  /* Shows an image (the institute logo) on the rover's deck. Without it the rover has a solar panel. */
  Game.prototype.setLogo = function (src) {
    var self = this, img = new Image();
    img.onload = function () {
      self.logo = img;
      if (self.world) { self.render(now()); self.requestRender(); }
    };
    img.src = src;
  };

  /* rows: array of strings. R rover, H helicopter, . sand, # rock, S ice sample, T stone sample
   * opts: goal ('collect' or 'deliver'), battery, part (helicopter carries the spare part),
   *       hidden (dust covers the samples), dropMustHit (a part dropped next to the rover is lost),
   *       beacons (how many the helicopter carries), plan (numbers both programs can read),
   *       info (anything the mission wants to remember about this field, e.g. for the stars),
   *       heat (temperature of every field, for the thermal camera), noPhoto (normal camera blocked),
   *       photoRadius (in a storm a photo only shows the fields this close to the helicopter) */
  Game.prototype.load = function (rows, opts) {
    opts = opts || {};
    var cols = 0, y, x;
    // Bonus missions: ? is a plate with a letter (taken from opts.letters in reading order), G is a gate
    // that unlock() opens with opts.code (by default the letters), opts.order is the text for get_order().
    var letters = opts.letters || '', letterCount = 0;
    for (y = 0; y < rows.length; y++) cols = Math.max(cols, rows[y].length);
    var w = {
      cols: cols, rows: rows.length, cells: [],
      rover: { x: 0, y: 0, dir: 'right' },
      collected: 0, total: 0, steps: 0, trail: [], crashed: false, crashedWho: null,
      goal: opts.goal || 'collect', hidden: !!opts.hidden, dropMustHit: !!opts.dropMustHit,
      heli: null, part: null, delivered: false, beacons: [], beaconLimit: opts.beacons || 1,
      plan: opts.plan || [], info: opts.info || {}, message: null, ticks: 0,
      heat: opts.heat || null, heatShown: false, noPhoto: opts.noPhoto || false,
      photoRadius: opts.photoRadius || 0, seen: {},
      order: opts.order || '', code: opts.code || letters, hasGate: false, gateOpen: false
    };
    for (y = 0; y < rows.length; y++) {
      var line = [];
      for (x = 0; x < cols; x++) {
        var ch = rows[y].charAt(x) || '.';
        var cell = { rock: false, sample: null };
        if (ch === '#') cell.rock = true;
        else if (ch === 'S') { cell.sample = 'ice'; w.total++; }
        else if (ch === 'T') cell.sample = 'stone';
        else if (ch === 'R') { w.rover.x = x; w.rover.y = y; }
        else if (ch === 'H') {
          var capacity = opts.battery || 10;
          w.heli = { x: x, y: y, battery: capacity, capacity: capacity, carrying: !!opts.part };
        }
        if (ch === '?') cell.letter = letters.charAt(letterCount++) || '?';
        if (ch === 'G') { cell.gate = true; w.hasGate = true; }
        line.push(cell);
      }
      w.cells.push(line);
    }
    w.trail.push({ x: w.rover.x, y: w.rover.y });
    this.world = w;
    this.view = { x: w.rover.x, y: w.rover.y, angle: 0 };
    this.tween = null;
    this.heliView = w.heli ? { x: w.heli.x, y: w.heli.y } : { x: 0, y: 0 };
    this.heliTween = null;
    this.effects = [];
    this.resize();
  };

  Game.prototype.isComplete = function () {
    var w = this.world;
    if (!w || w.crashed) return false;
    if (w.goal === 'deliver') return w.delivered;
    return w.total > 0 && w.collected === w.total;
  };

  Game.prototype.tick = function () { this.world.ticks++; };

  Game.prototype.remaining = function () {
    return this.world.total - this.world.collected;
  };

  Game.prototype._free = function (x, y) {
    var w = this.world;
    if (x < 0 || y < 0 || x >= w.cols || y >= w.rows || w.cells[y][x].rock) return false;
    return !(w.cells[y][x].gate && !w.gateOpen);
  };

  Game.prototype.canMove = function (dir) {
    var d = DIRS[dir], r = this.world.rover;
    return !!d && this._free(r.x + d.dx, r.y + d.dy);
  };

  Game.prototype.isSample = function () {
    var r = this.world.rover;
    return this.world.cells[r.y][r.x].sample !== null;
  };

  Game.prototype.scan = function () {
    var r = this.world.rover;
    return this.world.cells[r.y][r.x].sample || 'nothing';
  };

  /* How many fields to the right of the rover the next thing to collect lies: 0 if the rover is on it, -1 if there is none. */
  Game.prototype.distance = function () {
    var w = this.world, r = w.rover;
    for (var x = r.x; x < w.cols; x++) {
      if (w.cells[r.y][x].sample === WANTED) return x - r.x;
    }
    return -1;
  };

  /* The letter on the plate under the rover, or an empty text. */
  Game.prototype.readLetter = function () {
    var r = this.world.rover;
    return this.world.cells[r.y][r.x].letter || '';
  };

  /* Opens the gate if the code word is right. */
  Game.prototype.unlock = function (code) {
    var w = this.world, x, y;
    if (w.crashed) throw new GameError('broken');
    if (!w.hasGate) throw new GameError('noGate');
    if (code !== w.code) throw new GameError('wrongCode', { code: code });
    if (w.gateOpen) return;
    w.gateOpen = true;
    for (y = 0; y < w.rows; y++) {
      for (x = 0; x < w.cols; x++) {
        if (w.cells[y][x].gate) this.effects.push({ type: 'ring', x: x, y: y, t0: now(), dur: 700 });
      }
    }
    this.requestRender();
  };

  Game.prototype._crash = function (key, dir, who, vars) {
    this.world.crashed = true;
    this.world.crashedWho = who || 'rover';
    this.effects.push({ type: 'crash', t0: now(), dur: 600, dir: dir || null, who: who || 'rover' });
    this.requestRender();
    throw new GameError(key, vars);
  };

  /* ---------- helicopter ---------- */

  Game.prototype.heliMove = function (dir) {
    var w = this.world, h = w.heli, d = DIRS[dir];
    if (w.crashed) throw new GameError('broken');
    if (h.battery <= 0) this._crash('batteryEmpty', null, 'heli');
    var nx = h.x + d.dx, ny = h.y + d.dy;
    if (nx < 0 || ny < 0 || nx >= w.cols || ny >= w.rows) this._crash('heliEdge', dir, 'heli');
    var from = { x: this.heliView.x, y: this.heliView.y };
    h.x = nx; h.y = ny;
    h.battery--;
    if (this.animMs < 30) {
      this.heliView = { x: nx, y: ny };
      this.heliTween = null;
    } else {
      this.heliTween = { from: from, to: { x: nx, y: ny }, t0: now(), dur: this.animMs };
    }
    this.requestRender();
  };

  /* Drops the part. It is delivered if the rover is on this field at the end of the tick. */
  Game.prototype.heliDrop = function () {
    var w = this.world, h = w.heli, r = w.rover;
    if (w.crashed) throw new GameError('broken');
    if (!h.carrying) this._crash('nothingToDrop', null, 'heli');
    h.carrying = false;
    if (r.x === h.x && r.y === h.y) {
      w.delivered = true;
      this.effects.push({ type: 'ring', x: h.x, y: h.y, t0: now(), dur: 700 });
    } else {
      w.part = { x: h.x, y: h.y };
      if (w.dropMustHit) this._crash('dropMissed', null, 'heli', { x: h.x, y: h.y, rx: r.x, ry: r.y });
    }
    this.requestRender();
  };

  Game.prototype.heliMark = function () {
    var w = this.world, h = w.heli;
    if (w.crashed) throw new GameError('broken');
    if (w.beacons.length >= w.beaconLimit) this._crash('beaconUsed', null, 'heli');
    w.beacons.push({ x: h.x, y: h.y });
    this.effects.push({ type: 'ring', x: h.x, y: h.y, t0: now(), dur: 700 });
    this.requestRender();
  };

  /* Radios a value to the rover. */
  Game.prototype.heliSend = function (value) {
    var w = this.world, h = w.heli;
    if (w.crashed) throw new GameError('broken');
    w.message = { value: value };
    this.effects.push({ type: 'ring', x: h.x, y: h.y, t0: now(), dur: 700 });
    this.effects.push({ type: 'ring', x: w.rover.x, y: w.rover.y, t0: now() + 250, dur: 700 });
    this.requestRender();
  };

  /* The rover takes the part if it lies on its field. Returns true once the rover has it. */
  Game.prototype.roverTakePart = function () {
    var w = this.world, r = w.rover;
    if (w.delivered) return true;
    if (w.part && w.part.x === r.x && w.part.y === r.y) {
      w.part = null;
      w.delivered = true;
      this.effects.push({ type: 'ring', x: r.x, y: r.y, t0: now(), dur: 700 });
      this.requestRender();
      return true;
    }
    return false;
  };

  /* The map as rows of words, the way the helicopter's camera reports it.
   * In a storm it is only the square around the helicopter, and those fields lose their dust. */
  Game.prototype.photo = function () {
    var w = this.world;
    function word(c) { return c.rock ? 'rock' : (c.sample || 'sand'); }
    if (!w.photoRadius) {
      return w.cells.map(function (row) { return row.map(word); });
    }
    var out = [], r = w.photoRadius, h = w.heli;
    for (var y = h.y - r; y <= h.y + r; y++) {
      var line = [];
      for (var x = h.x - r; x <= h.x + r; x++) {
        if (x < 0 || y < 0 || x >= w.cols || y >= w.rows) { line.push('edge'); continue; }
        w.seen[x + ',' + y] = true;
        line.push(word(w.cells[y][x]));
      }
      out.push(line);
    }
    this.effects.push({ type: 'ring', x: h.x, y: h.y, t0: now(), dur: 700 });
    this.requestRender();
    return out;
  };

  /* The temperature of every field. From now on the map shows the thermal image. */
  Game.prototype.thermal = function () {
    this.world.heatShown = true;
    this.requestRender();
    return this.world.heat.map(function (row) { return row.slice(); });
  };

  Game.prototype.move = function (dir) {
    var w = this.world, r = w.rover, d = DIRS[dir];
    if (w.crashed) throw new GameError('broken');
    r.dir = dir;
    var from = { x: this.view.x, y: this.view.y, angle: this.view.angle };
    var turn = shortestTurn(from.angle, d.angle);
    var nx = r.x + d.dx, ny = r.y + d.dy;
    if (!this._free(nx, ny)) {
      var inside = nx >= 0 && ny >= 0 && nx < w.cols && ny < w.rows;
      this.view.angle = from.angle + turn;
      if (inside && w.cells[ny][nx].gate) this._crash('crashGate', dir);
      this._crash(inside ? 'crashRock' : 'crashEdge', dir);
    }
    r.x = nx; r.y = ny;
    w.steps++;
    w.trail.push({ x: nx, y: ny });
    this._tweenTo(from, { x: nx, y: ny, angle: from.angle + turn });
  };

  Game.prototype.collect = function () {
    var w = this.world, r = w.rover, cell = w.cells[r.y][r.x];
    if (w.crashed) throw new GameError('broken');
    if (cell.sample === null) this._crash('noSample', null);
    if (cell.sample === 'stone') this._crash('wrongSample', null);
    cell.sample = null;
    w.collected++;
    this.effects.push({ type: 'pop', x: r.x, y: r.y, t0: now(), dur: Math.max(350, Math.min(700, this.animMs * 2)) });
    this.requestRender();
  };

  function shortestTurn(from, to) {
    var diff = (to - from) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  }

  Game.prototype._tweenTo = function (from, to) {
    if (this.animMs < 30) {
      this.view = { x: to.x, y: to.y, angle: to.angle };
      this.tween = null;
    } else {
      this.tween = { from: from, to: to, t0: now(), dur: this.animMs };
    }
    this.requestRender();
  };

  /* ---------- sizing and render loop ---------- */

  Game.prototype.resize = function () {
    var w = this.world;
    if (!w) return;
    var m = this.margin;
    var availW = Math.max(120, this.stage.clientWidth - 24);
    var availH = Math.max(120, this.stage.clientHeight - 24);
    var s = Math.floor(Math.min((availW - m) / w.cols, (availH - m) / w.rows, 92));
    s = Math.max(s, 22);
    this.cell = s;
    var cw = m + w.cols * s + 2, ch = m + w.rows * s + 2;
    var dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.render(now());
    this.requestRender();
  };

  Game.prototype.requestRender = function () {
    var self = this;
    if (this._raf !== null) return;
    this._raf = requestAnimationFrame(function () {
      self._raf = null;
      var t = now();
      self.render(t);
      if (self.tween || self.heliTween || self.effects.length) self.requestRender();
    });
  };

  Game.prototype.render = function (t) {
    var w = this.world;
    if (!w) return;
    var ctx = this.ctx, s = this.cell, m = this.margin, x, y, i;

    // advance the rover tween
    if (this.tween) {
      var tw = this.tween, k = Math.min(1, (t - tw.t0) / tw.dur);
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.view.x = tw.from.x + (tw.to.x - tw.from.x) * e;
      this.view.y = tw.from.y + (tw.to.y - tw.from.y) * e;
      this.view.angle = tw.from.angle + (tw.to.angle - tw.from.angle) * Math.min(1, e * 2);
      if (k >= 1) this.tween = null;
    }
    if (this.heliTween) {
      var ht = this.heliTween, hk = Math.min(1, (t - ht.t0) / ht.dur);
      var he = hk < 0.5 ? 2 * hk * hk : 1 - Math.pow(-2 * hk + 2, 2) / 2;
      this.heliView.x = ht.from.x + (ht.to.x - ht.from.x) * he;
      this.heliView.y = ht.from.y + (ht.to.y - ht.from.y) * he;
      if (hk >= 1) this.heliTween = null;
    }
    this.effects = this.effects.filter(function (fx) { return t - fx.t0 < fx.dur; });

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // coordinate labels
    ctx.fillStyle = '#8087a0';
    ctx.font = '11px Consolas, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (x = 0; x < w.cols; x++) ctx.fillText(String(x), m + x * s + s / 2, m / 2);
    for (y = 0; y < w.rows; y++) ctx.fillText(String(y), m / 2, m + y * s + s / 2);

    ctx.save();
    ctx.translate(m, m);

    // ground
    for (y = 0; y < w.rows; y++) {
      for (x = 0; x < w.cols; x++) drawSand(ctx, x, y, s);
    }
    ctx.strokeStyle = 'rgba(60, 20, 8, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (x = 0; x <= w.cols; x++) { ctx.moveTo(x * s + 0.5, 0); ctx.lineTo(x * s + 0.5, w.rows * s); }
    for (y = 0; y <= w.rows; y++) { ctx.moveTo(0, y * s + 0.5); ctx.lineTo(w.cols * s, y * s + 0.5); }
    ctx.stroke();

    // wheel tracks
    ctx.strokeStyle = 'rgba(70, 24, 10, 0.3)';
    ctx.lineWidth = Math.max(1.5, s * 0.045);
    ctx.lineCap = 'round';
    var off = s * 0.23;
    for (i = 1; i < w.trail.length; i++) {
      var a = w.trail[i - 1], b = w.trail[i];
      var bx = b.x, by = b.y;
      if (i === w.trail.length - 1 && this.tween) { bx = this.view.x; by = this.view.y; }
      var px = (a.y === b.y) ? 0 : off, py = (a.y === b.y) ? off : 0;
      ctx.beginPath();
      ctx.moveTo(a.x * s + s / 2 + px, a.y * s + s / 2 + py);
      ctx.lineTo(bx * s + s / 2 + px, by * s + s / 2 + py);
      ctx.moveTo(a.x * s + s / 2 - px, a.y * s + s / 2 - py);
      ctx.lineTo(bx * s + s / 2 - px, by * s + s / 2 - py);
      ctx.stroke();
    }

    // letter plates and the gate (bonus missions)
    for (y = 0; y < w.rows; y++) {
      for (x = 0; x < w.cols; x++) {
        if (w.cells[y][x].letter) drawPlate(ctx, x * s + s / 2, y * s + s / 2, s, w.cells[y][x].letter);
        if (w.cells[y][x].gate) drawGate(ctx, x * s + s / 2, y * s + s / 2, s, w.gateOpen);
      }
    }

    // rocks and samples
    for (y = 0; y < w.rows; y++) {
      for (x = 0; x < w.cols; x++) {
        var c = w.cells[y][x], cx = x * s + s / 2, cy = y * s + s / 2;
        if (c.rock) drawRock(ctx, cx, cy, s, x, y);
        else if (w.hidden && !w.seen[x + ',' + y]) drawDust(ctx, cx, cy, s, x, y);
        else if (c.sample === 'ice') drawIce(ctx, cx, cy, s, 1, 1);
        else if (c.sample === 'stone') drawStone(ctx, cx, cy, s, x, y);
      }
    }
    if (w.heat && w.heatShown) drawHeat(ctx, w, s);
    for (i = 0; i < w.beacons.length; i++) {
      drawBeacon(ctx, w.beacons[i].x * s + s / 2, w.beacons[i].y * s + s / 2, s);
    }
    if (w.part) drawCrate(ctx, w.part.x * s + s / 2, w.part.y * s + s / 2, s * 0.26);

    // rover (with crash shake)
    var rx = this.view.x * s + s / 2, ry = this.view.y * s + s / 2;
    var crashFx = null;
    for (i = 0; i < this.effects.length; i++) if (this.effects[i].type === 'crash') crashFx = this.effects[i];
    var hx = this.heliView.x * s + s / 2, hy = this.heliView.y * s + s / 2;
    if (crashFx && crashFx.who === 'heli') {
      var hck = (t - crashFx.t0) / crashFx.dur;
      hx += Math.sin(hck * Math.PI * 7) * (1 - hck) * s * 0.07;
    } else if (crashFx) {
      var ck = (t - crashFx.t0) / crashFx.dur;
      var shake = Math.sin(ck * Math.PI * 7) * (1 - ck) * s * 0.07;
      var d = crashFx.dir ? DIRS[crashFx.dir] : { dx: 1, dy: 0 };
      rx += d.dx * shake; ry += d.dy * shake;
    }
    drawRover(ctx, rx, ry, s, this.view.angle, w.crashedWho === 'rover', this.logo);
    if (w.delivered) drawCrate(ctx, rx - s * 0.2, ry + s * 0.12, s * 0.17);

    // whatever lies under the rover stays visible as a small marker in the corner of the field
    var under = w.cells[w.rover.y][w.rover.x].sample;
    if (under && !this.tween && !w.hidden) {
      var ux = w.rover.x * s + s * 0.8, uy = w.rover.y * s + s * 0.2;
      ctx.beginPath();
      ctx.arc(ux, uy, s * 0.17, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 16, 22, 0.75)';
      ctx.fill();
      ctx.save();
      ctx.translate(ux, uy);
      ctx.scale(0.5, 0.5);
      if (under === 'ice') drawIce(ctx, 0, -s * 0.03, s, 1, 1);
      else drawStone(ctx, 0, -s * 0.04, s, w.rover.x, w.rover.y);
      ctx.restore();
    }

    if (w.heli) drawHeli(ctx, hx, hy, s, w.heli.carrying, w.crashedWho === 'heli', !!this.heliTween, t);

    // floating effects
    for (i = 0; i < this.effects.length; i++) {
      var fx = this.effects[i];
      var p = Math.max(0, Math.min(1, (t - fx.t0) / fx.dur));
      if (fx.type === 'pop') {
        var fxX = fx.x * s + s / 2, fxY = fx.y * s + s / 2 - p * s * 0.55;
        drawIce(ctx, fxX, fxY, s, 1 - p, 1 + p * 0.5);
        ctx.globalAlpha = 1 - p * p;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.round(s * 0.3) + 'px Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+1', fxX + s * 0.3, fxY - s * 0.25);
        ctx.globalAlpha = 1;
      } else if (fx.type === 'crash') {
        var flash = (fx.who === 'heli') ? this.heliView : this.view;
        ctx.fillStyle = 'rgba(255, 60, 40, ' + (0.45 * (1 - p)).toFixed(3) + ')';
        ctx.fillRect(Math.round(flash.x) * s, Math.round(flash.y) * s, s, s);
      } else if (fx.type === 'ring' && t >= fx.t0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.9 * (1 - p)).toFixed(3) + ')';
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.beginPath();
        ctx.arc(fx.x * s + s / 2, fx.y * s + s / 2, s * (0.15 + 0.4 * p), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  /* ---------- drawing helpers ---------- */

  /* A plate on the ground with one letter of the code word. */
  function drawPlate(ctx, cx, cy, s, letter) {
    var w = s * 0.6;
    roundRect(ctx, cx - w / 2, cy - w / 2, w, w, s * 0.07);
    ctx.fillStyle = '#f2c230';
    ctx.fill();
    ctx.strokeStyle = '#2b2410';
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.stroke();
    ctx.fillStyle = '#1d1808';
    ctx.font = 'bold ' + Math.round(s * 0.4) + 'px Consolas, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, cx, cy + s * 0.02);
  }

  /* The gate: two posts with a red and white barrier between them. An open gate has no barrier and green lights. */
  function drawGate(ctx, cx, cy, s, open) {
    var top = cy - s * 0.42, height = s * 0.84, width = s * 0.14, parts = 6, i;
    if (!open) {
      for (i = 0; i < parts; i++) {
        ctx.fillStyle = (i % 2 === 0) ? '#e03a2f' : '#f4f4f4';
        ctx.fillRect(cx - width / 2, top + i * height / parts, width, height / parts);
      }
      ctx.strokeStyle = '#3a1512';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.strokeRect(cx - width / 2, top, width, height);
    }
    for (i = -1; i <= 1; i += 2) {
      ctx.fillStyle = '#2b2d36';
      ctx.beginPath(); ctx.arc(cx, cy + i * s * 0.42, s * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = open ? '#3ddc84' : '#ff4634';
      ctx.beginPath(); ctx.arc(cx, cy + i * s * 0.42, s * 0.04, 0, Math.PI * 2); ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function ellipse(ctx, cx, cy, rx, ry) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.restore();
  }

  function drawSand(ctx, x, y, s) {
    ctx.fillStyle = ((x + y) % 2 === 0) ? '#c1653c' : '#b75b34';
    ctx.fillRect(x * s, y * s, s, s);
    for (var i = 0; i < 4; i++) {
      if (hash(x, y, i) < 0.5) continue;
      var px = x * s + (0.12 + hash(x, y, i + 10) * 0.76) * s;
      var py = y * s + (0.12 + hash(x, y, i + 20) * 0.76) * s;
      ctx.fillStyle = 'rgba(80, 30, 14, 0.3)';
      ctx.beginPath();
      ctx.arc(px, py, s * (0.014 + hash(x, y, i + 30) * 0.02), 0, Math.PI * 2);
      ctx.fill();
    }
    if (hash(x, y, 50) > 0.82) {
      var qx = x * s + (0.3 + hash(x, y, 51) * 0.4) * s, qy = y * s + (0.3 + hash(x, y, 52) * 0.4) * s;
      ellipse(ctx, qx, qy, s * 0.11, s * 0.07);
      ctx.fillStyle = 'rgba(70, 25, 10, 0.2)';
      ctx.fill();
    }
  }

  function drawRock(ctx, cx, cy, s, x, y) {
    ellipse(ctx, cx + s * 0.03, cy + s * 0.27, s * 0.38, s * 0.13);
    ctx.fillStyle = 'rgba(40, 12, 5, 0.35)';
    ctx.fill();
    var n = 8, i, a, r;
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      a = i / n * Math.PI * 2;
      r = s * (0.31 + hash(x, y, i + 60) * 0.11);
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.86);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.86);
    }
    ctx.closePath();
    ctx.fillStyle = '#5c2e21';
    ctx.fill();
    ctx.strokeStyle = '#391a12';
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.stroke();
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      a = i / n * Math.PI * 2;
      r = s * (0.17 + hash(x, y, i + 60) * 0.07);
      var hx = cx - s * 0.05 + Math.cos(a) * r, hy = cy - s * 0.07 + Math.sin(a) * r * 0.8;
      if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = '#81483a';
    ctx.fill();
  }

  function shard(ctx, bx, by, h, wd, tilt) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(wd / 2, -h * 0.62);
    ctx.lineTo(wd * 0.4, 0);
    ctx.lineTo(-wd * 0.4, 0);
    ctx.lineTo(-wd / 2, -h * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#a5e6fb';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(wd / 2, -h * 0.62);
    ctx.lineTo(wd * 0.4, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = '#56b6e4';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(1, wd * 0.09);
    ctx.beginPath();
    ctx.moveTo(-wd * 0.22, -h * 0.55);
    ctx.lineTo(-wd * 0.16, -h * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  function drawIce(ctx, cx, cy, s, alpha, scale) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    var g = ctx.createRadialGradient(0, s * 0.05, s * 0.05, 0, s * 0.05, s * 0.42);
    g.addColorStop(0, 'rgba(190, 240, 255, 0.5)');
    g.addColorStop(1, 'rgba(190, 240, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9);
    var base = s * 0.24;
    shard(ctx, -s * 0.13, base, s * 0.3, s * 0.15, -0.38);
    shard(ctx, s * 0.14, base, s * 0.27, s * 0.14, 0.42);
    shard(ctx, 0, base, s * 0.48, s * 0.2, 0);
    ctx.restore();
  }

  function drawStone(ctx, cx, cy, s, x, y) {
    ellipse(ctx, cx + s * 0.02, cy + s * 0.17, s * 0.23, s * 0.08);
    ctx.fillStyle = 'rgba(40, 12, 5, 0.3)';
    ctx.fill();
    ellipse(ctx, cx, cy + s * 0.04, s * 0.21, s * 0.16);
    ctx.fillStyle = '#4b4856';
    ctx.fill();
    ctx.strokeStyle = '#2b2933';
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.stroke();
    ctx.fillStyle = '#9d9aab';
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx + (hash(x, y, i + 80) - 0.5) * s * 0.26, cy + s * 0.04 + (hash(x, y, i + 90) - 0.5) * s * 0.18, s * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* A layer of dust that hides whatever lies on the field. */
  function drawDust(ctx, cx, cy, s, x, y) {
    ctx.fillStyle = 'rgba(232, 170, 120, 0.5)';
    ellipse(ctx, cx + (hash(x, y, 100) - 0.5) * s * 0.1, cy + s * 0.05, s * 0.36, s * 0.22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 55, 25, 0.35)';
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (var i = 0; i < 2; i++) {
      var oy = cy - s * 0.02 + i * s * 0.11;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.22, oy);
      ctx.quadraticCurveTo(cx - s * 0.08, oy - s * 0.07, cx + s * 0.04, oy);
      ctx.quadraticCurveTo(cx + s * 0.14, oy + s * 0.05, cx + s * 0.24, oy - s * 0.01);
      ctx.stroke();
    }
  }

  /* Thermal image: every field tinted from blue (cold) to red (warm), with its temperature. */
  function drawHeat(ctx, w, s) {
    var lo = Infinity, hi = -Infinity, x, y;
    for (y = 0; y < w.rows; y++) {
      for (x = 0; x < w.cols; x++) {
        lo = Math.min(lo, w.heat[y][x]);
        hi = Math.max(hi, w.heat[y][x]);
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(s * 0.26) + 'px Consolas, Menlo, monospace';
    for (y = 0; y < w.rows; y++) {
      for (x = 0; x < w.cols; x++) {
        var k = (hi > lo) ? (w.heat[y][x] - lo) / (hi - lo) : 0.5;
        var red = Math.round(40 + 215 * k), blue = Math.round(255 - 205 * k), green = Math.round(110 - 50 * k);
        ctx.fillStyle = 'rgba(' + red + ', ' + green + ', ' + blue + ', 0.62)';
        ctx.fillRect(x * s + 1, y * s + 1, s - 1, s - 1);
        ctx.fillStyle = 'rgba(10, 10, 20, 0.55)';
        ctx.fillText(String(w.heat[y][x]), x * s + s / 2 + 1, y * s + s / 2 + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(w.heat[y][x]), x * s + s / 2, y * s + s / 2);
      }
    }
  }

  function drawBeacon(ctx, cx, cy, s) {
    ctx.strokeStyle = 'rgba(255, 70, 70, 0.75)';
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff4646';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.stroke();
  }

  /* The spare part: an orange crate. */
  function drawCrate(ctx, cx, cy, size) {
    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.15);
    ctx.fillStyle = '#f2a23a';
    ctx.fill();
    ctx.strokeStyle = '#8a4d0c';
    ctx.lineWidth = Math.max(1, size * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - size / 2, cy); ctx.lineTo(cx + size / 2, cy);
    ctx.moveTo(cx, cy - size / 2); ctx.lineTo(cx, cy + size / 2);
    ctx.stroke();
  }

  function drawHeli(ctx, px, py, s, carrying, crashed, moving, t) {
    var arm = s * 0.25, i;
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // shadow on the ground, shifted to show that the helicopter is in the air
    ctx.fillStyle = 'rgba(30, 8, 4, 0.22)';
    ellipse(ctx, px + s * 0.1, py + s * 0.14, s * 0.3, s * 0.24);
    ctx.fill();
    ctx.save();
    ctx.translate(px, py - s * 0.04);
    ctx.strokeStyle = '#2b2d36';
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-arm, -arm); ctx.lineTo(arm, arm);
    ctx.moveTo(arm, -arm); ctx.lineTo(-arm, arm);
    ctx.stroke();
    var spin = moving ? t / 35 : 0.6;
    for (i = 0; i < 4; i++) {
      var rx = corners[i][0] * arm, ry = corners[i][1] * arm;
      ctx.fillStyle = 'rgba(215, 235, 255, 0.4)';
      ctx.beginPath(); ctx.arc(rx, ry, s * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(40, 44, 56, 0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.025);
      var a = spin + i * 0.8;
      ctx.beginPath();
      ctx.moveTo(rx - Math.cos(a) * s * 0.14, ry - Math.sin(a) * s * 0.14);
      ctx.lineTo(rx + Math.cos(a) * s * 0.14, ry + Math.sin(a) * s * 0.14);
      ctx.stroke();
    }
    roundRect(ctx, -s * 0.12, -s * 0.12, s * 0.24, s * 0.24, s * 0.06);
    ctx.fillStyle = crashed ? '#b9483c' : '#3a4152';
    ctx.fill();
    ctx.strokeStyle = '#151720';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.stroke();
    if (carrying) drawCrate(ctx, 0, 0, s * 0.15);
    else {
      ctx.fillStyle = '#8ad9f7';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.04, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (crashed) {
      ctx.strokeStyle = '#ff5340';
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.arc(px, py, s * 0.44, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawRover(ctx, px, py, s, angle, crashed, logo) {
    var u = s, i, side;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    roundRect(ctx, -0.31 * u, -0.27 * u, 0.66 * u, 0.62 * u, 0.08 * u);
    ctx.fillStyle = 'rgba(35, 10, 4, 0.28)';
    ctx.fill();
    ctx.fillStyle = '#25252b';
    var wheelX = [-0.23, 0, 0.23];
    for (i = 0; i < 3; i++) {
      for (side = -1; side <= 1; side += 2) {
        roundRect(ctx, wheelX[i] * u - 0.085 * u, side * 0.265 * u - 0.055 * u, 0.17 * u, 0.11 * u, 0.03 * u);
        ctx.fill();
      }
    }
    roundRect(ctx, -0.28 * u, -0.19 * u, 0.56 * u, 0.38 * u, 0.06 * u);
    ctx.fillStyle = crashed ? '#e9b9ae' : '#eeece6';
    ctx.fill();
    ctx.strokeStyle = '#85837d';
    ctx.lineWidth = Math.max(1, u * 0.02);
    ctx.stroke();
    if (logo) {
      // camera head at the front, antenna at the back; the deck stays free for the logo
      roundRect(ctx, 0.175 * u, -0.1 * u, 0.085 * u, 0.2 * u, 0.025 * u);
      ctx.fillStyle = '#c4c2bb';
      ctx.fill();
      ctx.fillStyle = '#17171c';
      ctx.beginPath(); ctx.arc(0.222 * u, -0.05 * u, 0.026 * u, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.222 * u, 0.05 * u, 0.026 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4b63f';
      ctx.beginPath(); ctx.arc(-0.235 * u, -0.145 * u, 0.024 * u, 0, Math.PI * 2); ctx.fill();
      // the logo always stays upright, whichever way the rover is facing
      var lw = 0.33 * u, lh = lw * logo.height / logo.width;
      ctx.rotate(-angle);
      ctx.globalCompositeOperation = 'multiply';
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      roundRect(ctx, -0.24 * u, -0.15 * u, 0.29 * u, 0.3 * u, 0.02 * u);
      ctx.fillStyle = '#21457f';
      ctx.fill();
      ctx.strokeStyle = '#6c9ae0';
      ctx.lineWidth = Math.max(0.75, u * 0.012);
      ctx.beginPath();
      ctx.moveTo(-0.143 * u, -0.15 * u); ctx.lineTo(-0.143 * u, 0.15 * u);
      ctx.moveTo(-0.047 * u, -0.15 * u); ctx.lineTo(-0.047 * u, 0.15 * u);
      ctx.moveTo(-0.24 * u, 0); ctx.lineTo(0.05 * u, 0);
      ctx.stroke();
      roundRect(ctx, 0.1 * u, -0.1 * u, 0.14 * u, 0.2 * u, 0.03 * u);
      ctx.fillStyle = '#c4c2bb';
      ctx.fill();
      ctx.fillStyle = '#17171c';
      ctx.beginPath(); ctx.arc(0.19 * u, -0.045 * u, 0.03 * u, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.19 * u, 0.045 * u, 0.03 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4b63f';
      ctx.beginPath(); ctx.arc(0.075 * u, -0.13 * u, 0.028 * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (crashed) {
      ctx.strokeStyle = '#ff5340';
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.arc(px, py, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  window.Game = Game;
  window.GameError = GameError;
})();
