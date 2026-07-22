init python:
    import sys
    import json

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
    _opent_extracted = {}

    def _save_extracted_file():
        try:
            import renpy
            import os
            game_dir = renpy.config.gamedir
            if game_dir:
                out_path = os.path.join(game_dir, "opent_extracted.json")
                with open(out_path, "w") as f:
                    json.dump(_opent_extracted, f, indent=2)
        except Exception:
            pass

    def opentranslator_filter(text):
        if not text:
            return text
        clean = text.strip()
        if len(clean) < 1:
            return text

        tr = None
        if clean in _opent_cache:
            tr = _opent_cache[clean]
        else:
            try:
                url = "http://127.0.0.1:3000/api/rpc"
                payload = {"method": "translate_realtime", "params": {"text": clean, "engine": "renpy"}}
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
                pass

            if tr:
                _opent_cache[clean] = tr
            else:
                _opent_cache[clean] = clean
                tr = clean

        if clean not in _opent_extracted:
            _opent_extracted[clean] = tr
            _save_extracted_file()

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

    # 1. Filtro de Diálogos e Menus
    try:
        config.say_menu_text_filter = opentranslator_filter
    except Exception:
        pass

    # 2. Filtro Universal de Renderização de Textos de Telas e Botões
    try:
        _old_replace_text = getattr(config, 'replace_text', None)
        def opent_replace_text_hook(s):
            if _old_replace_text:
                s = _old_replace_text(s)
            return opentranslator_filter(s)
        config.replace_text = opent_replace_text_hook
    except Exception:
        pass
