init python:
    import sys
    import json

    # Compatibilidade de biblioteca HTTP para Python 2 (Ren'Py 6/7) e Python 3 (Ren'Py 8+)
    PY2 = sys.version_info[0] == 2
    if PY2:
        import urllib2 as urllib_req
        import urllib as urllib_parse
        def encode_str(s):
            if isinstance(s, unicode):
                return s.encode('utf-8')
            return s
    else:
        import urllib.request as urllib_req
        import urllib.parse as urllib_parse
        def encode_str(s):
            return s.encode('utf-8') if isinstance(s, str) else s

    _opent_cache = {}

    def opentranslator_filter(text):
        if not text:
            return text
        clean = text.strip()
        if len(clean) < 1:
            return text
        if clean in _opent_cache:
            return _opent_cache[clean]

        tr = None
        # 1. Tenta tradução via RPC principal (Porta 3000)
        try:
            url = "http://127.0.0.1:3000/api/rpc"
            payload = {
                "method": "translate_realtime",
                "params": {
                    "text": clean,
                    "engine": "renpy"
                }
            }
            data = json.dumps(payload).encode('utf-8')
            req = urllib_req.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'OpenTranslator-RenPy'})
            resp = urllib_req.urlopen(req, timeout=1.0)
            raw = resp.read().decode('utf-8')
            resp.close()
            if raw:
                res_json = json.loads(raw)
                if res_json.get("ok") and "data" in res_json and "translated" in res_json["data"]:
                    candidate = res_json["data"]["translated"]
                    if candidate and candidate.strip():
                        tr = candidate
        except Exception:
            # 2. Fallback via Dual Hook Server HTTP (Porta 16005)
            try:
                fb_url = "http://127.0.0.1:16005/translate?text=" + urllib_parse.quote(encode_str(clean))
                req_fb = urllib_req.Request(fb_url, headers={'User-Agent': 'OpenTranslator-RenPy'})
                resp_fb = urllib_req.urlopen(req_fb, timeout=1.0)
                raw_fb = resp_fb.read().decode('utf-8')
                resp_fb.close()
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

    # Acopla a função de tradução nativa e segura para diálogos e menus
    try:
        config.say_menu_text_filter = opentranslator_filter
    except Exception:
        pass

    try:
        if hasattr(config, 'say_thought_text_filter'):
            config.say_thought_text_filter = opentranslator_filter
    except Exception:
        pass
