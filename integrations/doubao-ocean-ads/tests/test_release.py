import contextlib
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('release', Path(__file__).parents[1] / 'build_release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class Release(unittest.TestCase):
    def setUp(self):
        self.temp_base = Path(__file__).resolve().parents[1] / '.test-tmp'
        self.temp_base.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=self.temp_base)
        self.root = Path(self.temp.name)
        assert self.root.resolve().is_relative_to(self.temp_base.resolve())
        self.original = release.ROOT, release.PACKAGE
        release.ROOT = self.root
        release.PACKAGE = self.root / 'package/ocean-ads-operations'
        release.PACKAGE.mkdir(parents=True)
        (release.PACKAGE / 'SKILL.md').write_text('---\nname: ocean-ads-operations\nmetadata:\n  version: 1.0.1\n---\nBody\n', encoding='utf-8')

    def tearDown(self):
        release.ROOT, release.PACKAGE = self.original
        assert self.root.resolve().is_relative_to(self.temp_base.resolve())
        self.temp.cleanup()

    def build(self):
        with contextlib.redirect_stdout(io.StringIO()):
            release.build()
        return self.root / 'dist/ocean-ads-operations-1.0.1.zip'

    def test_same_version_rebuild_is_deterministic(self):
        archive = self.build()
        first = hashlib.sha256(archive.read_bytes()).hexdigest()
        self.build()
        self.assertEqual(first, hashlib.sha256(archive.read_bytes()).hexdigest())
        self.assertTrue((self.root / 'dist/release-manifest-1.0.1.json').is_file())

    def test_same_version_change_cannot_replace_archive(self):
        archive = self.build()
        first = archive.read_bytes()
        with (release.PACKAGE / 'SKILL.md').open('a', encoding='utf-8') as output:
            output.write('Changed body\n')
        with self.assertRaisesRegex(ValueError, 'bump version'):
            self.build()
        self.assertEqual(first, archive.read_bytes())
