#!/usr/bin/env python3
"""生成站源模块索引 index.json。

应用「模块」页从索引读取可安装的模块：索引里的 `repo` / `tag` / `path` 指向模块文件所在
位置，`sha256` 用来校验下载到的 manifest.json 与 main.js。

用法：
    python3 .github/scripts/module_index.py            # 写入仓库根目录的 index.json
    python3 .github/scripts/module_index.py --check     # 只校验，不写文件
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKIP_DIRS = {"dist", "build", ".git", ".github", "node_modules"}
MODULE_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,31}$")
MODULE_VERSION = re.compile(r"^\d+\.\d+\.\d+$")
API_VERSION = 1
DEFAULT_REPO = "jqk4388/guoapp-modules-private"


def repository() -> str:
    name = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if name:
        return name
    try:
        remote = subprocess.check_output(
            ["git", "remote", "get-url", "origin"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return DEFAULT_REPO
    match = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$", remote)
    return match.group(1) if match else DEFAULT_REPO


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_entry(directory: Path, repo: str) -> dict | None:
    manifest_path = directory / "manifest.json"
    entry_path = directory / "main.js"
    if not manifest_path.is_file() or not entry_path.is_file():
        return None
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(manifest, dict):
        return None
    identifier = manifest.get("id")
    version = manifest.get("version")
    if not isinstance(identifier, str) or not MODULE_ID.match(identifier) or identifier != directory.name:
        return None
    if not isinstance(version, str) or not MODULE_VERSION.match(version):
        return None
    if manifest.get("api") != API_VERSION:
        return None
    name = manifest.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    return {
        "id": identifier,
        "name": name.strip(),
        "version": version,
        "description": str(manifest.get("description") or ""),
        "api": API_VERSION,
        "adult": bool(manifest.get("adult")),
        "repo": repo,
        "tag": f"{identifier}-v{version}",
        "path": identifier,
        "sha256": {"manifest.json": digest(manifest_path), "main.js": digest(entry_path)},
    }


def build(repo: str) -> dict:
    modules = []
    for directory in sorted(ROOT.iterdir()):
        if not directory.is_dir() or directory.name in SKIP_DIRS or directory.name.startswith("."):
            continue
        entry = read_entry(directory, repo)
        if entry is not None:
            modules.append(entry)
    modules.sort(key=lambda item: item["id"])
    return {"format": API_VERSION, "modules": modules}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="只校验现有 index.json 是否最新")
    parser.add_argument("--repo", default="", help="索引里写出的仓库名，默认取 GITHUB_REPOSITORY 或 origin")
    options = parser.parse_args()
    index = build(options.repo.strip() or repository())
    text = json.dumps(index, ensure_ascii=False, indent=2, sort_keys=False) + "\n"
    target = ROOT / "index.json"
    if options.check:
        current = target.read_text(encoding="utf-8") if target.is_file() else ""
        if current != text:
            print("index.json 不是最新，请运行 python3 .github/scripts/module_index.py", file=sys.stderr)
            return 1
        print(f"index.json 已是最新，共 {len(index['modules'])} 个模块")
        return 0
    target.write_text(text, encoding="utf-8")
    print(f"已写入 {target}，共 {len(index['modules'])} 个模块")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
