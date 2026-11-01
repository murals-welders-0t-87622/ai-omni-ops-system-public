#!/usr/bin/env python3
"""Check local Whisper files without downloading or loading a model."""
import argparse
import json
import os
from pathlib import Path


def check(model, resolver):
    result = {'model': model, 'state': 'unknown', 'model_loaded': False, 'transcription_verified': False}
    try:
        candidate = Path(model)
        snapshot = candidate if candidate.is_dir() else Path(resolver(model, local_files_only=True))
    except Exception:
        result['state'] = 'model_unavailable_offline'
        return result
    required = ('model.bin', 'config.json', 'tokenizer.json')
    result['missing_or_empty'] = [name for name in required if not (snapshot / name).is_file() or (snapshot / name).stat().st_size == 0]
    result['state'] = 'model_files_incomplete' if result['missing_or_empty'] else 'model_files_present_not_loaded'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', default=os.getenv('WHISPER_MODEL_NAME', 'small'))
    args = parser.parse_args()
    try:
        from faster_whisper.utils import download_model
    except Exception:
        print(json.dumps({'model': args.model, 'state': 'runtime_unavailable', 'model_loaded': False, 'transcription_verified': False}))
        return 2
    result = check(args.model, download_model)
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['state'] == 'model_files_present_not_loaded' else 2


if __name__ == '__main__':
    raise SystemExit(main())
