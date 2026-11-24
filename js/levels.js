/* Missions. Each one has texts in English (en) and German (de).
 *
 * Map characters:  R rover   . sand   # rock   S ice crystal   T stone
 * build(rnd) returns the rows of the map; rnd() gives a random number 0..1.
 * stars: [most lines for 3 stars, most lines for 2 stars]
 * api: commands that appear in the command list from this mission on.
 */
(function () {
  'use strict';

  function fixed(rows) {
    return function () { return rows.slice(); };
  }

  /* n cells, each ice with the given chance; at least minIce crystals and minGap gaps. */
  function randomRow(rnd, n, chance, minIce, minGap) {
    for (;;) {
      var out = '', ice = 0;
      for (var i = 0; i < n; i++) {
        if (rnd() < chance) { out += 'S'; ice++; } else { out += '.'; }
      }
      if (ice >= minIce && n - ice >= minGap) return out;
    }
  }

  function repeat(ch, n) {
    var out = '';
    while (out.length < n) out += ch;
    return out;
  }

  function between(rnd, lo, hi) {
    return lo + Math.floor(rnd() * (hi - lo + 1));
  }

  window.COMMAND_DOCS = {
    move_right: { text: 'move_right()', en: 'Drive one field to the right', de: 'Ein Feld nach rechts fahren' },
    move_left: { text: 'move_left()', en: 'Drive one field to the left', de: 'Ein Feld nach links fahren' },
    move_up: { text: 'move_up()', en: 'Drive one field up', de: 'Ein Feld nach oben fahren' },
    move_down: { text: 'move_down()', en: 'Drive one field down', de: 'Ein Feld nach unten fahren' },
    collect: { text: 'collect()', en: 'Collect the crystal under the rover', de: 'Den Kristall unter dem Rover einsammeln' },
    for_loop: { text: 'for i in range(3):', en: 'Repeat the indented lines 3 times', de: 'Die eingerückten Zeilen 3-mal wiederholen' },
    is_sample: { text: 'is_sample()', en: 'True if something lies under the rover', de: 'True, wenn unter dem Rover etwas liegt' },
    if_stmt: { text: 'if is_sample():', en: 'Run the indented lines only if the answer is True', de: 'Die eingerückten Zeilen nur ausführen, wenn die Antwort True ist' },
    can_move: { text: 'can_move_right()', en: 'True if the field to the right is free (also _left, _up, _down)', de: 'True, wenn das Feld rechts frei ist (auch _left, _up, _down)' },
    while_loop: { text: 'while can_move_right():', en: 'Repeat as long as the answer is True', de: 'Wiederholen, solange die Antwort True ist' },
    def_stmt: { text: 'def my_command():', en: 'Teach the rover a new command', de: 'Dem Rover einen neuen Befehl beibringen' },
    is_sample_kind: { text: 'is_sample("ice")', en: 'True only for ice; is_sample("stone") is True only for stones', de: 'True nur bei Eis; is_sample("stone") ist True nur bei Steinen' },
    scan: { text: 'scan()', en: 'Tells what lies under the rover: "ice", "stone" or "nothing"', de: 'Sagt, was unter dem Rover liegt: "ice", "stone" oder "nothing"' },
    print: { text: 'print("Hi")', en: 'Write a text or a value to the output', de: 'Einen Text oder Wert in die Ausgabe schreiben' },
    move: { text: 'move("right")', en: 'Drive in a direction: "right", "left", "up", "down"', de: 'In eine Richtung fahren: "right", "left", "up", "down"' },
    fly: { text: 'fly_right()', en: 'Fly one field to the right, costs 1 battery (also fly_left, fly_up, fly_down)', de: 'Ein Feld nach rechts fliegen, kostet 1 Akku (auch fly_left, fly_up, fly_down)' },
    drop: { text: 'drop()', en: 'Drop the spare part onto the field below', de: 'Das Ersatzteil auf das Feld darunter abwerfen' },
    battery: { text: 'battery()', en: 'How much battery is left', de: 'Wie viel Akku noch übrig ist' },
    wait: { text: 'wait()', en: 'Hover for one tick; costs no battery', de: 'Einen Tick lang schweben; kostet keinen Akku' },
    take_photo: { text: 'photo = take_photo()', en: 'The area as a list of rows; photo[y][x] is one field', de: 'Das Gebiet als Liste von Zeilen; photo[y][x] ist ein Feld' },
    mark: { text: 'mark()', en: 'Set the beacon on the field below', de: 'Die Markierung auf das Feld darunter setzen' },
    get_plan: { text: 'plan = get_plan()', en: 'The numbers of this run as a list; plan[0] is the first one', de: 'Die Zahlen dieses Starts als Liste; plan[0] ist die erste' },
    send: { text: 'send(route)', en: 'Radio a value, for example a list, to the rover', de: 'Einen Wert, zum Beispiel eine Liste, an den Rover funken' },
    list_append: { text: 'route.append("right")', en: 'Add a value at the end of a list', de: 'Einen Wert ans Ende einer Liste anhängen' },
    abs_doc: { text: 'abs(a - b)', en: 'The distance between two numbers, never negative', de: 'Der Abstand zweier Zahlen, nie negativ' },
    list_remove: { text: 'targets.remove(t)', en: 'Delete the value t from a list', de: 'Den Wert t aus einer Liste löschen' },
    len_doc: { text: 'len(targets)', en: 'How many elements a list has', de: 'Wie viele Elemente eine Liste hat' },
    take_thermal: { text: 'heat = take_thermal()', en: 'The temperature of every field as a list of rows; heat[y][x] is one number', de: 'Die Temperatur jedes Feldes als Liste von Zeilen; heat[y][x] ist eine Zahl' },
    small_photo: { text: 'tile = take_photo()', en: 'In the storm: only the 3 x 3 fields around you; tile[1][1] is the field below you', de: 'Im Sturm: nur die 3 x 3 Felder um dich herum; tile[1][1] ist das Feld unter dir' },
    heli_pos: { text: 'get_x()', en: 'Your column, counted from 0 (get_y() is your row)', de: 'Deine Spalte, ab 0 gezählt (get_y() ist deine Zeile)' },
    get_pos: { text: 'get_x()', en: 'Column of the rover, counted from 0 (get_y() is the row)', de: 'Spalte des Rovers, ab 0 gezählt (get_y() ist die Zeile)' }
  };

  window.LEVELS = [
    {
      id: 'first-contact',
      title: { en: 'First contact', de: 'Erster Kontakt' },
      story: {
        en: '<p>The rover has landed on Mars! A radio signal from Earth takes many minutes to get there, so nobody can steer the rover with a joystick. Instead you send it a <b>program</b>: a list of commands that it carries out one after another, from top to bottom.</p><p><b>Mission:</b> Drive to the ice crystal and collect it.</p>',
        de: '<p>Der Rover ist auf dem Mars gelandet! Ein Funksignal von der Erde braucht viele Minuten bis dorthin – niemand kann den Rover mit einem Joystick steuern. Stattdessen schickst du ihm ein <b>Programm</b>: eine Liste von Befehlen, die er der Reihe nach von oben nach unten ausführt.</p><p><b>Mission:</b> Fahre zum Eiskristall und sammle ihn ein.</p>'
      },
      concept: {
        en: '<p>A command is a name followed by brackets, and each command gets its own line:</p><pre>move_right()</pre><p>Python is strict: no capital letters, no spaces, and do not forget the brackets. All commands you may use are listed under the map.</p>',
        de: '<p>Ein Befehl ist ein Name mit Klammern dahinter, und jeder Befehl bekommt eine eigene Zeile:</p><pre>move_right()</pre><p>Python ist streng: keine Großbuchstaben, keine Leerzeichen, und vergiss die Klammern nicht. Alle Befehle, die du benutzen darfst, stehen unter der Karte.</p>'
      },
      hint: {
        en: 'The crystal is 3 fields to the right. You need <code>move_right()</code> three times and then <code>collect()</code>.',
        de: 'Der Kristall liegt 3 Felder rechts. Du brauchst dreimal <code>move_right()</code> und danach <code>collect()</code>.'
      },
      starter: {
        en: '# Lines that start with # are comments. Python ignores them.\n# Write one command per line, then press Run.\nmove_right()\n',
        de: '# Zeilen mit # am Anfang sind Kommentare. Python ignoriert sie.\n# Schreibe einen Befehl pro Zeile und drücke dann Start.\nmove_right()\n'
      },
      api: ['move_right', 'collect'],
      stars: [4, 4],
      build: fixed([
        '..#..',
        'R..S.',
        '.#...'
      ])
    },
    {
      id: 'detour',
      title: { en: 'Around the rocks', de: 'Um die Felsen herum' },
      story: {
        en: '<p>Rocks block the direct way. The rover can drive in four directions, but it must not hit a rock or leave the map.</p><p><b>Mission:</b> Find a route to the crystal and collect it. Plan the route first, then write it down.</p>',
        de: '<p>Felsen versperren den direkten Weg. Der Rover kann in vier Richtungen fahren, darf aber nicht gegen einen Felsen stoßen oder die Karte verlassen.</p><p><b>Mission:</b> Finde einen Weg zum Kristall und sammle ihn ein. Plane zuerst die Route, schreibe sie dann auf.</p>'
      },
      concept: {
        en: '<p>Four commands for four directions:</p><pre>move_right()\nmove_left()\nmove_up()\nmove_down()</pre>',
        de: '<p>Vier Befehle für vier Richtungen:</p><pre>move_right()\nmove_left()\nmove_up()\nmove_down()</pre>'
      },
      hint: {
        en: 'One possible route: right, right, down, right, right, down.',
        de: 'Eine mögliche Route: rechts, rechts, unten, rechts, rechts, unten.'
      },
      starter: {
        en: '# Find a way around the rocks.\n',
        de: '# Finde einen Weg um die Felsen herum.\n'
      },
      api: ['move_left', 'move_up', 'move_down'],
      stars: [7, 9],
      build: fixed([
        'R..#.',
        '.#...',
        '...#S'
      ])
    },
    {
      id: 'long-road',
      title: { en: 'The long road', de: 'Der lange Weg' },
      story: {
        en: '<p>The next crystal is 10 fields away. You could write <code>move_right()</code> ten times, but good programmers are lazy: they let the computer do the repeating.</p><p><b>Mission:</b> Collect the crystal. For three stars your program may have at most 3 lines.</p>',
        de: '<p>Der nächste Kristall ist 10 Felder entfernt. Du könntest zehnmal <code>move_right()</code> schreiben, aber gute Programmierer sind faul: Sie lassen den Computer wiederholen.</p><p><b>Mission:</b> Sammle den Kristall ein. Für drei Sterne darf dein Programm höchstens 3 Zeilen haben.</p>'
      },
      concept: {
        en: '<p>A <b>loop</b> repeats commands. This one writes a text into the output 3 times:</p><pre>for i in range(3):\n    print("Hello Mars")</pre><p>The number in <code>range()</code> says how often, and the indented line is what gets repeated. Two things matter: the colon <code>:</code> at the end of the first line and the 4 spaces in front of the second.</p>',
        de: '<p>Eine <b>Schleife</b> wiederholt Befehle. Diese hier schreibt 3-mal einen Text in die Ausgabe:</p><pre>for i in range(3):\n    print("Hallo Mars")</pre><p>Die Zahl in <code>range()</code> sagt, wie oft, und die eingerückte Zeile ist das, was wiederholt wird. Zwei Dinge sind wichtig: der Doppelpunkt <code>:</code> am Ende der ersten Zeile und die 4 Leerzeichen vor der zweiten.</p>'
      },
      hint: {
        en: 'Replace the repeated lines with the loop. <code>collect()</code> comes after the loop and is <b>not</b> indented, because it should happen only once.',
        de: 'Ersetze die wiederholten Zeilen durch die Schleife. <code>collect()</code> kommt nach der Schleife und ist <b>nicht</b> eingerückt, weil es nur einmal passieren soll.'
      },
      starter: {
        en: '# This works, but it is a lot of typing ...\nmove_right()\nmove_right()\nmove_right()\n',
        de: '# Das funktioniert, ist aber viel Tipparbeit ...\nmove_right()\nmove_right()\nmove_right()\n'
      },
      api: ['for_loop', 'print'],
      stars: [3, 7],
      build: fixed([
        '..#.....#..',
        'R.........S',
        '.#....#....'
      ])
    },
    {
      id: 'ice-row',
      title: { en: 'A row of ice', de: 'Eine Reihe Eis' },
      story: {
        en: '<p>Six crystals lie in a row. A loop can repeat several commands at once: every indented line belongs to the loop.</p><p><b>Mission:</b> Collect all six crystals.</p>',
        de: '<p>Sechs Kristalle liegen in einer Reihe. Eine Schleife kann mehrere Befehle auf einmal wiederholen: Jede eingerückte Zeile gehört zur Schleife.</p><p><b>Mission:</b> Sammle alle sechs Kristalle ein.</p>'
      },
      concept: {
        en: '<p>Two commands in one loop:</p><pre>for i in range(2):\n    print("tick")\n    print("tock")</pre><p>The output is: tick, tock, tick, tock. Both indented lines are repeated together.</p>',
        de: '<p>Zwei Befehle in einer Schleife:</p><pre>for i in range(2):\n    print("tick")\n    print("tack")</pre><p>Die Ausgabe ist: tick, tack, tick, tack. Beide eingerückten Zeilen werden zusammen wiederholt.</p>'
      },
      hint: {
        en: 'What does the rover do for a single crystal? Drive one field to the right, then collect. Repeat that 6 times.',
        de: 'Was macht der Rover für einen einzelnen Kristall? Ein Feld nach rechts fahren, dann einsammeln. Wiederhole das 6-mal.'
      },
      starter: {
        en: '# Collect all six crystals with one loop.\n',
        de: '# Sammle alle sechs Kristalle mit einer Schleife ein.\n'
      },
      api: [],
      stars: [3, 7],
      build: fixed([
        '...#...',
        'RSSSSSS',
        '.#.....'
      ])
    },
    {
      id: 'staircase',
      title: { en: 'The staircase', de: 'Die Treppe' },
      story: {
        en: '<p>The crystals lie on a slope like the steps of a staircase. Programmers look for the <b>pattern</b> that repeats.</p><p><b>Mission:</b> Collect all four crystals. Which commands make up one step?</p>',
        de: '<p>Die Kristalle liegen an einem Hang wie die Stufen einer Treppe. Programmierer suchen nach dem <b>Muster</b>, das sich wiederholt.</p><p><b>Mission:</b> Sammle alle vier Kristalle ein. Welche Befehle ergeben eine Stufe?</p>'
      },
      concept: null,
      hint: {
        en: 'One step is: down, right, collect. There are 4 steps.',
        de: 'Eine Stufe ist: runter, rechts, einsammeln. Es gibt 4 Stufen.'
      },
      starter: {
        en: '# Find the pattern that repeats.\n',
        de: '# Finde das Muster, das sich wiederholt.\n'
      },
      api: [],
      stars: [4, 8],
      build: fixed([
        'R#...',
        '.S#..',
        '..S#.',
        '...S#',
        '....S'
      ])
    },
    {
      id: 'corner',
      title: { en: 'Around the corner', de: 'Um die Ecke' },
      story: {
        en: '<p>The crystals lie along two edges of the plateau. When a loop is finished, Python continues with the next line that is not indented, and that can be another loop.</p><p><b>Mission:</b> Collect all eight crystals.</p>',
        de: '<p>Die Kristalle liegen an zwei Kanten des Plateaus. Wenn eine Schleife fertig ist, macht Python mit der nächsten nicht eingerückten Zeile weiter, und das kann wieder eine Schleife sein.</p><p><b>Mission:</b> Sammle alle acht Kristalle ein.</p>'
      },
      concept: {
        en: '<p>Two loops, one after the other:</p><pre>for i in range(2):\n    print("A")\nfor i in range(3):\n    print("B")</pre><p>The output is: A, A, B, B, B. The second loop only starts when the first one is finished.</p>',
        de: '<p>Zwei Schleifen nacheinander:</p><pre>for i in range(2):\n    print("A")\nfor i in range(3):\n    print("B")</pre><p>Die Ausgabe ist: A, A, B, B, B. Die zweite Schleife beginnt erst, wenn die erste fertig ist.</p>'
      },
      hint: {
        en: 'First loop: 5 times right and collect. Second loop: 3 times down and collect.',
        de: 'Erste Schleife: 5-mal rechts und einsammeln. Zweite Schleife: 3-mal runter und einsammeln.'
      },
      starter: {
        en: '# First along the top, then down the right side.\n',
        de: '# Erst oben entlang, dann an der rechten Seite hinunter.\n'
      },
      api: [],
      stars: [6, 10],
      build: fixed([
        'RSSSSS',
        '.##..S',
        '.#...S',
        '....#S'
      ])
    },
    {
      id: 'big-field',
      title: { en: 'The big field', de: 'Das große Feld' },
      story: {
        en: '<p>A whole field of ice: 4 rows with 4 crystals each. Think about <b>one row</b> first: drive right and collect, drive back to the left, go one field down. Then repeat that for every row.</p><p><b>Mission:</b> Collect all 16 crystals.</p>',
        de: '<p>Ein ganzes Feld voller Eis: 4 Reihen mit je 4 Kristallen. Überlege zuerst für <b>eine Reihe</b>: nach rechts fahren und einsammeln, nach links zurückfahren, ein Feld nach unten. Dann wiederholst du das für jede Reihe.</p><p><b>Mission:</b> Sammle alle 16 Kristalle ein.</p>'
      },
      concept: {
        en: '<p>A loop inside a loop:</p><pre>for row in range(2):\n    for i in range(3):\n        print("x")\n    print("row done")</pre><p>The output is: x, x, x, row done, x, x, x, row done. In each of the 2 rounds the inner loop runs completely. The innermost line is indented twice (8 spaces).</p>',
        de: '<p>Eine Schleife in einer Schleife:</p><pre>for row in range(2):\n    for i in range(3):\n        print("x")\n    print("Reihe fertig")</pre><p>Die Ausgabe ist: x, x, x, Reihe fertig, x, x, x, Reihe fertig. In jeder der 2 Runden läuft die innere Schleife komplett durch. Die innerste Zeile ist doppelt eingerückt (8 Leerzeichen).</p>'
      },
      hint: {
        en: 'Outer loop: 4 rows. Inside it: a loop "4 times right and collect", then a loop "4 times left", then <code>move_down()</code>.',
        de: 'Äußere Schleife: 4 Reihen. Darin: eine Schleife „4-mal rechts und einsammeln“, dann eine Schleife „4-mal links“, dann <code>move_down()</code>.'
      },
      starter: {
        en: '# Solve one row first, then wrap it in a second loop.\n',
        de: '# Löse zuerst eine Reihe, dann packe sie in eine zweite Schleife.\n'
      },
      api: [],
      stars: [7, 12],
      build: fixed([
        'RSSSS',
        '.SSSS',
        '.SSSS',
        '.SSSS',
        '.....'
      ])
    },
    {
      id: 'look-first',
      title: { en: 'Look first', de: 'Erst schauen' },
      story: {
        en: '<p>A dust storm has scattered the crystals. From now on <b>the field looks different on every run</b>, so you cannot know in advance where the ice is. And careful: <code>collect()</code> on bare ground breaks the drill!</p><p><b>Mission:</b> Check every field in the row and collect only where there is a crystal.</p>',
        de: '<p>Ein Staubsturm hat die Kristalle verteilt. Ab jetzt <b>sieht das Feld bei jedem Start anders aus</b>, du kannst also nicht vorher wissen, wo das Eis liegt. Und Vorsicht: <code>collect()</code> auf leerem Boden macht den Bohrer kaputt!</p><p><b>Mission:</b> Prüfe jedes Feld der Reihe und sammle nur dort ein, wo ein Kristall liegt.</p>'
      },
      concept: {
        en: '<p>A <b>condition</b> lets the rover decide:</p><pre>if is_sample():\n    print("There is something here!")</pre><p><code>is_sample()</code> is a question to the rover\'s sensor. It answers with <code>True</code> or <code>False</code>. The indented line only runs if the answer is <code>True</code>; otherwise Python skips it.</p>',
        de: '<p>Mit einer <b>Bedingung</b> kann der Rover entscheiden:</p><pre>if is_sample():\n    print("Hier liegt etwas!")</pre><p><code>is_sample()</code> ist eine Frage an den Sensor des Rovers. Er antwortet mit <code>True</code> oder <code>False</code>. Die eingerückte Zeile wird nur ausgeführt, wenn die Antwort <code>True</code> ist; sonst überspringt Python sie.</p>'
      },
      hint: {
        en: 'A loop over the 9 fields: drive right, then the <code>if</code> with <code>collect()</code> inside. The <code>if</code> is inside the loop, so <code>collect()</code> is indented twice.',
        de: 'Eine Schleife über die 9 Felder: nach rechts fahren, dann das <code>if</code> mit <code>collect()</code> darin. Das <code>if</code> steht in der Schleife, also ist <code>collect()</code> doppelt eingerückt.'
      },
      starter: {
        en: '# The crystals are somewhere else on every run.\nfor i in range(9):\n    move_right()\n',
        de: '# Die Kristalle liegen bei jedem Start woanders.\nfor i in range(9):\n    move_right()\n'
      },
      api: ['is_sample', 'if_stmt'],
      stars: [4, 6],
      random: true,
      build: function (rnd) {
        return [
          '..#....#..',
          'R' + randomRow(rnd, 9, 0.5, 2, 2),
          '....#.....'
        ];
      }
    },
    {
      id: 'storm-field',
      title: { en: 'After the storm', de: 'Nach dem Sturm' },
      story: {
        en: '<p>The storm also hit a whole field: 3 rows, and nobody knows where the ice is. Now you combine everything you know: loops inside loops and a condition.</p><p><b>Mission:</b> Collect every crystal, wherever it lies.</p>',
        de: '<p>Der Sturm hat auch ein ganzes Feld erwischt: 3 Reihen, und niemand weiß, wo das Eis liegt. Jetzt kombinierst du alles, was du kannst: Schleifen in Schleifen und eine Bedingung.</p><p><b>Mission:</b> Sammle jeden Kristall ein, egal wo er liegt.</p>'
      },
      concept: null,
      hint: {
        en: 'Take your idea from "The big field" and put <code>if is_sample():</code> in front of <code>collect()</code>. Each row has 5 fields.',
        de: 'Nimm deine Idee aus „Das große Feld“ und setze <code>if is_sample():</code> vor <code>collect()</code>. Jede Reihe hat 5 Felder.'
      },
      starter: {
        en: '# 3 rows with 5 fields each. Where is the ice? Nobody knows.\n',
        de: '# 3 Reihen mit je 5 Feldern. Wo ist das Eis? Niemand weiß es.\n'
      },
      api: [],
      stars: [8, 12],
      random: true,
      build: function (rnd) {
        return [
          'R' + randomRow(rnd, 5, 0.5, 1, 1),
          '.' + randomRow(rnd, 5, 0.5, 1, 1),
          '.' + randomRow(rnd, 5, 0.5, 1, 1),
          '......'
        ];
      }
    },
    {
      id: 'unknown',
      title: { en: 'Into the unknown', de: 'Ins Unbekannte' },
      story: {
        en: '<p>The rover explores a trench, and its length is different on every run. A <code>for</code> loop needs a number, but here you do not know it. A <code>while</code> loop repeats <b>as long as</b> a condition is true.</p><p><b>Mission:</b> Drive to the end of the trench and collect all crystals on the way.</p>',
        de: '<p>Der Rover erkundet einen Graben, und der ist bei jedem Start unterschiedlich lang. Eine <code>for</code>-Schleife braucht eine Zahl, aber die kennst du hier nicht. Eine <code>while</code>-Schleife wiederholt, <b>solange</b> eine Bedingung wahr ist.</p><p><b>Mission:</b> Fahre bis zum Ende des Grabens und sammle unterwegs alle Kristalle ein.</p>'
      },
      concept: {
        en: '<p>Repeat as long as the way is free. This example drives <b>up</b> until something is in the way:</p><pre>while can_move_up():\n    move_up()</pre><p><code>can_move_up()</code> is <code>True</code> if no rock and no edge is in the way. Before every round Python asks the question again. There is one such question for each direction.</p>',
        de: '<p>Wiederholen, solange der Weg frei ist. Dieses Beispiel fährt nach <b>oben</b>, bis etwas im Weg ist:</p><pre>while can_move_up():\n    move_up()</pre><p><code>can_move_up()</code> ist <code>True</code>, wenn kein Felsen und kein Rand im Weg ist. Vor jeder Runde stellt Python die Frage neu. Für jede Richtung gibt es so eine Frage.</p>'
      },
      hint: {
        en: 'Inside the <code>while</code> loop: drive right, then check with <code>if is_sample():</code> and collect.',
        de: 'In der <code>while</code>-Schleife: nach rechts fahren, dann mit <code>if is_sample():</code> prüfen und einsammeln.'
      },
      starter: {
        en: '# How long is the trench? It changes on every run.\n',
        de: '# Wie lang ist der Graben? Das ändert sich bei jedem Start.\n'
      },
      api: ['can_move', 'while_loop'],
      stars: [4, 6],
      random: true,
      build: function (rnd) {
        var width = 12, len = between(rnd, 4, 10);
        var trench = randomRow(rnd, len - 1, 0.45, 1, 1) + 'S';
        var wall = repeat('#', len + 2) + repeat('.', width - len - 2);
        return [
          wall,
          'R' + trench + '#' + repeat('.', width - len - 2),
          wall
        ];
      }
    },
    {
      id: 'canyon',
      title: { en: 'The canyon', de: 'Der Canyon' },
      story: {
        en: '<p>A winding canyon: first to the right, then down, then right again, then down again. How long each part is changes on every run. The crystal lies at the very end.</p><p><b>Mission:</b> Follow the canyon to its end and collect the crystal.</p>',
        de: '<p>Ein verwinkelter Canyon: erst nach rechts, dann nach unten, dann wieder nach rechts, dann wieder nach unten. Wie lang jedes Stück ist, ändert sich bei jedem Start. Der Kristall liegt ganz am Ende.</p><p><b>Mission:</b> Folge dem Canyon bis zum Ende und sammle den Kristall ein.</p>'
      },
      concept: null,
      hint: {
        en: 'Drive right as long as possible, then down as long as possible. You need that twice, so a <code>for</code> loop around two <code>while</code> loops is the shortest way.',
        de: 'Fahre so lange wie möglich nach rechts, dann so lange wie möglich nach unten. Das brauchst du zweimal, also ist eine <code>for</code>-Schleife um zwei <code>while</code>-Schleifen der kürzeste Weg.'
      },
      starter: {
        en: '# Right, down, right, down - but how far each time?\n',
        de: '# Rechts, runter, rechts, runter - aber wie weit jeweils?\n'
      },
      api: [],
      stars: [6, 9],
      random: true,
      build: function (rnd) {
        var W = 9, H = 6, x, y, i;
        var a = between(rnd, 2, 4), b = between(rnd, 1, 2), c = between(rnd, 2, 4), d = between(rnd, 1, 3);
        var grid = [];
        for (y = 0; y < H; y++) {
          grid.push([]);
          for (x = 0; x < W; x++) grid[y].push('#');
        }
        for (i = 0; i <= a; i++) grid[0][i] = '.';
        for (i = 0; i <= b; i++) grid[i][a] = '.';
        for (i = 0; i <= c; i++) grid[b][a + i] = '.';
        for (i = 0; i <= d; i++) grid[b + i][a + c] = '.';
        grid[0][0] = 'R';
        grid[b + d][a + c] = 'S';
        return grid.map(function (row) { return row.join(''); });
      }
    },
    {
      id: 'own-commands',
      title: { en: 'Your own commands', de: 'Eigene Befehle' },
      story: {
        en: '<p>Three rows of ice, but they are not evenly spaced. Collecting one row is always the same work. With <code>def</code> you give that work a name and teach the rover a <b>new command</b>.</p><p><b>Mission:</b> Write a function that collects one row and drives back to the left. Then use it three times.</p>',
        de: '<p>Drei Reihen Eis, aber sie haben unterschiedliche Abstände. Eine Reihe einzusammeln ist immer dieselbe Arbeit. Mit <code>def</code> gibst du dieser Arbeit einen Namen und bringst dem Rover einen <b>neuen Befehl</b> bei.</p><p><b>Mission:</b> Schreibe eine Funktion, die eine Reihe einsammelt und nach links zurückfährt. Benutze sie dann dreimal.</p>'
      },
      concept: {
        en: '<p>Define a function, then call it:</p><pre>def two_right():\n    move_right()\n    move_right()\n\ntwo_right()\ntwo_right()</pre><p>The indented lines are stored under the name <code>two_right</code>. They only run when you call <code>two_right()</code>. You choose the name yourself.</p>',
        de: '<p>Eine Funktion definieren und dann aufrufen:</p><pre>def zwei_rechts():\n    move_right()\n    move_right()\n\nzwei_rechts()\nzwei_rechts()</pre><p>Die eingerückten Zeilen werden unter dem Namen <code>zwei_rechts</code> gespeichert. Sie laufen erst, wenn du <code>zwei_rechts()</code> aufrufst. Den Namen wählst du selbst.</p>'
      },
      hint: {
        en: 'In the function: a loop "4 times right and collect" and a loop "4 times left". After that: call it, 2 times down, call it, 3 times down, call it.',
        de: 'In der Funktion: eine Schleife „4-mal rechts und einsammeln“ und eine Schleife „4-mal links“. Danach: aufrufen, 2-mal runter, aufrufen, 3-mal runter, aufrufen.'
      },
      starter: {
        en: 'def collect_row():\n    # What does the rover do for one row?\n    move_right()\n\ncollect_row()\n',
        de: 'def reihe_einsammeln():\n    # Was macht der Rover für eine Reihe?\n    move_right()\n\nreihe_einsammeln()\n'
      },
      api: ['def_stmt'],
      stars: [14, 18],
      build: fixed([
        'RSSSS',
        '.####',
        '.SSSS',
        '.....',
        '.#.#.',
        '.SSSS'
      ])
    },
    {
      id: 'ice-or-stone',
      title: { en: 'Ice or stone?', de: 'Eis oder Stein?' },
      story: {
        en: '<p>Not everything that lies around is valuable. Besides ice there are now grey stones, and the cargo bay only accepts ice. <code>is_sample()</code> is not enough any more, because it is true for both.</p><p><b>Mission:</b> Collect all the ice and leave the stones where they are.</p>',
        de: '<p>Nicht alles, was herumliegt, ist wertvoll. Neben Eis gibt es jetzt graue Steine, und der Laderaum nimmt nur Eis an. <code>is_sample()</code> reicht nicht mehr, denn es ist bei beiden wahr.</p><p><b>Mission:</b> Sammle das ganze Eis ein und lass die Steine liegen.</p>'
      },
      concept: {
        en: '<p>You can make the question more precise. Write into the brackets what the rover should look for:</p><pre>if is_sample("stone"):\n    print("Just a stone")</pre><p><code>is_sample("stone")</code> is only <code>True</code> for a stone, <code>is_sample("ice")</code> only for ice. With empty brackets it is <code>True</code> for both. The text needs quotation marks.</p>',
        de: '<p>Du kannst die Frage genauer stellen. Schreibe in die Klammern, wonach der Rover suchen soll:</p><pre>if is_sample("stone"):\n    print("Nur ein Stein")</pre><p><code>is_sample("stone")</code> ist nur bei einem Stein <code>True</code>, <code>is_sample("ice")</code> nur bei Eis. Mit leeren Klammern ist es bei beiden <code>True</code>. Der Text braucht Anführungszeichen.</p>'
      },
      hint: {
        en: 'Like in "Look first", but the question has to ask for ice only. Mind the quotation marks inside the brackets.',
        de: 'Wie bei „Erst schauen“, aber die Frage muss gezielt nach Eis fragen. Achte auf die Anführungszeichen in den Klammern.'
      },
      starter: {
        en: '# Only ice goes into the cargo bay.\n',
        de: '# In den Laderaum kommt nur Eis.\n'
      },
      api: ['is_sample_kind'],
      stars: [4, 6],
      random: true,
      build: function (rnd) {
        for (;;) {
          var row = '', ice = 0, stone = 0;
          for (var i = 0; i < 9; i++) {
            var r = rnd();
            if (r < 0.38) { row += 'S'; ice++; }
            else if (r < 0.72) { row += 'T'; stone++; }
            else row += '.';
          }
          if (ice >= 2 && stone >= 2) return ['...#......', 'R' + row, '......#...'];
        }
      }
    },
    {
      id: 'pyramid',
      title: { en: 'The pyramid', de: 'Die Pyramide' },
      story: {
        en: '<p>Every row is one crystal longer than the one before: 1, 2, 3, 4, 5. A loop can count along. The <b>variable</b> after <code>for</code> holds a new number in every round, and you can use it inside the loop.</p><p><b>Mission:</b> Collect all 15 crystals.</p>',
        de: '<p>Jede Reihe ist einen Kristall länger als die vorige: 1, 2, 3, 4, 5. Eine Schleife kann mitzählen. Die <b>Variable</b> hinter <code>for</code> enthält in jeder Runde eine neue Zahl, und du kannst sie in der Schleife benutzen.</p><p><b>Mission:</b> Sammle alle 15 Kristalle ein.</p>'
      },
      concept: {
        en: '<p><code>range(1, 4)</code> counts 1, 2, 3:</p><pre>for n in range(1, 4):\n    print("round", n)\n    for i in range(n):\n        print("*")</pre><p>Round 1 writes one star, round 2 two stars, round 3 three. You can use <code>n</code> wherever a number is expected, for example in <code>range(n)</code>.</p>',
        de: '<p><code>range(1, 4)</code> zählt 1, 2, 3:</p><pre>for n in range(1, 4):\n    print("Runde", n)\n    for i in range(n):\n        print("*")</pre><p>Runde 1 schreibt einen Stern, Runde 2 zwei Sterne, Runde 3 drei. Du kannst <code>n</code> überall benutzen, wo eine Zahl erwartet wird, zum Beispiel in <code>range(n)</code>.</p>'
      },
      hint: {
        en: 'Outer loop: <code>for n in range(1, 6):</code>. Inside: n times right and collect, n times left, then one field down.',
        de: 'Äußere Schleife: <code>for n in range(1, 6):</code>. Darin: n-mal rechts und einsammeln, n-mal links, dann ein Feld runter.'
      },
      starter: {
        en: '# Row 1 has 1 crystal, row 2 has 2, row 3 has 3 ...\n',
        de: '# Reihe 1 hat 1 Kristall, Reihe 2 hat 2, Reihe 3 hat 3 ...\n'
      },
      api: [],
      stars: [7, 12],
      build: fixed([
        'RS....',
        '.SS...',
        '.SSS..',
        '.SSSS.',
        '.SSSSS'
      ])
    },
    {
      id: 'free-exploration',
      title: { en: 'Free exploration', de: 'Freie Erkundung' },
      story: {
        en: '<p>A large plain with ice and stones, different on every run. There are no stars here, so try whatever you like.</p><p><b>Mission:</b> Collect all the ice. Ideas for experts: count the crystals in a variable and <code>print()</code> the result at the end, drive in a snake line instead of driving back, or write a function with a direction, such as <code>def drive(direction, steps):</code>.</p>',
        de: '<p>Eine große Ebene mit Eis und Steinen, bei jedem Start anders. Hier gibt es keine Sterne, probiere also aus, was du willst.</p><p><b>Mission:</b> Sammle das ganze Eis ein. Ideen für Profis: Zähle die Kristalle in einer Variablen und gib das Ergebnis am Ende mit <code>print()</code> aus, fahre in Schlangenlinien statt zurückzufahren, oder schreibe eine Funktion mit Richtung, etwa <code>def fahre(richtung, schritte):</code>.</p>'
      },
      concept: {
        en: '<p>A variable remembers a value:</p><pre>count = 0\ncount = count + 1\nprint(count)</pre><p><code>scan()</code> gives you a value as well: the text <code>"ice"</code>, <code>"stone"</code> or <code>"nothing"</code>, which you can compare with <code>==</code>. <code>move("right")</code> takes the direction as a text, and <code>get_x()</code> and <code>get_y()</code> tell you where the rover is.</p>',
        de: '<p>Eine Variable merkt sich einen Wert:</p><pre>anzahl = 0\nanzahl = anzahl + 1\nprint(anzahl)</pre><p>Auch <code>scan()</code> liefert einen Wert: den Text <code>"ice"</code>, <code>"stone"</code> oder <code>"nothing"</code>, den du mit <code>==</code> vergleichen kannst. <code>move("right")</code> bekommt die Richtung als Text, und <code>get_x()</code> und <code>get_y()</code> sagen dir, wo der Rover steht.</p>'
      },
      hint: {
        en: 'The plain has 7 rows. In every row there are 9 fields to the right of the rover.',
        de: 'Die Ebene hat 7 Reihen. In jeder Reihe liegen 9 Felder rechts vom Rover.'
      },
      starter: {
        en: '# Free exploration: collect all the ice, in your own way.\n',
        de: '# Freie Erkundung: Sammle das ganze Eis ein, auf deine Art.\n'
      },
      api: ['scan', 'move', 'get_pos'],
      stars: null,
      random: true,
      build: function (rnd) {
        for (;;) {
          var rows = [], ice = 0;
          for (var y = 0; y < 7; y++) {
            var row = (y === 0) ? 'R' : '.';
            for (var x = 0; x < 9; x++) {
              var r = rnd();
              if (r < 0.25) { row += 'S'; ice++; }
              else if (r < 0.37) row += 'T';
              else row += '.';
            }
            rows.push(row);
          }
          if (ice >= 6) return rows;
        }
      }
    },

    /* ---------- Helicopter track ----------
     * The rover runs `roverCode`, which the student can read but not change.
     * The student's program flies the helicopter (H on the map). Both run in step.
     * world: goal 'deliver' (bring the part to the rover) or 'collect', battery, part, hidden, dropMustHit
     * starMetric 'battery': the stars count battery used instead of lines of code. */
    {
      id: 'heli-delivery',
      track: 'heli',
      title: { en: 'Special delivery', de: 'Eillieferung' },
      story: {
        en: '<p>A wheel sensor on the rover is failing. The rover will drive to its work site, stop there and wait for a spare part. You fly the <b>helicopter</b> that carries the part.</p><p>Both programs run <b>at the same time</b>. You cannot change the rover\'s program, but you can read it.</p><p><b>Mission:</b> Work out where the rover will stop, fly there and drop the part. The battery is too small for searching.</p>',
        de: '<p>Ein Radsensor des Rovers fällt aus. Der Rover fährt zu seinem Einsatzort, hält dort an und wartet auf ein Ersatzteil. Du fliegst den <b>Helikopter</b>, der das Teil trägt.</p><p>Beide Programme laufen <b>gleichzeitig</b>. Das Programm des Rovers kannst du nicht ändern, aber lesen.</p><p><b>Mission:</b> Finde heraus, wo der Rover anhalten wird, fliege dorthin und wirf das Teil ab. Zum Suchen reicht der Akku nicht.</p>'
      },
      concept: {
        en: '<p>Your program now controls the helicopter. It flies over rocks, and every flight costs 1 battery. <code>drop()</code> lets go of the part: if the rover is on that field it takes the part at once, otherwise the part lies there until the rover\'s <code>wait_for_part()</code> finds it.</p><p>A <b>tick</b> is one beat of the mission clock: the rover carries out one command, then the helicopter one. <b>Step</b> plays one tick at a time.</p>',
        de: '<p>Dein Programm steuert jetzt den Helikopter. Er fliegt über Felsen hinweg, und jeder Flug kostet 1 Akku. <code>drop()</code> lässt das Teil los: Steht der Rover auf diesem Feld, nimmt er es sofort, sonst liegt es dort, bis <code>wait_for_part()</code> des Rovers es findet.</p><p>Ein <b>Tick</b> ist ein Takt der Missionsuhr: Der Rover führt einen Befehl aus, dann der Helikopter einen. <b>Schritt</b> spielt jeweils einen Tick ab.</p>'
      },
      hint: {
        en: 'Go through the rover\'s program line by line and note its position after every command. It starts at column 0, row 0. The numbers at the edge of the map help.',
        de: 'Gehe das Programm des Rovers Zeile für Zeile durch und notiere seine Position nach jedem Befehl. Er startet bei Spalte 0, Zeile 0. Die Zahlen am Kartenrand helfen.'
      },
      starter: {
        en: '# Your program flies the helicopter.\n# Read the rover\'s program first.\n',
        de: '# Dein Programm fliegt den Helikopter.\n# Lies zuerst das Programm des Rovers.\n'
      },
      roverCode: {
        en: '# Drive to the work site,\n# then wait for the part.\nfor i in range(3):\n    move_right()\nfor i in range(2):\n    move_down()\n    move_right()\nwait_for_part()\n',
        de: '# Zum Einsatzort fahren,\n# dann aufs Teil warten.\nfor i in range(3):\n    move_right()\nfor i in range(2):\n    move_down()\n    move_right()\nwait_for_part()\n'
      },
      api: ['fly', 'drop', 'battery'],
      world: { goal: 'deliver', battery: 10, part: true },
      starMetric: 'battery',
      stars: [7, 8],
      build: fixed([
        'R...#..',
        '.#...#.',
        '..#....',
        '...#..#',
        'H....#.'
      ])
    },
    {
      id: 'heli-moving-target',
      track: 'heli',
      title: { en: 'Moving target', de: 'Bewegliches Ziel' },
      story: {
        en: '<p>This time the rover does not stop. Its program has no command for waiting, and when the program ends the rover switches off. The part has to land on the rover <b>while it is driving</b>.</p><p><b>Mission:</b> Be above the right field at the right tick and drop the part. If the rover is not below you, the part is lost.</p>',
        de: '<p>Diesmal hält der Rover nicht an. Sein Programm hat keinen Befehl zum Warten, und wenn es zu Ende ist, schaltet sich der Rover ab. Das Teil muss auf dem Rover landen, <b>während er fährt</b>.</p><p><b>Mission:</b> Sei im richtigen Tick über dem richtigen Feld und wirf das Teil ab. Ist der Rover nicht unter dir, ist das Teil verloren.</p>'
      },
      concept: {
        en: '<p><code>wait()</code> lets the helicopter hover for one tick. It costs no battery, but the clock keeps running.</p><p>Count in ticks: after tick 1 the rover has carried out its first command, after tick 2 its second, and so on. <code>drop()</code> hits if the rover is on your field <b>at the end of that tick</b>.</p><p>The stars count battery, so a meeting point close to you is worth more.</p>',
        de: '<p><code>wait()</code> lässt den Helikopter einen Tick lang schweben. Das kostet keinen Akku, aber die Uhr läuft weiter.</p><p>Zähle in Ticks: Nach Tick 1 hat der Rover seinen ersten Befehl ausgeführt, nach Tick 2 seinen zweiten und so weiter. <code>drop()</code> trifft, wenn der Rover <b>am Ende dieses Ticks</b> auf deinem Feld steht.</p><p>Die Sterne zählen den Akku, ein Treffpunkt in deiner Nähe ist also mehr wert.</p>'
      },
      hint: {
        en: 'Pick a field on the rover\'s route. In which tick does the rover arrive there? Your <code>drop()</code> must be your command with exactly that number. Example: the rover arrives in tick 9 and you need 4 flights, so you wait 4 ticks and drop as your 9th command.',
        de: 'Wähle ein Feld auf der Route des Rovers. In welchem Tick kommt der Rover dort an? Dein <code>drop()</code> muss dein Befehl mit genau dieser Nummer sein. Beispiel: Der Rover kommt in Tick 9 an und du brauchst 4 Flüge, also wartest du 4 Ticks und wirfst als 9. Befehl ab.'
      },
      starter: {
        en: '# Where is the rover after each tick?\n',
        de: '# Wo ist der Rover nach jedem Tick?\n'
      },
      roverCode: {
        en: '# The rover never stops.\n# At the end it turns off.\nfor i in range(2):\n    move_down()\nfor i in range(6):\n    move_right()\nfor i in range(2):\n    move_up()\nfor i in range(3):\n    move_right()\n',
        de: '# Der Rover hält nie an.\n# Am Ende schaltet er ab.\nfor i in range(2):\n    move_down()\nfor i in range(6):\n    move_right()\nfor i in range(2):\n    move_up()\nfor i in range(3):\n    move_right()\n'
      },
      api: ['wait'],
      world: { goal: 'deliver', battery: 6, part: true, dropMustHit: true },
      starMetric: 'battery',
      stars: [2, 4],
      build: fixed([
        'R#####....',
        '.#####....',
        '..........',
        '...#....#.',
        '....H..#..'
      ])
    },
    {
      id: 'heli-photo',
      track: 'heli',
      title: { en: 'Aerial photo', de: 'Luftbild' },
      story: {
        en: '<p>One ice crystal lies hidden under the dust, in a different place on every run. From the ground it is invisible, but the helicopter\'s infrared camera can see it. <code>take_photo()</code> returns the whole area as a list of rows, and every row is a list of fields.</p><p>The rover is waiting for a beacon. Read its program to see what it does with it.</p><p><b>Mission:</b> Find the ice in the photo, fly there and set the beacon with <code>mark()</code>.</p>',
        de: '<p>Ein Eiskristall liegt unter dem Staub verborgen, bei jedem Start an einer anderen Stelle. Vom Boden aus ist er unsichtbar, aber die Infrarotkamera des Helikopters sieht ihn. <code>take_photo()</code> liefert das ganze Gebiet als Liste von Zeilen, und jede Zeile ist eine Liste von Feldern.</p><p>Der Rover wartet auf eine Markierung. Lies sein Programm, um zu sehen, was er damit macht.</p><p><b>Mission:</b> Finde das Eis im Foto, fliege dorthin und setze die Markierung mit <code>mark()</code>.</p>'
      },
      concept: {
        en: '<p>A list in a list. You reach one field with two indexes, <b>first the row, then the column</b>:</p><pre>photo = take_photo()\nprint(photo[0][3])\nprint(len(photo))</pre><p><code>photo[0][3]</code> is the field in row 0, column 3. Its value is <code>"ice"</code> or <code>"sand"</code>. <code>len(photo)</code> is the number of rows and <code>len(photo[0])</code> the number of columns. Counting starts at 0, just like the numbers at the edge of the map.</p>',
        de: '<p>Eine Liste in einer Liste. Ein Feld erreichst du mit zwei Indizes, <b>erst die Zeile, dann die Spalte</b>:</p><pre>photo = take_photo()\nprint(photo[0][3])\nprint(len(photo))</pre><p><code>photo[0][3]</code> ist das Feld in Zeile 0, Spalte 3. Sein Wert ist <code>"ice"</code> oder <code>"sand"</code>. <code>len(photo)</code> ist die Anzahl der Zeilen und <code>len(photo[0])</code> die Anzahl der Spalten. Gezählt wird ab 0, genau wie bei den Zahlen am Kartenrand.</p>'
      },
      hint: {
        en: 'Two nested loops: <code>y</code> over the rows and <code>x</code> over the columns. When <code>photo[y][x] == "ice"</code> you know the target. The helicopter starts at column 0, row 0, so the target is x flights to the right and y flights down.',
        de: 'Zwei verschachtelte Schleifen: <code>y</code> über die Zeilen und <code>x</code> über die Spalten. Wenn <code>photo[y][x] == "ice"</code> gilt, kennst du das Ziel. Der Helikopter startet bei Spalte 0, Zeile 0, das Ziel liegt also x Flüge rechts und y Flüge unten.'
      },
      starter: {
        en: '# The ice is somewhere else on every run.\nphoto = take_photo()\n',
        de: '# Das Eis liegt bei jedem Start woanders.\nphoto = take_photo()\n'
      },
      roverCode: {
        en: '# Wait for the beacon, drive\n# to it and drill there.\nwait_for_beacon()\nx = beacon_x()\ny = beacon_y()\nfor i in range(x):\n    move_right()\nfor i in range(5 - y):\n    move_up()\ncollect()\n',
        de: '# Auf die Markierung warten,\n# hinfahren und dort bohren.\nwait_for_beacon()\nx = beacon_x()\ny = beacon_y()\nfor i in range(x):\n    move_right()\nfor i in range(5 - y):\n    move_up()\ncollect()\n'
      },
      api: ['take_photo', 'mark', 'heli_pos', 'print'],
      world: { goal: 'collect', battery: 12, hidden: true },
      starMetric: 'battery',
      stars: [12, 12],
      random: true,
      build: function (rnd) {
        var cols = 8, rows = 6, x, y, out = [];
        do {
          x = between(rnd, 0, cols - 1);
          y = between(rnd, 0, rows - 1);
        } while (x + y < 3 || (x === 0 && y === rows - 1));
        for (var r = 0; r < rows; r++) {
          var line = '';
          for (var c = 0; c < cols; c++) {
            if (c === x && r === y) line += 'S';
            else if (c === 0 && r === 0) line += 'H';
            else if (c === 0 && r === rows - 1) line += 'R';
            else line += '.';
          }
          out.push(line);
        }
        return out;
      }
    },
    {
      id: 'heli-plan',
      track: 'heli',
      title: { en: 'According to plan', de: 'Nach Plan' },
      story: {
        en: '<p>The rover gets its orders as a list of numbers, the <b>plan</b>. The plan is different on every run, so a flight you worked out by watching is wrong the next time.</p><p>Read the rover\'s program to see what each number means. Your program can read the same plan with <code>get_plan()</code>.</p><p><b>Mission:</b> Fly to where the rover will stop and drop the part, whatever the plan says.</p>',
        de: '<p>Der Rover bekommt seine Befehle als Liste von Zahlen, den <b>Plan</b>. Der Plan ist bei jedem Start anders, ein Flug, den du durch Zuschauen herausgefunden hast, ist beim nächsten Mal also falsch.</p><p>Lies das Programm des Rovers, um zu sehen, was jede Zahl bedeutet. Dein Programm kann denselben Plan mit <code>get_plan()</code> lesen.</p><p><b>Mission:</b> Fliege dorthin, wo der Rover anhalten wird, und wirf das Teil ab, egal was im Plan steht.</p>'
      },
      concept: {
        en: '<p>A list holds several values. With an <b>index</b> in square brackets you pick one of them, counting from 0:</p><pre>plan = get_plan()\nprint(plan)\nprint(plan[0] + plan[1])</pre><p>You can calculate with a list element like with any other number, for example <code>range(plan[0] + 2)</code>.</p>',
        de: '<p>Eine Liste enthält mehrere Werte. Mit einem <b>Index</b> in eckigen Klammern wählst du einen davon aus, gezählt wird ab 0:</p><pre>plan = get_plan()\nprint(plan)\nprint(plan[0] + plan[1])</pre><p>Mit einem Listenelement kannst du rechnen wie mit jeder anderen Zahl, zum Beispiel <code>range(plan[0] + 2)</code>.</p>'
      },
      hint: {
        en: 'The rover starts at column 0, row 0. Its last column is <code>plan[0] + plan[2]</code> and its last row is <code>plan[1]</code>. You start at column 0, row 5, so you fly <code>5 - plan[1]</code> fields up.',
        de: 'Der Rover startet bei Spalte 0, Zeile 0. Seine letzte Spalte ist <code>plan[0] + plan[2]</code> und seine letzte Zeile <code>plan[1]</code>. Du startest bei Spalte 0, Zeile 5, fliegst also <code>5 - plan[1]</code> Felder nach oben.'
      },
      starter: {
        en: '# The plan changes on every run.\nplan = get_plan()\nprint(plan)\n',
        de: '# Der Plan ändert sich bei jedem Start.\nplan = get_plan()\nprint(plan)\n'
      },
      roverCode: {
        en: '# A new plan on every run.\nplan = get_plan()\nfor i in range(plan[0]):\n    move_right()\nfor i in range(plan[1]):\n    move_down()\nfor i in range(plan[2]):\n    move_right()\nwait_for_part()\n',
        de: '# Jeder Start: neuer Plan.\nplan = get_plan()\nfor i in range(plan[0]):\n    move_right()\nfor i in range(plan[1]):\n    move_down()\nfor i in range(plan[2]):\n    move_right()\nwait_for_part()\n'
      },
      api: ['get_plan'],
      world: { goal: 'deliver', battery: 12, part: true },
      starMetric: 'battery',
      stars: function (w) {
        var direct = w.plan[0] + w.plan[2] + 5 - w.plan[1];
        return [direct, direct + 2];
      },
      random: true,
      build: function (rnd) {
        var cols = 8, rows = 6, i, x, y;
        var a = between(rnd, 1, 3), b = between(rnd, 1, 4), c = between(rnd, 1, 3);
        var grid = [];
        for (y = 0; y < rows; y++) {
          grid.push([]);
          for (x = 0; x < cols; x++) grid[y].push('.');
        }
        var keep = {};
        for (i = 0; i <= a; i++) keep[i + ',0'] = true;
        for (i = 0; i <= b; i++) keep[a + ',' + i] = true;
        for (i = 0; i <= c; i++) keep[(a + i) + ',' + b] = true;
        keep['0,' + (rows - 1)] = true;
        var rocks = 0;
        while (rocks < 5) {
          x = between(rnd, 0, cols - 1);
          y = between(rnd, 0, rows - 1);
          if (keep[x + ',' + y] || grid[y][x] === '#') continue;
          grid[y][x] = '#';
          rocks++;
        }
        grid[0][0] = 'R';
        grid[rows - 1][0] = 'H';
        return {
          rows: grid.map(function (row) { return row.join(''); }),
          world: { plan: [a, b, c] }
        };
      }
    },
    {
      id: 'heli-route',
      track: 'heli',
      title: { en: 'Radio contact', de: 'Funkkontakt' },
      story: {
        en: '<p>A wall of rocks blocks the rover\'s way to the crystal. There is one gap, in a different row on every run, and from the ground the rover cannot see it. The helicopter sees everything from above.</p><p>The rover waits for a <b>route</b>: a list of directions such as <code>["right", "down"]</code>. Then it drives exactly what the list says.</p><p><b>Mission:</b> Find the gap in the photo, build the route as a list and <code>send()</code> it to the rover. The helicopter does not have to fly.</p>',
        de: '<p>Eine Felswand versperrt dem Rover den Weg zum Kristall. Es gibt eine Lücke, bei jedem Start in einer anderen Zeile, und vom Boden aus sieht der Rover sie nicht. Der Helikopter sieht alles von oben.</p><p>Der Rover wartet auf eine <b>Route</b>: eine Liste von Richtungen wie <code>["right", "down"]</code>. Dann fährt er genau das, was in der Liste steht.</p><p><b>Mission:</b> Finde die Lücke im Foto, baue die Route als Liste und schicke sie mit <code>send()</code> an den Rover. Der Helikopter muss dafür nicht fliegen.</p>'
      },
      concept: {
        en: '<p>You can build a list piece by piece. <code>append()</code> adds a value at the end:</p><pre>words = []\nfor i in range(2):\n    words.append("hi")\nwords.append("bye")\nprint(words)</pre><p>The output is <code>[\'hi\', \'hi\', \'bye\']</code>.</p><p>The wall stands in column 4. In the photo, <code>photo[y][4]</code> is <code>"rock"</code> in every row except the one with the gap, where it is <code>"sand"</code>.</p>',
        de: '<p>Eine Liste kannst du Stück für Stück aufbauen. <code>append()</code> hängt einen Wert ans Ende:</p><pre>words = []\nfor i in range(2):\n    words.append("hi")\nwords.append("bye")\nprint(words)</pre><p>Die Ausgabe ist <code>[\'hi\', \'hi\', \'bye\']</code>.</p><p>Die Wand steht in Spalte 4. Im Foto ist <code>photo[y][4]</code> in jeder Zeile <code>"rock"</code>, außer in der Zeile mit der Lücke, dort ist es <code>"sand"</code>.</p>'
      },
      hint: {
        en: 'First find the row of the gap: let <code>y</code> run over all rows and check <code>photo[y][4]</code>. The rover starts at column 0, row 0 and the crystal lies at column 8, row 0. So the route is: down to the row of the gap, 8 times right, and the same number of fields up again.',
        de: 'Finde zuerst die Zeile der Lücke: Lass <code>y</code> über alle Zeilen laufen und prüfe <code>photo[y][4]</code>. Der Rover startet bei Spalte 0, Zeile 0, und der Kristall liegt bei Spalte 8, Zeile 0. Die Route ist also: nach unten bis zur Zeile der Lücke, 8-mal nach rechts und genauso viele Felder wieder nach oben.'
      },
      starter: {
        en: '# The helicopter sees the whole area.\nphoto = take_photo()\nroute = []\n',
        de: '# Der Helikopter sieht das ganze Gebiet.\nphoto = take_photo()\nroute = []\n'
      },
      roverCode: {
        en: '# Wait for the route, then\n# drive what the list says.\nroute = receive()\nfor step in route:\n    move(step)\ncollect()\n',
        de: '# Auf die Route warten, dann\n# fahren, was die Liste sagt.\nroute = receive()\nfor step in route:\n    move(step)\ncollect()\n'
      },
      api: ['send', 'list_append'],
      world: { goal: 'collect', battery: 6 },
      stars: [12, 16],
      random: true,
      build: function (rnd) {
        var cols = 9, rows = 6, x, y, grid = [];
        var gap = between(rnd, 1, rows - 1);
        for (y = 0; y < rows; y++) {
          grid.push([]);
          for (x = 0; x < cols; x++) grid[y].push(x === 4 && y !== gap ? '#' : '.');
        }
        var rocks = 0;
        while (rocks < 3) {
          x = between(rnd, 1, cols - 2);
          y = between(rnd, 0, rows - 1);
          if (x === 4 || y === gap || grid[y][x] === '#' || (x === 2 && y === 2)) continue;
          grid[y][x] = '#';
          rocks++;
        }
        grid[0][0] = 'R';
        grid[0][cols - 1] = 'S';
        grid[2][2] = 'H';
        return grid.map(function (row) { return row.join(''); });
      }
    },
    {
      id: 'heli-thermal',
      track: 'heli',
      title: { en: 'Thermal image', de: 'Wärmebild' },
      story: {
        en: '<p>Today the dust is so thick that the normal camera sees nothing. But ice is colder than the ground around it, and the helicopter also carries a <b>thermal camera</b>. <code>take_thermal()</code> returns the temperature of every field as a number, and shows the image on the map.</p><p><b>Mission:</b> Find the coldest field in the thermal image, fly there and set the beacon. The rover does the rest.</p>',
        de: '<p>Heute ist der Staub so dicht, dass die normale Kamera nichts sieht. Aber Eis ist kälter als der Boden rundherum, und der Helikopter hat auch eine <b>Wärmebildkamera</b> an Bord. <code>take_thermal()</code> liefert die Temperatur jedes Feldes als Zahl und zeigt das Bild auf der Karte.</p><p><b>Mission:</b> Finde das kälteste Feld im Wärmebild, fliege dorthin und setze die Markierung. Den Rest erledigt der Rover.</p>'
      },
      concept: {
        en: '<p>To find the smallest value, go through all of them and remember the smallest one so far:</p><pre>values = [7, 3, 9, 1, 5]\nsmallest = values[0]\nfor v in values:\n    if v &lt; smallest:\n        smallest = v\nprint(smallest)</pre><p>The output is 1. In the mission the numbers are in a list of rows, and you also have to remember <b>where</b> the smallest one was. Temperatures on Mars are negative: -70 is colder, and therefore smaller, than -40.</p>',
        de: '<p>Um den kleinsten Wert zu finden, gehst du alle durch und merkst dir den bisher kleinsten:</p><pre>values = [7, 3, 9, 1, 5]\nsmallest = values[0]\nfor v in values:\n    if v &lt; smallest:\n        smallest = v\nprint(smallest)</pre><p>Die Ausgabe ist 1. In der Mission stehen die Zahlen in einer Liste von Zeilen, und du musst dir auch merken, <b>wo</b> der kleinste Wert war. Temperaturen auf dem Mars sind negativ: -70 ist kälter und damit kleiner als -40.</p>'
      },
      hint: {
        en: 'Remember the position of the coldest field so far in two variables, for example <code>best_x</code> and <code>best_y</code>, both starting at 0. Go through all rows <code>y</code> and columns <code>x</code>. If <code>heat[y][x]</code> is smaller than <code>heat[best_y][best_x]</code>, that field becomes the new best. Afterwards fly <code>best_x</code> fields right and <code>best_y</code> fields down.',
        de: 'Merke dir die Position des bisher kältesten Feldes in zwei Variablen, zum Beispiel <code>best_x</code> und <code>best_y</code>, beide am Anfang 0. Gehe alle Zeilen <code>y</code> und Spalten <code>x</code> durch. Wenn <code>heat[y][x]</code> kleiner ist als <code>heat[best_y][best_x]</code>, wird dieses Feld das neue beste. Fliege danach <code>best_x</code> Felder nach rechts und <code>best_y</code> Felder nach unten.'
      },
      starter: {
        en: '# The colder a field, the smaller its number.\nheat = take_thermal()\n',
        de: '# Je kälter ein Feld, desto kleiner seine Zahl.\nheat = take_thermal()\n'
      },
      roverCode: {
        en: '# Wait for the beacon, drive\n# to it and drill there.\nwait_for_beacon()\nx = beacon_x()\ny = beacon_y()\nfor i in range(x):\n    move_right()\nfor i in range(5 - y):\n    move_up()\ncollect()\n',
        de: '# Auf die Markierung warten,\n# hinfahren und dort bohren.\nwait_for_beacon()\nx = beacon_x()\ny = beacon_y()\nfor i in range(x):\n    move_right()\nfor i in range(5 - y):\n    move_up()\ncollect()\n'
      },
      api: ['take_thermal'],
      world: { goal: 'collect', battery: 12, hidden: true, noPhoto: true },
      starMetric: 'battery',
      stars: [12, 12],
      random: true,
      build: function (rnd) {
        var cols = 8, rows = 6, x, y, out = [], heat = [], lowest = 0;
        do {
          x = between(rnd, 0, cols - 1);
          y = between(rnd, 0, rows - 1);
        } while (x + y < 3 || (x === 0 && y === rows - 1));
        // some days are colder than others, so no fixed number separates ice from ground
        var coldest = between(rnd, 50, 95), warmest = coldest - between(rnd, 20, 35);
        for (var r = 0; r < rows; r++) {
          var line = '', temps = [];
          for (var c = 0; c < cols; c++) {
            var temp = -between(rnd, warmest, coldest);
            lowest = Math.min(lowest, temp);
            temps.push(temp);
            if (c === x && r === y) line += 'S';
            else if (c === 0 && r === 0) line += 'H';
            else if (c === 0 && r === rows - 1) line += 'R';
            else line += '.';
          }
          out.push(line);
          heat.push(temps);
        }
        // the ice is the coldest field, but only by a little: a fixed limit does not find it
        heat[y][x] = lowest - between(rnd, 1, 3);
        return { rows: out, world: { heat: heat } };
      }
    },
    {
      id: 'heli-battery',
      track: 'heli',
      title: { en: 'Short on battery', de: 'Knapper Akku' },
      story: {
        en: '<p>Five crystals lie hidden under the dust, and the battery is small. The program in your editor already works in principle: it finds the crystals in the photo and flies to them one after another. But it visits them in the order of the list, and that wastes battery.</p><p>The rover waits for five beacons and then drives to each of them.</p><p><b>Mission:</b> Read the program, understand it, and change the <b>order</b> of the visits so that the battery lasts.</p>',
        de: '<p>Fünf Kristalle liegen unter dem Staub verborgen, und der Akku ist klein. Das Programm in deinem Editor funktioniert im Prinzip schon: Es findet die Kristalle im Foto und fliegt sie nacheinander an. Aber es besucht sie in der Reihenfolge der Liste, und das verschwendet Akku.</p><p>Der Rover wartet auf fünf Markierungen und fährt dann zu jeder hin.</p><p><b>Mission:</b> Lies das Programm, verstehe es und ändere die <b>Reihenfolge</b> der Besuche so, dass der Akku reicht.</p>'
      },
      concept: {
        en: '<p>The first solution that works is often not the best one. <b>Optimising</b> means: the same result for less cost. A simple and good rule here: always fly to the <b>nearest</b> target next.</p><p>The distance between two fields is the difference of the columns plus the difference of the rows. <code>abs()</code> removes a minus sign:</p><pre>print(abs(2 - 7))\nprint(abs(7 - 2))</pre><p>Both lines print 5. <code>targets.remove(t)</code> deletes the element <code>t</code> from the list, and <code>len(targets)</code> tells you how many are left.</p>',
        de: '<p>Die erste Lösung, die funktioniert, ist oft nicht die beste. <b>Optimieren</b> heißt: dasselbe Ergebnis mit weniger Aufwand. Eine einfache und gute Regel hier: Fliege immer als Nächstes zum <b>nächstgelegenen</b> Ziel.</p><p>Der Abstand zweier Felder ist der Unterschied der Spalten plus der Unterschied der Zeilen. <code>abs()</code> entfernt ein Minuszeichen:</p><pre>print(abs(2 - 7))\nprint(abs(7 - 2))</pre><p>Beide Zeilen geben 5 aus. <code>targets.remove(t)</code> löscht das Element <code>t</code> aus der Liste, und <code>len(targets)</code> sagt dir, wie viele noch übrig sind.</p>'
      },
      hint: {
        en: 'Replace the last loop. Repeat as long as targets are left: go through all of them and remember the one with the smallest distance from where you are now (<code>get_x()</code>, <code>get_y()</code>). Fly there, set the beacon and remove that target from the list.',
        de: 'Ersetze die letzte Schleife. Wiederhole, solange Ziele übrig sind: Gehe alle durch und merke dir das mit dem kleinsten Abstand zu deiner jetzigen Position (<code>get_x()</code>, <code>get_y()</code>). Fliege hin, setze die Markierung und lösche dieses Ziel aus der Liste.'
      },
      starter: {
        en: 'def fly_to(x, y):\n    while get_x() < x:\n        fly_right()\n    while get_x() > x:\n        fly_left()\n    while get_y() < y:\n        fly_down()\n    while get_y() > y:\n        fly_up()\n\nphoto = take_photo()\ntargets = []\nfor y in range(len(photo)):\n    for x in range(len(photo[y])):\n        if photo[y][x] == "ice":\n            targets.append([x, y])\n\n# This visits the targets in the order of the list.\n# The battery does not last. Find a better order!\nfor t in targets:\n    fly_to(t[0], t[1])\n    mark()\n',
        de: 'def fly_to(x, y):\n    while get_x() < x:\n        fly_right()\n    while get_x() > x:\n        fly_left()\n    while get_y() < y:\n        fly_down()\n    while get_y() > y:\n        fly_up()\n\nphoto = take_photo()\ntargets = []\nfor y in range(len(photo)):\n    for x in range(len(photo[y])):\n        if photo[y][x] == "ice":\n            targets.append([x, y])\n\n# Das besucht die Ziele in der Reihenfolge der Liste.\n# Dafür reicht der Akku nicht. Finde eine bessere Reihenfolge!\nfor t in targets:\n    fly_to(t[0], t[1])\n    mark()\n'
      },
      roverCode: {
        en: '# Wait for 5 beacons, then\n# drive to each and drill.\ntargets = wait_for_beacons(5)\nfor t in targets:\n    drive_to(t[0], t[1])\n    collect()\n',
        de: '# Auf 5 Markierungen warten,\n# dann zu jeder fahren, bohren.\ntargets = wait_for_beacons(5)\nfor t in targets:\n    drive_to(t[0], t[1])\n    collect()\n'
      },
      api: ['abs_doc', 'list_remove', 'len_doc'],
      world: { goal: 'collect', hidden: true, beacons: 5 },
      starMetric: 'battery',
      stars: function (w) { return [w.info.shortest, w.heli.capacity]; },
      random: true,
      build: function (rnd) {
        var cols = 9, rows = 7, count = 5;
        function dist(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
        function without(list, i) { return list.slice(0, i).concat(list.slice(i + 1)); }
        function tour(order) {
          var pos = [0, 0], sum = 0;
          order.forEach(function (p) { sum += dist(pos, p); pos = p; });
          return sum;
        }
        // shortest of all possible orders
        function shortest(pos, left) {
          if (!left.length) return 0;
          var best = Infinity;
          left.forEach(function (p, i) { best = Math.min(best, dist(pos, p) + shortest(p, without(left, i))); });
          return best;
        }
        // "always the nearest next", and where two are equally near, the more expensive choice
        function nearestFirst(pos, left) {
          if (!left.length) return 0;
          var near = Infinity, worst = 0;
          left.forEach(function (p) { near = Math.min(near, dist(pos, p)); });
          left.forEach(function (p, i) {
            if (dist(pos, p) === near) worst = Math.max(worst, near + nearestFirst(p, without(left, i)));
          });
          return worst;
        }
        for (;;) {
          var cells = [], taken = {};
          while (cells.length < count) {
            var x = between(rnd, 0, cols - 1), y = between(rnd, 0, rows - 1);
            if (taken[x + ',' + y] || (x === 0 && (y === 0 || y === rows - 1))) continue;
            taken[x + ',' + y] = true;
            cells.push([x, y]);
          }
          // the order in which the starting program finds them: row by row
          cells.sort(function (p, q) { return p[1] - q[1] || p[0] - q[0]; });
          var battery = nearestFirst([0, 0], cells);
          if (tour(cells) < battery + 3) continue;
          var out = [];
          for (var r = 0; r < rows; r++) {
            var line = '';
            for (var c = 0; c < cols; c++) {
              if (taken[c + ',' + r]) line += 'S';
              else if (c === 0 && r === 0) line += 'H';
              else if (c === 0 && r === rows - 1) line += 'R';
              else line += '.';
            }
            out.push(line);
          }
          return { rows: out, world: { battery: battery, info: { shortest: shortest([0, 0], cells) } } };
        }
      }
    },
    {
      id: 'heli-mosaic',
      track: 'heli',
      title: { en: 'Piece by piece', de: 'Stück für Stück' },
      story: {
        en: '<p>A sandstorm! The camera only reaches one field in every direction, so a photo shows just the 3 × 3 fields around the helicopter. Five crystals are hidden somewhere in the area of 9 × 6 fields.</p><p>The rover waits for a map of the <b>whole</b> area and then drills at every field that is marked <code>"ice"</code> in it. Read its program.</p><p><b>Mission:</b> Take six photos, put them together into one big map and <code>send()</code> it to the rover.</p>',
        de: '<p>Ein Sandsturm! Die Kamera reicht nur ein Feld weit in jede Richtung, ein Foto zeigt also nur die 3 × 3 Felder um den Helikopter. Irgendwo im Gebiet von 9 × 6 Feldern sind fünf Kristalle versteckt.</p><p>Der Rover wartet auf eine Karte des <b>ganzen</b> Gebiets und bohrt dann an jedem Feld, das darin als <code>"ice"</code> eingetragen ist. Lies sein Programm.</p><p><b>Mission:</b> Mache sechs Fotos, setze sie zu einer großen Karte zusammen und schicke sie mit <code>send()</code> an den Rover.</p>'
      },
      concept: {
        en: '<p>In the storm <code>take_photo()</code> returns 3 rows with 3 fields each. The one in the middle, <code>tile[1][1]</code>, is the field below the helicopter:</p><pre>tile = take_photo()\nprint(tile[0])\nprint(tile[1][1])</pre><p>To copy a small photo into the big map you <b>shift the indexes</b>. If the helicopter is at column <code>cx</code>, row <code>cy</code>, then <code>tile[0][0]</code> belongs to column <code>cx - 1</code>, row <code>cy - 1</code> of the big map. You change one field of a list with <code>area[y][x] = "ice"</code>.</p>',
        de: '<p>Im Sturm liefert <code>take_photo()</code> 3 Zeilen mit je 3 Feldern. Das Feld in der Mitte, <code>tile[1][1]</code>, ist das Feld unter dem Helikopter:</p><pre>tile = take_photo()\nprint(tile[0])\nprint(tile[1][1])</pre><p>Um ein kleines Foto in die große Karte zu kopieren, <b>verschiebst du die Indizes</b>. Steht der Helikopter bei Spalte <code>cx</code>, Zeile <code>cy</code>, dann gehört <code>tile[0][0]</code> zu Spalte <code>cx - 1</code>, Zeile <code>cy - 1</code> der großen Karte. Ein Feld einer Liste änderst du mit <code>area[y][x] = "ice"</code>.</p>'
      },
      hint: {
        en: 'The area splits into six tiles of 3 × 3 fields. Their centres are at columns 1, 4 and 7 in rows 1 and 4, so there are 3 flights between two photos. For every photo let <code>dy</code> and <code>dx</code> run from 0 to 2 and copy <code>tile[dy][dx]</code> to <code>area[get_y() - 1 + dy][get_x() - 1 + dx]</code>. A function for "take a photo and copy it" saves a lot of typing.',
        de: 'Das Gebiet besteht aus sechs Kacheln mit 3 × 3 Feldern. Ihre Mittelpunkte liegen bei den Spalten 1, 4 und 7 in den Zeilen 1 und 4, zwischen zwei Fotos liegen also 3 Flüge. Lass für jedes Foto <code>dy</code> und <code>dx</code> von 0 bis 2 laufen und kopiere <code>tile[dy][dx]</code> nach <code>area[get_y() - 1 + dy][get_x() - 1 + dx]</code>. Eine Funktion für „Foto machen und kopieren“ spart viel Tipparbeit.'
      },
      starter: {
        en: '# The big map: 6 rows with 9 fields each, all "sand" for now.\narea = []\nfor y in range(6):\n    area.append(["sand"] * 9)\n\n# In the storm a photo shows only 3 x 3 fields.\ntile = take_photo()\nprint(tile)\n',
        de: '# Die große Karte: 6 Zeilen mit je 9 Feldern, erst einmal alles "sand".\narea = []\nfor y in range(6):\n    area.append(["sand"] * 9)\n\n# Im Sturm zeigt ein Foto nur 3 x 3 Felder.\ntile = take_photo()\nprint(tile)\n'
      },
      roverCode: {
        en: '# Wait for the whole map, then\n# drill at every "ice" field.\narea = receive()\nfor y in range(len(area)):\n    for x in range(len(area[y])):\n        if area[y][x] == "ice":\n            drive_to(x, y)\n            collect()\n',
        de: '# Auf die ganze Karte warten,\n# dann bei jedem "ice" bohren.\narea = receive()\nfor y in range(len(area)):\n    for x in range(len(area[y])):\n        if area[y][x] == "ice":\n            drive_to(x, y)\n            collect()\n'
      },
      api: ['small_photo'],
      world: { goal: 'collect', hidden: true, battery: 18, photoRadius: 1 },
      starMetric: 'battery',
      stars: [15, 17],
      random: true,
      build: function (rnd) {
        var cols = 9, rows = 6, count = 5, taken = {}, placed = 0, out = [];
        while (placed < count) {
          var x = between(rnd, 0, cols - 1), y = between(rnd, 0, rows - 1);
          // not where the rover or the helicopter start
          if (taken[x + ',' + y] || (x === 0 && y === rows - 1) || (x === 1 && y === 1)) continue;
          taken[x + ',' + y] = true;
          placed++;
        }
        for (var r = 0; r < rows; r++) {
          var line = '';
          for (var c = 0; c < cols; c++) {
            if (taken[c + ',' + r]) line += 'S';
            else if (c === 1 && r === 1) line += 'H';
            else if (c === 0 && r === rows - 1) line += 'R';
            else line += '.';
          }
          out.push(line);
        }
        return out;
      }
    }
  ];
})();
