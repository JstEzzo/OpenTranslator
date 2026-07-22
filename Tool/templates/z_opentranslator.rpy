init python:
    import sys
    import json
    import threading

    PY2 = sys.version_info[0] == 2

    if PY2:
        import urllib2
        import urllib
        def post_rpc_raw(payload_str):
            req = urllib2.Request("http://127.0.0.1:3000/api/rpc", data=payload_str)
            req.add_header('Content-Type', 'application/json')
            req.add_header('User-Agent', 'OpenTranslator-RenPy')
            resp = urllib2.urlopen(req, timeout=2.0)
            data = resp.read()
            resp.close()
            return data.decode('utf-8')
        def fetch_fallback_raw(clean_encoded):
            url = "http://127.0.0.1:16005/translate?text=" + urllib.quote(clean_encoded)
            req = urllib2.Request(url)
            req.add_header('User-Agent', 'OpenTranslator-RenPy')
            resp = urllib2.urlopen(req, timeout=2.0)
            data = resp.read()
            resp.close()
            return data.decode('utf-8')
        def encode_utf8(s):
            if isinstance(s, unicode):
                return s.encode('utf-8')
            return s
    else:
        import urllib.request
        import urllib.parse
        def post_rpc_raw(payload_str):
            req = urllib.request.Request("http://127.0.0.1:3000/api/rpc", data=payload_str.encode('utf-8'), headers={'Content-Type': 'application/json', 'User-Agent': 'OpenTranslator-RenPy'})
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                return resp.read().decode('utf-8')
        def fetch_fallback_raw(clean_encoded):
            url = "http://127.0.0.1:16005/translate?text=" + urllib.parse.quote(clean_encoded)
            req = urllib.request.Request(url, headers={'User-Agent': 'OpenTranslator-RenPy'})
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                return resp.read().decode('utf-8')
        def encode_utf8(s):
            return s.encode('utf-8') if isinstance(s, str) else s

    _opent_cache = {}
    _opent_pending = set()
    _opent_lock = threading.Lock()

    def _fetch_translation_worker(clean):
        tr = None
        for attempt in range(2):
            try:
                payload = {
                    "method": "translate_realtime",
                    "params": {
                        "text": clean,
                        "engine": "renpy"
                    }
                }
                raw = post_rpc_raw(json.dumps(payload))
                if raw:
                    res = json.loads(raw)
                    if res.get("ok") and "data" in res and "translated" in res["data"]:
                        candidate = res["data"]["translated"]
                        if candidate and candidate.strip():
                            tr = candidate
                            break
            except Exception:
                try:
                    raw_fb = fetch_fallback_raw(encode_utf8(clean))
                    if raw_fb:
                        res_fb = json.loads(raw_fb)
                        candidate_fb = res_fb.get("translated") or res_fb.get("text")
                        if candidate_fb and candidate_fb.strip():
                            tr = candidate_fb
                            break
                except Exception:
                    pass

        with _opent_lock:
            if tr:
                _opent_cache[clean] = tr
            else:
                _opent_cache[clean] = clean
            if clean in _opent_pending:
                _opent_pending.remove(clean)

        try:
            if hasattr(renpy, 'restart_interaction'):
                renpy.restart_interaction()
        except Exception:
            pass

    def opent_translate(text):
        if not text:
            return text
        clean = text.strip()
        if len(clean) < 1:
            return text

        with _opent_lock:
            if clean in _opent_cache:
                return _opent_cache[clean]
            if clean in _opent_pending:
                return text
            _opent_pending.add(clean)

        t = threading.Thread(target=_fetch_translation_worker, args=(clean,))
        t.daemon = True
        t.start()

        return text

    # HOOK CENTRAL: Modifica a função de tradução de strings oficial do motor Ren'Py
    try:
        if hasattr(renpy, 'translation') and hasattr(renpy.translation, 'translate_string'):
            _old_translate_string = renpy.translation.translate_string
            def _opent_translate_string(s, language=None):
                res = _old_translate_string(s, language)
                if res and res != s:
                    return res
                return opent_translate(s)
            renpy.translation.translate_string = _opent_translate_string
    except Exception:
        pass

    # HOOK AUXILIAR: Intercepta substituição de textos em telas
    try:
        old_replace_text = getattr(config, 'replace_text', None)
        def opent_replace_text_hook(s):
            if old_replace_text:
                s = old_replace_text(s)
            return opent_translate(s)
        config.replace_text = opent_replace_text_hook
    except Exception:
        pass

    # HOOK AUXILIAR: Intercepta menus de escolhas
    try:
        old_filter = getattr(config, 'say_menu_text_filter', None)
        def opent_text_filter(text):
            if old_filter:
                text = old_filter(text)
            return opent_translate(text)
        config.say_menu_text_filter = opent_text_filter
    except Exception:
        pass
