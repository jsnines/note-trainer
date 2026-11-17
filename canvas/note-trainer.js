(function () {
  "use strict";
  var jsCheck = document.getElementById("jsCheck"); if (jsCheck) jsCheck.parentNode.removeChild(jsCheck);

  // ---------- Instruments ----------
  // fingers[i] = the finger used i half steps above the open string (first position)
  // Each button's value is that number of half steps.
  var INSTRUMENTS = {
    violin: {
      name: "Violin", icon: "🎻", clef: "treble", range: "G string to E string",
      strings: [{ name: "G", midi: 55 }, { name: "D", midi: 62 }, { name: "A", midi: 69 }, { name: "E", midi: 76 }],
      fingers: [
        { label: "0 (open)", btn: "0", sub: "open", short: "0" },
        { label: "Low 1", btn: "Low 1", short: "L1" },
        { label: "1", btn: "1", short: "1" },
        { label: "Low 2", btn: "Low 2", short: "L2" },
        { label: "2", btn: "2", short: "2" },
        { label: "3", btn: "3", short: "3" },
        { label: "High 3 / Low 4", btn: "High 3", sub: "or Low 4", short: "H3" },
        { label: "4", btn: "4", short: "4" }
      ],
      tapes: [2, 4, 5]
    },
    viola: {
      name: "Viola", icon: "🎻", clef: "alto", range: "C string to A string",
      strings: [{ name: "C", midi: 48 }, { name: "G", midi: 55 }, { name: "D", midi: 62 }, { name: "A", midi: 69 }],
      fingers: null, // same as violin (filled in below)
      tapes: [2, 4, 5]
    },
    cello: {
      name: "Cello", icon: "🎻", clef: "bass", range: "C string to A string",
      strings: [{ name: "C", midi: 36 }, { name: "G", midi: 43 }, { name: "D", midi: 50 }, { name: "A", midi: 57 }],
      fingers: [
        { label: "0 (open)", btn: "0", sub: "open", short: "0" },
        { label: "Backward extension 1", btn: "Back ext. 1", sub: "x1", short: "x1" },
        { label: "1", btn: "1", short: "1" },
        { label: "2", btn: "2", short: "2" },
        { label: "3", btn: "3", short: "3" },
        { label: "4", btn: "4", short: "4" },
        { label: "Forward extension 4", btn: "Ext. 4", sub: "x4", short: "x4" }
      ],
      tapes: [2, 3, 4, 5]
    },
    bass: {
      name: "Bass", icon: "🎻", clef: "bass", range: "E string to G string", soundShift: -12,
      strings: [{ name: "E", midi: 40 }, { name: "A", midi: 45 }, { name: "D", midi: 50 }, { name: "G", midi: 55 }],
      fingers: [
        { label: "0 (open)", btn: "0", sub: "open", short: "0" },
        { label: "1 in half position", btn: "½ pos. 1", sub: "half position", short: "½1" },
        { label: "1", btn: "1", short: "1" },
        { label: "2", btn: "2", short: "2" },
        { label: "4", btn: "4", short: "4" }
      ],
      tapes: [2, 3, 4]
    }
  };
  INSTRUMENTS.viola.fingers = INSTRUMENTS.violin.fingers;

  // ---------- Music data ----------
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var LETTER_ORDER = "CDEFGAB";
  // How each pitch class may be spelled
  var SPELL = { 0: ["C"], 1: ["C#"], 2: ["D"], 3: ["D#", "Eb"], 4: ["E"], 5: ["F"], 6: ["F#"], 7: ["G"], 8: ["G#"], 9: ["A"], 10: ["Bb"], 11: ["B"] };
  var SET_ALLOW = {
    cmajor:   ["C", "D", "E", "F", "G", "A", "B"],
    gmajor:   ["C", "D", "E", "F#", "G", "A", "B"],
    dmajor:   ["C#", "D", "E", "F#", "G", "A", "B"],
    amajor:   ["C#", "D", "E", "F#", "G#", "A", "B"],
    fmajor:   ["C", "D", "E", "F", "G", "A", "Bb"],
    sharps:   ["C", "D", "E", "F", "G", "A", "B", "C#", "D#", "F#", "G#"],
    all:      ["C", "D", "E", "F", "G", "A", "B", "C#", "D#", "F#", "G#", "Eb", "Bb"]
  };
  // Bottom staff line for each clef, as a "diatonic number" (octave*7 + letter index)
  var CLEF_BOTTOM = { treble: 4 * 7 + 2 /* E4 */, alto: 3 * 7 + 3 /* F3 */, bass: 2 * 7 + 4 /* G2 */ };

  var inst = INSTRUMENTS.violin;

  var CLEF_NAMES = { treble: "Treble clef", alto: "Alto clef", bass: "Bass clef" };
  var SET_LABELS = {
    cmajor: "C Major (no sharps or flats)",
    gmajor: "G Major (F♯)",
    dmajor: "D Major (F♯, C♯)",
    amajor: "A Major (F♯, C♯, G♯)",
    fmajor: "F Major (B♭)",
    sharps: "Naturals + sharps (F♯, C♯, G♯, D♯)",
    all: "Everything in first position (naturals, sharps, B♭, E♭)"
  };

  function makeNote(id) {
    var m = id.match(/^([A-G])([#b]?)(\d)$/);
    var n = {
      id: id,
      letter: m[1],
      acc: m[2] === "#" ? "sharp" : m[2] === "b" ? "flat" : "natural",
      octave: +m[3]
    };
    n.midi = (n.octave + 1) * 12 + SEMI[n.letter] + (n.acc === "sharp" ? 1 : n.acc === "flat" ? -1 : 0);
    n.display = n.letter + (n.acc === "sharp" ? "♯" : n.acc === "flat" ? "♭" : "");
    n.pos = n.octave * 7 + LETTER_ORDER.indexOf(n.letter) - CLEF_BOTTOM[inst.clef];
    // Every first-position way to play it, preferred (higher string / lower finger) first
    n.ways = [];
    var maxS = inst.fingers.length - 1;
    for (var i = inst.strings.length - 1; i >= 0; i--) {
      var s = n.midi - inst.strings[i].midi;
      if (s >= 0 && s <= maxS) {
        var f = inst.fingers[s];
        n.ways.push({ string: inst.strings[i].name, label: f.label, short: f.short, semis: s });
      }
    }
    n.main = n.ways[0];
    return n;
  }

  // Every note in first position for the current instrument, filtered by note set
  function notesFor(setName) {
    var allow = SET_ALLOW[setName];
    var opens = inst.strings.map(function (s) { return s.midi; });
    var lo = opens[0], hi = opens[opens.length - 1] + inst.fingers.length - 1;
    var ids = [];
    for (var midi = lo; midi <= hi; midi++) {
      var pc = midi % 12;
      SPELL[pc].forEach(function (sp) {
        var isOpen = opens.indexOf(midi) !== -1;
        if (!isOpen && allow.indexOf(sp) === -1) return;
        var letterPc = SEMI[sp[0]];
        var octave = Math.floor(midi / 12) - 1;
        // keep octave right for spellings that cross C (none here, but safe)
        if (sp[1] === "b" && letterPc === 0) octave++;
        ids.push(sp + octave);
      });
    }
    return ids.map(makeNote);
  }

  // ---------- Staff drawing (pure SVG, no fonts needed) ----------
  var SP = 14;          // space between staff lines
  var BOTTOM = 130;     // y of bottom line
  function yOf(pos) { return BOTTOM - pos * SP / 2; }

  var CLEFS = {
    treble:
      '<g transform="translate(30,0)" fill="none" stroke="#1f2430" stroke-linecap="round" stroke-linejoin="round">' +
      '<path stroke-width="3.2" d="M27,118 C21,118 19,110 25,107 C33,103 41,110 39,119 C37,129 24,132 17,125 ' +
      'C8,116 12,101 25,92 C37,83 45,72 44,57 C43,46 37,42 33,48 C28,56 28,68 31,84 L39,156 ' +
      'C41,168 31,172 25,166"/>' +
      '<circle cx="27" cy="164" r="5" fill="#1f2430" stroke="none"/>' +
      '</g>',
    // C clef: middle line is middle C
    alto:
      '<g fill="#1f2430">' +
      '<rect x="28" y="73" width="8" height="58"/>' +
      '<rect x="40" y="73" width="2.8" height="58"/>' +
      // upper lobe: from the middle-C point, bulge right, curl over the top, end in a ball
      '<g>' +
      '<path d="M42.5,102 L46,96.5 C49,99 53,99.5 57,98 C64,95.5 72,92 72,85 C72,77.5 66,72.5 58.5,72.5 ' +
      'C52.5,72.5 48.5,75.5 48.5,80 L53,80 C53.5,77.8 55.5,76.6 58,76.6 C62.5,76.6 65.2,80 65.2,85.5 ' +
      'C65.2,92.5 59,96.5 52,98.5 C48.5,99.5 45.5,100.5 42.5,102 Z"/>' +
      '<circle cx="52.2" cy="81.4" r="4.6"/>' +
      '</g>' +
      // lower lobe is a mirror image across the middle line
      '<g transform="matrix(1,0,0,-1,0,204)">' +
      '<path d="M42.5,102 L46,96.5 C49,99 53,99.5 57,98 C64,95.5 72,92 72,85 C72,77.5 66,72.5 58.5,72.5 ' +
      'C52.5,72.5 48.5,75.5 48.5,80 L53,80 C53.5,77.8 55.5,76.6 58,76.6 C62.5,76.6 65.2,80 65.2,85.5 ' +
      'C65.2,92.5 59,96.5 52,98.5 C48.5,99.5 45.5,100.5 42.5,102 Z"/>' +
      '<circle cx="52.2" cy="81.4" r="4.6"/>' +
      '</g>' +
      '</g>',
    // F clef: the dots surround the F line (4th line)
    bass:
      '<g fill="#1f2430" stroke="#1f2430" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="38" cy="89" r="6" stroke="none"/>' +
      '<path fill="none" stroke-width="3.6" d="M34,87 C33,78 41,72 50,73 C62,74 67,84 65,96 C63,110 50,122 30,130"/>' +
      '<circle cx="76" cy="81" r="3.3" stroke="none"/>' +
      '<circle cx="76" cy="95" r="3.3" stroke="none"/>' +
      '</g>'
  };

  function drawSharp(x, y) {
    return '<g stroke="#1f2430" stroke-linecap="butt">' +
      '<line x1="' + (x - 3) + '" y1="' + (y - 13) + '" x2="' + (x - 3) + '" y2="' + (y + 15) + '" stroke-width="1.8"/>' +
      '<line x1="' + (x + 3) + '" y1="' + (y - 15) + '" x2="' + (x + 3) + '" y2="' + (y + 13) + '" stroke-width="1.8"/>' +
      '<line x1="' + (x - 8) + '" y1="' + (y - 3) + '" x2="' + (x + 8) + '" y2="' + (y - 7) + '" stroke-width="4"/>' +
      '<line x1="' + (x - 8) + '" y1="' + (y + 7) + '" x2="' + (x + 8) + '" y2="' + (y + 3) + '" stroke-width="4"/>' +
      '</g>';
  }
  function drawFlat(x, y) {
    return '<g fill="none" stroke="#1f2430" stroke-linecap="round">' +
      '<line x1="' + (x - 4) + '" y1="' + (y - 22) + '" x2="' + (x - 4) + '" y2="' + (y + 7) + '" stroke-width="1.8"/>' +
      '<path stroke-width="2.6" d="M' + (x - 4) + ',' + (y + 7) + ' C' + (x + 9) + ',' + (y) + ' ' + (x + 9) + ',' + (y - 9) + ' ' + (x - 4) + ',' + (y - 2) + '"/>' +
      '</g>';
  }

  function staffSVG(note) {
    var W = 360, H = 210, x = 230;
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A note on the ' + inst.clef + ' clef staff">';
    out += '<rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    for (var i = 0; i < 5; i++) {
      var ly = yOf(i * 2);
      out += '<line x1="14" y1="' + ly + '" x2="' + (W - 14) + '" y2="' + ly + '" stroke="#1f2430" stroke-width="1.4"/>';
    }
    out += '<line x1="14" y1="' + yOf(8) + '" x2="14" y2="' + yOf(0) + '" stroke="#1f2430" stroke-width="1.6"/>';
    out += CLEFS[inst.clef];
    if (!note) return out + '</svg>';

    var p = note.pos, y = yOf(p), q;
    // ledger lines
    for (q = -2; q >= p; q -= 2) out += '<line x1="' + (x - 17) + '" y1="' + yOf(q) + '" x2="' + (x + 17) + '" y2="' + yOf(q) + '" stroke="#1f2430" stroke-width="1.6"/>';
    for (q = 10; q <= p; q += 2) out += '<line x1="' + (x - 17) + '" y1="' + yOf(q) + '" x2="' + (x + 17) + '" y2="' + yOf(q) + '" stroke="#1f2430" stroke-width="1.6"/>';
    // accidental
    if (note.acc === "sharp") out += drawSharp(x - 28, y);
    if (note.acc === "flat") out += drawFlat(x - 26, y);
    // stem (up below the middle line, down from the middle line up)
    if (p < 4) out += '<line x1="' + (x + 8.2) + '" y1="' + (y - 2) + '" x2="' + (x + 8.2) + '" y2="' + (y - 50) + '" stroke="#1f2430" stroke-width="1.8"/>';
    else out += '<line x1="' + (x - 8.2) + '" y1="' + (y + 2) + '" x2="' + (x - 8.2) + '" y2="' + (y + 50) + '" stroke="#1f2430" stroke-width="1.8"/>';
    // note head
    out += '<ellipse cx="' + x + '" cy="' + y + '" rx="9" ry="6.4" transform="rotate(-22 ' + x + ' ' + y + ')" fill="#1f2430"/>';
    return out + '</svg>';
  }

  // ---------- Fingerboard diagram for feedback ----------
  function fingerboardSVG(way) {
    var rows = inst.fingers.length - 1;
    var W = 170, top = 34, step = rows > 5 ? 17 : 24, H = top + rows * step + 22;
    var names = inst.strings.map(function (s) { return s.name; });
    var xs = {}; names.forEach(function (s, i) { xs[s] = 35 + i * 34; });
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fingerboard diagram">';
    out += '<rect x="20" y="' + top + '" width="132" height="' + (rows * step + 14) + '" rx="6" fill="#2b2420"/>';
    out += '<rect x="20" y="' + (top - 4) + '" width="132" height="6" fill="#efe6d8"/>';
    inst.tapes.forEach(function (s) {
      out += '<line x1="20" y1="' + (top + s * step) + '" x2="152" y2="' + (top + s * step) + '" stroke="#6b5c50" stroke-width="2" stroke-dasharray="3 3"/>';
    });
    names.forEach(function (s) {
      var on = way.string === s;
      out += '<line x1="' + xs[s] + '" y1="' + (top - 2) + '" x2="' + xs[s] + '" y2="' + (top + rows * step + 12) + '" stroke="' + (on ? "#f2c14e" : "#c9c2b6") + '" stroke-width="' + (on ? 3 : 1.6) + '"/>';
      out += '<text x="' + xs[s] + '" y="18" text-anchor="middle" font-size="15" font-weight="700" fill="' + (on ? "#7a3b1d" : "#5d6475") + '" font-family="Arial, sans-serif">' + s + '</text>';
    });
    var cx = xs[way.string];
    if (way.semis === 0) {
      out += '<circle cx="' + cx + '" cy="' + (top - 1) + '" r="10" fill="#fff" stroke="#1e7a3c" stroke-width="3"/>';
      out += '<text x="' + cx + '" y="' + (top + 4) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#1e7a3c" font-family="Arial, sans-serif">0</text>';
    } else {
      var cy = top + way.semis * step;
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="11" fill="#1e7a3c" stroke="#fff" stroke-width="2"/>';
      out += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="' + (way.short.length > 1 ? 11 : 14) + '" font-weight="700" fill="#fff" font-family="Arial, sans-serif">' + way.short + '</text>';
    }
    return out + '</svg>';
  }

  // ---------- Sound (Web Audio, works offline) ----------
  var audioCtx = null;
  function playMidi(midi) {
    try {
      midi += inst.soundShift || 0; // string bass sounds an octave lower than written
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var t = audioCtx.currentTime, f = 440 * Math.pow(2, (midi - 69) / 12);
      var osc = audioCtx.createOscillator(), filt = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
      var lfo = audioCtx.createOscillator(), lfoGain = audioCtx.createGain();
      osc.type = "sawtooth"; osc.frequency.value = f;
      lfo.frequency.value = 5.5; lfoGain.gain.setValueAtTime(0, t); lfoGain.gain.linearRampToValueAtTime(f * 0.005, t + 0.35);
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      filt.type = "lowpass"; filt.frequency.value = Math.min(4000, Math.max(800, f * 5)); filt.Q.value = 1;
      var vol = f < 150 ? 0.26 : 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
      g.gain.setValueAtTime(vol, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      osc.connect(filt); filt.connect(g); g.connect(audioCtx.destination);
      osc.start(t); lfo.start(t); osc.stop(t + 1.35); lfo.stop(t + 1.35);
    } catch (e) { /* sound is optional */ }
  }

  // ---------- State ----------
  var $ = function (id) { return document.getElementById(id); };
  var state = {
    pool: [], total: 0, index: 0, current: null, answered: false,
    pick: { letter: null, acc: "natural", string: null, finger: null },
    right: { name: 0, string: 0, finger: 0, all: 0 }, asked: 0, streak: 0, best: 0,
    missed: {}, lastSettings: null, deck: [],
    student: null, finishedAt: null // kept in memory only; gone on reload
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function nextNote() {
    if (!state.deck.length) {
      state.deck = shuffle(state.pool.slice());
      if (state.current && state.deck.length > 1 && state.deck[0].id === state.current.id) state.deck.push(state.deck.shift());
    }
    return state.deck.shift();
  }

  // ---------- Build buttons ----------
  function makeChoices(container, items, key) {
    container.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.value = it.value;
      b.innerHTML = it.html;
      b.addEventListener("click", function () {
        if (state.answered) return;
        state.pick[key] = it.value;
        refreshSelection();
      });
      container.appendChild(b);
    });
  }

  makeChoices($("letterChoices"), "ABCDEFG".split("").map(function (l) { return { value: l, html: l }; }), "letter");
  makeChoices($("accChoices"), [
    { value: "natural", html: "♮ natural" }, { value: "sharp", html: "♯ sharp" }, { value: "flat", html: "♭ flat" }
  ], "acc");

  // String + finger buttons depend on the instrument
  function buildInstrumentButtons() {
    makeChoices($("stringChoices"), inst.strings.map(function (s) { return { value: s.name, html: s.name }; }), "string");
    makeChoices($("fingerChoices"), inst.fingers.map(function (f, i) {
      return { value: String(i), html: f.btn + "<small>" + (f.sub || "&nbsp;") + "</small>" };
    }), "finger");
  }

  function eachBtn(id, fn) { Array.prototype.forEach.call($(id).children, fn); }

  function refreshSelection() {
    var p = state.pick;
    eachBtn("letterChoices", function (b) { b.classList.toggle("sel", b.dataset.value === p.letter); });
    eachBtn("accChoices", function (b) { b.classList.toggle("sel", b.dataset.value === p.acc); });
    eachBtn("stringChoices", function (b) { b.classList.toggle("sel", b.dataset.value === p.string); });
    eachBtn("fingerChoices", function (b) { b.classList.toggle("sel", b.dataset.value === p.finger); });
    var ready = p.letter && p.string && p.finger !== null;
    $("checkBtn").disabled = !ready;
    $("checkHint").textContent = ready ? "Press Enter or click Check." : "Answer all three questions.";
  }

  function updateStats() {
    var s = state;
    var html = "";
    if (s.student) html += "<span>👤 <b>" + escapeHtml(s.student) + "</b></span>";
    if (s.total) html += "<span>Question <b>" + Math.min(s.index + 1, s.total) + "</b> of " + s.total + "</span>";
    else html += "<span>Question <b>" + (s.index + 1) + "</b></span>";
    html += "<span>All 3 right: <b>" + s.right.all + "</b> / " + s.asked + "</span>";
    html += "<span>Streak: <b>" + s.streak + "</b> 🔥</span>";
    $("stats").innerHTML = html;
  }

  // ---------- Instrument picker ----------
  // Nothing is saved in the browser: every visit starts fresh on violin.
  // (Clean up the instrument choice older versions remembered.)
  var instKey = "violin";
  try { localStorage.removeItem("ftNoteTrainerInstrument"); } catch (e) {}

  function selectInstrument(key) {
    instKey = key;
    inst = INSTRUMENTS[key];
    eachBtn("instPicks", function (b) {
      var on = b.dataset.value === key;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("stringPicks").innerHTML = inst.strings.map(function (s) {
      return '<label class="chk"><input type="checkbox" value="' + s.name + '" checked> ' + s.name + '</label>';
    }).join("");
    $("title").textContent = inst.icon + " " + inst.name + " First Position Note Trainer";
    buildInstrumentButtons();
  }

  $("instPicks").innerHTML = Object.keys(INSTRUMENTS).map(function (k) {
    var I = INSTRUMENTS[k];
    var clefName = CLEF_NAMES[I.clef];
    return '<button type="button" class="inst" data-value="' + k + '"><span class="ico">' + I.icon + '</span>' + I.name + '<small>' + clefName + '</small></button>';
  }).join("");
  eachBtn("instPicks", function (b) { b.addEventListener("click", function () { selectInstrument(b.dataset.value); }); });
  selectInstrument(instKey);

  // ---------- Screens ----------
  function show(id) {
    ["setup", "nameScreen", "quiz", "results"].forEach(function (s) { $(s).classList.toggle("hidden", s !== id); });
    if (id === "setup" || id === "nameScreen") $("stats").innerHTML = "";
    if (id === "setup") state.student = null;
  }

  // 10- and 20-question sessions start with the student's name (always blank)
  function askName() {
    var st = state.lastSettings;
    state.student = null;
    $("studentName").value = "";
    $("nameWarn").textContent = "";
    $("nameSummary").textContent = inst.name + " · " + SET_LABELS[st.set] + " · " + st.count + " questions";
    show("nameScreen");
    window.scrollTo(0, 0);
    $("studentName").focus();
  }

  function beginNamed() {
    var nm = $("studentName").value.replace(/\s+/g, " ").trim();
    if (!nm) { $("nameWarn").textContent = "Please type your name to begin."; $("studentName").focus(); return; }
    state.student = nm;
    state.best = 0;
    startQuiz(poolFor(state.lastSettings), state.lastSettings.count);
  }

  function beginSettings(st) {
    state.lastSettings = st;
    if (st.count) { askName(); return; }
    state.student = null;
    state.best = 0;
    startQuiz(poolFor(st), st.count);
  }

  function readSettings() {
    var set = document.querySelector('input[name="set"]:checked').value;
    var count = +document.querySelector('input[name="count"]:checked').value;
    var strings = Array.prototype.filter.call(document.querySelectorAll("#stringPicks input"), function (i) { return i.checked; })
      .map(function (i) { return i.value; });
    return { set: set, count: count, strings: strings };
  }

  function poolFor(settings) {
    return notesFor(settings.set).filter(function (n) {
      return n.ways.some(function (w) { return settings.strings.indexOf(w.string) !== -1; });
    });
  }

  function startQuiz(pool, count) {
    state.pool = pool;
    state.total = count;
    state.index = 0;
    state.asked = 0;
    state.streak = 0;
    state.right = { name: 0, string: 0, finger: 0, all: 0 };
    state.missed = {};
    state.deck = [];
    state.current = null;
    state.finishedAt = null;
    $("reportWrap").classList.add("hidden");
    $("reportCanvas").width = 0; $("reportCanvas").height = 0;
    $("reportImg").removeAttribute("src");
    $("saveHint").textContent = "";
    $("saveHelp").classList.add("hidden");
    show("quiz");
    loadQuestion();
  }

  function loadQuestion() {
    state.current = nextNote();
    state.answered = false;
    state.pick = { letter: null, acc: "natural", string: null, finger: null };
    $("staff").innerHTML = staffSVG(state.current);
    $("qLabel").textContent = "Question " + (state.index + 1);
    $("feedback").className = "hidden";
    $("feedback").innerHTML = "";
    $("checkBtn").textContent = "Check answer";
    ["letterChoices", "accChoices", "stringChoices", "fingerChoices"].forEach(function (id) {
      eachBtn(id, function (b) { b.classList.remove("right", "wrong"); b.disabled = false; });
    });
    refreshSelection();
    updateStats();
  }

  function fingerWords(w) { return /^\d/.test(w.label) ? "finger " + w.label : w.label; }

  function check() {
    var n = state.current, p = state.pick;
    state.answered = true;
    var nameOk = p.letter === n.letter && p.acc === n.acc;
    // Accept any correct first-position way (e.g. violin A4 = open A, or 4 on the D string)
    var match = null;
    n.ways.forEach(function (w) { if (!match && w.string === p.string && String(w.semis) === p.finger) match = w; });
    var stringOk = n.ways.some(function (w) { return w.string === p.string; });
    var fingerOk = !!match || (!stringOk && n.ways.some(function (w) { return String(w.semis) === p.finger; }));
    if (stringOk && !match) fingerOk = false;
    var way = match || n.main;
    var allOk = nameOk && !!match;

    state.asked++;
    if (nameOk) state.right.name++;
    if (stringOk) state.right.string++;
    if (fingerOk) state.right.finger++;
    if (allOk) { state.right.all++; state.streak++; state.best = Math.max(state.best, state.streak); }
    else { state.streak = 0; state.missed[n.id] = n; }

    // mark buttons
    ["letterChoices", "accChoices", "stringChoices", "fingerChoices"].forEach(function (id) {
      eachBtn(id, function (b) { b.classList.remove("sel"); });
    });
    eachBtn("letterChoices", function (b) {
      b.disabled = true;
      if (b.dataset.value === n.letter) b.classList.add("right");
      else if (b.dataset.value === p.letter) b.classList.add("wrong");
    });
    eachBtn("accChoices", function (b) {
      b.disabled = true;
      if (b.dataset.value === n.acc) b.classList.add("right");
      else if (b.dataset.value === p.acc) b.classList.add("wrong");
    });
    eachBtn("stringChoices", function (b) {
      b.disabled = true;
      if (b.dataset.value === way.string) b.classList.add("right");
      else if (b.dataset.value === p.string) b.classList.add("wrong");
    });
    eachBtn("fingerChoices", function (b) {
      b.disabled = true;
      if (b.dataset.value === String(way.semis)) b.classList.add("right");
      else if (b.dataset.value === p.finger) b.classList.add("wrong");
    });

    var praise = ["Excellent!", "Nice work!", "You got it!", "Perfect!", "Bravo!", "Fantastic!"];
    var head = allOk ? praise[Math.floor(Math.random() * praise.length)] : "Not quite — here's the answer:";
    var detail = "<b>" + n.display + "</b> is played on the <b>" + way.string + " string</b> with " +
      (way.semis === 0 ? "<b>no fingers (open string)</b>." : "<b>" + fingerWords(way) + "</b>.");
    var list = "";
    if (!allOk) {
      list = "<ul>" +
        "<li>Note name: " + (nameOk ? "✅" : "❌ it's <b>" + n.display + "</b>") + "</li>" +
        "<li>String: " + (stringOk ? "✅" : "❌ it's the <b>" + way.string + "</b> string") + "</li>" +
        "<li>Finger: " + (fingerOk ? "✅" : "❌ it's <b>" + way.label + "</b>") + "</li></ul>";
    }
    var alt = n.ways.filter(function (w) { return w !== way; }).map(function (w) {
      return w.semis === 0 ? "the open " + w.string + " string" : fingerWords(w) + " on the " + w.string + " string";
    });
    var altTxt = alt.length ? '<p class="hint" style="margin-top:6px">You can also play this note with ' + alt.join(" or ") + ".</p>" : "";

    var fb = $("feedback");
    fb.className = "feedback " + (allOk ? "ok" : "no");
    fb.innerHTML = "<div><div class='big'>" + head + "</div><div>" + detail + "</div>" + list + altTxt + "</div>" + fingerboardSVG(way);

    var last = state.total && state.index + 1 >= state.total;
    $("checkBtn").textContent = last ? "See results ▶" : "Next note ▶";
    $("checkBtn").disabled = false;
    $("checkHint").textContent = "Press Enter to continue.";
    updateStats();
    if ($("soundOn").checked) playMidi(n.midi);
    $("checkBtn").focus({ preventScroll: true });
    try { fb.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
  }

  function advance() {
    state.index++;
    if (state.total && state.index >= state.total) return showResults();
    loadQuestion();
  }

  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

  function showResults() {
    var s = state, n = s.asked;
    if (!n) { show("setup"); return; }
    $("resPct").textContent = pct(s.right.all, n) + "%";
    $("resLine").innerHTML = inst.name + ": you got all three parts right on <b>" + s.right.all + "</b> of <b>" + n + "</b> notes. Best streak: <b>" + s.best + "</b>.";
    var bars = [["Note names", s.right.name], ["Strings", s.right.string], ["Fingers", s.right.finger]];
    $("resBars").innerHTML = bars.map(function (b) {
      var v = pct(b[1], n);
      return '<div class="bar"><span>' + b[0] + '</span><div class="track"><div class="fill" style="width:' + v + '%"></div></div><span>' + v + '%</span></div>';
    }).join("");
    var missed = Object.keys(s.missed).map(function (k) { return s.missed[k]; }).sort(function (a, b) { return a.midi - b.midi; });
    $("resMissedWrap").classList.toggle("hidden", !missed.length);
    $("missedBtn").classList.toggle("hidden", !missed.length);
    $("resMissed").innerHTML = missed.map(function (m) { return "<span>" + missedLabel(m) + "</span>"; }).join("");
    var who = s.student ? ", " + s.student.split(" ")[0] : "";
    $("results").querySelector("h2").textContent = pct(s.right.all, n) >= 80 ? "Great work" + who + "! 🎉" : "Keep practicing" + who + "! 🎻";
    s.finishedAt = new Date();
    if (s.student) drawReport(missed);
    $("reportWrap").classList.toggle("hidden", !s.student);
    $("saveHint").textContent = "";
    $("saveHelp").classList.add("hidden");
    if (s.student) {
      $("reportImg").src = $("reportCanvas").toDataURL("image/png");
      $("saveName").textContent = reportFileName();
    }
    show("results");
    $("stats").innerHTML = (s.student ? "<span>👤 <b>" + escapeHtml(s.student) + "</b></span>" : "") +
      "<span>Finished: <b>" + state.right.all + "</b> / " + state.asked + "</span>";
  }

  function missedLabel(m) {
    return m.display + " (" + m.main.string + " string, " + (m.main.semis === 0 ? "open" : m.main.label.replace("High 3 / Low 4", "High 3")) + ")";
  }

  // ---------- Report picture (drawn on a canvas, saved as PNG) ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawReport(missed) {
    var s = state, st = s.lastSettings, n = s.asked;
    var W = 900, P = 44, SCALE = 2;
    var FONT = '"Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';
    var c = $("reportCanvas"), ctx = c.getContext("2d");
    function font(size, weight) { ctx.font = (weight || 400) + " " + size + "px " + FONT; }

    // Lay out the missed-note chips first so we know how tall the picture is
    font(17, 600);
    var chips = [], cx = P, cy = 0, CH = 36, GAP = 10;
    missed.forEach(function (m) {
      var t = missedLabel(m), w = ctx.measureText(t).width + 26;
      if (cx + w > W - P && cx > P) { cx = P; cy += CH + GAP; }
      chips.push({ t: t, x: cx, y: cy, w: w });
      cx += w + GAP;
    });
    var MISSED_Y = 800;
    var chipsBottom = MISSED_Y + (chips.length ? cy + CH : 30);
    var H = chipsBottom + 70;

    c.width = W * SCALE; c.height = H * SCALE;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.textBaseline = "alphabetic";

    // Background + header band
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7a3b1d"; ctx.fillRect(0, 0, W, 76);
    ctx.fillStyle = "#ffffff"; font(26, 700); ctx.textAlign = "left";
    ctx.fillText(inst.name + " First Position Note Trainer", P, 48);
    font(17, 600); ctx.textAlign = "right"; ctx.fillText("Results report", W - P, 48);
    ctx.textAlign = "left";

    function label(text, y) { ctx.fillStyle = "#5d6475"; font(14, 700); ctx.fillText(text.toUpperCase(), P, y); }
    function divider(y) { ctx.strokeStyle = "#d9d5cc"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke(); }

    // Student + date
    var d = s.finishedAt;
    var dateTxt = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) +
      " at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    label("Student", 112);
    ctx.fillStyle = "#1f2430"; font(30, 700); ctx.fillText(s.student, P, 146);
    label("Completed", 186);
    ctx.fillStyle = "#1f2430"; font(20, 400); ctx.fillText(dateTxt, P, 214);
    divider(240);

    // Settings
    label("Settings", 276);
    var allStrings = st.strings.length === inst.strings.length;
    var rows = [
      ["Instrument", inst.name + " (" + CLEF_NAMES[inst.clef] + ")"],
      ["Notes", SET_LABELS[st.set]],
      ["Strings", st.strings.join(", ") + (allStrings ? "  (all strings)" : "")],
      ["Questions", String(st.count)],
      ["Sound after answer", $("soundOn").checked ? "On" : "Off"]
    ];
    rows.forEach(function (r, i) {
      var y = 312 + i * 31;
      ctx.fillStyle = "#5d6475"; font(18, 600); ctx.fillText(r[0], P, y);
      ctx.fillStyle = "#1f2430"; font(18, 400); ctx.fillText(r[1], P + 200, y);
    });
    divider(470);

    // Score
    label("Score", 506);
    var total = pct(s.right.all, n);
    ctx.fillStyle = "#7a3b1d"; font(72, 800); ctx.fillText(total + "%", P, 586);
    var tx = P + 230;
    ctx.fillStyle = "#1f2430"; font(20, 400);
    ctx.fillText("All 3 parts right on " + s.right.all + " of " + n + " notes", tx, 540);
    ctx.fillText("Best streak: " + s.best, tx, 570);
    if (s.total && n < s.total) {
      ctx.fillStyle = "#b3261e"; font(18, 700);
      ctx.fillText("Ended early: answered " + n + " of " + s.total + " questions", tx, 600);
    }

    var bars = [["Note names", s.right.name], ["Strings", s.right.string], ["Fingers", s.right.finger]];
    bars.forEach(function (b, i) {
      var y = 640 + i * 36, v = pct(b[1], n), bx = P + 140, bw = W - P - 70 - bx;
      ctx.fillStyle = "#1f2430"; font(18, 600); ctx.textAlign = "left"; ctx.fillText(b[0], P, y + 6);
      ctx.fillStyle = "#ece8df"; roundRect(ctx, bx, y - 8, bw, 16, 8); ctx.fill();
      if (v > 0) { ctx.fillStyle = "#7a3b1d"; roundRect(ctx, bx, y - 8, Math.max(16, bw * v / 100), 16, 8); ctx.fill(); }
      ctx.fillStyle = "#1f2430"; ctx.textAlign = "right"; ctx.fillText(v + "%", W - P, y + 6);
      ctx.textAlign = "left";
    });
    divider(740);

    // Notes to practice
    label("Notes to practice", 776);
    if (!chips.length) {
      ctx.fillStyle = "#1e7a3c"; font(19, 700); ctx.fillText("None. Every note was right!", P, MISSED_Y + 22);
    }
    chips.forEach(function (ch) {
      var y = MISSED_Y + ch.y;
      ctx.fillStyle = "#fbe3e1"; roundRect(ctx, ch.x, y, ch.w, CH, 18); ctx.fill();
      ctx.strokeStyle = "#e9b4ae"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#1f2430"; font(17, 600); ctx.fillText(ch.t, ch.x + 13, y + 24);
    });
  }

  function reportFileName() {
    var d = state.finishedAt;
    function two(x) { return (x < 10 ? "0" : "") + x; }
    var date = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
    var nm = state.student.replace(/[\\\/:*?"<>|.\u0000-\u001f]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "") || "Student";
    return nm + "_" + date + ".png";
  }

  function saveReport() {
    var c = $("reportCanvas"), name = reportFileName();
    function download(url, isBlob) {
      var a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      if (isBlob) setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }
    // Some sites (like Google Sites) can silently block downloads, so always show the backup steps.
    $("saveHint").textContent = "Check your Downloads folder for " + name + ".";
    $("saveHelp").classList.remove("hidden");
    try {
      if (c.toBlob) c.toBlob(function (blob) { blob ? download(URL.createObjectURL(blob), true) : download(c.toDataURL("image/png")); }, "image/png");
      else download(c.toDataURL("image/png"));
    } catch (e) {
      $("saveHint").textContent = "This computer blocked the download. Use the steps below instead.";
    }
  }

  // Backup: show the picture by itself in a new tab, where it can be saved or printed
  function openReport() {
    var src = $("reportImg").src, name = reportFileName(), w = null;
    $("saveHelp").classList.remove("hidden");
    try { w = window.open("", "_blank"); } catch (e) { w = null; }
    try {
      if (!w) throw new Error("blocked");
      var doc = w.document;
      doc.open();
      doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(name) + '</title></head>' +
        '<body style="margin:0;padding:16px;background:#f3f1ec;font-family:Arial,sans-serif;font-size:16px">' +
        '<p style="margin:0 0 12px">Right-click the picture (or press and hold) and choose <b>Save image as…</b>. Name it <b>' + escapeHtml(name) + '</b></p>' +
        '<img src="' + src + '" alt="Results report" style="max-width:100%;height:auto;border:1px solid #d9d5cc;background:#fff">' +
        '</body></html>');
      doc.close();
    } catch (e) {
      try { if (w) w.close(); } catch (e2) {}
      $("saveHint").textContent = "New tabs are blocked here. Use the steps below to save the picture.";
    }
  }

  // ---------- Events ----------
  $("startBtn").addEventListener("click", function () {
    var st = readSettings();
    if (!st.strings.length) { $("setupWarn").textContent = "Pick at least one string."; return; }
    $("setupWarn").textContent = "";
    beginSettings(st);
  });
  $("nameGoBtn").addEventListener("click", beginNamed);
  $("nameBackBtn").addEventListener("click", function () { show("setup"); });
  $("studentName").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); beginNamed(); }
  });
  $("saveImgBtn").addEventListener("click", saveReport);
  $("openImgBtn").addEventListener("click", openReport);
  $("checkBtn").addEventListener("click", function () { state.answered ? advance() : check(); });
  $("hearBtn").addEventListener("click", function () { if (state.current) playMidi(state.current.midi); });
  $("quitBtn").addEventListener("click", function () { if (state.asked) showResults(); else show("setup"); });
  $("againBtn").addEventListener("click", function () {
    beginSettings(state.lastSettings);
  });
  $("missedBtn").addEventListener("click", function () {
    var pool = Object.keys(state.missed).map(function (k) { return state.missed[k]; });
    state.student = null; // extra practice, no report
    state.best = 0;
    startQuiz(pool, Math.max(5, pool.length * 2));
  });
  $("settingsBtn").addEventListener("click", function () { show("setup"); });
  $("backBtn").addEventListener("click", function () { state.current = null; show("setup"); window.scrollTo(0, 0); });

  document.addEventListener("keydown", function (e) {
    if ($("quiz").classList.contains("hidden")) return;
    if (e.key === "Enter" && !$("checkBtn").disabled) {
      e.preventDefault();
      $("checkBtn").click();
    }
  });
})();
