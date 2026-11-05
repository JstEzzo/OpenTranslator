# Local Portuguese translation

OpenTranslator offers `Local translation · Offline` as an optional translation provider. Game text stays on the computer. This provider currently supports English and Japanese source text and Portuguese output; the installed English model supports Brazilian Portuguese, while the Japanese model produces general Portuguese. Machine translation still requires review.

## Installation and configuration

Install Python, CTranslate2, Transformers, SentencePiece and the chosen Marian models separately. Convert the models using the official CTranslate2 converter. Model weights and Python dependencies are not included in the portable application. CUDA is optional and requires compatible NVIDIA runtime libraries; CPU inference is supported.

Create `data/local-translation.json` on the destination computer. All paths must refer to that computer. Do not commit this file or translation caches.

```json
{
  "python": "C:/Python/python.exe",
  "device": "cpu",
  "threads": 6,
  "cacheDirectory": "C:/OpenTranslator/data/local-translation-cache",
  "models": {
    "en": {
      "source": "C:/Models/english-portuguese-tokenizer",
      "converted": "C:/Models/english-portuguese-ctranslate2",
      "revision": "EXACT_MODEL_REVISION",
      "prefix": ">>pob<< "
    }
  }
}
```

Optional `dllDirectories` lists process-local CUDA library directories. Optional `languageDetectionDirectory` points to an installed `langid` package for preserving existing Portuguese text. Add a `ja` model with the same fields and the language prefix required by its model card. Use only a prefix actually supported by the selected model.

Select the local provider in Settings. Missing configuration or models produces an error; it does not silently send text to an online provider. Local caches contain game text and must be treated as private data. They are keyed by model revision, language and source text. Unsupported languages, oversized inputs and invalid output remain pending.

## RPG Maker MV/MZ dialogue

The structured extractor joins consecutive dialogue commands into one message for translation. Application preserves the original command count, positions and event logic. A backed-up plugin measures rendered words and wraps dialogue within the message window. It applies only to the standard message window; custom plugin windows, image text and dynamically generated dialogue require separate verification.

Internal language markers such as `>>pob<<` are encoder metadata. They must never appear in translated game files. Quality checks reject leaked markers, repeated model output and damaged placeholders before application. A translated file count is not proof that an entire game is translated or playable.

## Model sources and licenses

- [Helsinki-NLP English–Portuguese model](https://huggingface.co/Helsinki-NLP/opus-mt-tc-big-en-pt): CC BY 4.0; preserve attribution when distributing weights.
- [Helsinki-NLP Japanese–Portuguese model](https://huggingface.co/Helsinki-NLP/opus-mt-ja-pt): Apache 2.0; follow the model license when distributing weights.
- [CTranslate2 installation](https://opennmt.net/CTranslate2/installation.html) and [Transformers conversion](https://opennmt.net/CTranslate2/guides/transformers).

## Experimental Unity native table worker

`resources/unity/native_localization_worker.py` supports an explicit schema: English columns in `StringData`, `Random000` and `Topic000`, plus native `m_text`/`m_Text` UI values. The three table columns use canonical UTF-8 Base64 storage; they are decoded before translation and encoded again before writing. Plain-text tables with those names are rejected rather than guessed. This worker is not the default Unity UI path. It requires UnityPy and its optional TypeTreeGeneratorAPI dependency, the game assemblies, and a separately prepared translation payload.

Always create a verified backup before invoking apply. The worker reconstructs type trees without executing game code, stages the modified bundle, reopens it, compares complete changed objects and verifies raw bytes of every unrelated object. Native gameplay, language selection and font coverage require later testing. Unreadable objects remain outside its coverage.

## Cocos Creator web builds inside Electron

OpenTranslator detects a Cocos web build under `resources/app/game` before treating the application as a generic Electron wrapper. It reads explicit `Glanguage`/`Gwords` localization maps and visible label/confirmation literals from compiled JavaScript without executing game code. It also reads `cc.Label` and `cc.RichText` fields from standard JSON and Cocos 2.4 compiled files and packs. Asset names, UUIDs, masks and object references are preserved.

When the build declares the supported signature/XOR resource encoding through its local downloader configuration, resources are decoded for translation and saved with the same encoding. Other encodings and serialization layouts require additional adapters. Text baked into pictures is outside this extraction. Backups are verified before the application writes files. Localization-map translations populate existing language columns so the translated text is active even if an older language preference is selected.

Chinese labels can use a local Chinese-to-English model followed by the local English-to-Portuguese model. Add a `zh` entry to `data/local-translation.json` with tokenizer/model paths, pinned revision, an empty prefix if required by the model, and `"outputLanguage": "en"`. Both stages run locally; their caches are separated by target language. Missing Chinese models and unresolved pivot output remain explicit errors or pending entries; Japanese is not used as a replacement for explicitly Chinese input.

Cutscene JsonAssets with the explicit `cgList[].chips[].words[].str` schema are also extracted. A four-string language array uses its English entry as the translation source, falling back to Chinese when the English entry contains only punctuation. Application checks every original language slot and updates all four slots together. Animation paths, speaker identifiers, voice files and other metadata are preserved. This schema is separate from UI labels: complete UI-label coverage does not prove that story scenes have been translated.

The packed-field interpretation follows the [Cocos 2.x deserializer](https://github.com/cocos/cocos-engine/blob/0a3c0330bb4e432b5923c39793a7bfdf23691923/cocos2d/core/platform/deserialize-compiled.ts). This does not imply compatibility with every Cocos version or every custom game loader.
