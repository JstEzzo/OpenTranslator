init python:
    import sys
    import json

    PY2 = sys.version_info[0] == 2

    if PY2:
        import urllib2
        import urllib
        def post_rpc(payload_str):
            req = urllib2.Request("http://127.0.0.1:3000/api/rpc", data=payload_str)
            req.add_header('Content-Type', 'application/json')
            req.add_header('User-Agent', 'OpenTranslator-RenPy')
            resp = urllib2.urlopen(req, timeout=3.0)
            data = resp.read()
            resp.close()
            return data.decode('utf-8')
        def fetch_fallback(clean_encoded):
            url = "http://127.0.0.1:16005/translate?text=" + urllib.quote(clean_encoded)
            req = urllib2.Request(url)
            req.add_header('User-Agent', 'OpenTranslator-RenPy')
            resp = urllib2.urlopen(req, timeout=3.0)
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
        def post_rpc(payload_str):
            req = urllib.request.Request("http://127.0.0.1:3000/api/rpc", data=payload_str.encode('utf-8'), headers={'Content-Type': 'application/json', 'User-Agent': 'OpenTranslator-RenPy'})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                return resp.read().decode('utf-8')
        def fetch_fallback(clean_encoded):
            url = "http://127.0.0.1:16005/translate?text=" + urllib.parse.quote(clean_encoded)
            req = urllib.request.Request(url, headers={'User-Agent': 'OpenTranslator-RenPy'})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                return resp.read().decode('utf-8')
        def encode_utf8(s):
            return s.encode('utf-8') if isinstance(s, str) else s

    _opent_cache = {}

    def opent_translate(text):
        if not text:
            return text
        clean = text.strip()
        if len(clean) < 1:
            return text
        if clean in _opent_cache:
            return _opent_cache[clean]

        try:
            payload = {
                "method": "translate_realtime",
                "params": {
                    "text": clean,
                    "engine": "renpy"
                }
            }
            raw = post_rpc(json.dumps(payload))
            if raw:
                res = json.loads(raw)
                if res.get("ok") and "data" in res and "translated" in res["data"]:
                    tr = res["data"]["translated"]
                    if tr and len(tr) > 0:
                        _opent_cache[clean] = tr
                        return tr
        except Exception:
            try:
                raw_fb = fetch_fallback(encode_utf8(clean))
                if raw_fb:
                    res_fb = json.loads(raw_fb)
                    tr_fb = res_fb.get("translated") or res_fb.get("text")
                    if tr_fb and len(tr_fb) > 0:
                        _opent_cache[clean] = tr_fb
                        return tr_fb
            except Exception:
                pass

        return text

    # HOOK 1: Replace Text Universal Seguro (Renderização Visual de Textos)
    try:
        old_replace_text = getattr(config, 'replace_text', None)
        def opent_replace_text_hook(s):
            if old_replace_text:
                s = old_replace_text(s)
            return opent_translate(s)
        config.replace_text = opent_replace_text_hook
    except Exception:
        pass

    # HOOK 2: Say Menu Text Filter Seguro (Diálogos e Menus)
    try:
        old_filter = getattr(config, 'say_menu_text_filter', None)
        def opent_text_filter(text):
            if old_filter:
                text = old_filter(text)
            return opent_translate(text)
        config.say_menu_text_filter = opent_text_filter
    except Exception:
        pass

    # HOOK 3: Say Thought Text Filter Seguro (Pensamentos)
    try:
        old_thought_filter = getattr(config, 'say_thought_text_filter', None)
        def opent_thought_filter(text):
            if old_thought_filter:
                text = old_thought_filter(text)
            return opent_translate(text)
        config.say_thought_text_filter = opent_thought_filter
    except Exception:
        pass
