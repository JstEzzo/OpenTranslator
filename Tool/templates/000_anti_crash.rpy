# OpenTranslator Ren'Py Anti-Crash & Cheat Handler
init -990 python:
    def _opent_bootstrap_runtime():
        try:
            import renpy
            import types
            import sys

            # Single reusable dummy class for polyfilling missing displayables, actions and audio
            class _OpenTranslatorDummy(object):
                def __init__(self, *args, **kwargs): pass
                def __call__(self, *args, **kwargs): return self
                def __getattr__(self, name): return lambda *args, **kwargs: None

            # Helper for clean nested attribute resolution
            def _get_nested_attr(root, path):
                curr = root
                for p in path.split('.'):
                    curr = getattr(curr, p, None)
                    if curr is None:
                        break
                return curr

            # 1. Polyfill basic functions
            if not hasattr(renpy, 'pure'):
                renpy.pure = lambda fn_or_name: fn_or_name

            if not hasattr(renpy, 'register_persistent'):
                renpy.register_persistent = lambda name, func=None, *args, **kwargs: None

            # 2. Resolve renpy.curry module-shadowing & attribute lookup bug
            if hasattr(renpy, 'curry'):
                curry_target = None
                if isinstance(renpy.curry, types.ModuleType):
                    curry_target = getattr(renpy.curry, 'curry', getattr(renpy.curry, 'Curry', renpy.curry))
                elif callable(renpy.curry):
                    curry_target = renpy.curry

                if curry_target:
                    class _CurryWrapper(object):
                        def __init__(self, target):
                            self._target = target
                            self.curry = target
                        def __call__(self, *args, **kwargs):
                            return self._target(*args, **kwargs)

                    renpy.curry = _CurryWrapper(curry_target)

            # 3. Polyfill GL2 shader registration
            if not hasattr(renpy, 'register_shader'):
                reg_sh = getattr(getattr(renpy, 'exports', None), 'register_shader', None)
                if not reg_sh:
                    reg_sh = _get_nested_attr(renpy, 'gl2.gl2shadercache.register_shader')
                renpy.register_shader = reg_sh if reg_sh else (lambda *args, **kwargs: None)

            # 4. Resolve Ren'Py export functions using a factory to avoid late-binding closure bugs
            def _make_dummy_fn(default_val):
                return lambda *args, **kwargs: default_val

            _export_fns = {
                'has_screen': ('display.screen', False),
                'get_screen': ('display.screen', None),
                'show_display_say': ('character', None),
                'predict_show_display_say': ('character', None)
            }
            for fname, (fmod, fdefault) in _export_fns.items():
                if not hasattr(renpy, fname):
                    found_fn = getattr(getattr(renpy, 'exports', None), fname, None)
                    if not found_fn:
                        found_fn = _get_nested_attr(renpy, fmod + '.' + fname)
                    setattr(renpy, fname, found_fn if found_fn else _make_dummy_fn(fdefault))

            # 5. Resolve dynamic class mappings
            _renpy_mappings = {
                'Displayable': ['display.core', 'display.displayable', 'display.layout'],
                'ParameterizedText': ['text.extras', 'character', 'display.text'],
                'Action': ['display.behavior'],
                'BarValue': ['display.behavior'],
                'FieldValue': ['display.behavior'],
                'Container': ['display.layout', 'display.core']
            }
            for attr, submods in _renpy_mappings.items():
                if not hasattr(renpy, attr):
                    found_cls = None
                    for sub in submods:
                        found_cls = _get_nested_attr(renpy, sub + '.' + attr)
                        if found_cls:
                            break
                    setattr(renpy, attr, found_cls if found_cls else _OpenTranslatorDummy)

            # 6. Audio polyfills
            if not hasattr(renpy, 'music'):
                renpy.music = getattr(getattr(renpy, 'audio', None), 'music', _OpenTranslatorDummy())
            elif not hasattr(renpy.music, 'register_channel'):
                renpy.music.register_channel = lambda *args, **kwargs: None

            if not hasattr(renpy, 'sound'):
                renpy.sound = getattr(getattr(renpy, 'audio', None), 'sound', _OpenTranslatorDummy())

            # 7. Safe Preference wrapper with dummy action fallback
            pref_cls = _get_nested_attr(renpy, 'display.behavior.Preference')
            if pref_cls:
                null_act = getattr(_get_nested_attr(renpy, 'display.behavior'), 'NullAction', _OpenTranslatorDummy)
                def _safe_Pref(name, value=None, *args, **kwargs):
                    try:
                        return pref_cls(name, value, *args, **kwargs)
                    except Exception:
                        return null_act() if callable(null_act) else _OpenTranslatorDummy()
                renpy.display.behavior.Preference = _safe_Pref
                try:
                    import store
                    store.Preference = _safe_Pref
                except Exception:
                    pass

            # 8. Enable developer/cheat config options cleanly
            if 'config' in globals():
                config.developer = True
                config.console = True
                config.rollback_enabled = True
                config.fast_skipping = True

            # 9. Ren'Py Cheat Telemetry & Remote Control Thread (Port 16005)
            try:
                import threading
                import time
                import json

                _opent_frozen_vars = {}

                def _deep_mutate_var(obj, var_key, var_val, visited=None, depth=0):
                    if depth > 5:
                        return
                    if visited is None:
                        visited = set()
                    obj_id = id(obj)
                    if obj_id in visited:
                        return
                    visited.add(obj_id)

                    try:
                        if isinstance(obj, dict):
                            if var_key in obj:
                                try: obj[var_key] = var_val
                                except Exception: pass
                            for sub_val in list(obj.values()):
                                if isinstance(sub_val, (dict, list, tuple)) or hasattr(sub_val, '__dict__'):
                                    _deep_mutate_var(sub_val, var_key, var_val, visited, depth + 1)

                        elif isinstance(obj, (list, tuple)):
                            for item in list(obj):
                                if hasattr(item, '__dict__'):
                                    if hasattr(item, var_key):
                                        try: setattr(item, var_key, var_val)
                                        except Exception: pass
                                    item_id_val = str(getattr(item, 'id', '') or getattr(item, 'name', '') or getattr(item, 'item_id', '')).lower()
                                    if item_id_val and (item_id_val in var_key.lower() or var_key.lower() in item_id_val):
                                        for attr_name in ('durability', 'dur', 'count', 'qty', 'amount', 'val', 'value'):
                                            if hasattr(item, attr_name):
                                                try: setattr(item, attr_name, var_val)
                                                except Exception: pass
                                elif isinstance(item, dict):
                                    if var_key in item:
                                        try: item[var_key] = var_val
                                        except Exception: pass
                                    item_id_val = str(item.get('id') or item.get('name') or item.get('item_id') or '').lower()
                                    if item_id_val and (item_id_val in var_key.lower() or var_key.lower() in item_id_val):
                                        for attr_name in ('durability', 'dur', 'count', 'qty', 'amount', 'val', 'value'):
                                            if attr_name in item:
                                                try: item[attr_name] = var_val
                                                except Exception: pass
                                if isinstance(item, (dict, list, tuple)) or hasattr(item, '__dict__'):
                                    _deep_mutate_var(item, var_key, var_val, visited, depth + 1)

                        elif hasattr(obj, '__dict__'):
                            if hasattr(obj, var_key):
                                try: setattr(obj, var_key, var_val)
                                except Exception: pass
                            for k_attr, v_attr in list(getattr(obj, '__dict__', {}).items()):
                                if not k_attr.startswith('_') and k_attr not in ('config', 'renpy', 'store', 'style', 'ui', 'adv', 'nvl', 'theme'):
                                    if isinstance(v_attr, (dict, list, tuple)) or hasattr(v_attr, '__dict__'):
                                        _deep_mutate_var(v_attr, var_key, var_val, visited, depth + 1)
                    except Exception:
                        pass

                def _scan_nested_vars(obj, prefix="", visited=None, depth=0):
                    if depth > 3:
                        return []
                    if visited is None:
                        visited = set()
                    obj_id = id(obj)
                    if obj_id in visited:
                        return []
                    visited.add(obj_id)

                    res = []
                    try:
                        def _is_heavy(k_name, val):
                            if isinstance(val, (int, float, str, bool)):
                                return False
                            k_s = str(k_name)
                            if k_s.startswith('_'):
                                return True
                            if k_s in ('config', 'renpy', 'store', 'style', 'ui', 'adv', 'nvl', 'theme', 'persistent', 'python', 'sys', 'os', 'main'):
                                return True
                            if callable(val) or isinstance(val, type):
                                return True
                            mod = getattr(type(val), '__module__', '') or ''
                            if mod.startswith(('renpy.', 'pygame.', 'sys', 'threading')):
                                return True
                            return False

                        def _sanitize_val(val):
                            if isinstance(val, float):
                                if val != val or val == float('inf') or val == float('-inf'):
                                    return 9999999
                            return val

                        if isinstance(obj, dict):
                            for k, v in list(obj.items()):
                                k_str = str(k)
                                if _is_heavy(k_str, v):
                                    continue
                                path = (prefix + "." + k_str) if prefix else k_str
                                if isinstance(v, (int, float, str, bool)):
                                    v_type = 'number' if isinstance(v, (int, float)) else ('boolean' if isinstance(v, bool) else 'string')
                                    res.append({'id': path, 'name': path, 'value': _sanitize_val(v), 'type': v_type})
                                elif isinstance(v, (dict, list, tuple)) or hasattr(v, '__dict__'):
                                    res.extend(_scan_nested_vars(v, path, visited, depth + 1))

                        elif isinstance(obj, (list, tuple)):
                            for idx, item in enumerate(list(obj)):
                                if _is_heavy(idx, item):
                                    continue
                                item_name = getattr(item, 'id', None) or getattr(item, 'name', None) or getattr(item, 'item_id', None)
                                item_str = str(item_name) if item_name else str(idx)
                                path = prefix + "[" + item_str + "]"
                                if isinstance(item, (int, float, str, bool)):
                                    v_type = 'number' if isinstance(item, (int, float)) else ('boolean' if isinstance(item, bool) else 'string')
                                    res.append({'id': path, 'name': path, 'value': _sanitize_val(item), 'type': v_type})
                                elif isinstance(item, (dict, list, tuple)) or hasattr(item, '__dict__'):
                                    res.extend(_scan_nested_vars(item, path, visited, depth + 1))

                        elif hasattr(obj, '__dict__'):
                            for k, v in list(getattr(obj, '__dict__', {}).items()):
                                k_str = str(k)
                                if _is_heavy(k_str, v):
                                    continue
                                path = (prefix + "." + k_str) if prefix else k_str
                                if isinstance(v, (int, float, str, bool)):
                                    v_type = 'number' if isinstance(v, (int, float)) else ('boolean' if isinstance(v, bool) else 'string')
                                    res.append({'id': path, 'name': path, 'value': _sanitize_val(v), 'type': v_type})
                                elif isinstance(v, (dict, list, tuple)) or hasattr(v, '__dict__'):
                                    res.extend(_scan_nested_vars(v, path, visited, depth + 1))
                    except Exception:
                        pass
                    return res

                def _set_path_val(st, path_str, val):
                    try:
                        exec(path_str + " = " + repr(val), st.__dict__)
                    except Exception:
                        pass
                    try:
                        setattr(st, path_str, val)
                        st.__dict__[path_str] = val
                    except Exception:
                        pass
                    _deep_mutate_var(st, path_str, val)

                def _opent_renpy_cheat_loop():
                    import sys
                    if sys.version_info[0] >= 3:
                        import urllib.request as _urlreq
                    else:
                        import urllib2 as _urlreq

                    while True:
                        try:
                            time.sleep(1.0)
                            if not hasattr(renpy, 'game') or not renpy.game.context():
                                continue

                            st = getattr(renpy, 'store', None)

                            # --- MEMORY FREEZE TICK ---
                            if st and _opent_frozen_vars:
                                for f_key, f_val in list(_opent_frozen_vars.items()):
                                    try:
                                        _set_path_val(st, f_key, f_val)
                                    except Exception:
                                        pass

                            gold_val = 0
                            if st:
                                for g_attr in ('gold', 'money', 'coins', 'cash', 'g'):
                                    if hasattr(st, g_attr) and isinstance(getattr(st, g_attr), (int, float)):
                                        gold_val = int(getattr(st, g_attr))
                                        break

                            scanned_vars = []
                            if st:
                                scanned_vars = _scan_nested_vars(st)

                            payload = {
                                'engine': 'renpy',
                                'gold': gold_val,
                                'through': getattr(getattr(renpy, 'config', None), 'developer', True),
                                'actors': [{'idx': 0, 'name': 'Protagonist', 'hp': 999, 'mhp': 999, 'mp': 999, 'mmp': 999, 'level': 1}],
                                'variables': scanned_vars,
                                'switches': []
                            }

                            req_data = json.dumps(payload).encode('utf-8')
                            req = _urlreq.Request('http://127.0.0.1:16005/cheat_poll', data=req_data, headers={'Content-Type': 'application/json'})
                            resp = _urlreq.urlopen(req, timeout=2.0)
                            resp_data = resp.read().decode('utf-8')

                            if resp_data:
                                cmds = json.loads(resp_data)
                                if isinstance(cmds, list):
                                    for cmd in cmds:
                                        try:
                                            cmd_type = cmd.get('comando') or cmd.get('cmd')
                                            if cmd_type in ('set_var', 'set_renpy_var') and st:
                                                var_key = str(cmd.get('id') if cmd.get('id') is not None else cmd.get('key'))
                                                var_val = cmd.get('valor') if 'valor' in cmd else cmd.get('value')
                                                try:
                                                    if hasattr(st, var_key):
                                                        orig_val = getattr(st, var_key)
                                                        if isinstance(orig_val, bool):
                                                            var_val = bool(str(var_val).lower() in ('true', '1', 'yes'))
                                                        elif isinstance(orig_val, int) and not isinstance(orig_val, bool):
                                                            try: var_val = int(var_val)
                                                            except Exception: pass
                                                        elif isinstance(orig_val, float):
                                                            try: var_val = float(var_val)
                                                            except Exception: pass
                                                    
                                                    # Lock variable into Memory Freeze Map
                                                    _opent_frozen_vars[var_key] = var_val

                                                    _set_path_val(st, var_key, var_val)

                                                    # Safe UI Refresh (Cross-Thread)
                                                    try:
                                                        def _force_ui_update():
                                                            try:
                                                                if hasattr(renpy, 'restart_interaction'):
                                                                    renpy.restart_interaction()
                                                                elif hasattr(getattr(renpy, 'exports', None), 'restart_interaction'):
                                                                    renpy.exports.restart_interaction()
                                                                elif hasattr(getattr(getattr(renpy, 'game', None), 'interface', None), 'restart_interaction'):
                                                                    renpy.game.interface.restart_interaction()
                                                            except Exception:
                                                                pass

                                                        if hasattr(renpy, 'invoke_in_main_thread'):
                                                            renpy.invoke_in_main_thread(_force_ui_update)
                                                        else:
                                                            _force_ui_update()
                                                    except Exception:
                                                        pass
                                                except Exception as ex_set:
                                                    sys.stderr.write("[OpenTranslator Cheat Set Error] " + str(ex_set) + "\n")
                                            elif cmd.get('code'):
                                                exec(cmd.get('code'), st.__dict__ if st else globals())
                                        except Exception:
                                            pass
                        except Exception:
                            pass

                t = threading.Thread(target=_opent_renpy_cheat_loop)
                t.daemon = True
                t.start()
            except Exception:
                pass

        except Exception:
            pass

    _opent_bootstrap_runtime()
    del _opent_bootstrap_runtime
