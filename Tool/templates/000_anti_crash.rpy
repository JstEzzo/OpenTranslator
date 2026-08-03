python early:
    def _opent_early_bootstrap():
        try:
            import renpy
            if not hasattr(renpy, 'suppress_transition'):
                def _safe_suppress_transition(*args, **kwargs):
                    try:
                        if hasattr(renpy, 'exports') and hasattr(renpy.exports, 'suppress_transition'):
                            return renpy.exports.suppress_transition(*args, **kwargs)
                        if hasattr(renpy, 'game') and hasattr(renpy.game, 'interface') and hasattr(renpy.game.interface, 'suppress_transition'):
                            return renpy.game.interface.suppress_transition(*args, **kwargs)
                    except Exception:
                        pass
                    return False
                try: setattr(renpy, 'suppress_transition', _safe_suppress_transition)
                except Exception: pass

            if hasattr(renpy, 'exports'):
                for export_name in dir(renpy.exports):
                    if not export_name.startswith('_') and not hasattr(renpy, export_name):
                        try: setattr(renpy, export_name, getattr(renpy.exports, export_name))
                        except Exception: pass

            try:
                import types
                import renpy.display.behavior as _rdb
                def _safe_rdb_run(action, *args, **kwargs):
                    if action is None:
                        return None
                    elif isinstance(action, (list, tuple)):
                        for i in action:
                            _safe_rdb_run(i, *args, **kwargs)
                        return None
                    elif isinstance(action, types.ModuleType):
                        return None
                    elif callable(action):
                        try:
                            return action(*args, **kwargs)
                        except TypeError as e:
                            if 'not callable' in str(e):
                                return None
                            raise
                    else:
                        return None
                _rdb.run = _safe_rdb_run
            except Exception:
                pass
        except Exception:
            pass
    _opent_early_bootstrap()

init -1500 python:
    # Ren'Py 8.5+ Compatibility Polyfill for restart_interaction
    def _opent_polyfill_restart_interaction():
        try:
            import renpy
            if not hasattr(renpy, 'restart_interaction'):
                def _safe_restart_interaction(*args, **kwargs):
                    try:
                        if hasattr(renpy, 'exports') and hasattr(renpy.exports, 'restart_interaction'):
                            return renpy.exports.restart_interaction(*args, **kwargs)
                        if hasattr(renpy, 'game') and hasattr(renpy.game, 'interface') and hasattr(renpy.game.interface, 'restart_interaction'):
                            return renpy.game.interface.restart_interaction(*args, **kwargs)
                    except Exception:
                        pass
                    return None
                try: setattr(renpy, 'restart_interaction', _safe_restart_interaction)
                except Exception: pass

            if hasattr(renpy, 'exports') and not hasattr(renpy.exports, 'restart_interaction'):
                try: setattr(renpy.exports, 'restart_interaction', getattr(renpy, 'restart_interaction'))
                except Exception: pass
        except Exception:
            pass
    _opent_polyfill_restart_interaction()

    # Dynamic Cross-Version Layout & Preferences Proxy Binder & Transitions Polyfill (Ren'Py 7.x -> 8.x)
    try:
        import sys, os, renpy
        if hasattr(renpy, 'store'):
            st = renpy.store
            class SafeCallable(object):
                def __call__(self, *args, **kwargs): return None
                def __contains__(self, item): return True
                def __iter__(self): return iter([])
                def __bool__(self): return True
                def __nonzero__(self): return True

            class LayoutProxy(object):
                def __init__(self):
                    self.provided = set(['compat', 'navigation', 'main_menu', 'classic', 'roundrect'])
                def __getattr__(self, name):
                    if name == 'provided':
                        return self.provided
                    return SafeCallable()
                def __call__(self, *args, **kwargs):
                    return self

            if not hasattr(st, '_layout') or st._layout is None:
                st._layout = LayoutProxy()
            else:
                if not hasattr(st._layout, 'provided') or not isinstance(getattr(st._layout, 'provided', None), (set, list, tuple, dict)):
                    try: setattr(st._layout, 'provided', set(['compat', 'navigation', 'main_menu', 'classic', 'roundrect']))
                    except Exception: pass

            if not hasattr(st, 'layout') or st.layout is None:
                st.layout = st._layout

            if not hasattr(st, 'preferences'):
                pref_obj = getattr(getattr(renpy, 'game', None), 'preferences', None)
                if not pref_obj:
                    pref_obj = getattr(renpy, 'preferences', None)
                if pref_obj:
                    st.preferences = pref_obj
                    st._preferences = pref_obj
                else:
                    class PreferencesProxy(object):
                        def __getattr__(self, name): return None
                        def __setattr__(self, name, val): pass
                    proxy_pref = PreferencesProxy()
                    st.preferences = proxy_pref
                    st._preferences = proxy_pref

            transitions_list = [
                'dissolve', 'fade', 'pixellate', 'move', 'ease', 'pushright', 'pushleft',
                'pushup', 'pushdown', 'vpunch', 'hpunch', 'blinds', 'squares', 'wipeleft',
                'wiperight', 'wipeup', 'wipedown', 'slideleft', 'slideright', 'slideup',
                'slidedown', 'slideawayleft', 'slideawayright', 'slideawayup', 'slideawaydown',
                'irisin', 'irisout', 'Dissolve', 'Fade', 'ImageDissolve'
            ]
            for tname in transitions_list:
                if not hasattr(st, tname):
                    try:
                        orig_t = getattr(renpy.exports, tname, None) if hasattr(renpy, 'exports') else None
                        if orig_t:
                            setattr(st, tname, orig_t)
                        else:
                            class DummyTransition(object):
                                def __init__(self, *a, **kw): pass
                                def __call__(self, *a, **kw): return self
                            setattr(st, tname, DummyTransition())
                    except Exception:
                        pass
        except Exception:
            pass

