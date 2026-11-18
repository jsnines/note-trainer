// Connects the trainer to the LMS (SCORM 1.2).
// Reports only that the activity was started and finished. No name, score or answers are sent.
(function () {
  "use strict";
  function findAPI(win) {
    for (var i = 0; win && i < 10; i++) {
      try { if (win.API) return win.API; } catch (e) { /* other origin */ }
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }
  var api = null;
  try { api = findAPI(window) || (window.opener ? findAPI(window.opener) : null); } catch (e) { api = null; }

  function call(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    try { return api && typeof api[fn] === "function" ? String(api[fn].apply(api, args)) : ""; } catch (e) { return ""; }
  }

  var started = false, finished = false;
  if (api) {
    started = call("LMSInitialize", "") === "true";
    if (started) {
      var status = call("LMSGetValue", "cmi.core.lesson_status");
      if (status === "" || status === "not attempted") {
        call("LMSSetValue", "cmi.core.lesson_status", "incomplete");
        call("LMSCommit", "");
      }
    }
  }

  function finish() {
    if (started && !finished) { finished = true; call("LMSFinish", ""); }
  }
  window.addEventListener("pagehide", finish);
  window.addEventListener("beforeunload", finish);

  window.TrainerLMS = {
    connected: function () { return started; },
    // Called when a student finishes a 10- or 20-question session
    completed: function () {
      if (!started) return;
      call("LMSSetValue", "cmi.core.lesson_status", "completed");
      call("LMSCommit", "");
    }
  };
})();
