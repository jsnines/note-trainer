(function () {
  "use strict";
  var jsCheck = document.getElementById("jsCheck"); if (jsCheck) jsCheck.parentNode.removeChild(jsCheck);

  // ---------- Levels ----------
  // Each level lists the note/rest lengths (in beats) it can use.
  var LEVELS = [
    {
      id: 1, name: "Level 1", beats: 4, time: "4/4",
      desc: "4/4 time · whole, half, and quarter notes and rests",
      settingsText: "Level 1: 4/4 time, whole, half and quarter notes and rests",
      durs: [4, 2, 1]
    }
  ];

  var TYPE_NAMES = {
    n4: "Whole notes", n2: "Half notes", n1: "Quarter notes",
    r4: "Whole rests", r2: "Half rests", r1: "Quarter rests"
  };
  var TYPE_ORDER = ["n4", "n2", "n1", "r4", "r2", "r1"];
  var SINGULAR = { 4: "whole", 2: "half", 1: "quarter" };

  // ---------- Rhythm patterns ----------
  // A pattern is a list of symbols: { rest: bool, dur: beats, start: 0-based beat }
  function compositions(total, durs) {
    if (total === 0) return [[]];
    var out = [];
    durs.forEach(function (d) {
      if (d <= total) compositions(total - d, durs).forEach(function (rest) { out.push([d].concat(rest)); });
    });
    return out;
  }

  function patternsFor(level) {
    var list = [];
    compositions(level.beats, level.durs).forEach(function (durs) {
      var combos = 1 << durs.length;
      for (var mask = 0; mask < combos; mask++) {
        var start = 0, syms = [], rests = 0, ok = true;
        durs.forEach(function (d, i) {
          var rest = !!(mask & (1 << i));
          // A half rest is only written on beat 1 or beat 3 in 4/4
          if (rest && d === 2 && start % 2 !== 0) ok = false;
          if (rest) rests++;
          syms.push({ rest: rest, dur: d, start: start });
          start += d;
        });
        if (!ok) continue;
        var wholeMeasure = durs.length === 1;
        if (!wholeMeasure && rests === durs.length) continue;      // no all-rest measures (except a whole rest)
        if (!wholeMeasure && rests > 2) continue;                   // keep it musical: at most 2 rests
        var p = { id: syms.map(symKey).join(" "), syms: syms };
        list.push(p);
        if (wholeMeasure && !syms[0].rest) list.push(p);            // whole notes a little more often
      }
    });
    return list;
  }

  function symKey(s) { return (s.rest ? "r" : "n") + s.dur + "@" + s.start; }
  function typeKey(s) { return (s.rest ? "r" : "n") + s.dur; }
  function countsFor(s) {
    var b = [];
    for (var i = 0; i < s.dur; i++) b.push(s.start + 1 + i);
    return b.join("-");
  }
  // What the student must enter: rests go in parentheses, e.g. (3-4)
  function answerFor(s) { return s.rest ? "(" + countsFor(s) + ")" : countsFor(s); }
  function symName(s) { return SINGULAR[s.dur] + " " + (s.rest ? "rest" : "note"); }

  var MODES = {
    practice: { name: "Practice mode", report: "Practice (could hear the rhythm before answering)" },
    test: { name: "Test mode", report: "Test (could hear the rhythm only after answering)" }
  };

  // ---------- Staff drawing (pure SVG, no fonts needed) ----------
  var W = 640, SP = 14, BOT = 128;
  var X0 = 100, X1 = W - 34, BW = (X1 - X0) / 4;
  var NOTE_POS = 3;  // noteheads sit in the 2nd space
  function yOf(pos) { return BOT - pos * SP / 2; }
  function symX(s) {
    if (s.rest && s.dur === 4) return (X0 + X1) / 2 - 10;   // whole rest is centered in the measure
    return X0 + s.start * BW + 26;
  }

  function quarterRest(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')" fill="none" stroke="currentColor">' +
      '<path d="M-4.5,-21 L1.5,-13.8" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M0.5,-15 L5.5,-9 L-2.5,0 L5.5,9.5" stroke-width="5.4" stroke-linejoin="round"/>' +
      '<path d="M5.8,10 C-0.5,5.5 -6.5,12 1.5,19.5" stroke-width="3.4" stroke-linecap="round"/></g>';
  }

  function drawSym(s, i) {
    var x = symX(s), y = yOf(NOTE_POS), out = '<g class="sym" data-i="' + i + '" fill="currentColor" stroke="currentColor">';
    if (s.rest) {
      if (s.dur === 4) out += '<rect x="' + (x - 9) + '" y="' + yOf(6) + '" width="18" height="7.5" stroke="none"/>';
      else if (s.dur === 2) out += '<rect x="' + (x - 9) + '" y="' + (yOf(4) - 7.5) + '" width="18" height="7.5" stroke="none"/>';
      else out += quarterRest(x, yOf(4));
    } else if (s.dur === 4) {
      out += '<ellipse cx="' + x + '" cy="' + y + '" rx="10.5" ry="6.8" stroke="none"/>' +
        '<ellipse cx="' + x + '" cy="' + y + '" rx="5.2" ry="3.4" transform="rotate(55 ' + x + ' ' + y + ')" fill="#fff" stroke="none"/>';
    } else {
      out += '<ellipse cx="' + x + '" cy="' + y + '" rx="8.8" ry="6.3" transform="rotate(-22 ' + x + ' ' + y + ')" stroke="none"/>';
      if (s.dur === 2) out += '<ellipse cx="' + x + '" cy="' + y + '" rx="6" ry="2.9" transform="rotate(-22 ' + x + ' ' + y + ')" fill="#fff" stroke="none"/>';
      out += '<line x1="' + (x + 7.9) + '" y1="' + (y - 2) + '" x2="' + (x + 7.9) + '" y2="' + (y - 50) + '" stroke-width="1.9"/>';
    }
    return out + '</g>';
  }

  // opts.counts: write the correct counting under each symbol; opts.size: add width/height for use as an image
  function staffSVG(pattern, opts) {
    opts = opts || {};
    var H = opts.counts ? 200 : 160;
    var size = opts.size ? ' width="' + W * opts.size + '" height="' + H * opts.size + '"' : "";
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '"' + size + ' xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One measure of rhythm in 4/4 time">';
    out += '<rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    for (var i = 0; i < 5; i++) {
      out += '<line x1="16" y1="' + yOf(i * 2) + '" x2="' + (W - 16) + '" y2="' + yOf(i * 2) + '" stroke="#1f2430" stroke-width="1.4"/>';
    }
    out += '<line x1="16" y1="' + yOf(8) + '" x2="16" y2="' + yOf(0) + '" stroke="#1f2430" stroke-width="1.6"/>';
    out += '<line x1="' + (W - 25) + '" y1="' + yOf(8) + '" x2="' + (W - 25) + '" y2="' + yOf(0) + '" stroke="#1f2430" stroke-width="1.6"/>';
    out += '<rect x="' + (W - 21) + '" y="' + yOf(8) + '" width="5" height="' + (SP * 4) + '" fill="#1f2430"/>';
    // time signature 4/4
    out += '<g fill="#1f2430" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="40" text-anchor="middle">' +
      '<text x="56" y="' + (yOf(4) - 1) + '">4</text><text x="56" y="' + (yOf(0) - 1) + '">4</text></g>';
    pattern.syms.forEach(function (s, i) {
      out += drawSym(s, i);
      if (opts.counts) {
        out += '<text x="' + symX(s) + '" y="' + (BOT + 50) + '" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1e7a3c">' + answerFor(s) + '</text>';
      }
    });
    return out + '</svg>';
  }

  // ---------- Sound (Web Audio, works offline) ----------
  var audioCtx = null, playing = { nodes: [], timers: [] };
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function click(t, accent) {
    var c = ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = "square"; o.frequency.value = accent ? 1600 : 1100;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.12 : 0.07, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.06);
    playing.nodes.push(o);
  }
  function tone(t, len) {
    var c = ctx(), o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "sawtooth"; o.frequency.value = 392;
    f.type = "lowpass"; f.frequency.value = 1800;
    var end = t + len * 0.9;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.setValueAtTime(0.16, Math.max(t + 0.04, end - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(end + 0.02);
    playing.nodes.push(o);
  }
  function stopPlayback() {
    playing.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
    playing.timers.forEach(clearTimeout);
    playing = { nodes: [], timers: [] };
    var marks = document.querySelectorAll("#staff .sym.playing");
    Array.prototype.forEach.call(marks, function (m) { m.classList.remove("playing"); });
  }
  function playRhythm(pattern) {
    try {
      stopPlayback();
      var c = ctx(), beat = 60 / 80, t0 = c.currentTime + 0.12, beats = 4;
      for (var b = 0; b < beats; b++) click(t0 + b * beat, b === 0);                // count-in
      var m0 = t0 + beats * beat;
      for (b = 0; b < beats; b++) click(m0 + b * beat, b === 0);
      pattern.syms.forEach(function (s, i) {
        var t = m0 + s.start * beat;
        if (!s.rest) tone(t, s.dur * beat);
        var startMs = (t - c.currentTime) * 1000, endMs = startMs + s.dur * beat * 1000 - 40;
        playing.timers.push(setTimeout(function () { mark(i, true); }, startMs));
        playing.timers.push(setTimeout(function () { mark(i, false); }, endMs));
      });
    } catch (e) { /* sound is optional */ }
  }
  function mark(i, on) {
    var g = document.querySelector('#staff .sym[data-i="' + i + '"]');
    if (g) g.classList.toggle("playing", on);
  }

  // ---------- State ----------
  var $ = function (id) { return document.getElementById(id); };
  var level = LEVELS[0];
  var state = {
    pool: [], deck: [], total: 0, index: 0, current: null, answered: false, mode: "practice",
    answers: [], sel: 0, // each answer: { paren: bool, body: "3-4" }
    asked: 0, allRight: 0, boxes: 0, boxesRight: 0, byType: {}, streak: 0, best: 0,
    missed: {}, lastSettings: null,
    student: null, finishedAt: null // kept in memory only; gone on reload
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

  function nextPattern() {
    if (!state.deck.length) {
      state.deck = shuffle(state.pool.slice());
      if (state.current && state.deck.length > 1 && state.deck[0].id === state.current.id) state.deck.push(state.deck.shift());
    }
    var p = state.deck.shift();
    // don't show the same rhythm twice in a row (whole notes are in the deck twice)
    if (state.current && p.id === state.current.id && state.deck.length) { state.deck.push(p); p = state.deck.shift(); }
    return p;
  }

  // ---------- Level picker ----------
  $("levelPicks").innerHTML = LEVELS.map(function (L) {
    return '<button type="button" class="level" data-value="' + L.id + '">' + L.name + '<small>' + L.desc + '</small></button>';
  }).join("");
  function selectLevel(id) {
    LEVELS.forEach(function (L) { if (L.id === id) level = L; });
    Array.prototype.forEach.call($("levelPicks").children, function (b) {
      var on = +b.dataset.value === level.id;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  Array.prototype.forEach.call($("levelPicks").children, function (b) {
    b.addEventListener("click", function () { selectLevel(+b.dataset.value); });
  });
  selectLevel(1);

  // ---------- Screens ----------
  function show(id) {
    ["setup", "nameScreen", "quiz", "results"].forEach(function (s) { $(s).classList.toggle("hidden", s !== id); });
    if (id !== "quiz") stopPlayback();
    if (id === "setup" || id === "nameScreen") $("stats").innerHTML = "";
    if (id === "setup") state.student = null;
  }

  function readSettings() {
    return {
      level: level,
      count: +document.querySelector('input[name="count"]:checked').value,
      mode: document.querySelector('input[name="mode"]:checked').value
    };
  }

  function askName() {
    var st = state.lastSettings;
    state.student = null;
    $("studentName").value = "";
    $("nameWarn").textContent = "";
    $("nameSummary").textContent = st.level.name + " · " + st.level.desc + " · " + MODES[st.mode].name + " · " + st.count + " questions";
    show("nameScreen");
    window.scrollTo(0, 0);
    $("studentName").focus();
  }

  function beginNamed() {
    var nm = $("studentName").value.replace(/\s+/g, " ").trim();
    if (!nm) { $("nameWarn").textContent = "Please type your name to begin."; $("studentName").focus(); return; }
    state.student = nm;
    startQuiz(patternsFor(state.lastSettings.level), state.lastSettings.count, state.lastSettings.mode);
  }

  function beginSettings(st) {
    state.lastSettings = st;
    if (st.count) { askName(); return; }
    state.student = null;
    startQuiz(patternsFor(st.level), st.count, st.mode);
  }

  function startQuiz(pool, count, mode) {
    state.pool = pool;
    state.mode = mode;
    state.total = count;
    state.index = 0;
    state.asked = 0; state.allRight = 0; state.boxes = 0; state.boxesRight = 0; state.byType = {};
    state.streak = 0; state.best = 0;
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

  function updateStats() {
    var s = state, html = "";
    if (s.student) html += "<span>👤 <b>" + escapeHtml(s.student) + "</b></span>";
    if (s.total) html += "<span>Question <b>" + Math.min(s.index + 1, s.total) + "</b> of " + s.total + "</span>";
    else html += "<span>Question <b>" + (s.index + 1) + "</b></span>";
    html += "<span>All right: <b>" + s.allRight + "</b> / " + s.asked + "</span>";
    html += "<span>Streak: <b>" + s.streak + "</b> 🔥</span>";
    $("stats").innerHTML = html;
  }

  // ---------- Question ----------
  function loadQuestion() {
    stopPlayback();
    state.current = nextPattern();
    state.answered = false;
    state.answers = state.current.syms.map(function () { return { paren: false, body: "" }; });
    state.sel = 0;
    setHear(state.mode !== "test");
    $("staff").innerHTML = staffSVG(state.current);
    $("qLabel").textContent = "Question " + (state.index + 1);
    $("feedback").className = "hidden";
    $("feedback").innerHTML = "";
    $("checkBtn").textContent = "Check answer";
    $("slots").className = "slots";
    buildSlots();
    setKeypad(true);
    refresh();
    updateStats();
  }

  function slotGeom(s) {
    var w = Math.min(BW - 14, 118), left = symX(s) - 24;
    if (left + w > W - 30) left = W - 30 - w;
    return { left: 100 * left / W, width: 100 * w / W, center: 100 * (left + w / 2) / W };
  }

  function buildSlots() {
    var box = $("slots");
    box.innerHTML = "";
    state.current.syms.forEach(function (s, i) {
      var g = slotGeom(s), b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.style.left = g.left + "%";
      b.style.width = g.width + "%";
      b.setAttribute("aria-label", "Counts for the " + symName(s) + " (box " + (i + 1) + ")");
      b.addEventListener("click", function () { if (state.answered) return; state.sel = i; refresh(); });
      box.appendChild(b);
    });
  }

  function shown(a) { return a.paren ? "(" + a.body + ")" : a.body; }
  // What gets graded: a dash left hanging at the end is ignored
  function given(a) { var b = a.body.replace(/-+$/, ""); return a.paren ? "(" + b + ")" : b; }

  function refresh() {
    var slots = $("slots").children;
    state.answers.forEach(function (a, i) {
      var b = slots[i], txt = shown(a);
      b.textContent = txt;
      b.classList.toggle("empty", !txt);
      b.classList.toggle("filled", !!txt);
      b.classList.toggle("sel", !state.answered && i === state.sel);
    });
    if (state.answered) return;
    var ready = state.answers.every(function (a) { return a.body.replace(/-+$/, "") !== ""; });
    $("checkBtn").disabled = !ready;
    $("checkHint").textContent = ready ? "Press Enter or click Check." : "Click a box, then use the buttons to fill it in.";
  }

  function press(key) {
    if (state.answered) return;
    var a = state.answers[state.sel], body = a.body;
    if (key === "paren") a.paren = !a.paren;
    else if (key === "parenOn") a.paren = true;
    else if (key === "back") { if (body) body = body.slice(0, -1); else a.paren = false; }
    else if (key === "-") { if (body && body.slice(-1) !== "-" && body.length < 7) body += "-"; }
    else if (/^[1-4]$/.test(key) && body.length < 7) body += key;
    a.body = body;
    refresh();
  }

  // Test mode: "Hear it" stays locked until the answer is checked
  function setHear(on) {
    var b = $("hearBtn");
    b.disabled = !on;
    b.textContent = on ? "🔊 Hear it" : "🔒 Hear it after you answer";
    b.title = on ? "Hear this rhythm" : "Test mode: you can hear the rhythm after you check your answer";
  }

  function moveSel(d) {
    if (state.answered) return;
    var n = state.answers.length;
    state.sel = (state.sel + d + n) % n;
    refresh();
  }

  function setKeypad(on) {
    Array.prototype.forEach.call($("keypad").children, function (b) { b.disabled = !on; });
  }

  function check() {
    var p = state.current, s = state;
    stopPlayback();
    s.answered = true;
    var wrong = [];
    p.syms.forEach(function (sym, i) {
      var ok = given(s.answers[i]) === answerFor(sym), k = typeKey(sym);
      s.boxes++; if (ok) s.boxesRight++;
      s.byType[k] = s.byType[k] || { right: 0, total: 0 };
      s.byType[k].total++; if (ok) s.byType[k].right++;
      if (!ok) wrong.push(i);
    });
    var allOk = !wrong.length;
    s.asked++;
    if (allOk) { s.allRight++; s.streak++; s.best = Math.max(s.best, s.streak); }
    else { s.streak = 0; s.missed[p.id] = p; }

    // mark the boxes and show the right counts under wrong ones
    var box = $("slots");
    box.className = "slots answered";
    Array.prototype.forEach.call(box.children, function (b, i) {
      b.classList.remove("sel");
      b.disabled = true;
      b.classList.add(wrong.indexOf(i) === -1 ? "right" : "wrong");
    });
    wrong.forEach(function (i) {
      var g = slotGeom(p.syms[i]), f = document.createElement("div");
      f.className = "fix";
      f.style.left = g.left + "%"; f.style.width = g.width + "%";
      f.textContent = "✓ " + answerFor(p.syms[i]);
      box.appendChild(f);
    });
    setKeypad(false);
    setHear(true);

    var praise = ["Excellent!", "Nice counting!", "You got it!", "Perfect!", "Bravo!", "Right on the beat!"];
    var html = "<div class='big'>" + (allOk ? praise[Math.floor(Math.random() * praise.length)] : "Not quite — here's how to count it:") + "</div>";
    if (!allOk) {
      html += "<ul>" + wrong.map(function (i) {
        var sym = p.syms[i], c = answerFor(sym);
        var how = sym.dur === 1
          ? "is on beat <b>" + (sym.start + 1) + "</b>, so it's counted <b>" + c + "</b>."
          : "starts on beat <b>" + (sym.start + 1) + "</b> and lasts <b>" + sym.dur + " beats</b>, so it's counted <b>" + c + "</b>.";
        return "<li>The " + symName(sym) + " " + how + "</li>";
      }).join("") + "</ul>";
      if (wrong.some(function (i) { return p.syms[i].rest; })) html += '<p class="hint" style="margin:8px 0 0">Remember: rests get counted too, and their counts go in parentheses — use the <b>( )</b> button.</p>';
      if (wrong.some(function (i) { return !p.syms[i].rest && state.answers[i].paren; })) html += '<p class="hint" style="margin:4px 0 0">Only rests use parentheses. Notes don\'t.</p>';
    } else {
      html += "<div>Counting: <b>" + p.syms.map(answerFor).join("&nbsp;&nbsp; ") + "</b></div>";
    }
    var fb = $("feedback");
    fb.className = "feedback " + (allOk ? "ok" : "no");
    fb.innerHTML = html;

    var last = s.total && s.index + 1 >= s.total;
    $("checkBtn").textContent = last ? "See results ▶" : "Next rhythm ▶";
    $("checkBtn").disabled = false;
    $("checkHint").textContent = "Press Enter to continue.";
    updateStats();
    if ($("soundOn").checked) playRhythm(p);
    $("checkBtn").focus({ preventScroll: true });
    try { fb.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
  }

  function advance() {
    state.index++;
    if (state.total && state.index >= state.total) return showResults();
    loadQuestion();
  }

  // ---------- Results ----------
  function typeRows() {
    return TYPE_ORDER.filter(function (k) { return state.byType[k]; }).map(function (k) {
      var t = state.byType[k];
      return { name: TYPE_NAMES[k], right: t.right, total: t.total, pct: pct(t.right, t.total) };
    });
  }

  function showResults() {
    var s = state, n = s.asked;
    stopPlayback();
    if (!n) { show("setup"); return; }
    $("resPct").textContent = pct(s.allRight, n) + "%";
    $("resLine").innerHTML = MODES[s.mode].name + ": you counted <b>" + s.allRight + "</b> of <b>" + n + "</b> rhythms all the way right. " +
      "Counting boxes right: <b>" + s.boxesRight + "</b> of <b>" + s.boxes + "</b>. Best streak: <b>" + s.best + "</b>.";
    $("resBars").innerHTML = typeRows().map(function (r) {
      return '<div class="bar"><span>' + r.name + '</span><div class="track"><div class="fill" style="width:' + r.pct + '%"></div></div><span class="num">' + r.right + "/" + r.total + " · " + r.pct + '%</span></div>';
    }).join("");
    var missed = Object.keys(s.missed).map(function (k) { return s.missed[k]; });
    $("resMissedWrap").classList.toggle("hidden", !missed.length);
    $("missedBtn").classList.toggle("hidden", !missed.length);
    $("resMissed").innerHTML = missed.map(function (p) { return staffSVG(p, { counts: true }); }).join("");
    var who = s.student ? ", " + s.student.split(" ")[0] : "";
    $("results").querySelector("h2").textContent = pct(s.allRight, n) >= 80 ? "Great work" + who + "! 🎉" : "Keep practicing" + who + "! 🎵";
    s.finishedAt = new Date();
    $("reportWrap").classList.toggle("hidden", !s.student);
    $("saveHint").textContent = "";
    $("saveHelp").classList.add("hidden");
    if (s.student) {
      $("saveName").textContent = reportFileName();
      drawReport(missed, function () { $("reportImg").src = $("reportCanvas").toDataURL("image/png"); });
      if (s.total && n >= s.total && window.TrainerLMS) window.TrainerLMS.completed();
    }
    show("results");
    window.scrollTo(0, 0);
    $("stats").innerHTML = (s.student ? "<span>👤 <b>" + escapeHtml(s.student) + "</b></span>" : "") +
      "<span>Finished: <b>" + s.allRight + "</b> / " + n + "</span>";
  }

  // ---------- Report picture (drawn on a canvas, saved as PNG) ----------
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  var MAX_PICS = 8;

  // Load the missed rhythms as pictures, then draw. Falls back to no pictures if they can't load.
  function drawReport(missed, done) {
    var shown = missed.slice(0, MAX_PICS), imgs = [], left = shown.length, finished = false;
    function finish(useImgs) {
      if (finished) return; finished = true;
      try { paint(missed, useImgs ? imgs : null); done(); }
      catch (e) { paint(missed, null); done(); }
    }
    if (!left) return finish(false);
    shown.forEach(function (p, i) {
      var im = new Image();
      im.onload = function () { if (--left === 0) finish(true); };
      im.onerror = function () { finish(false); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(staffSVG(p, { counts: true, size: 1 }));
      imgs[i] = im;
    });
    setTimeout(function () { finish(false); }, 3000);
  }

  function paint(missed, imgs) {
    var s = state, n = s.asked;
    var W2 = 900, P = 44, SCALE = 2;
    var FONT = '"Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';
    var c = $("reportCanvas"), g = c.getContext("2d");
    function font(size, weight) { g.font = (weight || 400) + " " + size + "px " + FONT; }

    var rows = typeRows();
    var SY = 30;           // shift for the 4th settings row
    var BARS_Y = 650 + SY;
    var MISSED_Y = BARS_Y + rows.length * 36 + 60;
    var picW = (W2 - 2 * P - 16) / 2, picH = picW * 200 / 640;
    var picRows = imgs ? Math.ceil(Math.min(missed.length, MAX_PICS) / 2) : 0;
    var missedH = !missed.length ? 40 : imgs ? picRows * (picH + 14) + (missed.length > MAX_PICS ? 30 : 0) : 40;
    var H = MISSED_Y + 30 + missedH + 40;

    c.width = W2 * SCALE; c.height = H * SCALE;
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.textBaseline = "alphabetic";
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, W2, H);
    g.fillStyle = "#7a3b1d"; g.fillRect(0, 0, W2, 76);
    g.fillStyle = "#ffffff"; font(26, 700); g.textAlign = "left";
    g.fillText("Rhythm Counting Trainer", P, 48);
    font(17, 600); g.textAlign = "right"; g.fillText("Results report", W2 - P, 48);
    g.textAlign = "left";

    function label(text, y) { g.fillStyle = "#5d6475"; font(14, 700); g.fillText(text.toUpperCase(), P, y); }
    function divider(y) { g.strokeStyle = "#d9d5cc"; g.lineWidth = 1; g.beginPath(); g.moveTo(P, y); g.lineTo(W2 - P, y); g.stroke(); }

    var d = s.finishedAt;
    var dateTxt = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) +
      " at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    label("Student", 112);
    g.fillStyle = "#1f2430"; font(30, 700); g.fillText(s.student, P, 146);
    label("Completed", 186);
    g.fillStyle = "#1f2430"; font(20, 400); g.fillText(dateTxt, P, 214);
    divider(240);

    label("Settings", 276);
    var st = s.lastSettings;
    [["Level", st.level.settingsText], ["Mode", MODES[s.mode].report], ["Questions", String(st.count)], ["Sound after answer", $("soundOn").checked ? "On" : "Off"]]
      .forEach(function (r, i) {
        var y = 312 + i * 31;
        g.fillStyle = "#5d6475"; font(18, 600); g.fillText(r[0], P, y);
        g.fillStyle = "#1f2430"; font(18, 400); g.fillText(r[1], P + 200, y);
      });
    divider(410 + SY);

    label("Score", 446 + SY);
    g.fillStyle = "#7a3b1d"; font(72, 800); g.fillText(pct(s.allRight, n) + "%", P, 526 + SY);
    var tx = P + 230;
    g.fillStyle = "#1f2430"; font(20, 400);
    g.fillText("Rhythms counted all the way right: " + s.allRight + " of " + n, tx, 480 + SY);
    g.fillText("Counting boxes right: " + s.boxesRight + " of " + s.boxes + " (" + pct(s.boxesRight, s.boxes) + "%)", tx, 510 + SY);
    g.fillText("Best streak: " + s.best, tx, 540 + SY);
    if (s.total && n < s.total) {
      g.fillStyle = "#b3261e"; font(18, 700);
      g.fillText("Ended early: answered " + n + " of " + s.total + " questions", tx, 570 + SY);
    }

    label("Counting by note and rest", BARS_Y - 32);
    rows.forEach(function (r, i) {
      var y = BARS_Y + i * 36, bx = P + 170, bw = W2 - P - 120 - bx;
      g.fillStyle = "#1f2430"; font(18, 600); g.textAlign = "left"; g.fillText(r.name, P, y + 6);
      g.fillStyle = "#ece8df"; roundRect(g, bx, y - 8, bw, 16, 8); g.fill();
      if (r.pct > 0) { g.fillStyle = "#7a3b1d"; roundRect(g, bx, y - 8, Math.max(16, bw * r.pct / 100), 16, 8); g.fill(); }
      g.fillStyle = "#1f2430"; g.textAlign = "right"; g.fillText(r.right + "/" + r.total + "  " + r.pct + "%", W2 - P, y + 6);
      g.textAlign = "left";
    });
    divider(MISSED_Y - 30);

    label("Rhythms to practice (with the right counting)", MISSED_Y);
    var y0 = MISSED_Y + 22;
    if (!missed.length) {
      g.fillStyle = "#1e7a3c"; font(19, 700); g.fillText("None. Every rhythm was right!", P, y0 + 14);
    } else if (!imgs) {
      g.fillStyle = "#1f2430"; font(19, 600); g.fillText(missed.length + " rhythm" + (missed.length > 1 ? "s" : "") + " missed.", P, y0 + 14);
    } else {
      imgs.forEach(function (im, i) {
        var x = P + (i % 2) * (picW + 16), y = y0 + Math.floor(i / 2) * (picH + 14);
        g.drawImage(im, x, y, picW, picH);
        g.strokeStyle = "#e9b4ae"; g.lineWidth = 1; roundRect(g, x, y, picW, picH, 8); g.stroke();
      });
      if (missed.length > MAX_PICS) {
        g.fillStyle = "#5d6475"; font(17, 600);
        g.fillText("+ " + (missed.length - MAX_PICS) + " more", P, y0 + picRows * (picH + 14) + 18);
      }
    }
    c.toDataURL("image/png"); // throws here (and falls back) if the pictures can't be used
  }

  function reportFileName() {
    var d = state.finishedAt || new Date();
    function two(x) { return (x < 10 ? "0" : "") + x; }
    var date = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
    var nm = state.student.replace(/[\\\/:*?"<>|.\u0000-\u001f]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "") || "Student";
    return nm + "_Rhythm_" + date + ".png";
  }

  function saveReport() {
    var c = $("reportCanvas"), name = reportFileName();
    function download(url, isBlob) {
      var a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      if (isBlob) setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }
    // Some sites can silently block downloads, so always show the backup steps.
    $("saveHint").textContent = "Check your Downloads folder for " + name + ".";
    $("saveHelp").classList.remove("hidden");
    try {
      if (c.toBlob) c.toBlob(function (blob) { blob ? download(URL.createObjectURL(blob), true) : download(c.toDataURL("image/png")); }, "image/png");
      else download(c.toDataURL("image/png"));
    } catch (e) {
      $("saveHint").textContent = "This computer blocked the download. Use the steps below instead.";
    }
  }

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
  $("startBtn").addEventListener("click", function () { beginSettings(readSettings()); });
  $("nameGoBtn").addEventListener("click", beginNamed);
  $("nameBackBtn").addEventListener("click", function () { show("setup"); });
  $("studentName").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); beginNamed(); }
  });
  Array.prototype.forEach.call($("keypad").children, function (b) {
    b.addEventListener("click", function () { press(b.dataset.key); });
  });
  $("checkBtn").addEventListener("click", function () { state.answered ? advance() : check(); });
  $("hearBtn").addEventListener("click", function () {
    if (!state.current || (state.mode === "test" && !state.answered)) return;
    playRhythm(state.current);
  });
  $("quitBtn").addEventListener("click", function () { if (state.asked) showResults(); else show("setup"); });
  $("againBtn").addEventListener("click", function () { beginSettings(state.lastSettings); });
  $("missedBtn").addEventListener("click", function () {
    var pool = Object.keys(state.missed).map(function (k) { return state.missed[k]; });
    state.student = null; // extra practice, no report
    startQuiz(pool, Math.max(5, pool.length * 2), "practice");
  });
  $("settingsBtn").addEventListener("click", function () { show("setup"); });
  $("backBtn").addEventListener("click", function () { state.current = null; show("setup"); window.scrollTo(0, 0); });
  $("saveImgBtn").addEventListener("click", saveReport);
  $("openImgBtn").addEventListener("click", openReport);

  document.addEventListener("keydown", function (e) {
    if ($("quiz").classList.contains("hidden")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter" && !$("checkBtn").disabled) { e.preventDefault(); $("checkBtn").click(); return; }
    if (state.answered) return;
    if (/^[1-4]$/.test(e.key)) { press(e.key); e.preventDefault(); }
    else if (e.key === "-" || e.key === "Subtract") { press("-"); e.preventDefault(); }
    else if (e.key === "(" || e.key === ")") { press("parenOn"); e.preventDefault(); } // typing ( or ) turns them on
    else if (e.key === "Backspace" || e.key === "Delete") { press("back"); e.preventDefault(); }
    else if (e.key === "ArrowRight") { moveSel(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { moveSel(-1); e.preventDefault(); }
  });
})();
