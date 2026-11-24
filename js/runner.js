/* Runs Python (via Skulpt) and connects the commands to the game.
 *
 * In the rover missions one program runs: the student's, steering the rover.
 * In the helicopter missions two programs run in step: the rover's fixed program and the
 * student's helicopter program. A "tick" lets every running program carry out one action.
 */
(function () {
  'use strict';

  var MAX_TICKS = 3000;
  var DIRECTIONS = ['right', 'left', 'up', 'down'];
  var ROVER_COMMANDS = ['move_right', 'move_left', 'move_up', 'move_down', 'move', 'collect',
    'is_sample', 'scan', 'can_move_right', 'can_move_left', 'can_move_up', 'can_move_down',
    'wait_for_part', 'wait_for_beacon', 'wait_for_beacons', 'beacon_x', 'beacon_y', 'receive', 'drive_to'];
  var HELI_COMMANDS = ['fly_right', 'fly_left', 'fly_up', 'fly_down', 'drop', 'mark', 'take_photo', 'take_thermal', 'battery', 'send'];
  var SHARED_COMMANDS = ['get_x', 'get_y', 'wait', 'get_plan'];
  var COMMANDS = ROVER_COMMANDS.concat(HELI_COMMANDS, SHARED_COMMANDS);
  var ORDER = ['rover', 'heli']; // within a tick the rover acts first, then the helicopter

  function builtinRead(file) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[file] === undefined) {
      throw "File not found: '" + file + "'";
    }
    return Sk.builtinFiles.files[file];
  }

  function halted() { return new Error('halted'); }

  /* hooks: onLine(actor, lineNumber), onOutput(text), onAction() */
  function Runner(game, hooks) {
    this.game = game;
    this.hooks = hooks || {};
    this.delay = 250;
    this.running = false;
    this.paused = false;
    this._resume = null;
    this._waitDone = null;
    this._waitTimer = null;
  }

  /* Finds a command written without brackets, e.g. a line that is just `move_right`. */
  Runner.lint = function (code) {
    var lines = code.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].replace(/#.*$/, '').trim();
      if (COMMANDS.indexOf(text) !== -1) return { line: i + 1, name: text };
    }
    return null;
  };

  /* ---------- pausing and timing ---------- */

  Runner.prototype._gate = function () {
    var self = this;
    if (!self.paused) return Promise.resolve();
    return new Promise(function (resolve) { self._resume = resolve; });
  };

  Runner.prototype._wait = function (ms) {
    var self = this;
    if (ms <= 0) return Promise.resolve();
    return new Promise(function (resolve) {
      self._waitDone = resolve;
      self._waitTimer = setTimeout(function () {
        self._waitDone = null;
        resolve();
      }, ms);
    });
  };

  /* ---------- ticks ---------- */

  /* A program asks for its next action. The promise settles when the tick has been played. */
  Runner.prototype._request = function (actor, fn) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (self.halted) { reject(halted()); return; }
      self.pending[actor] = { fn: fn, resolve: resolve, reject: reject };
      self._maybeTick();
    });
  };

  /* Same, wrapped so that Skulpt pauses the Python program until the tick is over. */
  Runner.prototype._action = function (actor, fn) {
    return Sk.misceval.promiseToSuspension(this._request(actor, fn).then(function () {
      return Sk.builtin.none.none$;
    }));
  };

  /* A tick starts as soon as every program that is still running has asked for an action. */
  Runner.prototype._maybeTick = function () {
    var self = this, anyone = false;
    if (self.halted || self.tickScheduled) return;
    for (var i = 0; i < ORDER.length; i++) {
      if (!self.live[ORDER[i]]) continue;
      anyone = true;
      if (!self.pending[ORDER[i]]) return;
    }
    if (!anyone) return;
    self.tickScheduled = true;
    self._gate().then(function () { self._tick(); });
  };

  Runner.prototype._tick = function () {
    var self = this, game = this.game, i, actor;
    self.tickScheduled = false;
    if (self.halted) return;
    var batch = self.pending;
    self.pending = {};
    self.inflight = batch;
    self.ticks++;
    if (self.ticks > MAX_TICKS) {
      self._halt({ status: 'crash', key: 'tooMany', vars: null, actor: self.student, line: null });
      return;
    }
    game.tick();
    game.animMs = Math.min(self.delay, 450) * 0.85;

    var results = {};
    for (i = 0; i < ORDER.length; i++) {
      actor = ORDER[i];
      if (!batch[actor]) continue;
      try {
        results[actor] = batch[actor].fn();
      } catch (err) {
        // A rule was broken. The program that caused it gets the error, so its line is known.
        var failed = batch[actor];
        delete batch[actor];
        self._halt({ status: 'crash', key: err.gameKey || 'broken', vars: err.vars || null, actor: actor, line: null });
        failed.reject(err);
        if (self.hooks.onAction) self.hooks.onAction();
        return;
      }
    }
    if (self.hooks.onAction) self.hooks.onAction();

    self._wait(self.delay).then(function () {
      if (self.halted) return;
      if (game.isComplete()) { self._halt({ status: 'success' }); return; }
      self.inflight = null;
      for (var j = 0; j < ORDER.length; j++) {
        if (batch[ORDER[j]]) batch[ORDER[j]].resolve(results[ORDER[j]]);
      }
    });
  };

  /* Ends the run. The first reason given is the one that is reported. */
  Runner.prototype._halt = function (outcome) {
    var self = this;
    if (!self.outcome) self.outcome = outcome;
    self.halted = true;
    [self.pending, self.inflight].forEach(function (group) {
      if (!group) return;
      Object.keys(group).forEach(function (actor) { group[actor].reject(halted()); });
    });
    self.pending = {};
    self.inflight = null;
    self.paused = false;
    if (self._resume) { var resume = self._resume; self._resume = null; resume(); }
    if (self._waitDone) {
      clearTimeout(self._waitTimer);
      var done = self._waitDone;
      self._waitDone = null;
      done();
    }
  };

  /* ---------- commands ---------- */

  Runner.prototype._install = function () {
    var self = this, game = this.game, none = Sk.builtin.none.none$;

    function bool(v) { return v ? Sk.builtin.bool.true$ : Sk.builtin.bool.false$; }

    /* owner: 'rover', 'heli' or null (both). A program may only use its own vehicle's commands. */
    function define(name, owner, minArgs, maxArgs, fn) {
      Sk.builtins[name] = new Sk.builtin.func(function () {
        if (owner && self.current !== owner) {
          var key = !game.world.heli ? 'noHeli' : (owner === 'rover' ? 'roverCommand' : 'heliCommand');
          throw new window.GameError(key, { name: name });
        }
        Sk.builtin.pyCheckArgsLen(name, arguments.length, minArgs, maxArgs);
        return fn.apply(null, arguments);
      });
    }

    function position(actor) { return actor === 'heli' ? game.world.heli : game.world.rover; }

    DIRECTIONS.forEach(function (dir) {
      define('move_' + dir, 'rover', 0, 0, function () {
        return self._action('rover', function () { game.move(dir); });
      });
      define('can_move_' + dir, 'rover', 0, 0, function () { return bool(game.canMove(dir)); });
      define('fly_' + dir, 'heli', 0, 0, function () {
        return self._action('heli', function () { game.heliMove(dir); });
      });
    });
    define('move', 'rover', 1, 1, function (pyDir) {
      var dir = Sk.ffi.remapToJs(pyDir);
      if (DIRECTIONS.indexOf(dir) === -1) throw new window.GameError('badDirection', { value: String(dir) });
      return self._action('rover', function () { game.move(dir); });
    });
    define('collect', 'rover', 0, 0, function () {
      return self._action('rover', function () { game.collect(); });
    });
    // is_sample() is True for anything; is_sample("ice") / is_sample("stone") ask for one kind.
    define('is_sample', 'rover', 0, 1, function (pyKind) {
      if (pyKind === undefined) return bool(game.isSample());
      var kind = Sk.ffi.remapToJs(pyKind);
      if (kind !== 'ice' && kind !== 'stone') {
        throw new Sk.builtin.ValueError('is_sample() only knows "ice" and "stone"');
      }
      return bool(game.scan() === kind);
    });
    define('scan', 'rover', 0, 0, function () { return new Sk.builtin.str(game.scan()); });

    // for both vehicles: they answer for whichever program is asking
    define('get_x', null, 0, 0, function () { return new Sk.builtin.int_(position(self.current).x); });
    define('get_y', null, 0, 0, function () { return new Sk.builtin.int_(position(self.current).y); });
    define('wait', null, 0, 0, function () {
      return self._action(self.current, function () {});
    });
    // every caller gets its own copy, so one program cannot change the other's plan
    define('get_plan', null, 0, 0, function () { return Sk.ffi.remapToPy(game.world.plan.slice()); });

    // helicopter
    define('drop', 'heli', 0, 0, function () {
      return self._action('heli', function () { game.heliDrop(); });
    });
    define('mark', 'heli', 0, 0, function () {
      return self._action('heli', function () { game.heliMark(); });
    });
    define('take_photo', 'heli', 0, 0, function () {
      if (game.world.noPhoto) throw new window.GameError('photoBlocked');
      return Sk.ffi.remapToPy(game.photo());
    });
    define('take_thermal', 'heli', 0, 0, function () {
      if (!game.world.heat) throw new window.GameError('noThermal');
      return Sk.ffi.remapToPy(game.thermal());
    });
    define('send', 'heli', 1, 1, function (pyValue) {
      var value = Sk.ffi.remapToJs(pyValue);
      return self._action('heli', function () { game.heliSend(value); });
    });
    define('battery', 'heli', 0, 0, function () { return new Sk.builtin.int_(game.world.heli.battery); });

    // rover commands that only appear in the rover's fixed programs
    function waitUntil(check, failure, result) {
      function attempt() {
        return self._request('rover', check).then(function (ok) {
          if (ok) return result ? result() : none;
          if (!self.live.heli) {
            // nobody is left who could still bring what the rover is waiting for
            var problem = failure();
            self._halt({ status: 'crash', key: problem.key, vars: problem.vars || null, actor: 'rover', line: null });
            throw halted();
          }
          return attempt();
        });
      }
      return Sk.misceval.promiseToSuspension(attempt());
    }
    define('wait_for_part', 'rover', 0, 0, function () {
      return waitUntil(function () { return game.roverTakePart(); }, function () {
        var w = game.world;
        if (!w.part) return { key: 'partNotDropped' };
        return { key: 'partElsewhere', vars: { x: w.part.x, y: w.part.y, rx: w.rover.x, ry: w.rover.y } };
      });
    });
    define('wait_for_beacon', 'rover', 0, 0, function () {
      return waitUntil(function () { return game.world.beacons.length > 0; }, function () { return { key: 'noBeacon' }; });
    });
    define('beacon_x', 'rover', 0, 0, function () {
      return new Sk.builtin.int_(game.world.beacons.length ? game.world.beacons[0].x : -1);
    });
    define('beacon_y', 'rover', 0, 0, function () {
      return new Sk.builtin.int_(game.world.beacons.length ? game.world.beacons[0].y : -1);
    });
    // waits for n beacons and returns their positions as a list of [x, y] pairs
    define('wait_for_beacons', 'rover', 1, 1, function (pyCount) {
      var count = Sk.ffi.remapToJs(pyCount);
      return waitUntil(function () { return game.world.beacons.length >= count; }, function () {
        return { key: 'tooFewBeacons', vars: { n: count, have: game.world.beacons.length } };
      }, function () {
        return Sk.ffi.remapToPy(game.world.beacons.slice(0, count).map(function (b) { return [b.x, b.y]; }));
      });
    });
    // waits for whatever the helicopter sends and returns it
    define('receive', 'rover', 0, 0, function () {
      return waitUntil(function () { return !!game.world.message; }, function () { return { key: 'noMessage' }; },
        function () { return Sk.ffi.remapToPy(game.world.message.value); });
    });
    // drives to a field, one step per tick: first along the row, then along the column
    define('drive_to', 'rover', 2, 2, function (pyX, pyY) {
      var tx = Sk.ffi.remapToJs(pyX), ty = Sk.ffi.remapToJs(pyY);
      function next() {
        var r = game.world.rover, dir = null;
        if (r.x < tx) dir = 'right';
        else if (r.x > tx) dir = 'left';
        else if (r.y < ty) dir = 'down';
        else if (r.y > ty) dir = 'up';
        if (!dir) return Promise.resolve(none);
        return self._request('rover', function () { game.move(dir); }).then(next);
      }
      return Sk.misceval.promiseToSuspension(next());
    });
  };

  /* ---------- programs ---------- */

  function innermostLine(suspension) {
    var line = null;
    for (var s = suspension; s; s = s.child) {
      if (typeof s.$lineno === 'number') line = s.$lineno;
    }
    return line;
  }

  function errorLine(err) {
    return (err && err.traceback && err.traceback.length) ? err.traceback[0].lineno : null;
  }

  /* Whenever Python pauses, we continue it ourselves. That way `current` always says
   * which program is executing, and commands know which vehicle they belong to. */
  Runner.prototype._handle = function (actor, suspension) {
    var self = this;
    function continueWith(setup) {
      return new Promise(function (resolve, reject) {
        setup(function () {
          self.current = actor;
          try { resolve(suspension.resume()); } catch (err) { reject(err); }
        });
      });
    }
    if (suspension.data && suspension.data.type === 'Sk.promise') {
      // Waiting for a tick. Even if the run has just been ended, the promise still settles,
      // and a broken rule arrives here as its error, so the program stops at the right line.
      var line = innermostLine(suspension);
      if (line && !self.halted && self.hooks.onLine) self.hooks.onLine(actor, line);
      return continueWith(function (go) {
        suspension.data.promise.then(function (value) {
          if (self.halted) suspension.data.error = halted();
          else suspension.data.result = value;
          go();
        }, function (err) {
          suspension.data.error = err;
          go();
        });
      });
    }
    // Python handed control back in a long calculation, so that the page stays responsive
    if (self.halted) throw halted();
    return continueWith(function (go) { setTimeout(go, 0); });
  };

  Runner.prototype._program = function (actor, code, name) {
    var self = this;
    return Sk.misceval.asyncToPromise(function () {
      self.current = actor;
      return Sk.importMainWithBody(name, false, code, true);
    }, { '*': function (suspension) { return self._handle(actor, suspension); } }).then(function () {
      self._ended(actor, null);
    }, function (err) {
      self._ended(actor, err);
    });
  };

  Runner.prototype._ended = function (actor, err) {
    var self = this, game = this.game;
    self.live[actor] = false;
    if (err) {
      var native = err.nativeError || err;
      if (self.outcome && self.outcome.actor === actor && self.outcome.line === null) {
        self.outcome.line = errorLine(err);
      } else if (!self.halted && native && native.gameKey) {
        self._halt({ status: 'crash', key: native.gameKey, vars: native.vars || null, actor: actor, line: errorLine(err) });
      } else if (!self.halted) {
        var message;
        try { message = err.toString(); } catch (e) { message = String(err); }
        self._halt({ status: 'error', actor: actor, type: err.tp$name || 'Error', message: message, line: errorLine(err) });
      }
      return;
    }
    if (self.halted) return;
    // a rover that has finished its program switches off: nothing can be handed over any more
    if (self.dual && actor === 'rover' && game.world.goal === 'deliver' && !game.world.delivered) {
      self._halt({ status: 'crash', key: 'roverDone', vars: null, actor: null, line: null });
      return;
    }
    self._maybeTick();
  };

  /* opts.roverCode: the rover's fixed program; the student's code then flies the helicopter.
   * Resolves with {status, ...}: success | incomplete | crash | error | stopped */
  Runner.prototype.run = function (code, opts) {
    var self = this;
    opts = opts || {};
    self.dual = typeof opts.roverCode === 'string';
    self.student = self.dual ? 'heli' : 'rover';
    self.halted = false;
    self.outcome = null;
    self.ticks = 0;
    self.pending = {};
    self.inflight = null;
    self.tickScheduled = false;
    self.live = { rover: true, heli: self.dual };
    self.current = null;
    self.paused = !!opts.paused;
    self.running = true;

    Sk.configure({
      output: function (text) { if (self.hooks.onOutput) self.hooks.onOutput(text); },
      read: builtinRead,
      __future__: Sk.python3,
      yieldLimit: 100
    });
    self._install();

    var programs = [];
    if (self.dual) programs.push(self._program('rover', opts.roverCode, '<rover>'));
    programs.push(self._program(self.student, code, '<stdin>'));

    return Promise.all(programs).then(function () {
      var outcome = self.outcome || { status: self.game.isComplete() ? 'success' : 'incomplete' };
      self.running = false;
      self.paused = false;
      self._resume = null;
      return outcome;
    });
  };

  /* Play the next tick while paused. */
  Runner.prototype.step = function () {
    if (this._resume) {
      var resume = this._resume;
      this._resume = null;
      resume();
    }
  };

  Runner.prototype.pause = function () { this.paused = true; };

  Runner.prototype.resume = function () {
    this.paused = false;
    this.step();
  };

  Runner.prototype.stop = function () {
    if (this.running) this._halt({ status: 'stopped' });
  };

  Runner.COMMANDS = COMMANDS;
  window.Runner = Runner;
})();
