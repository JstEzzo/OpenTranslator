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
