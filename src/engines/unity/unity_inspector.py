import os
import sys
import json
import glob

# Ensure UnityPy in resources/unity/site-packages is accessible
site_pkg = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../resources/unity/site-packages'))
if os.path.exists(site_pkg) and site_pkg not in sys.path:
    sys.path.insert(0, site_pkg)

try:
    import UnityPy
    UNITYPY_AVAILABLE = True
except Exception as e:
    UNITYPY_AVAILABLE = False
    UNITYPY_ERROR = str(e)

def inspect_unity_game(game_dir):
    report = {
        "gameDir": game_dir,
        "unityPyAvailable": UNITYPY_AVAILABLE,
        "textSources": [],
        "textAssetsFound": 0,
        "monoBehavioursWithText": 0,
        "stringTablesFound": 0,
        "looseTextFiles": [],
        "autoTranslatorDictionaries": [],
        "streamingAssetsFiles": [],
        "serializedAssetFiles": [],
        "managedAssemblies": [],
        "il2cppMetadata": None
    }

    if not os.path.exists(game_dir):
        report["error"] = "Game directory does not exist"
        return report

    # 1. Check for data folder
    entries = os.listdir(game_dir)
    data_dir_name = None
    for e in entries:
        if e.lower().endswith("_data") and os.path.isdir(os.path.join(game_dir, e)):
            data_dir_name = e
            break

    data_dir = os.path.join(game_dir, data_dir_name) if data_dir_name else None

    # 2. Check IL2CPP metadata
    if data_dir:
        meta_path = os.path.join(data_dir, "il2cpp_data", "Metadata", "global-metadata.dat")
        if os.path.exists(meta_path):
            report["il2cppMetadata"] = {
                "path": meta_path,
                "sizeBytes": os.path.getsize(meta_path)
            }
            report["textSources"].append("IL2CPP Compiled Metadata")

    # 3. Check Managed assemblies
    if data_dir:
        managed_dir = os.path.join(data_dir, "Managed")
        if os.path.exists(managed_dir):
            dlls = [f for f in os.listdir(managed_dir) if f.lower().endswith(".dll")]
            report["managedAssemblies"] = dlls[:20]
            report["managedAssembliesCount"] = len(dlls)
            report["textSources"].append(f"Mono Managed Assemblies ({len(dlls)} DLLs)")

    # 4. Check AutoTranslator dictionaries
    at_dir = os.path.join(game_dir, "AutoTranslator", "Translation")
    if os.path.exists(at_dir):
        for root, _, files in os.walk(at_dir):
            for f in files:
                if f.endswith(".txt"):
                    rel = os.path.relpath(os.path.join(root, f), game_dir)
                    report["autoTranslatorDictionaries"].append(rel)
        if report["autoTranslatorDictionaries"]:
            report["textSources"].append(f"AutoTranslator Dictionaries ({len(report['autoTranslatorDictionaries'])} files)")

    # 5. Check loose text files in root
    for f in entries:
        if f.lower().endswith((".txt", ".csv", ".json", ".tsv")):
            report["looseTextFiles"].append(f)
    if report["looseTextFiles"]:
        report["textSources"].append(f"Loose Text Files ({len(report['looseTextFiles'])} files)")

    # 6. Check StreamingAssets
    if data_dir:
        sa_dir = os.path.join(data_dir, "StreamingAssets")
        if os.path.exists(sa_dir):
            for root, _, files in os.walk(sa_dir):
                for f in files:
                    rel = os.path.relpath(os.path.join(root, f), sa_dir)
                    report["streamingAssetsFiles"].append(rel)
            if report["streamingAssetsFiles"]:
                report["textSources"].append(f"StreamingAssets ({len(report['streamingAssetsFiles'])} files)")

    # 7. Check Serialized Assets (.assets, resources.assets, globalgamemanagers)
    if data_dir:
        for f in os.listdir(data_dir):
            if f.endswith((".assets", ".resource", ".resS")) or f.startswith("globalgamemanagers"):
                p = os.path.join(data_dir, f)
                report["serializedAssetFiles"].append({
                    "name": f,
                    "sizeBytes": os.path.getsize(p)
                })

    # 8. Use UnityPy to inspect assets if available
    if UNITYPY_AVAILABLE and data_dir:
        assets_to_inspect = []
        for f in ["resources.assets", "globalgamemanagers.assets", "globalgamemanagers", "sharedassets0.assets"]:
            p = os.path.join(data_dir, f)
            if os.path.exists(p):
                assets_to_inspect.append(p)

        text_assets_sample = []
        for asset_path in assets_to_inspect:
            try:
                env = UnityPy.load(asset_path)
                for obj in env.objects:
                    t_name = getattr(obj.type, "name", str(obj.type))
                    if t_name == "TextAsset":
                        report["textAssetsFound"] += 1
                        try:
                            data = obj.read()
                            name = getattr(data, "name", "unnamed")
                            text_assets_sample.append({
                                "asset": os.path.basename(asset_path),
                                "name": name,
                                "size": len(getattr(data, "script", b"") or b"")
                            })
                        except Exception:
                            pass
                    elif t_name == "MonoBehaviour":
                        report["monoBehavioursWithText"] += 1
            except Exception as e:
                report[f"error_{os.path.basename(asset_path)}"] = str(e)

        if report["textAssetsFound"] > 0:
            report["textSources"].append(f"Serialized TextAssets ({report['textAssetsFound']} found in sampled assets)")
        report["textAssetsSample"] = text_assets_sample[:10]

    return report

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    res = inspect_unity_game(target)
    print(json.dumps(res, indent=2))
