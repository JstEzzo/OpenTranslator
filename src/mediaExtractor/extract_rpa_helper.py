#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, json, argparse, hashlib

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

TOOL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RPATOOL_DIRS = [
    os.path.join(TOOL_ROOT, 'resources', 'renpy', 'rpatool'),
    os.path.join(TOOL_ROOT, 'unren_tools')
]
for d in RPATOOL_DIRS:
    if os.path.exists(d) and d not in sys.path:
        sys.path.insert(0, d)

try:
    from rpatool import RenPyArchive
except Exception as e:
    RenPyArchive = None

IMAGE_EXTS = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tga', '.ico', '.svg', '.tiff')
AUDIO_EXTS = ('.ogg', '.mp3', '.wav', '.m4a', '.flac', '.aac', '.opus', '.mid', '.midi')

def extract_rpa(game_dir, dest_dir, media_type='img'):
    if media_type == 'all':
        target_exts = None
        label = 'arquivos'
    elif media_type == 'audio':
        target_exts = AUDIO_EXTS
        label = 'áudios'
    else:
        target_exts = IMAGE_EXTS
        label = 'imagens'
    
    game_sub = os.path.join(game_dir, 'game') if os.path.isdir(os.path.join(game_dir, 'game')) else game_dir
    os.makedirs(dest_dir, exist_ok=True)
    
    total_found = 0
    extracted_count = 0
    duplicates_count = 0
    collisions_count = 0
    ignored_count = 0
    errors = []
    sources = []
    
    rpa_files = []
    ignored_dirs = {'renpy', 'lib', 'saves', 'cache', 'tl', '.git'}
    for root, dirs, files in os.walk(game_sub):
        dirs[:] = [d for d in dirs if d.lower() not in ignored_dirs]
        for f in files:
            if f.lower().endswith('.rpa'):
                rpa_files.append(os.path.join(root, f))
                
    if not rpa_files:
        return {
            'ok': False,
            'rpaFound': 0,
            'extracted': 0,
            'duplicates': 0,
            'collisions': 0,
            'physicalWritten': 0,
            'found': 0,
            'ignored': 0,
            'errors': 0,
            'errorList': [],
            'sources': []
        }
        
    if RenPyArchive is None:
        return {
            'ok': False,
            'rpaFound': len(rpa_files),
            'extracted': 0,
            'duplicates': 0,
            'collisions': 0,
            'physicalWritten': 0,
            'found': 0,
            'ignored': 0,
            'errors': 1,
            'errorList': ['Módulo rpatool não pôde ser carregado.'],
            'sources': []
        }
        
    for rpa_path in rpa_files:
        rpa_name = os.path.basename(rpa_path)
        try:
            archive = RenPyArchive(rpa_path)
            file_list = archive.list()
            rpa_extracted = 0
            rpa_duplicates = 0
            rpa_collisions = 0
            for fn in file_list:
                fn_clean = fn.lstrip('/\\')
                fn_lower = fn_clean.lower()
                total_found += 1
                if target_exts is None or fn_lower.endswith(target_exts):
                    try:
                        content = archive.read(fn)
                        out_path = os.path.join(dest_dir, fn_clean)
                        
                        # Collision check with existing file
                        if os.path.exists(out_path):
                            collisions_count += 1
                            rpa_collisions += 1
                            with open(out_path, 'rb') as ef:
                                existing_content = ef.read()
                            if hashlib.sha256(existing_content).digest() == hashlib.sha256(content).digest():
                                # Identical content: already present on disk, do not overwrite or count as newly extracted
                                duplicates_count += 1
                                rpa_duplicates += 1
                                continue
                            else:
                                # Different content: preserve archive version separately
                                base, ext = os.path.splitext(out_path)
                                alt_path = f'{base}.rpa{ext}'
                                if os.path.exists(alt_path):
                                    with open(alt_path, 'rb') as aef:
                                        alt_content = aef.read()
                                    if hashlib.sha256(alt_content).digest() == hashlib.sha256(content).digest():
                                        duplicates_count += 1
                                        rpa_duplicates += 1
                                        continue
                                out_path = alt_path
                                
                        os.makedirs(os.path.dirname(out_path), exist_ok=True)
                        with open(out_path, 'wb') as of:
                            of.write(content)
                        extracted_count += 1
                        rpa_extracted += 1
                    except Exception as ex:
                        errors.append(f'Erro ao extrair {fn_clean} de {rpa_name}: {str(ex)}')
                else:
                    ignored_count += 1
            if rpa_extracted > 0 or rpa_duplicates > 0:
                parts = []
                if rpa_extracted > 0:
                    parts.append(f'{rpa_extracted} novos')
                if rpa_duplicates > 0:
                    parts.append(f'{rpa_duplicates} idênticos')
                if rpa_collisions > 0:
                    parts.append(f'{rpa_collisions} colisões tratadas')
                sources.append(f'arquivo RPA: {rpa_name} ({", ".join(parts)})')
        except Exception as ex:
            errors.append(f'Falha ao ler pacote RPA {rpa_name}: {str(ex)}')
            
    return {
        'ok': (extracted_count > 0 or duplicates_count > 0),
        'rpaFound': len(rpa_files),
        'extracted': extracted_count,
        'duplicates': duplicates_count,
        'collisions': collisions_count,
        'physicalWritten': extracted_count,
        'found': total_found,
        'ignored': ignored_count,
        'errors': len(errors),
        'errorList': errors[:20],
        'sources': sources
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--game', required=True)
    parser.add_argument('--dest', required=True)
    parser.add_argument('--type', default='img')
    args = parser.parse_args()
    
    res = extract_rpa(args.game, args.dest, args.type)
    print(json.dumps(res, ensure_ascii=False))
