window.$RTCheats.tab('rm.switches', 'Switches', function (container) {
  var sys = window.$dataSystem;
  var gs = window.$gameSwitches;
  if (!sys || !sys.switches || !gs) {
    var msg = document.createElement('div');
    msg.textContent = 'Switches not available yet — start a game first.';
    msg.style.cssText = 'opacity:0.6;font-size:11px;';
    container.appendChild(msg);
    return;
  }
  var names = sys.switches; // index 0 is null/empty
  var N = names.length - 1;

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
    var row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 0;cursor:pointer;';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!gs.value(id);
    cb.onchange = function () { gs.setValue(id, cb.checked); };
    var label = document.createElement('span');
    var nm = names[id];
    label.textContent = '#' + id + (nm ? ' ' + nm : '');
    label.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    label.title = label.textContent;
    row.appendChild(cb);
    row.appendChild(label);
    return row;
  }

  function rebuild() {
    list.innerHTML = '';
    var q = search.value.trim().toLowerCase();
    var ids;
    if (/^\d+$/.test(q)) {
      var qid = parseInt(q, 10);
      ids = qid >= 1 && qid <= N ? [qid] : [];
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
      none.textContent = 'No matching switches.';
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
