#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenTranslator - Ferramenta de Tradução em Lote Genérica
Integrado ao projeto OpenTranslator (Google Translate Engine sem API Paga)
"""

import os
import re
import sys
import json
import time
import random
import argparse
import requests
import pickle
import zlib
import io
from glob import glob
from shutil import rmtree
from signal import signal, SIGINT, SIG_IGN
from tqdm import tqdm
from colorama import Fore, Style, init

init(autoreset=True)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

DEFAULT_CACHE_FILE = "translation_cache.json"


KNOWN_FILE_EXTENSIONS = {
    ".txt", ".exe", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tga",
    ".ogg", ".wav", ".mp3", ".flac", ".aac", ".m4a", ".opus",
    ".ttf", ".otf", ".woff", ".woff2", ".css", ".js", ".html", ".htm",
    ".rpy", ".rpyc", ".rpym", ".rpymc", ".py", ".pyc", ".pyo",
    ".zip", ".rpa", ".rar", ".7z", ".gz", ".tar", ".bat", ".ps1",
    ".dll", ".so", ".dylib", ".bin", ".dat", ".save", ".log", ".json"
}


def is_filename_or_path(s):
    if not s or not isinstance(s, str):
        return False
    s_clean = s.strip().lower()
    if ' ' not in s_clean:
        for ext in KNOWN_FILE_EXTENSIONS:
            if s_clean.endswith(ext):
                return True
        if '/' in s_clean or '\\' in s_clean:
            return True
    return False


def protect_renpy_tags(text):
    """
    Protege variaveis interpoladas e tags do Ren'Py ([var], {tag}, %(var)s) antes de enviar para traducao.
    """
    if not text:
        return text, {}
    placeholders = {}
    pattern = re.compile(r'(\[.*?\]|\{.*?\}|%\(.*?\)[s|d|f])')

    def _replace(match):
        idx = len(placeholders)
        ph = f"__RPY_VAR_{idx}__"
        placeholders[ph] = match.group(0)
        return ph

    protected_text = pattern.sub(_replace, text)
    return protected_text, placeholders


def restore_renpy_tags(translated_text, placeholders):
    """
    Restaura as variaveis e tags originais do Ren'Py exatamente como eram.
    """
    if not translated_text or not placeholders:
        return translated_text
    result = translated_text
    for ph, orig in placeholders.items():
        result = result.replace(ph, orig)
    return result


def confirm(text):
    result = input("{}\n{}[y]es{}/{}[n]o{}: ".format(
        text, Fore.GREEN, Style.RESET_ALL, Fore.RED, Style.RESET_ALL
    )).lower()
    return result in ["y", "yes"]


def check_output(output_dir, auto_confirm=False):
    os.makedirs(output_dir, exist_ok=True)


class OpenTranslatorGoogleEngine:
    """Motor de tradução gratuito do Google Translate (OpenTranslator GTX Engine)"""

    def __init__(self, source_lang="auto", target_lang="pt", timeout=10, max_retries=3):
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.timeout = timeout
        self.max_retries = max_retries
        self.base_url = "https://translate.googleapis.com/translate_a/single"
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
        }

    def translate_single(self, text, target_lang=None, source_lang=None):
        if not text or not text.strip():
            return text

        sl = source_lang or self.source_lang
        tl = target_lang or self.target_lang

        params = {
            "client": "gtx",
            "sl": sl,
            "tl": tl,
            "dt": "t",
            "q": text,
        }

        for attempt in range(self.max_retries + 1):
            try:
                response = requests.get(
                    self.base_url,
                    params=params,
                    headers=self.headers,
                    timeout=self.timeout,
                )
                if response.status_code == 200:
                    data = response.json()
                    if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                        parts = [
                            part[0] for part in data[0]
                            if part and isinstance(part, list) and len(part) > 0 and part[0]
                        ]
                        return "".join(parts)
                elif response.status_code == 429:
                    # Delay em caso de Rate Limit
                    time.sleep((attempt + 1) * 1.5 + random.uniform(0.2, 0.8))
            except Exception as e:
                time.sleep((attempt + 1) * 0.5)

        return text

    def translate_batch(self, text_list, target_lang=None, source_lang=None):
        if not text_list:
            return []

        sl = source_lang or self.source_lang
        tl = target_lang or self.target_lang
        results = [None] * len(text_list)

        batches = []
        current_batch = []
        current_len = 0

        for idx, text in enumerate(text_list):
            if not text or not text.strip():
                results[idx] = text
                continue

            t_len = len(text)
            if current_len + t_len > 3500 and current_batch:
                batches.append(current_batch)
                current_batch = []
                current_len = 0

            current_batch.append((idx, text))
            current_len += t_len

        if current_batch:
            batches.append(current_batch)

        total_b = len(batches)
        completed_b = 0
        import threading
        lock = threading.Lock()

        def _process_batch(batch):
            nonlocal completed_b
            indices, raw_texts = zip(*batch)
            protected_texts = []
            escapes_list = []
            for t in raw_texts:
                prot, esc_tokens = extract_renpy_escapes(t)
                protected_texts.append(prot)
                escapes_list.append(esc_tokens)

            combined_text = "\n".join(protected_texts)
            translated_combined = self.translate_single(combined_text, target_lang=tl, source_lang=sl)
            translated_lines = translated_combined.split("\n")

            if len(translated_lines) == len(raw_texts):
                for i, t_line, esc_tokens in zip(indices, translated_lines, escapes_list):
                    results[i] = restore_renpy_escapes(t_line, esc_tokens)
            else:
                for i, orig, esc_tokens in zip(indices, raw_texts, escapes_list):
                    prot = protected_texts[raw_texts.index(orig)]
                    t_raw = self.translate_single(prot, target_lang=tl, source_lang=sl)
                    results[i] = restore_renpy_escapes(t_raw, esc_tokens)

            with lock:
                completed_b += 1
                if total_b > 20 and (completed_b % 20 == 0 or completed_b == total_b):
                    pct = int((completed_b / total_b) * 100)
                    print(f"   ↳ [Lote Progresso] {completed_b}/{total_b} blocos traduzidos ({pct}%)...", flush=True)

        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=32) as executor:
            list(executor.map(_process_batch, batches))

        return [r if r is not None else orig for r, orig in zip(results, text_list)]


RENPY_ESCAPE_RE = re.compile(
    r'(\[[a-zA-Z0-9_.\-]+\]|%\([a-zA-Z0-9_]+\)[sdefg]|%[sdefg]|\{[^}]+\})'
)

def extract_renpy_escapes(text):
    if not isinstance(text, str):
        return text, []
    escapes = []
    def replace_func(m):
        idx = len(escapes)
        escapes.append(m.group(0))
        return f"__RENPY_ESC_{idx}__"
    protected_text = RENPY_ESCAPE_RE.sub(replace_func, text)
    return protected_text, escapes

def restore_renpy_escapes(text, escapes):
    if not isinstance(text, str) or not escapes:
        return text
    restored = text
    for idx, orig in enumerate(escapes):
        tag = f"__RENPY_ESC_{idx}__"
        # Substituição case-insensitive caso o tradutor altere para minúsculas
        pattern = re.compile(re.escape(tag), re.IGNORECASE)
        if pattern.search(restored):
            restored = pattern.sub(lambda m: orig, restored)
        else:
            # Self-healing: Se a API de tradução omitiu a tag, reinjeta no final para preservar a funcionalidade do jogo
            restored += " " + orig
    
    # Validação de integridade de chaves de tags Ren'Py ({ vs })
    if restored.count('{') != restored.count('}'):
        # Se houver desbalanceamento por erro de tradução, remove chaves órfãs para evitar crash no Ren'Py
        if restored.count('{') > restored.count('}'):
            restored = restored.replace('{', '', restored.count('{') - restored.count('}'))
        elif restored.count('}') > restored.count('{'):
            restored = restored.replace('}', '', restored.count('}') - restored.count('{'))
            
    return restored

class DummyDict(dict):
    def __setstate__(self, state):
        if isinstance(state, dict): self.update(state)
        elif isinstance(state, tuple):
            for item in state:
                if isinstance(item, dict): self.update(item)

class DummyList(list):
    def __setstate__(self, state):
        if isinstance(state, list): self.extend(state)

class DummyNode(object):
    def __init__(self, *a, **kw): pass
    def __setstate__(self, state):
        if isinstance(state, dict): self.__dict__.update(state)
        elif isinstance(state, tuple):
            for item in state:
                if isinstance(item, dict): self.__dict__.update(item)

class DummyPyExpr(str):
    def __new__(cls, val, *args, **kwargs):
        return super().__new__(cls, val)
    def __setstate__(self, state):
        if isinstance(state, dict): self.__dict__.update(state)
        elif isinstance(state, tuple) and len(state) >= 2 and isinstance(state[1], dict):
            self.__dict__.update(state[1])

class DummyUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if name == 'defaultdict': return lambda *a, **kw: {}
        if name == 'RevertableDict': return DummyDict
        if name == 'RevertableList': return DummyList
        if name == 'RevertableSet': return set
        if name == 'PyExpr': return DummyPyExpr
        return type(name, (DummyNode,), {})

import unicodedata

def remove_accents(input_str):
    if not isinstance(input_str, str): return input_str
    nfkd_form = unicodedata.normalize('NFD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])


class TranslationString:
    """Representa uma string individual a ser traduzida com suporte a cache"""

    def __init__(self, content, cache=None, engine=None):
        self.content = content
        self.to_language = None
        self.translation = None
        self.cache = cache if cache is not None else {}
        self.engine = engine

    def translate(self, to_language, engine=None):
        self.to_language = to_language
        eng = engine or self.engine or OpenTranslatorGoogleEngine(target_lang=to_language)

        if not self.content or not self.content.strip():
            self.translation = self.content
            return self.translation

        cached = self.pull_from_cache(to_language)
        if cached is not None:
            self.translation = cached
            return self.translation

        # Protect Ren'Py interpolation variables ([var], %(var)s, {b}) before calling translation API
        protected_content, placeholders = protect_renpy_tags(self.content)
        translated_raw = eng.translate_single(protected_content, target_lang=to_language)
        translated_text = restore_renpy_tags(translated_raw, placeholders)

        self.translation = translated_text

        # Atualizar cache
        if self.content not in self.cache:
            self.cache[self.content] = {}
        self.cache[self.content][to_language] = self.translation
        return self.translation

    def pull_from_cache(self, to_language):
        available = self.cache.get(self.content)
        if available and isinstance(available, dict):
            return available.get(to_language)
        return None

    def is_cached(self, to_language):
        return self.pull_from_cache(to_language) is not None

    def __repr__(self):
        return f'TranslationString(content="{self.content}", translation="{self.translation}")'


class TranslationItem:
    """Representa um item contendo uma ou mais frases/linhas de texto a serem traduzidas"""

    def __init__(self, source_line=0, target_line=0, original_content="", cache=None, engine=None):
        self.source_line = source_line
        self.target_line = target_line
        self.cache = cache
        self.engine = engine
        self.translation_strings = []
        self._original_content = ""
        self.original_content = original_content

    @property
    def original_content(self):
        return self._original_content

    @original_content.setter
    def original_content(self, content):
        self._original_content = content
        self.sanitize()

    def sanitize(self):
        self.translation_strings = []
        # Quebra em sub-strings preservando quebras de linha padrão \n
        sub_strings = self._original_content.split("\n")
        for sub in sub_strings:
            self.translation_strings.append(
                TranslationString(sub, cache=self.cache, engine=self.engine)
            )

    def translate(self, to_language, engine=None):
        for ts in self.translation_strings:
            ts.translate(to_language, engine=engine)

    def get_translated_content(self):
        return "\n".join([ts.translation if ts.translation is not None else ts.content for ts in self.translation_strings])

    def stats(self, to_language):
        total_chars = sum(len(ts.content) for ts in self.translation_strings)
        cached_count = sum(1 for ts in self.translation_strings if ts.is_cached(to_language))
        return total_chars, cached_count

    def __iter__(self):
        return iter(self.translation_strings)

    def __repr__(self):
        return f"TranslationItem(lines {self.source_line + 1}->{self.target_line + 1})"


class TranslationBlock:
    """Agrupamento de itens de tradução"""

    def __init__(self, source_file=None, block_line=0):
        self.source_file = source_file
        self.block_line = block_line
        self.translation_items = []

    def add_translation_item(self, item):
        self.translation_items.append(item)

    def translate(self, to_language, engine=None):
        for item in self.translation_items:
            item.translate(to_language, engine=engine)

    def stats(self, to_language):
        chars, hits = 0, 0
        for item in self.translation_items:
            c, h = item.stats(to_language)
            chars += c
            hits += h
        return chars, hits

    def __iter__(self):
        return iter(self.translation_items)

    def __repr__(self):
        return f"TranslationBlock({self.source_file}, linha {self.block_line + 1})"


class TranslationFile:
    """Carrega e processa arquivos de texto genéricos / JSON / CSV / SRT etc."""

    def __init__(self, filename, cache=None, engine=None):
        self.filename = filename
        self.cache = cache
        self.engine = engine
        self.translation_blocks = []
        self.raw_lines = []

    def load_file(self):
        with open(self.filename, "r", encoding="utf-8", errors="ignore") as f:
            self.raw_lines = f.readlines()

        block = TranslationBlock(source_file=self.filename, block_line=0)

        # Trata arquivos JSON, RPY do Ren'Py ou Texto genérico
        if self.filename.endswith(".json"):
            try:
                content_str = "".join(self.raw_lines)
                parsed_json = json.loads(content_str)
                self._extract_json_strings(parsed_json, block)
            except Exception:
                self._parse_plain_text(block)
        elif self.filename.endswith(".rpy") or self.filename.endswith(".rpym") or self.filename.endswith(".py"):
            self._parse_rpy_file(block)
        elif self.filename.endswith(".rpyc") or self.filename.endswith(".rpymc"):
            self._parse_rpyc_file(block)
        else:
            self._parse_plain_text(block)

        if block.translation_items:
            self.translation_blocks.append(block)

    def _parse_plain_text(self, block):
        for idx, line in enumerate(self.raw_lines):
            stripped = line.rstrip("\r\n")
            if stripped.strip():
                item = TranslationItem(
                    source_line=idx,
                    target_line=idx,
                    original_content=stripped,
                    cache=self.cache,
                    engine=self.engine,
                )
                block.add_translation_item(item)

    def _parse_rpy_file(self, block):
        in_strings_block = False
        media_prefixes = ('image', 'play', 'stop', 'sound', 'voice', 'music', 'show', 'hide', 'scene')
        ignore_sub = ('.png', '.jpg', '.jpeg', '.webp', '.ogg', '.wav', '.mp3', '.mp4', '.ttf', '.otf', 'gui/', 'images/', 'audio/', 'fonts/')

        full_text = "".join(self.raw_lines)
        extracted_seen = set()

        # 1. Extração de blocos _(...) com concatenação de aspas multilinhas (biografias, misturas de aspas, comentários e {#id})
        pos = 0
        while True:
            m = re.search(r'_\s*\(', full_text[pos:])
            if not m:
                break
            start_idx = pos + m.end()
            paren_depth = 1
            in_string = False
            str_char = None
            i = start_idx
            raw_block_chars = []
            
            while i < len(full_text) and paren_depth > 0:
                ch = full_text[i]
                if in_string:
                    raw_block_chars.append(ch)
                    if ch == str_char and (i == 0 or full_text[i-1] != '\\' or (i > 1 and full_text[i-2] == '\\')):
                        if str_char in ('"', "'") and i >= 2 and full_text[i-2:i+1] == str_char * 3:
                            in_string = False
                            str_char = None
                        elif str_char in ('"', "'") and not (i >= 2 and full_text[i-2:i+1] == str_char * 3):
                            in_string = False
                            str_char = None
                else:
                    if ch in ('"', "'"):
                        in_string = True
                        str_char = ch
                        raw_block_chars.append(ch)
                    elif ch == '(':
                        paren_depth += 1
                        raw_block_chars.append(ch)
                    elif ch == ')':
                        paren_depth -= 1
                        if paren_depth > 0:
                            raw_block_chars.append(ch)
                    else:
                        raw_block_chars.append(ch)
                i += 1
            
            pos = i
            raw_block = "".join(raw_block_chars)
            
            # Limpa comentários # fora de aspas
            cleaned_block_chars = []
            in_s = False
            s_c = None
            j = 0
            while j < len(raw_block):
                c = raw_block[j]
                if in_s:
                    cleaned_block_chars.append(c)
                    if c == s_c and (j == 0 or raw_block[j-1] != '\\'):
                        in_s = False
                else:
                    if c in ('"', "'"):
                        in_s = True
                        s_c = c
                        cleaned_block_chars.append(c)
                    elif c == '#':
                        while j < len(raw_block) and raw_block[j] not in ('\n', '\r'):
                            j += 1
                        continue
                    else:
                        cleaned_block_chars.append(c)
                j += 1
            
            cleaned_block = "".join(cleaned_block_chars)
            parts = re.findall(r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')', cleaned_block)
            if parts:
                combined_parts = []
                for p in parts:
                    if p.startswith('"""') or p.startswith("'''"):
                        combined_parts.append(p[3:-3])
                    else:
                        val = p[1:-1].replace('\\"', '"').replace("\\'", "'")
                        combined_parts.append(val)
                combined_str = "".join(combined_parts).strip()
                if combined_str and combined_str not in extracted_seen and any(c.isalpha() for c in combined_str):
                    extracted_seen.add(combined_str)
                    item = TranslationItem(
                        source_line=0,
                        target_line=0,
                        original_content=combined_str,
                        cache=self.cache,
                        engine=self.engine,
                    )
                    block.add_translation_item(item)

        # 2. Regex de extração universal de strings entre aspas (suporta aspas triplas multilinhas, duplas e simples)
        string_matches = re.findall(r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')', full_text)
        
        for quoted in string_matches:
            if quoted.startswith('"""') or quoted.startswith("'''"):
                content = quoted[3:-3].strip()
            else:
                content = quoted[1:-1].strip()

            if not content or content in extracted_seen:
                continue
            extracted_seen.add(content)

            # Ignora automaticamente nomes de arquivos, extensões (.txt, .exe, .png, .ogg, .ttf, etc.) e caminhos do sistema
            if is_filename_or_path(content):
                continue

            # Ignora identificadores de código sem espaço (ex: "bg_room", "btn_hover")
            # Mas EXTRAI E PRESERVA automaticamente palavras isoladas legítimas em qualquer jogo (ex: "Home", "Town", "Contacts", "Student", "Teacher", "Status", "Shop", "Gallery")
            if ' ' not in content:
                if '_' in content or '/' in content or '\\' in content:
                    continue
                if content.islower():
                    CODE_KEYWORDS = {
                        "true", "false", "none", "auto", "default", "define", "label",
                        "jump", "call", "pass", "return", "init", "python", "hide", "show",
                        "scene", "image", "play", "stop", "music", "sound", "voice", "with"
                    }
                    if content in CODE_KEYWORDS:
                        continue

            # Ignora nomes de arquivos ou identificadores internos de código sem letras legíveis
            if not any(c.isalpha() for c in content):
                continue

            # Ignora códigos hexadecimais de cores ou hashes (ex: c138, c5fffb, 0x123)
            if re.match(r'^(#|0x|c)?[0-9a-fA-F]{3,8}$', content.strip()) and not any(w in content.lower() for w in ['the', 'and', 'for', 'you', 'are']):
                continue

            # Aceita qualquer texto com pelo menos 1 caractere alfabético
            item = TranslationItem(
                source_line=0,
                target_line=0,
                original_content=content,
                cache=self.cache,
                engine=self.engine,
            )
            block.add_translation_item(item)

    def _parse_rpyc_file(self, block):
        try:
            with open(self.filename, "rb") as f:
                raw = f.read()
            data = None
            for pos in [i for i, b in enumerate(raw[:500]) if b == 0x78]:
                try:
                    data = zlib.decompress(raw[pos:])
                    break
                except Exception:
                    continue
            if not data:
                return
            u = DummyUnpickler(io.BytesIO(data))
            res = u.load()

            ignore_sub = ('.png', '.jpg', '.jpeg', '.webp', '.ogg', '.wav', '.mp3', '.mp4', '.ttf', '.otf', 'gui/', 'images/', 'audio/', 'fonts/')
            extracted = []
            visited = set()

            def walk(node):
                if node is None or id(node) in visited: return
                visited.add(id(node))

                tname = type(node).__name__
                if tname == 'Say':
                    what = getattr(node, 'what', '')
                    if isinstance(what, str) and what.strip():
                        extracted.append(what)
                elif tname == 'Menu':
                    items = getattr(node, 'items', [])
                    for item in items:
                        if isinstance(item, tuple) and len(item) > 0 and isinstance(item[0], str) and item[0].strip():
                            extracted.append(item[0])
                elif isinstance(node, DummyPyExpr):
                    val = str(node).strip()
                    trans_matches = re.findall(r'_\(\s*("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')\s*\)', val)
                    for raw_m in trans_matches:
                        if raw_m.startswith('"""') or raw_m.startswith("'''"):
                            m = raw_m[3:-3].strip()
                        else:
                            m = raw_m[1:-1].strip()
                        if m and not any(sub in m.lower() for sub in ignore_sub):
                            if any(c.isalpha() for c in m):
                                extracted.append(m)

                if isinstance(node, (list, tuple)):
                    for item in node: walk(item)
                elif hasattr(node, '__dict__'):
                    for k, v in getattr(node, '__dict__', {}).items():
                        if isinstance(v, (list, tuple, DummyNode, DummyDict, DummyList, DummyPyExpr, str)):
                            walk(v)

            walk(res)

            for idx, content in enumerate(extracted):
                clean = content.strip()
                if clean and len(clean) >= 1 and any(c.isalpha() for c in clean) and not any(sub in clean.lower() for sub in ignore_sub):
                    item = TranslationItem(
                        source_line=idx,
                        target_line=idx,
                        original_content=clean,
                        cache=self.cache,
                        engine=self.engine,
                    )
                    block.add_translation_item(item)
        except Exception:
            pass

    def _extract_json_strings(self, obj, block, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                self._extract_json_strings(v, block, f"{path}.{k}" if path else k)
        elif isinstance(obj, list):
            for idx, item in enumerate(obj):
                self._extract_json_strings(item, block, f"{path}[{idx}]")
        elif isinstance(obj, str) and obj.strip():
            item = TranslationItem(
                source_line=0,
                target_line=0,
                original_content=obj,
                cache=self.cache,
                engine=self.engine,
            )
            block.add_translation_item(item)

    def translate(self, to_language, engine=None):
        eng = engine or self.engine or OpenTranslatorGoogleEngine(target_lang=to_language)
        all_strings = []
        for block in self.translation_blocks:
            for item in block.translation_items:
                for ts in item.translation_strings:
                    all_strings.append(ts)

        pending = [ts for ts in all_strings if ts.content and ts.content.strip() and not ts.is_cached(to_language)]

        if pending:
            raw_contents = [ts.content for ts in pending]
            translated_results = eng.translate_batch(raw_contents, target_lang=to_language)
            for ts, trans in zip(pending, translated_results):
                ts.translation = trans
                if ts.content not in ts.cache:
                    ts.cache[ts.content] = {}
                ts.cache[ts.content][to_language] = trans

        for ts in all_strings:
            if ts.translation is None:
                cached = ts.pull_from_cache(to_language)
                ts.translation = cached if cached is not None else ts.content

    def stats(self, to_language):
        chars, hits = 0, 0
        for block in self.translation_blocks:
            c, h = block.stats(to_language)
            chars += c
            hits += h
        return chars, hits

    def save(self, out_path):
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        if self.filename.endswith(".json"):
            # Para JSON, se processado como texto simples ou estruturado
            try:
                with open(self.filename, "r", encoding="utf-8", errors="ignore") as f:
                    data = json.load(f)
                items_iter = iter([item for block in self.translation_blocks for item in block])
                data_translated = self._rebuild_json(data, items_iter)
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(data_translated, f, ensure_ascii=False, indent=2)
                return
            except Exception:
                pass
        elif self.filename.endswith(".rpy"):
            out_lines = list(self.raw_lines)
            for block in self.translation_blocks:
                for item in block:
                    if 0 <= item.target_line < len(out_lines):
                        orig_line = out_lines[item.target_line]
                        stripped = orig_line.strip()
                        # Never overwrite 'old' lines or comment lines
                        if stripped.startswith("old ") or stripped.startswith("#"):
                            continue

                        # Substitui a primeira string entre aspas pelo valor traduzido
                        def replacer(m):
                            tr_str = item.get_translated_content().replace('"', '\\"')
                            return f'"{tr_str}"'
                        updated = re.sub(r'("(?:[^"\\]|\\.)*")', replacer, orig_line, count=1)
                        out_lines[item.target_line] = updated

            with open(out_path, "w", encoding="utf-8") as f:
                f.writelines(out_lines)
            return

        # Para texto plano genérico
        out_lines = list(self.raw_lines)
        for block in self.translation_blocks:
            for item in block:
                if 0 <= item.target_line < len(out_lines):
                    ending = "\n" if out_lines[item.target_line].endswith("\n") else ""
                    out_lines[item.target_line] = item.get_translated_content() + ending

        with open(out_path, "w", encoding="utf-8") as f:
            f.writelines(out_lines)

    def _rebuild_json(self, obj, items_iter):
        if isinstance(obj, dict):
            return {k: self._rebuild_json(v, items_iter) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._rebuild_json(v, items_iter) for v in obj]
        elif isinstance(obj, str) and obj.strip():
            try:
                item = next(items_iter)
                return item.get_translated_content()
            except StopIteration:
                return obj
        return obj

    def __iter__(self):
        return iter(self.translation_blocks)

    def __repr__(self):
        return f"TranslationFile({self.filename}, {len(self.translation_blocks)} blocos)"


def extract_rpa_archives(game_dir):
    """Extrai arquivos .rpy de arquivos .rpa (Ren'Py RPA-3.0 e RPA-2.0) nativamente"""
    if not os.path.exists(game_dir):
        return 0

    game_sub_dir = os.path.join(game_dir, "game") if os.path.isdir(os.path.join(game_dir, "game")) else game_dir
    if not os.path.exists(game_sub_dir):
        return 0

    rpa_files = [os.path.join(game_sub_dir, f) for f in os.listdir(game_sub_dir) if f.lower().endswith(".rpa")]
    if not rpa_files:
        return 0

    extracted_count = 0
    import zlib
    import pickle

    for rpa_path in rpa_files:
        try:
            with open(rpa_path, "rb") as f:
                header = f.readline()
                if not (header.startswith(b"RPA-3.0") or header.startswith(b"RPA-2.0")):
                    continue
                parts = header.split()
                if len(parts) < 2:
                    continue
                offset = int(parts[1], 16)
                key = int(parts[2], 16) if len(parts) > 2 else 0

                f.seek(offset)
                compressed_index = f.read()
                index_data = zlib.decompress(compressed_index)
                index = pickle.loads(index_data, encoding="latin1")

                for filename, d in index.items():
                    if not (filename.endswith(".rpy") or filename.endswith(".rpyc")):
                        continue
                    if isinstance(d, list) and len(d) > 0:
                        entry = d[0]
                        if isinstance(entry, tuple) and len(entry) >= 2:
                            file_offset = entry[0] ^ key
                            file_length = entry[1] ^ key
                            f.seek(file_offset)
                            content = f.read(file_length)

                            out_file = os.path.join(game_sub_dir, filename)
                            if not os.path.exists(out_file):
                                os.makedirs(os.path.dirname(out_file), exist_ok=True)
                                with open(out_file, "wb") as out_f:
                                    out_f.write(content)
                                extracted_count += 1
        except Exception:
            pass
    return extracted_count


def main():
    parser = argparse.ArgumentParser(
        description="OpenTranslator - Ferramenta de Tradução em Lote Genérica (Google Translate Gratuito)"
    )
    parser.add_argument(
        "-i", "--input", type=str, dest="input_path", required=True,
        metavar="path", help="(obrigatório) Arquivo ou diretório com os textos para tradução"
    )
    parser.add_argument(
        "-l", "--language", type=str, dest="target_language", default="pt",
        metavar="lang", help="Idioma de destino (padrão: 'pt')"
    )
    parser.add_argument(
        "-s", "--source-language", type=str, dest="source_language", default="auto",
        metavar="lang", help="Idioma de origem (padrão: 'auto')"
    )
    parser.add_argument(
        "-o", "--output", type=str, dest="output_dir", required=True,
        metavar="dir", help="(obrigatório) Diretório de saída"
    )
    parser.add_argument(
        "-c", "--cache-file", type=str, dest="cache_file", default=DEFAULT_CACHE_FILE,
        metavar="file", help="Caminho para o arquivo de cache JSON"
    )
    parser.add_argument(
        "-y", "--yes", action="store_true", dest="auto_confirm",
        help="Confirma automaticamente sem pedir interação no terminal"
    )
    parser.add_argument(
        "--strip-accents", action="store_true", dest="strip_accents",
        help="Remove acentos do texto traduzido (ex: você -> voce, faça -> faca)"
    )
    parser.add_argument(
        "--clear-cache", action="store_true", dest="clear_cache",
        help="Limpa o arquivo de cache antes de iniciar a tradução"
    )

    args = parser.parse_args()

    original_sigint_handler = signal(SIGINT, SIG_IGN)
    signal(SIGINT, original_sigint_handler)

    # 1. Carregamento do Cache
    if args.clear_cache and os.path.isfile(args.cache_file):
        try:
            os.remove(args.cache_file)
            print(f"{Fore.YELLOW}[Cache] Arquivo de cache '{args.cache_file}' removido com sucesso.{Style.RESET_ALL}")
        except Exception:
            pass

    cache_data = {}
    if os.path.isfile(args.cache_file):
        try:
            with open(args.cache_file, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
        except Exception:
            cache_data = {}

    check_output(args.output_dir, auto_confirm=args.auto_confirm)

    # 2. Localização dos Arquivos
    if os.path.isfile(args.input_path):
        files = [args.input_path]
        base_dir = os.path.dirname(os.path.abspath(args.input_path))
    elif os.path.isdir(args.input_path):
        base_dir = os.path.abspath(args.input_path)

        # Autodesempacotamento de arquivos .rpa se existirem no diretório
        extracted_rpy = extract_rpa_archives(base_dir)
        if extracted_rpy > 0:
            print(f"{Fore.GREEN}Desempacotados nativamente {extracted_rpy} arquivos .rpy dos pacotes .rpa!{Style.RESET_ALL}")

        files = glob(os.path.join(base_dir, "**", "*.*"), recursive=True)
        # Filtra apenas arquivos de texto comuns e scripts Ren'Py (ignorando hooks internos do OpenTranslator)
        valid_exts = {".txt", ".json", ".csv", ".po", ".srt", ".md", ".xml", ".html", ".htm", ".ini", ".rpy", ".rpyc", ".rpym", ".rpymc", ".py"}
        ignored_names = {
            "opent_translated.json", "opent_translated.pkl", "00_opent_runtime.rpy", "00_opent_runtime.rpyc",
            "000_opent_runtime.rpy", "000_opent_runtime.rpyc", "zz_opent_runtime.rpy", "zz_opent_runtime.rpyc",
            "z_opentranslator.rpy", "z_opentranslator.rpyc", "00_anti_crash.rpy", "000_anti_crash.rpy", "zz_anti_crash.rpy",
            "desktop.ini", "script_version.txt", "mvps.txt", "changelog.txt", "third-party.txt", "errors.txt",
            "traceback.txt", "log.txt"
        }
        files = [
            f for f in files
            if os.path.isfile(f)
            and os.path.splitext(f)[1].lower() in valid_exts
            and os.path.basename(f).lower() not in ignored_names
            and not os.path.basename(f).lower().endswith("mvps.txt")
            and not os.path.basename(f).lower().startswith("00_opent")
            and not os.path.basename(f).lower().startswith("000_opent")
            and not os.path.basename(f).lower().startswith("zz_opent")
            and not os.path.basename(f).lower().startswith("z_opent")
        ]
    else:
        print(f"{Fore.RED}Erro: O caminho de entrada '{args.input_path}' não foi encontrado.{Style.RESET_ALL}")
        sys.exit(1)

    if not files:
        print(f"{Fore.YELLOW}Nenhum arquivo compatível encontrado para tradução em '{args.input_path}'.{Style.RESET_ALL}")
        sys.exit(0)

    # Inicializar motor do OpenTranslator Google Translate
    engine = OpenTranslatorGoogleEngine(
        source_lang=args.source_language,
        target_lang=args.target_language
    )

    # 3. Parsing dos Arquivos
    print(f"{Fore.CYAN}Parseando arquivos e preparando lote de tradução...{Style.RESET_ALL}")
    file_map = {}
    total_chars = 0
    total_cache_hits = 0

    for file in tqdm(files, total=len(files), unit="arquivo"):
        tf = TranslationFile(file, cache=cache_data, engine=engine)
        tf.load_file()
        chars, hits = tf.stats(args.target_language)
        total_chars += chars
        total_cache_hits += hits
        file_map[file] = tf

    print("\n" + "=" * 60)
    print(f"{Fore.GREEN}Motor de Tradução:{Style.RESET_ALL} OpenTranslator GTX Engine (Google Translate Gratuito)")
    print(f"{Fore.GREEN}Total de Caracteres:{Style.RESET_ALL} {total_chars}")
    print(f"{Fore.GREEN}Cache Hits (Já Traduzidos):{Style.RESET_ALL} {total_cache_hits}")
    print(f"{Fore.GREEN}Custo Estimado:{Style.RESET_ALL} R$ 0.00 / $ 0.00 (Gratuito)")
    print("=" * 60 + "\n")

    if not args.auto_confirm and not confirm("Deseja iniciar a tradução agora?"):
        print("Tradução cancelada pelo usuário.")
        sys.exit(0)

    # 4. Tradução Concorrente de Alta Velocidade (Lote Agregado Global)
    print(f"\n{Fore.CYAN}Agregando lote global de tradução para alta velocidade...{Style.RESET_ALL}", flush=True)
    all_ts = []
    for tf in file_map.values():
        for block in tf.translation_blocks:
            for item in block.translation_items:
                all_ts.extend(item.translation_strings)

    pending_map = {}
    for ts in all_ts:
        if ts.content and ts.content.strip() and not ts.is_cached(args.target_language):
            if ts.content not in pending_map:
                pending_map[ts.content] = []
            pending_map[ts.content].append(ts)

    unique_pending = list(pending_map.keys())
    if unique_pending:
        print(f"{Fore.GREEN}Traduzindo {len(unique_pending)} textos únicos em lote paralelo ultra-rápido...{Style.RESET_ALL}", flush=True)

        protected_list = []
        placeholders_list = []
        for text in unique_pending:
            prot, ph = protect_renpy_tags(text)
            protected_list.append(prot)
            placeholders_list.append(ph)

        translated_results_raw = engine.translate_batch(protected_list, target_lang=args.target_language)

        translated_results = []
        for raw, ph in zip(translated_results_raw, placeholders_list):
            translated_results.append(restore_renpy_tags(raw, ph))

        for orig, trans in zip(unique_pending, translated_results):
            if orig not in cache_data:
                cache_data[orig] = {}
            cache_data[orig][args.target_language] = trans
            for ts in pending_map[orig]:
                ts.translation = trans

    for tf in file_map.values():
        tf.translate(args.target_language, engine=engine)

    # 5. Gravando Resultados
    print(f"\n{Fore.CYAN}Salvando arquivos traduzidos...{Style.RESET_ALL}")
    dict_map = {}
    for file, tf in tqdm(file_map.items(), total=len(file_map), unit="arquivo"):
        if not (file.endswith(".rpy") or file.endswith(".rpyc")):
            rel_path = os.path.relpath(file, base_dir)
            out_file_path = os.path.join(args.output_dir, rel_path)
            tf.save(out_file_path)

        for block in tf.translation_blocks:
            for item in block:
                orig = item.original_content
                trans = item.get_translated_content()
                if orig and trans and orig.strip():
                    orig_clean = orig.strip()
                    trans_clean = remove_accents(trans)
                    dict_map[orig_clean] = trans_clean

                    # Normalização automática de tags ({i}) e marcadores (•) no dicionário
                    bare_orig = re.sub(r'\{.*?\}', '', orig_clean)
                    bare_orig = re.sub(r'^[•\-\*>\s▪]+', '', bare_orig).strip()
                    bare_trans = re.sub(r'\{.*?\}', '', trans_clean)
                    bare_trans = re.sub(r'^[•\-\*>\s▪]+', '', bare_trans).strip()

                    if bare_orig and bare_trans:
                        if bare_orig not in dict_map:
                            dict_map[bare_orig] = bare_trans
                        if "{i}" in orig_clean and "{i}" not in bare_orig:
                            dict_map[f"{{i}}{bare_orig}{{/i}}"] = f"{{i}}{bare_trans}{{/i}}"
                            dict_map[f"• {bare_orig}"] = f"• {bare_trans}"
                            dict_map[f"• {{i}}{bare_orig}{{/i}}"] = f"• {{i}}{bare_trans}{{/i}}"

    # Injeção automática universal para frases WIP de fim de história ("... story will return in future updates.")
    wip_entries = {}
    for k, v in list(dict_map.items()):
        if "will return in future updates" in k.lower():
            clean_k = re.sub(r'\{.*?\}', '', k)
            clean_k = re.sub(r'^[•\-\*>\s▪]+', '', clean_k).strip()
            clean_v = re.sub(r'\{.*?\}', '', v)
            clean_v = re.sub(r'^[•\-\*>\s▪]+', '', clean_v).strip()
            if clean_k and clean_v:
                wip_entries[clean_k] = clean_v
                wip_entries[f"{{i}}{clean_k}{{/i}}"] = f"{{i}}{clean_v}{{/i}}"
                wip_entries[f"• {clean_k}"] = f"• {clean_v}"
                wip_entries[f"• {{i}}{clean_k}{{/i}}"] = f"• {{i}}{clean_v}{{/i}}"

    dict_map.update(wip_entries)

    # 1. UI Universal do Ren'Py e Calendários (Estrito à Engine, sem dados de jogos específicos)
    UNIVERSAL_RENPY_UI_KEYS = [
        "Preferences", "Start", "Load", "Save", "Quit", "Return", "Main Menu",
        "About", "Help", "History", "Display", "Skip", "After Choices", "Window",
        "Fullscreen", "Text Speed", "Auto-Forward Time", "Music Volume", "Sound Volume",
        "Voice Volume", "Jukebox", "Next", "Previous", "Currently Playing", "Track",
        "Screen Filters", "Unlock Page", "Talk", "Inventory/Status", "Inventory",
        "Status", "Skip Week", "Unseen Text", "Transitions", "Skip unseen text",
        "Skip after choices", "Are you sure you want to quit?", "Font override",
        "Text scaling", "Line spacing", "Character spacing", "High contrast text",
        "Force mono output", "Self-voicing", "Self-voicing volume drop",
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
        "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
        "January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December",
        "Cookie Jar", "Credits", "Changelog", "Reset size", "Features",
        "Button outlines", "Dialogue box opacity", "Sound", "Gameplay", "Cheats",
        "Accessibility", "Difficulty", "Reset tutorials", "Visual Novel",
        "Show quick menu", "Unlock all", "Disable cheats", "Background", "Biography",
        "Yes", "No", "Confirm", "Back", "Auto", "Q.Save", "Q.Load", "Prefs", "Gallery", "Replay"
    ]

    # 2. Heurística Nível Motor (Auto-Descoberta Omni-Scanner Lexical Seguro)
    auto_discovered_keys = set()
    try:
        # Padrão universal para capturar QUALQUER string Python/Ren'Py perfeitamente
        PY_STRING = r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')'
        
        patterns = [
            re.compile(r'_\(\s*' + PY_STRING + r'\s*\)'),                                # Funções de Tradução _("Texto")
            re.compile(r'Character\(\s*(?:_\()?\s*' + PY_STRING),                        # Nomes de Personagens
            re.compile(r'(?:define|default)\s+[a-zA-Z0-9_.]+\s*=\s*' + PY_STRING),       # Constantes, Missões e Itens
            re.compile(r'(?:notify|Notify|Confirm)\(\s*' + PY_STRING + r'\s*\)'),        # Pop-ups de tela e Confirmações
            re.compile(r'^\s*' + PY_STRING + r'\s*:'),                                   # Escolhas do Jogador (ex: "Entrar na casa":)
            re.compile(r'(?:text|textbutton|tooltip|label)\s*' + PY_STRING),             # UI Customizada (Telas, Botões e Dicas)
            re.compile(r'^\s*' + PY_STRING + r'\s*$'),                                   # Strings isoladas em .py / dicionários de mensagens
            re.compile(r'=\s*' + PY_STRING)                                              # Atribuições diretas de variáveis em .py
        ]
        
        # Blocklist de segurança extrema para assets e telas nativas baseada nos logs do GitHub
        DANGER_PREFIXES = ("bg ", "cg ", "gui/", "images/", "audio/", "fonts/", "music/")
        
        for root_dir, _, file_list in os.walk(base_dir):
            for file_name in file_list:
                if file_name.endswith(".rpy") or file_name.endswith(".rpym") or file_name.endswith(".py"):
                    try:
                        with open(os.path.join(root_dir, file_name), "r", encoding="utf-8", errors="ignore") as f:
                            lines = f.readlines()
                            
                        for line in lines:
                            if line.strip().startswith('#'):
                                continue
                                
                            for regex in patterns:
                                for match in regex.findall(line):
                                    if match.startswith('"""') or match.startswith("'''"):
                                        clean_match = match[3:-3].strip()
                                    else:
                                        clean_match = match[1:-1].replace('\\"', '"').replace("\\'", "'").strip()
                                    
                                    # Filtro de Segurança Engine-Level
                                    if clean_match and len(clean_match) > 1 and not is_filename_or_path(clean_match):
                                        # Proteção contra o Crash do Ren'Py 8.x (Strings Vazias)
                                        if not clean_match.strip():
                                            continue
                                            
                                        # Proteção contra injeção em caminhos de arquivos e nomes de cenas (bg/cg)
                                        lower_match = clean_match.lower()
                                        if any(lower_match.startswith(prefix) for prefix in DANGER_PREFIXES):
                                            continue
                                            
                                        # Bloqueia palavras minúsculas isoladas e códigos Hexadecimais
                                        if not clean_match.islower() or " " in clean_match:
                                            if not re.match(r'^#[0-9a-fA-F]{3,8}$', clean_match):
                                                auto_discovered_keys.add(clean_match)
                    except Exception:
                        pass
    except Exception:
        pass

    # 3. Mescla e Deduplicação O(1)
    combined_keys = list(set(UNIVERSAL_RENPY_UI_KEYS) | auto_discovered_keys)
    pending_ui_keys = [k for k in combined_keys if k not in dict_map]

    # 4. Tradução em Lote Dinâmica
    if pending_ui_keys:
        print(f"   ↳ [Auto-Descoberta Universal] Capturados {len(auto_discovered_keys)} termos, variáveis e personagens do jogo automaticamente!")
        translated_ui = engine.translate_batch(pending_ui_keys, target_lang=args.target_language, source_lang=args.source_language)
        for orig, trans in zip(pending_ui_keys, translated_ui):
            if trans:
                if args.strip_accents:
                    trans = remove_accents(trans)
                dict_map[orig] = trans

    # Expansão automática universal de variáveis de interpolação Ren'Py/Python ([class.prop])
    eval_entries = {}
    var_pattern = re.compile(r'\[([a-zA-Z0-9_\.]+)\]')
    for k, v in list(dict_map.items()):
        if "[" in k and "]" in k:
            vars_found = var_pattern.findall(k)
            if vars_found:
                k_eval = k
                v_eval = v
                for var_expr in vars_found:
                    parts = var_expr.split('.')
                    last_part = parts[-1]
                    pretty_name = last_part.capitalize()
                    k_eval = k_eval.replace(f"[{var_expr}]", pretty_name)
                    v_eval = v_eval.replace(f"[{var_expr}]", pretty_name)
                if k_eval != k and k_eval not in dict_map:
                    eval_entries[k_eval] = v_eval
                    if "Anon's" in k_eval:
                        k_alt = k_eval.replace("Anon's", "Anonls")
                        eval_entries[k_alt] = v_eval

    dict_map.update(eval_entries)

    # Universal Ren'Py system preferences and accessibility keys filter (Preservando opções de UI)
    RENPY_INTERNAL_PREFS = {
        "voice sustain", "wait for voice", "voice volume", "music volume",
        "sound volume", "emphasize audio", "self voicing", "self voicing volume drop",
        "self voicing pitch", "self voicing rate", "clipboard voicing",
        "debug voicing", "system cursor", "high contrast", "vertical text",
        "show empty window", "restore window pos", "slow text", "slow_text",
        "font transform", "font size", "font line spacing", "font", "renderer",
        "powersave", "mono audio", "mono", "stereo", "mixer"
    }

    RENPY_PREF_PATTERNS = re.compile(
        r'^(self voicing|font|volume|contrast|spacing|audio|sound|music|mono|stereo|mixer|caption|subtitles|fps|vsync|resolution|powersave)',
        re.IGNORECASE
    )

    def is_renpy_system_preference(text):
        if not text or not isinstance(text, str):
            return False
        clean = text.lower().strip()
        if clean in RENPY_INTERNAL_PREFS:
            return True
        if RENPY_PREF_PATTERNS.search(clean):
            return True
        if any(keyword in clean for keyword in ["font transform", "volume drop", "line spacing", "self voicing", "mono audio", "mono"]):
            return True
        return False

    # Pass de desescapamento de quebras de linha (\n -> ASCII 10 real) para O(1) hash match perfeito no Ren'Py
    unescaped_entries = {}
    for k, v in list(dict_map.items()):
        if "\\n" in k or "\\t" in k:
            k_unesc = k.replace("\\n", "\n").replace("\\t", "\t")
            v_unesc = v.replace("\\n", "\n").replace("\\t", "\t")
            unescaped_entries[k_unesc] = v_unesc
    dict_map.update(unescaped_entries)

    # Purgar do dicionario antes de exportar json/pkl
    to_delete = [k for k in list(dict_map.keys()) if is_renpy_system_preference(k)]
    for k in to_delete:
        dict_map.pop(k, None)

    # Exportar Dicionário Consolidado e Desduplicado opent_translated.json e opent_translated.pkl
    import pickle
    dict_path_1 = os.path.join(args.output_dir, "opent_translated.json")
    dict_path_2 = os.path.join(base_dir, "opent_translated.json")
    pkl_path_1 = os.path.join(args.output_dir, "opent_translated.pkl")
    pkl_path_2 = os.path.join(base_dir, "opent_translated.pkl")
    try:
        with open(dict_path_1, "w", encoding="utf-8") as f:
            json.dump(dict_map, f, ensure_ascii=False)
        with open(dict_path_2, "w", encoding="utf-8") as f:
            json.dump(dict_map, f, ensure_ascii=False)
        with open(pkl_path_1, "wb") as f:
            pickle.dump(dict_map, f, protocol=2)
        with open(pkl_path_2, "wb") as f:
            pickle.dump(dict_map, f, protocol=2)
        print(f"{Fore.GREEN}Dicionário opent_translated (JSON & PKL ultra-rápido) exportado com {len(dict_map)} entradas únicas!{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}Erro ao exportar opent_translated: {e}{Style.RESET_ALL}")

    # 6. Salvar Cache Persistente
    print(f"{Fore.CYAN}Persistindo cache em '{args.cache_file}'...{Style.RESET_ALL}")
    try:
        with open(args.cache_file, "w", encoding="utf-8") as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"{Fore.RED}Erro ao salvar cache: {e}{Style.RESET_ALL}")

    print(f"\n{Fore.GREEN}[OK] Tradução concluída com sucesso no OpenTranslator!{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
