from __future__ import annotations

import argparse
import hashlib
import re
import shutil
from pathlib import Path


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_obj:
        for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_exact_copy(source: Path, destination: Path) -> None:
    shutil.copy2(source, destination)
    if source.read_bytes() != destination.read_bytes():
        raise RuntimeError(f"Copy verification failed: '{source}' -> '{destination}'")


def to_flask_template(html: str) -> str:
    """Convert static frontend asset paths into Flask url_for paths."""
    css_pattern = re.compile(r'href=["\']css/style\.css(?P<query>\?[^"\']*)?["\']')
    js_pattern = re.compile(r'src=["\']js/app\.js(?P<query>\?[^"\']*)?["\']')
    icon_pattern = re.compile(r'href=["\']favicon\.svg(?P<query>\?[^"\']*)?["\']')

    html = css_pattern.sub(
        lambda m: (
            f'href="{{{{ url_for(\'static\', filename=\'css/style.css\') }}}}{m.group("query") or ""}"'
        ),
        html,
    )
    html = js_pattern.sub(
        lambda m: (
            f'src="{{{{ url_for(\'static\', filename=\'js/app.js\') }}}}{m.group("query") or ""}"'
        ),
        html,
    )
    html = icon_pattern.sub(
        lambda m: (
            f'href="{{{{ url_for(\'static\', filename=\'favicon.svg\') }}}}{m.group("query") or ""}"'
        ),
        html,
    )
    return html


def sync_frontend(source_dir: Path, project_root: Path) -> None:
    template_dir = project_root / "templates"
    static_css_dir = project_root / "static" / "css"
    static_js_dir = project_root / "static" / "js"
    static_dir = project_root / "static"

    source_index = source_dir / "index.html"
    source_css = source_dir / "css" / "style.css"
    source_js = source_dir / "js" / "app.js"
    source_favicon = source_dir / "favicon.svg"

    if not source_dir.exists() or not source_dir.is_dir():
        raise FileNotFoundError(f"Source folder does not exist: {source_dir}")

    required_files = [source_index, source_css, source_js]
    missing = [str(p) for p in required_files if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing source files:\n" + "\n".join(missing))

    template_dir.mkdir(parents=True, exist_ok=True)
    static_css_dir.mkdir(parents=True, exist_ok=True)
    static_js_dir.mkdir(parents=True, exist_ok=True)

    raw_html = source_index.read_text(encoding="utf-8")
    flask_html = to_flask_template(raw_html)
    (template_dir / "index.html").write_text(flask_html, encoding="utf-8")

    destination_css = static_css_dir / "style.css"
    destination_js = static_js_dir / "app.js"

    ensure_exact_copy(source_css, destination_css)
    ensure_exact_copy(source_js, destination_js)

    if source_favicon.exists():
        destination_favicon = static_dir / "favicon.svg"
        ensure_exact_copy(source_favicon, destination_favicon)

    print("Sync completed successfully.")
    print(f"- HTML template updated: {template_dir / 'index.html'}")
    print(
        f"- CSS synced: {source_css} -> {destination_css} (sha256: {file_sha256(destination_css)[:12]})"
    )
    print(
        f"- JS synced:  {source_js} -> {destination_js} (sha256: {file_sha256(destination_js)[:12]})"
    )
    if source_favicon.exists():
        print("- Favicon synced: static/favicon.svg")


def main() -> None:
    project_root = Path(__file__).resolve().parent
    default_source = project_root / "sidechick-frontend"

    parser = argparse.ArgumentParser(
        description="Sync sidechick-frontend into Flask templates/static folders."
    )
    parser.add_argument(
        "--source",
        default=str(default_source),
        help="Path to sidechick-frontend folder.",
    )
    args = parser.parse_args()

    source_dir = Path(args.source).expanduser().resolve()

    sync_frontend(source_dir=source_dir, project_root=project_root)
    print(f"Source: {source_dir}")
    print(f"Project: {project_root}")


if __name__ == "__main__":
    main()
