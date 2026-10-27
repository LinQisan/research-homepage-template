# research-homepage-template

研究内容・発表資料・自己紹介を載せる個人サイトのテンプレートです。Node.js で静的 HTML を生成します。依存パッケージはなく、`npm install` も不要です。

- トップ・プロジェクト・資料（記事）・自己紹介の 4 ページ構成
- 内容は `content/` の JS と Markdown を書き換えるだけ
- ライト／ダーク表示、目次、コードのコピー、グラフや図の部品
- スライド＋原稿の「発表モード」（任意）
- 相対パスで出力するため、ドメイン直下にもサブディレクトリにも置ける
- GitHub Actions で FTPS 自動デプロイ（任意）

## はじめかた

Node.js 18 以上が必要です（Windows・macOS・Linux）。

1. GitHub のこのページで **Use this template → Create a new repository** を押し、自分のリポジトリを作ります。
2. 作ったリポジトリを手元にコピーし、開発用サーバーを起動します（`<あなたのユーザー名>/<リポジトリ名>` は自分のものに置き換えます）。

```bash
git clone https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
cd <リポジトリ名>
npm run dev
```

[http://localhost:4321/](http://localhost:4321/) を開くと、ファイルを保存するたびに自動で反映されます。

3. 下の表のファイルを自分の内容に書き換えます。まずは `content/site.js` の名前・サイト名・紹介文からはじめてください。氏名が初期値のままだとビルド時に注意が表示されます。

## 内容の編集

| ファイル・フォルダー | 内容 |
| --- | --- |
| `content/site.js` | サイト名・プロフィール・研究テーマ・外部リンク・自己紹介 |
| `content/projects/` | 研究プロジェクト（`_template.js` をコピーして追加。`example-project.js` は見本） |
| `content/talks.js`・`content/talks/` | 資料の一覧と、記事本文の Markdown（`markdown-guide.md` は書式の見本） |
| `content/presentations.js`・`presentation/` | スライドと発表原稿（任意） |
| `public/` | 画像・PDF・favicon などの公開ファイル（そのままサイトにコピーされます） |
| `src/` | ページのテンプレート・CSS・JavaScript（デザインを変えたいとき） |

- 見本の `example-project.js`・`markdown-guide.md`・`public/images/projects/example-project/` は、自分の内容を書いたら削除してください。
- 項目を空欄（`''`・`[]`・`null`）にすると、その部分は表示されません。
- ファイル名は半角英数字・ハイフンにすると、どのサーバーでも確実に開けます。
- 配色は `src/assets/style.css` の先頭の変数（`--accent` など）で変えられます。

## ビルド・確認

```bash
npm run build
npm run check
```

生成先は `dist/` です。`npm run check` はリンク切れや画像の欠けを確かめます。`npm run preview` でビルド結果を確認でき、`npm run preview:sub` でサブディレクトリに置いた場合の表示も確かめられます。

公開するには、`dist/` の**中身**をサーバーの公開フォルダーにアップロードします。静的ファイルとして配信できるサーバー（Apache・nginx・IIS・GitHub Pages など）ならどこでも動き、公開先に Node.js や Python は不要です。

`content/site.js` の `siteUrl` に公開 URL を書くと、`sitemap.xml`・`robots.txt`・canonical タグも生成されます。公開後は次のコマンドで、公開サイトのリンクを確かめられます。

```bash
npm run check:remote -- https://www.example.ac.jp/~yourname/
```

## GitHub Actions でデプロイ（任意）

`main` に push すると、ビルド・リンク確認・テストの後、FTPS（明示的 TLS）でアップロードします。Pull Request では確認のみ行います。接続情報は、リポジトリの **Settings → Secrets and variables → Actions** に登録します。

| Repository secret | 設定内容 |
| --- | --- |
| `FTPS_HOST` | サーバーのホスト名または IPv4 アドレス（プロトコル・ポート・パスを含めない） |
| `FTPS_USERNAME` | ユーザー名 |
| `FTPS_PASSWORD` | パスワード |
| `FTPS_REMOTE_DIR` | アップロード先の公開ディレクトリ（事前に作成しておく） |

4 項目がすべて空の場合はアップロードをスキップします。一部だけ設定されている場合はエラーになります。ポートを変える場合は Repository variable に `FTPS_PORT` を登録します（既定値：`21`）。同名ファイルは上書きしますが、サーバー上の古いファイルは削除しません。

FTPS を使わない場合は、`.github/workflows/deploy-ftps.yml` を削除してかまいません。`compatibility.yml` は Windows・macOS・Linux でのビルド確認です。

ローカルからデプロイする場合（Python 3.10 以上）は、`.env.deploy.example` を `.env.deploy` にコピーして設定し、読み込んでから実行します。`--dry-run` を付けると接続せずにアップロード対象だけを表示します。

```bash
set -a
source .env.deploy
set +a
python3 scripts/deploy-ftps.py --dry-run
```

Windows の PowerShell では `$env:FTPS_HOST = '...'` のように環境変数を設定してから `python scripts/deploy-ftps.py` を実行します。認証情報は Git にコミットしないでください（`.env*` は `.gitignore` 済みです）。

## スライドと原稿の発表ページ（任意）

`content/presentations.js` に登録すると、スライド画像と原稿を並べたページと、発表者用の「発表モード」が作られます。スライド画像は PowerPoint や PDF から作ります。

```bash
python -m pip install -r scripts/requirements-slides.txt
npm run slides -- presentation/my-talk.pdf
```

Python 3.10 以上と PyMuPDF が必要です。PowerPoint で保存した PDF を使う方法がおすすめです。`.pptx` を直接変換する場合は [LibreOffice](https://www.libreoffice.org/download/download-libreoffice/) も必要です（見つからない場合は `SOFFICE` 環境変数に実行ファイルのパスを指定）。出力先は `presentation/slides/<ファイル名>/slide-01.jpg` 以降で、幅は `--width 2000` などで変えられます。

## フォルダー構成

```
content/      サイトの内容（ここを編集）
public/       画像・ファイル（そのまま公開）
presentation/ 発表スライドと原稿（任意）
src/          ビルドスクリプト・テンプレート・CSS・JS
scripts/      開発サーバー・リンク確認・デプロイ・スライド変換
dist/         ビルド結果（自動生成。Git には含めない）
```
