"""Cross-platform slide conversion, including real PDF rendering when installed."""

from contextlib import redirect_stderr
import importlib.util
import io
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("export_slides", Path(__file__).parents[1] / "export_slides.py")
slides = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(slides)


class ConversionTests(unittest.TestCase):
    def test_windows_standard_install_path_with_spaces(self):
        with tempfile.TemporaryDirectory() as temporary:
            executable = Path(temporary) / "Program Files/LibreOffice/program/soffice.com"
            executable.parent.mkdir(parents=True)
            executable.touch()
            with patch.dict(os.environ, {"ProgramFiles": str(Path(temporary) / "Program Files")}, clear=True):
                with patch.object(slides.shutil, "which", side_effect=lambda name: str(executable) if name == str(executable) else None):
                    self.assertEqual(slides.find_libreoffice(), str(executable))

    def test_explicit_libreoffice_override_is_not_silently_ignored(self):
        with patch.dict(os.environ, {"SOFFICE": "missing-soffice"}), patch.object(slides.shutil, "which", return_value=None):
            with self.assertRaisesRegex(ValueError, "SOFFICE"):
                slides.find_libreoffice()

    def test_libreoffice_success_exit_without_pdf_is_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            work = Path(temporary)
            with patch.object(slides, "find_libreoffice", return_value="soffice"), patch.object(slides.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "", "conversion failed")) as run:
                with self.assertRaisesRegex(ValueError, "conversion failed"):
                    slides.convert_to_pdf(work / "研究 slides.pptx", work)
            command = run.call_args.args[0]
            self.assertIn(str(work / "研究 slides.pptx"), command)
            self.assertIn(f"-env:UserInstallation={(work / 'profile').as_uri()}", command)

    def test_invalid_input_does_not_touch_existing_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "images"
            output.mkdir()
            previous = output / "slide-01.jpg"
            previous.write_bytes(b"previous slide")
            with redirect_stderr(io.StringIO()):
                self.assertEqual(slides.main([str(Path(temporary) / "missing.pptx"), "--out-dir", str(output)]), 1)
            self.assertEqual(previous.read_bytes(), b"previous slide")


@unittest.skipUnless(importlib.util.find_spec("pymupdf"), "Optional PyMuPDF is not installed")
class RenderingTests(unittest.TestCase):
    def setUp(self):
        import pymupdf
        self.pymupdf = pymupdf
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.source = self.root / "研究 slides.PDF"
        self.output = self.root / "slide images"
        with pymupdf.open() as document:
            page = document.new_page(width=800, height=450)
            page.insert_text((40, 60), "研究スライド / Slide 1", fontname="japan", fontsize=24)
            document.new_page(width=600, height=800).set_rotation(90)
            document.save(self.source)
        self.output.mkdir()
        (self.output / "slide-99.jpg").write_bytes(b"stale slide")

    def test_real_pdf_numbering_width_rotation_and_stale_slide_cleanup(self):
        self.assertEqual(slides.render_pdf(self.source, self.output, 1600), 2)
        self.assertEqual(sorted(file.name for file in self.output.iterdir()), ["slide-01.jpg", "slide-02.jpg"])
        for number, height in ((1, 900), (2, 1200)):
            image = self.pymupdf.Pixmap(self.output / f"slide-{number:02d}.jpg")
            self.assertEqual((image.width, image.height, image.alpha), (1600, height, 0))
            self.assertEqual(image.pixel(0, 0), (255, 255, 255))
            if number == 1:
                self.assertLess(min(image.samples), 100, "Japanese text must be visible on the white page")

    def test_failed_second_page_preserves_previous_slides(self):
        original = self.pymupdf.Page.get_pixmap

        def fail_on_second_page(page, **kwargs):
            if page.number == 1:
                raise RuntimeError("render failed")
            return original(page, **kwargs)

        with patch.object(self.pymupdf.Page, "get_pixmap", fail_on_second_page):
            with self.assertRaisesRegex(RuntimeError, "render failed"):
                slides.render_pdf(self.source, self.output, 1600)
        self.assertEqual(sorted(file.name for file in self.output.iterdir()), ["slide-99.jpg"])
        self.assertEqual((self.output / "slide-99.jpg").read_bytes(), b"stale slide")

    def test_input_folder_cannot_be_replaced_by_output(self):
        with redirect_stderr(io.StringIO()):
            self.assertEqual(slides.main([str(self.source), "--out-dir", str(self.root)]), 1)
        self.assertTrue(self.source.is_file())

    @unittest.skipUnless(shutil.which("node"), "Node.js is not installed")
    def test_node_entry_point_with_unicode_paths_and_pdf_without_libreoffice(self):
        env = {**os.environ, "PYTHON": sys.executable, "SOFFICE": "not-installed"}
        result = subprocess.run([
            "node", str(slides.ROOT / "scripts/export-slides.mjs"), str(self.source),
            "--out-dir", str(self.output), "--width", "800",
        ], env=env, capture_output=True, text=True, encoding="utf-8", timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        image = self.pymupdf.Pixmap(self.output / "slide-01.jpg")
        self.assertEqual(image.width, 800)


if __name__ == "__main__":
    unittest.main()
