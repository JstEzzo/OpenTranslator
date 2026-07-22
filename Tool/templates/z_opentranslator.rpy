init python:
    import sys
    import json

    PY2 = sys.version_info[0] == 2

    if PY2:
        import urllib2
        import urllib
        def post_rpc_fast(payload_str):
            req = urllib2.Request("http://127.0.0.1:3000/api/rpc", data=payload_str)
            req.add_header('Content-Type', 'application/json')
            req.add_header('User-Agent', 'OpenTranslator-RenPy')
            resp = urllib2.urlopen(req, timeout=1.2)
            data = resp.read()
            resp.close()
            return data.decode('utf-8')
        def fetch_fallback_fast(clean_encoded):
            url = "http://127.0.0.1:16005/translate?text=" + urllib.quote(clean_encoded)
            req = urllib2.Request(url)
            req.add_header('User-Agent', 'OpenTranslator-RenPy')
            resp = urllib2.urlopen(req, timeout=1.2)
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
        def post_rpc_fast(payload_str):
            req = urllib.request.Request("http://127.0.0.1:3000/api/rpc", data=payload_str.encode('utf-8'), headers={'Content-Type': 'application/json', 'User-Agent': 'OpenTranslator-RenPy'})
            with urllib.request.urlopen(req, timeout=1.2) as resp:
                return resp.read().decode('utf-8')
        def fetch_fallback_fast(clean_encoded):
            url = "http://127.0.0.1:16005/translate?text=" + urllib.parse.quote(clean_encoded)
            req = urllib.request.Request(url, headers={'User-Agent': 'OpenTranslator-RenPy'})
            with urllib.request.urlopen(req, timeout=1.2) as resp:
                return resp.read().decode('utf-8')
        def encode_utf8(s):
            return s.encode('utf-8') if isinstance(s, str) else s

    _opent_cache = {}

    def opent_translate(text):
        if not text:
            return text
        clean = text.strip()
        if len(clean) < 1 or clean.startswith("[") or clean.startswith("{"):
            if not clean or len(clean) < 1:
                return text
        if clean in _opent_cache:
            return _opent_cache[clean]

        tr = None
        try:
            payload = {
                "method": "translate_realtime",
                "params": {
                    "text": clean,
                    "engine": "renpy"
                }
            }
            raw = post_rpc_fast(json.dumps(payload))
            if raw:
                res = json.loads(raw)
                if res.get("ok") and "data" in res and "translated" in res["data"]:
                    candidate = res["data"]["translated"]
                    if candidate and candidate.strip():
                        tr = candidate
        except Exception:
            try:
                raw_fb = fetch_fallback_fast(encode_utf8(clean))
                if raw_fb:
                    res_fb = json.loads(raw_fb)
                    candidate_fb = res_fb.get("translated") or res_fb.get("text")
                    if candidate_fb and candidate_fb.strip():
                        tr = candidate_fb
            except Exception:
                pass

        if tr:
            _opent_cache[clean] = tr
            try:
                if hasattr(renpy, 'translation') and hasattr(renpy.translation, 'string_translators'):
                    st = renpy.translation.string_translators
                    if '' in st:
                        st[''][clean] = tr
                    elif None in st:
                        st[None][clean] = tr
            except Exception:
                pass
            return tr
        else:
            _opent_cache[clean] = clean
            return clean

    # HOOK UNIVERSAL 1: Intercepta a interpolação de strings do Ren'Py (renpy.substitute)
    try:
        if hasattr(renpy, 'substitute'):
            _old_substitute = renpy.substitute
            def _opent_substitute(s, scope=None, force=False):
                res = _old_substitute(s, scope, force)
                if isinstance(res, (str, unicode if PY2 else str)):
                    return opent_translate(res)
                return res
            renpy.substitute = _opent_substitute
    except Exception:
        pass

    # HOOK UNIVERSAL 2: Intercepta o tradutor interno de strings (renpy.translation.translate_string)
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

    # HOOK UNIVERSAL 3: Intercepta o filtro de menus e caixas de diálogos
    try:
        old_filter = getattr(config, 'say_menu_text_filter', None)
        def opent_text_filter(text):
            if old_filter:
                text = old_filter(text)
            return opent_translate(text)
        config.say_menu_text_filter = opent_text_filter
    except Exception:
        pass
