/**
 * OpenTranslator — EngineRegistry
 * Registro e resolução de adaptadores de engine.
 * Suporta todas as engines da plataforma:
 * Ren'Py, RPG Maker, Unity, Unreal, Godot, GameMaker, Construct 3,
 * Defold, Cocos Creator, Cocos2d-x, Wolf RPG, GDevelop, Electron e Generic.
 */

class EngineRegistry {
  constructor() {
    this.adapters = new Map();
  }

  register(adapter) {
    if (!adapter || !adapter.id) {
      throw new Error("Adapter inválido ou sem propriedade 'id'.");
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(engineId) {
    return this.adapters.get(engineId) || null;
  }

  getAll() {
    return Array.from(this.adapters.values());
  }

  resolveAdapter(detectionResult) {
    if (!detectionResult) return this.adapters.get("generic") || null;
    const engineId = detectionResult.engine;
    if (this.adapters.has(engineId)) {
      return this.adapters.get(engineId);
    }

    if (engineId === "mz" || engineId === "mv" || engineId === "rgss") {
      if (this.adapters.has("rpgmaker")) return this.adapters.get("rpgmaker");
      if (this.adapters.has("mv")) return this.adapters.get("mv");
      if (this.adapters.has("mz")) return this.adapters.get("mz");
    }

    if (engineId === "renpy" || engineId === "python" || engineId === "REN_PY") {
      if (this.adapters.has("renpy")) return this.adapters.get("renpy");
    }

    if (engineId === "krkrz" && this.adapters.has("krkr")) {
      return this.adapters.get("krkr");
    }

    if (engineId === "cocos" && this.adapters.has("cocos_creator")) {
      return this.adapters.get("cocos_creator");
    }

    return this.adapters.get("generic") || null;
  }
}

const defaultRegistry = new EngineRegistry();

const RenpyAdapter = require('../engines/renpy/renpyAdapter');
const RpgMakerAdapter = require('../engines/rpgmaker/rpgMakerAdapter');
const UnityAdapter = require('../engines/unity/unityAdapter');
const UnrealAdapter = require('../engines/unreal/unrealAdapter');
const GodotAdapter = require('../engines/godot/godotAdapter');
const GameMakerAdapter = require('../engines/gamemaker/gameMakerAdapter');
const ConstructAdapter = require('../engines/construct/constructAdapter');
const DefoldAdapter = require('../engines/defold/defoldAdapter');
const CocosCreatorAdapter = require('../engines/cocos/cocosCreatorAdapter');
const Cocos2dxAdapter = require('../engines/cocos/cocos2dxAdapter');
const WolfAdapter = require('../engines/wolf/wolfAdapter');
const RgssAdapter = require('../engines/rpgmaker/rgssAdapter');
const GDevelopAdapter = require('../engines/gdevelop/gdevelopAdapter');
const ElectronAdapter = require('../engines/electron/electronAdapter');
const GenericAdapter = require('../engines/generic/genericAdapter');

defaultRegistry.register(new RenpyAdapter());
defaultRegistry.register(new RpgMakerAdapter());
defaultRegistry.register(new RgssAdapter());
defaultRegistry.register(new UnityAdapter());
defaultRegistry.register(new UnrealAdapter());
defaultRegistry.register(new GodotAdapter());
defaultRegistry.register(new GameMakerAdapter());
defaultRegistry.register(new ConstructAdapter());
defaultRegistry.register(new DefoldAdapter());
defaultRegistry.register(new CocosCreatorAdapter());
defaultRegistry.register(new Cocos2dxAdapter());
defaultRegistry.register(new WolfAdapter());
defaultRegistry.register(new GDevelopAdapter());
defaultRegistry.register(new ElectronAdapter());
defaultRegistry.register(new GenericAdapter());

module.exports = defaultRegistry;
module.exports.EngineRegistry = EngineRegistry;
