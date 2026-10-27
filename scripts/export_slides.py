"""PPTX / PDF からスライド画像を出力（Windows / macOS / Linux 共通）。"""

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def find_libreoffice():
    override = os.environ.get("SOFFICE")
    candidates = [override] if override else ["soffice.com", "soffice", "libreoffice"]
    if not override:
        candidates += [
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
            str(Path.home() / "Applications/LibreOffice.app/Contents/MacOS/soffice"),
        ]
        for key in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"):
            if os.environ.get(key):
                base = Path(os.environ[key])
                if key == "LOCALAPPDATA":
                    base /= "Programs"
                candidates += [str(base / "LibreOffice/program" / name) for name in ("soffice.com", "soffice.exe")]
    for candidate in candidates:
        executable = shutil.which(candidate)
        if executable:
            return executable
    raise ValueError("LibreOffice が見つかりません。インストールするか、SOFFICE に実行ファイルのパスを設定してください。PowerPoint から保存した PDF も入力できます。")


def convert_to_pdf(source, work):
    result = subprocess.run([
        find_libreoffice(), f"-env:UserInstallation={(work / 'profile').as_uri()}",
        "--headless", "--convert-to", "pdf:impress_pdf_Export", "--outdir", str(work), str(source),
    ], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180)
    pdf = work / (source.stem + ".pdf")
    # LibreOffice は変換失敗時も終了コード 0 を返す場合がある。
    if result.returncode or not pdf.is_file() or not pdf.stat().st_size:
        raise ValueError("LibreOffice で PDF を作成できませんでした。\n" + (result.stderr or result.stdout).strip())
    return pdf


def render_pdf(pdf, output, width):
    try:
        import pymupdf
    except ImportError:
        raise ValueError("PyMuPDF が必要です。使用する Python で -m pip install -r scripts/requirements-slides.txt を実行してください。") from None

    with pymupdf.open(pdf) as document:
        if not document.is_pdf or document.needs_pass or not document.page_count:
            raise ValueError("パスワードのない、1 ページ以上の PDF を指定してください。")
        output.parent.mkdir(parents=True, exist_ok=True)
        # 全ページの変換が成功するまで、公開中のスライド画像を変更しない。
        with tempfile.TemporaryDirectory(prefix=".slides-", dir=output.parent) as temporary:
            work = Path(temporary)
            staged = work / "images"
            staged.mkdir()
            for number, page in enumerate(document, 1):
                scale = width / page.rect.width
                image = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), colorspace=pymupdf.csRGB, alpha=False)
                image.save(staged / f"slide-{number:02d}.jpg", jpg_quality=85)
            backup = work / "previous"
            if output.exists():
                output.rename(backup)
            try:
                staged.rename(output)
            except OSError:
                if backup.exists():
                    backup.rename(output)
                raise
        return document.page_count


def positive_width(value):
    width = int(value)
    if width <= 0:
        raise argparse.ArgumentTypeError("幅は 1 以上の整数で指定してください。")
    return width


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help=".pptx または .pdf ファイル")
    parser.add_argument("--out-dir", type=Path, help="画像の出力先（既定：presentation/slides/<ファイル名>）")
    parser.add_argument("--width", type=positive_width, default=1600, help="画像の幅（既定：1600 px）")
    args = parser.parse_args(argv)
    try:
        source = args.source.resolve()
        if source.suffix.lower() not in (".pptx", ".pdf") or not source.is_file():
            raise ValueError("存在する .pptx または .pdf ファイルを指定してください。")
        output = (args.out_dir or ROOT / "presentation/slides" / source.stem).resolve()
        if output == source or output in source.parents:
            raise ValueError("入力ファイルを含むフォルダーは出力先に指定できません。")
        if output.exists() and not output.is_dir():
            raise ValueError("出力先にはフォルダーを指定してください。")
        with tempfile.TemporaryDirectory(prefix="research-slides-") as temporary:
            if source.suffix.lower() == ".pptx":
                print("LibreOffice で PDF に変換します。フォント・版式が変わる場合は、PowerPoint から保存した PDF を入力してください。", flush=True)
                pdf = convert_to_pdf(source, Path(temporary))
            else:
                pdf = source
            count = render_pdf(pdf, output, args.width)
        print(f"✓ {count} 枚のスライドを {output} に出力しました。")
        return 0
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        print(f"スライド画像を出力できませんでした：{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
