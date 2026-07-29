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
                                        setattr(st, f_key, f_val)
                                        st.__dict__[f_key] = f_val
                                        try: exec(f_key + " = " + repr(f_val), st.__dict__)
                                        except Exception: pass
                                        for k_top, v_top in list(st.__dict__.items()):
                                            if not k_top.startswith('_') and k_top not in ('config', 'renpy', 'store', 'style', 'ui', 'adv', 'nvl', 'theme'):
                                                if isinstance(v_top, dict) and f_key in v_top:
                                                    v_top[f_key] = f_val
                                                elif hasattr(v_top, '__dict__') and hasattr(v_top, f_key):
                                                    setattr(v_top, f_key, f_val)
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
                                for k, v in list(st.__dict__.items()):
                                    if not k.startswith('_') and k not in ('config', 'renpy', 'store', 'style', 'ui', 'adv', 'nvl', 'theme'):
                                        if isinstance(v, (int, float, str, bool)):
                                            v_type = 'number' if isinstance(v, (int, float)) else ('boolean' if isinstance(v, bool) else 'string')
                                            scanned_vars.append({'id': k, 'name': k, 'value': v, 'type': v_type})

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

                                                    setattr(st, var_key, var_val)
                                                    st.__dict__[var_key] = var_val
                                                    try:
                                                        exec(var_key + " = " + repr(var_val), st.__dict__)
                                                    except Exception:
                                                        pass
                                                    
                                                    # Walk nested objects & dicts in store to ensure all occurrences update
                                                    try:
                                                        for k_top, v_top in list(st.__dict__.items()):
                                                            if not k_top.startswith('_') and k_top not in ('config', 'renpy', 'store', 'style', 'ui', 'adv', 'nvl', 'theme'):
                                                                if isinstance(v_top, dict) and var_key in v_top:
                                                                    v_top[var_key] = var_val
                                                                elif hasattr(v_top, '__dict__') and hasattr(v_top, var_key):
                                                                    setattr(v_top, var_key, var_val)
                                                    except Exception:
                                                        pass

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
