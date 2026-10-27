#!/usr/bin/env python3
"""Upload dist/ contents using explicit FTPS and Python's standard library."""

import argparse
import ftplib
import os
from pathlib import Path
import ssl
import sys

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = ("FTPS_HOST", "FTPS_USERNAME", "FTPS_PASSWORD", "FTPS_REMOTE_DIR")
IGNORED = {".DS_Store", ".gitkeep"}


def report(message):
    print(message, flush=True)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write(message + "\n\n")


def configuration(skip_if_unconfigured=False):
    values = {key: os.environ.get(key, "") for key in REQUIRED}
    missing = [key for key, value in values.items() if not value.strip()]
    if skip_if_unconfigured and len(missing) == len(REQUIRED):
        report("FTPS の Secrets が未設定のため、デプロイをスキップしました（ビルドと確認は完了）。")
        return None
    if missing:
        raise ValueError("GitHub Secrets / 環境変数を設定してください：" + ", ".join(missing))
    for key, value in values.items():
        if any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError(f"{key} に改行や制御文字は使えません。")
    host = values["FTPS_HOST"]
    if any(char in host for char in "/:@ \\"):
        raise ValueError("FTPS_HOST にはホスト名または IPv4 アドレスだけを書いてください（プロトコル・ポート・パスは不要）。")
    if ".." in values["FTPS_REMOTE_DIR"].split("/"):
        raise ValueError("FTPS_REMOTE_DIR に .. は使えません。")
    try:
        port = int(os.environ.get("FTPS_PORT", "") or "21")
    except ValueError:
        raise ValueError("FTPS_PORT は 1〜65535 の整数で指定してください。") from None
    if not 1 <= port <= 65535:
        raise ValueError("FTPS_PORT は 1〜65535 の整数で指定してください。")
    return {**values, "port": port}


def upload_files(dist):
    if not dist.is_dir() or not (dist / "index.html").is_file():
        raise ValueError("dist/index.html がありません。先に npm run build を実行してください。")
    files = []
    for entry in sorted(dist.rglob("*")):
        relative = entry.relative_to(dist)
        if any(part in IGNORED for part in relative.parts):
            continue
        if entry.is_symlink():
            raise ValueError(f"シンボリックリンクはアップロードできません：{relative.as_posix()}")
        if any(ord(char) < 32 or ord(char) == 127 for char in relative.as_posix()):
            raise ValueError("dist/ のファイル名に改行や制御文字は使えません。")
        if entry.is_file():
            files.append(relative)
    # Upload resources first, then HTML, and the homepage last.
    return sorted(files, key=lambda p: (p == Path("index.html"), p.suffix == ".html", p.as_posix()))


def enter_directory(ftp, name):
    try:
        ftp.cwd(name)
    except ftplib.error_perm as error:
        if not str(error).startswith("550"):
            raise
        ftp.mkd(name)
        ftp.cwd(name)


def deploy(config, dist, files):
    # Never disable certificate/hostname verification or fall back to plain FTP.
    context = ssl.create_default_context()
    with ftplib.FTP_TLS(context=context, timeout=60, encoding="utf-8") as ftp:
        ftp.connect(config["FTPS_HOST"], config["port"])
        ftp.login(config["FTPS_USERNAME"], config["FTPS_PASSWORD"])
        ftp.prot_p()  # Encrypt file data as well as authentication/control traffic.
        ftp.set_pasv(True)
        # Require the configured site root to exist; only create its children.
        ftp.cwd(config["FTPS_REMOTE_DIR"])
        remote_root = ftp.pwd()
        for relative in files:
            ftp.cwd(remote_root)
            for part in relative.parts[:-1]:
                enter_directory(ftp, part)
            with (dist / relative).open("rb") as stream:
                ftp.storbinary(f"STOR {relative.name}", stream, blocksize=64 * 1024)
            print(f"アップロード：{relative.as_posix()}", flush=True)
    report(f"FTPS デプロイ完了：{len(files)} 件をアップロードしました（サーバー上のほかのファイルは残しています）。")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="接続せずに dist/ のアップロード対象を表示する")
    parser.add_argument("--skip-if-unconfigured", action="store_true", help="必須の 4 項目がすべて空ならデプロイをスキップする")
    args = parser.parse_args(argv)
    try:
        dist = ROOT / "dist"
        files = upload_files(dist)
        if args.dry_run:
            for relative in files:
                print(relative.as_posix())
            print(f"予行完了：{len(files)} 件（サーバーには接続していません）。")
            return 0
        config = configuration(args.skip_if_unconfigured)
        if config is not None:
            deploy(config, dist, files)
        return 0
    except (ValueError, *ftplib.all_errors) as error:
        # Servers may echo input in error replies. Redact configured secrets too.
        message = str(error)
        secrets = sorted((os.environ.get(key, "") for key in REQUIRED), key=len, reverse=True)
        for secret in secrets:
            if secret:
                message = message.replace(secret, "***")
        print(f"FTPS デプロイ失敗（{type(error).__name__}）：{message}", file=sys.stderr)
        report("FTPS デプロイは完了していません。ログを確認し、修正後にワークフローを再実行してください。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
