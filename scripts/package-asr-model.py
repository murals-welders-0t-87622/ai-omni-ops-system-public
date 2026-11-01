#!/usr/bin/env python3
"""Copy one downloaded Hugging Face snapshot into an offline runtime cache."""
import argparse
from pathlib import Path
import shutil


def package_snapshot(snapshot_path, hub_path, destination):
    hub = Path(hub_path).resolve(strict=True)
    snapshot = Path(snapshot_path).absolute()
    repo = snapshot.parent.parent
    if (snapshot.parent.name != 'snapshots' or repo.parent != hub
            or not repo.name.startswith('models--') or repo.is_symlink()
            or snapshot.is_symlink() or not snapshot.is_dir()):
        raise ValueError('unexpected model snapshot location')
    repo_root = repo.resolve(strict=True)
    if not snapshot.resolve(strict=True).is_relative_to(repo_root):
        raise ValueError('snapshot resolves outside model cache')
    for item in snapshot.rglob('*'):
        if item.is_symlink():
            resolved = item.resolve(strict=True)
            if not resolved.is_relative_to(repo_root):
                raise ValueError('snapshot link escapes model cache')
    target_repo = Path(destination) / repo.name
    target_snapshot = target_repo / 'snapshots' / snapshot.name
    if target_snapshot.exists():
        raise ValueError('destination snapshot already exists')
    shutil.copytree(snapshot, target_snapshot, symlinks=False)
    refs = target_repo / 'refs'
    refs.mkdir(parents=True, exist_ok=True)
    (refs / 'main').write_text(snapshot.name, encoding='utf-8')
    return target_snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', required=True)
    parser.add_argument('--cache-dir', required=True)
    parser.add_argument('--destination', required=True)
    args = parser.parse_args()
    from faster_whisper.utils import download_model
    snapshot = download_model(args.model, cache_dir=args.cache_dir)
    result = package_snapshot(snapshot, args.cache_dir, args.destination)
    print(f'Packaged offline snapshot: {result.name}')


if __name__ == '__main__':
    main()
