"""Build a deterministic, source-only skill archive, excluding research packages."""
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PACKAGE = ROOT / 'package' / 'ocean-ads-operations'


def build():
    version = re.search(r'(?m)^  version: (\d+\.\d+\.\d+)\s*$', (PACKAGE / 'SKILL.md').read_text(encoding='utf-8')).group(1)
    files = sorted(p for p in PACKAGE.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    for source in files:
        if source.suffix == '.md':
            for link in re.findall(r'\]\(([^)]+)\)', source.read_text(encoding='utf-8')):
                if '://' in link or link.startswith('#'):
                    continue
                target = (source.parent / link.split('#')[0]).resolve()
                if not target.is_relative_to(PACKAGE) or not target.is_file():
                    raise ValueError(f'Broken or escaping package reference: {source.name}: {link}')
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    archive = dist / f'ocean-ads-operations-{version}.zip'
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        for source in files:
            info = zipfile.ZipInfo('ocean-ads-operations/' + source.relative_to(PACKAGE).as_posix(), (2026, 10, 24, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, source.read_bytes())
    data = buffer.getvalue()
    if archive.exists() and archive.read_bytes() != data:
        raise ValueError('Existing version archive differs; bump version instead of overwriting')
    archive.write_bytes(data)
    manifest = {'name': 'ocean-ads-operations', 'version': version, 'archive': archive.name,
                'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
                'files': [{'path': p.relative_to(PACKAGE).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],
                'nativeBuddyCreated': False, 'businessExecutionVerified': False}
    encoded = json.dumps(manifest, ensure_ascii=False, indent=2)
    versioned_manifest = dist / f'release-manifest-{version}.json'
    if versioned_manifest.exists() and versioned_manifest.read_text(encoding='utf-8') != encoded:
        raise ValueError('Existing version manifest differs; bump version')
    versioned_manifest.write_text(encoded, encoding='utf-8')
    (dist / 'release-manifest.json').write_text(encoded, encoding='utf-8')
    print(json.dumps({'archive': str(archive), 'files': len(files), 'sha256': manifest['sha256']}))


if __name__ == '__main__':
    build()
