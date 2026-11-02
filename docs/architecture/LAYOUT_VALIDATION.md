# Text layout validation

Translation can change text length and wrapping. Character-count heuristics can identify risks but do not prove that text fits the actual rendered game window.

Separate textual validation, wrap/shrink recommendations, and an engine-specific font/layout change. Preserve variables, escape sequences, rich-text tags, newlines, and bidirectional text requirements. Glyph shaping and pixel layout require runtime/visual testing.

Claims about expansion percentages, automatic TMP resizing, or RenPy GUI changes need a source or reproducible implementation test. Validate long menus, dialogue, choices, dynamic values, and supported display sizes in the specific game.
