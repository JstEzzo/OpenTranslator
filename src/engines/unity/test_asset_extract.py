import sys
import os
import json

site_pkg = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../resources/unity/site-packages'))
if os.path.exists(site_pkg):
    sys.path.insert(0, site_pkg)

import UnityPy

game_dir = sys.argv[1] if len(sys.argv) > 1 else "."
data_dir = None
for e in os.listdir(game_dir):
    if e.lower().endswith("_data") and os.path.isdir(os.path.join(game_dir, e)):
        data_dir = os.path.join(game_dir, e)
        break

extracted = []
if data_dir:
    for f in os.listdir(data_dir):
        if f.endswith(".assets"):
            p = os.path.join(data_dir, f)
            try:
                env = UnityPy.load(p)
                for obj in env.objects:
                    if getattr(obj.type, "name", "") == "TextAsset":
                        data = obj.read()
                        script_bytes = getattr(data, "script", b"")
                        if isinstance(script_bytes, bytes):
                            text = script_bytes.decode("utf-8", errors="ignore")
                        else:
                            text = str(script_bytes)
                        if text and len(text.strip()) > 3:
                            extracted.append({
                                "asset": f,
                                "name": getattr(data, "name", "unnamed"),
                                "preview": text.strip()[:100],
                                "length": len(text)
                            })
            except Exception as e:
                pass

print(json.dumps(extracted[:15], indent=2))
