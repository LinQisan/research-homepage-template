"""Regression checks for deployment boundaries; no server or credentials needed."""

from contextlib import redirect_stderr, redirect_stdout
import ftplib
import importlib.util
import io
import os
from pathlib import Path, PurePosixPath
import ssl
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("deploy_ftps", Path(__file__).parents[1] / "deploy-ftps.py")
deploy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(deploy)

CONFIG = {
    "FTPS_HOST": "school.invalid",
    "FTPS_USERNAME": "test-user",
    "FTPS_PASSWORD": "space ' \" $;`password",
    "FTPS_REMOTE_DIR": "/public_html/my site",
}


class MemoryFTP:
    """Model remote directories/files so incorrect destination paths are visible."""

    def __init__(self, **kwargs):
        self.context = kwargs["context"]
        self.directories = {"/", CONFIG["FTPS_REMOTE_DIR"]}
        self.current = "/"
        self.files = {CONFIG["FTPS_REMOTE_DIR"] + "/old.html": b"keep me"}
        self.uploads = []
        self.protected = False

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def connect(self, host, port):
        self.connection = (host, port)

    def login(self, username, password):
        self.credentials = (username, password)

    def prot_p(self):
        self.protected = True

    def set_pasv(self, value):
        self.passive = value

    def resolve(self, name):
        return str(PurePosixPath(self.current) / name)

    def cwd(self, name):
        target = self.resolve(name)
        if target not in self.directories:
            raise ftplib.error_perm("550 Directory unavailable")
        self.current = target

    def pwd(self):
        return self.current

    def mkd(self, name):
        self.directories.add(self.resolve(name))

    def storbinary(self, command, stream, **_kwargs):
        if not self.protected:
            raise AssertionError("File data must be encrypted")
        target = self.resolve(command.removeprefix("STOR "))
        self.uploads.append(target)
        self.files[target] = stream.read()


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dist = self.root / "dist"
        self.dist.mkdir()
        (self.dist / "index.html").write_bytes(b"new homepage")
        # Remove only deployment settings; Windows needs SYSTEMROOT etc. for SSL.
        self.env = patch.dict(os.environ)
        self.env.start()
        self.addCleanup(self.env.stop)
        for key in (*deploy.REQUIRED, "FTPS_PORT", "GITHUB_STEP_SUMMARY"):
            os.environ.pop(key, None)
        self.output = io.StringIO()
        self.stdout = redirect_stdout(self.output)
        self.stdout.__enter__()
        self.addCleanup(self.stdout.__exit__, None, None, None)

    def test_blank_secrets_skip_without_connection_and_write_summary(self):
        summary = self.root / "summary.md"
        with patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(summary)}), patch.object(deploy, "ROOT", self.root), patch.object(deploy.ftplib, "FTP_TLS") as ftp:
            self.assertEqual(deploy.main(["--skip-if-unconfigured"]), 0)
        ftp.assert_not_called()
        self.assertIn("スキップ", summary.read_text(encoding="utf-8"))

    def test_partial_configuration_and_invalid_inputs_fail(self):
        for changes in ({"FTPS_PASSWORD": ""}, {"FTPS_HOST": "ftp://school.invalid"}, {"FTPS_PORT": "0"}, {"FTPS_PORT": "abc"}, {"FTPS_REMOTE_DIR": "../other"}, {"FTPS_PASSWORD": "bad\ncommand"}):
            with self.subTest(changes=changes), patch.dict(os.environ, {**CONFIG, **changes}):
                with self.assertRaises(ValueError):
                    deploy.configuration(skip_if_unconfigured=True)

    def test_no_anonymous_login_when_run_locally_without_configuration(self):
        with self.assertRaises(ValueError):
            deploy.configuration()

    def test_dry_run_needs_no_credentials_or_server(self):
        with patch.object(deploy, "ROOT", self.root), patch.object(deploy.ftplib, "FTP_TLS") as ftp:
            self.assertEqual(deploy.main(["--dry-run"]), 0)
        ftp.assert_not_called()
        self.assertIn("index.html", self.output.getvalue())

    def test_recursive_binary_upload_stays_inside_target_and_preserves_old_files(self):
        resources = {"assets/app.js": b"javascript", "images/研究 notes.bin": bytes(range(256)), "projects/detail.html": b"page", "about.html": b"about"}
        for name, content in resources.items():
            file = self.dist / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(content)
        (self.dist / ".DS_Store").write_bytes(b"metadata")
        (self.dist / ".gitkeep").touch()
        with patch.dict(os.environ, CONFIG):
            config = deploy.configuration()
        ftp = MemoryFTP(context=ssl.create_default_context())
        with patch.object(deploy.ftplib, "FTP_TLS", return_value=ftp) as factory:
            deploy.deploy(config, self.dist, deploy.upload_files(self.dist))
        context = factory.call_args.kwargs["context"]
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertEqual(ftp.credentials, (CONFIG["FTPS_USERNAME"], CONFIG["FTPS_PASSWORD"]))
        self.assertEqual(ftp.connection, (CONFIG["FTPS_HOST"], 21))
        self.assertTrue(ftp.passive)
        base = CONFIG["FTPS_REMOTE_DIR"] + "/"
        self.assertEqual(ftp.files[base + "old.html"], b"keep me")
        self.assertEqual(ftp.files[base + "index.html"], b"new homepage")
        for name, content in resources.items():
            self.assertEqual(ftp.files[base + name], content)
        self.assertEqual(ftp.uploads[-1], base + "index.html")
        self.assertEqual(len(ftp.uploads), len(resources) + 1)

    def test_missing_target_is_not_created(self):
        with patch.dict(os.environ, CONFIG):
            config = deploy.configuration()
        ftp = MemoryFTP(context=ssl.create_default_context())
        ftp.directories = {"/"}
        with patch.object(deploy.ftplib, "FTP_TLS", return_value=ftp):
            with self.assertRaises(ftplib.error_perm):
                deploy.deploy(config, self.dist, deploy.upload_files(self.dist))
        self.assertEqual(ftp.directories, {"/"})

    def test_missing_build_and_symlinks_fail_before_connecting(self):
        (self.dist / "index.html").unlink()
        with self.assertRaises(ValueError):
            deploy.upload_files(self.dist)
        (self.dist / "index.html").write_text("homepage")
        (self.dist / "outside").symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            deploy.upload_files(self.dist)

    def test_tls_and_upload_failures_return_nonzero_and_redact_secrets(self):
        for error in (ssl.SSLCertVerificationError("untrusted certificate"), ftplib.error_perm("553 failed " + CONFIG["FTPS_PASSWORD"]), TimeoutError("timed out")):
            stderr = io.StringIO()
            with self.subTest(error=error), patch.dict(os.environ, CONFIG), patch.object(deploy, "ROOT", self.root), patch.object(deploy, "deploy", side_effect=error), redirect_stderr(stderr):
                self.assertEqual(deploy.main([]), 1)
            self.assertNotIn(CONFIG["FTPS_PASSWORD"], stderr.getvalue())
            self.assertNotIn("デプロイ完了：", self.output.getvalue())


if __name__ == "__main__":
    unittest.main()
