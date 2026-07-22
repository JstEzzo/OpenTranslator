init -9999 python:
    import sys
    import json

    PY2 = sys.version_info[0] == 2

    if PY2:
        import urllib2
        import urllib
        def fetch_url(url):
            req = urllib2.Request(url)
            req.add_header('User-Agent', 'OpenTranslator-RenPy')
            resp = urllib2.urlopen(req, timeout=1.5)
            data = resp.read()
            resp.close()
            return data.decode('utf-8')
        def quote_str(s):
            if isinstance(s, unicode):
                s = s.encode('utf-8')
            return urllib.quote(s)
    else:
        import urllib.request
        import urllib.parse
        def fetch_url(url):
            req = urllib.request.Request(url, headers={'User-Agent': 'OpenTranslator-RenPy'})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                return resp.read().decode('utf-8')
        def quote_str(s):
            return urllib.parse.quote(s.encode('utf-8') if isinstance(s, str) else s)

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
            q = quote_str(clean)
            url = "http://127.0.0.1:16005/translate?text=" + q
            raw = fetch_url(url)
            if raw:
                res = json.loads(raw)
                tr = res.get("translated") or res.get("text")
                if tr:
                    _opent_cache[clean] = tr
                    return tr
        except Exception:
            pass

        return text

    if hasattr(config, 'say_menu_text_filter'):
        old_filter = config.say_menu_text_filter
        def opent_text_filter(text):
            if old_filter:
                text = old_filter(text)
            return opent_translate(text)
        config.say_menu_text_filter = opent_text_filter
