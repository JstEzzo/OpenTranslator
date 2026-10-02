window.$RTCheats.tab('rm.variables', 'Variables', function (container) {
  var sys = window.$dataSystem;
  var gv = window.$gameVariables;
  if (!sys || !sys.variables || !gv) {
    var msg = document.createElement('div');
    msg.textContent = 'Variables not available yet — start a game first.';
    msg.style.cssText = 'opacity:0.6;font-size:11px;';
    container.appendChild(msg);
    return;
  }
  var names = sys.variables; // index 0 is null/empty
  var N = names.length - 1;

  // Candidate ids: those with a non-empty name; if none are named, fall back to
  // the first 200 by index (search can still reach any id by number).
  var named = [];
  for (var i = 1; i <= N; i++) {
    var nm = names[i];
    if (nm !== null && nm !== undefined && nm !== '') named.push(i);
  }
  var base = named;
  if (base.length === 0) {
    base = [];
    for (var j = 1; j <= Math.min(N, 200); j++) base.push(j);
  }

  var search = document.createElement('input');
  search.placeholder = 'Search by id or name…';
  search.style.cssText =
    'width:100%;margin-bottom:6px;padding:4px;background:#1a1a26;color:#e6e6ff;' +
    'border:1px solid #44445a;border-radius:3px;font:11px monospace;';
  container.appendChild(search);

  var list = document.createElement('div');
  container.appendChild(list);

  var CAP = 500;

  function rowFor(id) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 0;';
    var label = document.createElement('span');
    var nm = names[id];
    label.textContent = '#' + id + (nm ? ' ' + nm : '');
    label.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    label.title = label.textContent;
    row.appendChild(label);

    var cur = gv.value(id);
    if (cur !== null && typeof cur === 'object') {
      var ro = document.createElement('span');
      ro.textContent = '[object]';
      ro.style.cssText = 'opacity:0.5;font-size:10px;';
      row.appendChild(ro);
      return row;
    }
    var orig = String(cur);
    var inp = document.createElement('input');
    inp.value = orig;
    inp.style.cssText =
      'width:96px;padding:2px 4px;background:#1a1a26;color:#e6e6ff;' +
      'border:1px solid #44445a;border-radius:3px;font:11px monospace;';
    function commit() {
      if (inp.value === orig) return; // no-op unless the value actually changed
      var raw = inp.value;
      var num = Number(raw);
      gv.setValue(id, raw !== '' && !isNaN(num) ? num : raw);
      orig = inp.value;
    }
    inp.onkeydown = function (e) {
      if (e.key === 'Enter') { commit(); inp.blur(); }
    };
    inp.onblur = commit;
    row.appendChild(inp);
    return row;
  }

  function rebuild() {
    list.innerHTML = '';
    var q = search.value.trim().toLowerCase();
    var ids;
    if (/^\d+$/.test(q)) {
      var qid = parseInt(q, 10);
      ids = qid >= 1 && qid <= N ? [qid] : []; // jump to an exact id even if unnamed
    } else if (q === '') {
      ids = base;
    } else {
      ids = base.filter(function (id) {
        var nm = names[id] ? String(names[id]).toLowerCase() : '';
        return nm.indexOf(q) !== -1 || String(id).indexOf(q) !== -1;
      });
    }
    var shown = ids.slice(0, CAP);
    for (var k = 0; k < shown.length; k++) list.appendChild(rowFor(shown[k]));
    if (ids.length > CAP) {
      var more = document.createElement('div');
      more.textContent = '… ' + (ids.length - CAP) + ' more — refine search';
      more.style.cssText = 'opacity:0.5;font-size:10px;margin-top:4px;';
      list.appendChild(more);
    }
    if (shown.length === 0) {
      var none = document.createElement('div');
      none.textContent = 'No matching variables.';
      none.style.cssText = 'opacity:0.5;font-size:10px;';
      list.appendChild(none);
    }
  }

  var timer = null;
  search.oninput = function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(rebuild, 120);
  };
  rebuild();
});