init -999999 python:
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

            # Patch renpy.translation to suppress duplicate string translation exceptions
            try:
                import renpy.translation
                orig_add_string = getattr(renpy.translation, 'add_string_translation', None)
                if orig_add_string:
                    def _safe_add_string_translation(language, old, new, loc):
                        try:
                            orig_add_string(language, old, new, loc)
                        except Exception:
                            pass
                    renpy.translation.add_string_translation = _safe_add_string_translation

                if hasattr(renpy.translation, 'StringTranslates'):
                    st_cls = renpy.translation.StringTranslates
                    orig_st_add = getattr(st_cls, 'add', None)
                    if orig_st_add:
                        def _safe_st_add(self, old, new, loc):
                            try:
                                orig_st_add(self, old, new, loc)
                            except Exception:
                                pass
                        st_cls.add = _safe_st_add
            except Exception:
                pass

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

            # 8. Enable developer/cheat config options cleanly & SafeList for config layers
            if 'config' in globals() or hasattr(renpy, 'config'):
                try:
                    config.developer = True
                    config.console = True
                    config.rollback_enabled = True
                    config.fast_skipping = True
                except Exception: pass

                try:
                    class SafeList(list):
                        def remove(self, x):
                            try:
                                if x in self:
                                    super(SafeList, self).remove(x)
                            except Exception:
                                pass

                    for k in dir(renpy.config):
                        if 'layer' in k.lower():
                            v = getattr(renpy.config, k, None)
                            if isinstance(v, list) and not isinstance(v, SafeList):
                                try: setattr(renpy.config, k, SafeList(v))
                                except Exception: pass
                            elif v is None:
                                try: setattr(renpy.config, k, SafeList(['bottom', 'master', 'transient', 'screens', 'overlay']))
                                except Exception: pass

                    for lname in ['bottom_layers', 'top_layers', 'layers', 'context_clear_layers', 'overlay_layers', 'clear_layers', 'menu_clear_layers', 'sticky_layers', 'hide_layers']:
                        curr_l = getattr(renpy.config, lname, None)
                        if curr_l is None:
                            try: setattr(renpy.config, lname, SafeList(['bottom', 'master', 'transient', 'screens', 'overlay']))
                            except Exception: pass
                        elif not isinstance(curr_l, SafeList):
                            try: setattr(renpy.config, lname, SafeList(curr_l))
                            except Exception: pass

                    cfg_cls = type(renpy.config)
                    _orig_cfg_setattr = getattr(cfg_cls, '__setattr__', None)
                    def _safe_cfg_setattr(self, name, value):
                        if isinstance(value, list) and not isinstance(value, SafeList):
                            value = SafeList(value)
                        if _orig_cfg_setattr:
                            try:
                                _orig_cfg_setattr(self, name, value)
                            except Exception:
                                self.__dict__[name] = value
                        else:
                            self.__dict__[name] = value
                    try:
                        cfg_cls.__setattr__ = _safe_cfg_setattr
                    except Exception:
                        pass
                except Exception: pass

            # 8.5 Dynamic Style Interceptor
            if hasattr(renpy, 'style'):
                try:
                    if hasattr(renpy.style, 'get_style'):
                        _orig_get_style = renpy.style.get_style
                        def _safe_get_style(name, *args, **kwargs):
                            try:
                                return _orig_get_style(name, *args, **kwargs)
                            except Exception:
                                try:
                                    if hasattr(renpy.style, 'Style'):
                                        return renpy.style.Style('default')
                                except Exception:
                                    pass
                                return None
                        renpy.style.get_style = _safe_get_style

                    if hasattr(renpy.style, 'StyleManager'):
                        sm_cls = renpy.style.StyleManager
                        _orig_sm_getattr = getattr(sm_cls, '__getattr__', None)
                        def _safe_sm_getattr(self, name):
                            try:
                                if _orig_sm_getattr:
                                    val = _orig_sm_getattr(self, name)
                                    if val is not None:
                                        return val
                            except Exception:
                                pass
                            try:
                                if hasattr(renpy.style, 'get_style'):
                                    return renpy.style.get_style(name)
                            except Exception:
                                pass
                            return None
                        sm_cls.__getattr__ = _safe_sm_getattr
                except Exception: pass

            # 9. Ren'Py Cheat Telemetry & Remote Control Thread (Port 16005)
            try:
                import threading
                import time
                import json

                _opent_frozen_vars = {}
                _opent_audit_queue = []

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

                        if isinstance(obj, dict):
                            if var_key in obj:
                                try: obj[var_key] = var_val
                                except Exception: pass
                            for sub_k, sub_v in list(obj.items()):
                                if not _is_heavy(sub_k, sub_v):
                                    if isinstance(sub_v, (dict, list, tuple)) or hasattr(sub_v, '__dict__'):
                                        _deep_mutate_var(sub_v, var_key, var_val, visited, depth + 1)

                        elif isinstance(obj, (list, tuple)):
                            for item in list(obj):
                                if hasattr(item, '__dict__'):
                                    if hasattr(item, var_key):
                                        try: setattr(item, var_key, var_val)
                                        except Exception: pass
                                    item_id_val = str(getattr(item, 'id', '') or getattr(item, 'name', '') or getattr(item, 'item_id', '')).lower()
                                    if item_id_val and (item_id_val in var_key.lower() or var_key.lower() in item_id_val):
                                        for attr_name in ('durability', 'dur', 'count', 'qty', 'amount', 'val', 'value', 'level', 'hp', 'mp'):
                                            if hasattr(item, attr_name):
                                                try: setattr(item, attr_name, var_val)
                                                except Exception: pass
                                elif isinstance(item, dict):
                                    if var_key in item:
                                        try: item[var_key] = var_val
                                        except Exception: pass
                                    item_id_val = str(item.get('id') or item.get('name') or item.get('item_id') or '').lower()
                                    if item_id_val and (item_id_val in var_key.lower() or var_key.lower() in item_id_val):
                                        for attr_name in ('durability', 'dur', 'count', 'qty', 'amount', 'val', 'value', 'level', 'hp', 'mp'):
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
                                if not _is_heavy(k_attr, v_attr):
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
                                path = (prefix + '["' + k_str + '"]') if prefix else k_str
                                if isinstance(v, (int, float, str, bool)):
                                    v_type = 'number' if isinstance(v, (int, float)) else ('boolean' if isinstance(v, bool) else 'string')
                                    res.append({'id': path, 'name': path, 'value': _sanitize_val(v), 'type': v_type})
                                elif isinstance(v, (dict, list, tuple)) or hasattr(v, '__dict__'):
                                    res.extend(_scan_nested_vars(v, path, visited, depth + 1))

                        elif isinstance(obj, (list, tuple)):
                            for idx, item in enumerate(list(obj)):
                                if _is_heavy(idx, item):
                                    continue
                                path = (prefix + "[" + str(idx) + "]") if prefix else ("[" + str(idx) + "]")
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

                def _get_path_val(st, path_str):
                    try:
                        return eval("renpy.store." + path_str, globals(), st.__dict__)
                    except Exception:
                        try:
                            return eval(path_str, globals(), st.__dict__)
                        except Exception:
                            return getattr(st, path_str, None)

                def _set_path_val(st, path_str, val):
                    success = False
                    try:
                        exec("renpy.store." + path_str + " = " + repr(val), globals(), st.__dict__)
                        success = True
                    except Exception:
                        pass
                    if not success:
                        try:
                            exec(path_str + " = " + repr(val), globals(), st.__dict__)
                            success = True
                        except Exception:
                            pass
                    if not success:
                        try:
                            setattr(st, path_str, val)
                            st.__dict__[path_str] = val
                        except Exception:
                            pass
                    _deep_mutate_var(st, path_str, val)

                def _force_choice_path(target_label):
                    try:
                        if hasattr(renpy, 'jump'):
                            renpy.jump(target_label)
                        elif hasattr(getattr(renpy, 'exports', None), 'jump'):
                            renpy.exports.jump(target_label)
                    except Exception:
                        pass

                def _opent_python_callback():
                    try:
                        st = getattr(renpy, 'store', None)
                        if st and _opent_frozen_vars:
                            for f_key, f_val in list(_opent_frozen_vars.items()):
                                _set_path_val(st, f_key, f_val)
                    except Exception:
                        pass

                try:
                    if hasattr(renpy, 'config') and hasattr(renpy.config, 'python_callbacks'):
                        if _opent_python_callback not in renpy.config.python_callbacks:
                            renpy.config.python_callbacks.append(_opent_python_callback)
                except Exception:
                    pass

                def _opent_after_load_callback():
                    try:
                        st = getattr(renpy, 'store', None)
                        if st and _opent_frozen_vars:
                            for f_key, f_val in list(_opent_frozen_vars.items()):
                                try:
                                    if hasattr(st, f_key) or '[' in f_key or '.' in f_key:
                                        _set_path_val(st, f_key, f_val)
                                except Exception:
                                    pass
                        if hasattr(renpy, 'restart_interaction'):
                            renpy.restart_interaction()
                    except Exception:
                        pass

                try:
                    if hasattr(renpy, 'config') and hasattr(renpy.config, 'after_load_callbacks'):
                        if _opent_after_load_callback not in renpy.config.after_load_callbacks:
                            renpy.config.after_load_callbacks.append(_opent_after_load_callback)
                except Exception:
                    pass


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

                            current_audit = list(_opent_audit_queue)
                            _opent_audit_queue[:] = []

                            payload = {
                                'engine': 'renpy',
                                'gold': gold_val,
                                'through': getattr(getattr(renpy, 'config', None), 'developer', True),
                                'savedir': str(getattr(getattr(renpy, 'config', None), 'savedir', '') or ''),
                                'save_directory': str(getattr(getattr(renpy, 'config', None), 'save_directory', '') or ''),
                                'actors': [{'idx': 0, 'name': 'Protagonist', 'hp': 999, 'mhp': 999, 'mp': 999, 'mmp': 999, 'level': 1}],
                                'variables': scanned_vars,
                                'switches': [],
                                'audit': current_audit
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

                                                    old_val = getattr(st, var_key, None)
                                                    _set_path_val(st, var_key, var_val)
                                                    new_val = getattr(st, var_key, None)

                                                    # Targeted Audit Log for the specific variable modified by user
                                                    try:
                                                        sys.stderr.write("[Targeted Audit] Var '" + str(var_key) + "' | Prev: " + str(old_val) + " -> Set: " + str(var_val) + " (RAM: " + str(new_val) + ")\n")
                                                        _opent_audit_queue.append({'key': str(var_key), 'old': str(old_val), 'new': str(new_val), 'val': str(var_val)})
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
