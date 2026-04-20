# Learn Happy (MkDocs)

A Markdown + [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) version of the guide in `learn/coach-visual-explainer/`.

## Run locally

From this directory:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/mkdocs serve
```

Open the URL printed in the terminal (usually `http://127.0.0.1:8000`).

## Build static site

```bash
.venv/bin/mkdocs build
```

Output is written to `site/` (gitignored).

## If you see “not found” (404)

MkDocs output must be served over **HTTP**, not opened as `file:///…/site/index.html`. Asset paths break in the browser without a server.

**Preview locally (pick one):**

```bash
.venv/bin/mkdocs serve -a 127.0.0.1:8765
```

Then open **http://127.0.0.1:8765/** (trailing paths like `/start-here/` use a trailing slash by default).

Or serve the built folder:

```bash
cd site && python3 -m http.server 8765 --bind 127.0.0.1
```

**Deploy to static hosting:** upload the **contents** of `site/` (the folder *inside* `site`, not the repo root), or set the host’s “publish directory” to `learn2/site` after `mkdocs build`. If the site lives under a subpath (e.g. `/docs/learn2/`), set `site_url` in `mkdocs.yml` to that full base URL and rebuild.
