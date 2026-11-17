#!/usr/bin/env python3
"""站源模块打包与发布规划。

本地与 CI 共用：把每个模块目录打成 `<标识>-<版本>.zip`（manifest.json 与 main.js 在根目录），
校验不过的模块直接报错退出，不改动任何已发布的 Release。打包不压缩且时间戳固定，
同一份源码在任何机器上产出的 zip 字节一致，哈希可与 Release 说明里的对得上。

用法：
    python3 .github/scripts/modules_release.py plan
    python3 .github/scripts/modules_release.py plan --out dist --only jise languo
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SKIP_DIRS = {"dist", "build", ".git", ".github", "node_modules"}
MODULE_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,31}$")
MODULE_VERSION = re.compile(r"^\d+\.\d+\.\d+$")
MANIFEST_LIMIT = 64 << 10
ENTRY_LIMIT = 4 << 20
API_VERSION = 1
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


class ModuleError(Exception):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_module(directory: Path) -> dict:
    manifest_path = directory / "manifest.json"
    entry_path = directory / "main.js"
    for path in (manifest_path, entry_path):
        if not path.is_file():
            raise ModuleError(f"{directory.name} 缺少 {path.name}")

    raw_manifest = manifest_path.read_bytes()
    if len(raw_manifest) > MANIFEST_LIMIT:
        raise ModuleError(f"{directory.name}/manifest.json 超过 64 KB")
    code = entry_path.read_bytes()
    if len(code) > ENTRY_LIMIT:
        raise ModuleError(f"{directory.name}/main.js 超过 4 MB")

    try:
        manifest = json.loads(raw_manifest.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ModuleError(f"{directory.name}/manifest.json 无法解析：{error}") from error
    if not isinstance(manifest, dict):
        raise ModuleError(f"{directory.name}/manifest.json 不是对象")

    identifier = manifest.get("id")
    if not isinstance(identifier, str) or not MODULE_ID.match(identifier):
        raise ModuleError(f"{directory.name}/manifest.json 的 id 不合法")
    if identifier != directory.name:
        raise ModuleError(f"{directory.name}/manifest.json 的 id 是 {identifier}，必须与目录同名")
    name = manifest.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ModuleError(f"{directory.name}/manifest.json 缺少 name")
    version = manifest.get("version")
    if not isinstance(version, str) or not MODULE_VERSION.match(version):
        raise ModuleError(f"{directory.name}/manifest.json 的 version 应为 x.y.z")
    if manifest.get("api") != API_VERSION:
        raise ModuleError(f"{directory.name}/manifest.json 的 api 应为 {API_VERSION}")

    files = [(manifest_path.name, raw_manifest), (entry_path.name, code)]
    readme_path = directory / "README.md"
    if readme_path.is_file():
        files.append((readme_path.name, readme_path.read_bytes()))

    return {
        "id": identifier,
        "name": name.strip(),
        "version": version,
        "description": str(manifest.get("description", "")).strip(),
        "api": API_VERSION,
        "adult": bool(manifest.get("adult", False)),
        "files": files,
        "sha256": {manifest_path.name: digest(raw_manifest), entry_path.name: digest(code)},
    }


def build_package(module: dict, out_dir: Path) -> tuple[str, str]:
    zip_name = f"{module['id']}-{module['version']}.zip"
    target = out_dir / zip_name
    with zipfile.ZipFile(target, "w", zipfile.ZIP_STORED) as archive:
        for name, data in module["files"]:
            info = zipfile.ZipInfo(name, ZIP_TIMESTAMP)
            info.create_system = 3
            info.compress_type = zipfile.ZIP_STORED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    return zip_name, digest(target.read_bytes())


def write_notes(module: dict, out_dir: Path, zip_name: str, zip_sha: str) -> Path:
    lines = [f"## {module['name']} {module['version']}", ""]
    if module["description"]:
        lines += [module["description"], ""]
    lines += [
        f"- 模块标识：`{module['id']}`",
        f"- 接口版本：{module['api']}",
        f"- 安装包：`{zip_name}`",
        f"- 安装包 SHA-256：`{zip_sha}`",
    ]
    for name, value in module["sha256"].items():
        lines.append(f"- `{name}` SHA-256：`{value}`")
    lines += [
        "",
        "安装：把 zip 拖进应用「模块」页，或放到数据目录的 "
        f"`modules/{module['id']}/` 下。",
        "",
    ]
    notes_dir = out_dir / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)
    target = notes_dir / f"{module['id']}.md"
    target.write_text("\n".join(lines), encoding="utf-8")
    return target


def collect(only: list[str]) -> list[Path]:
    directories = [
        path
        for path in sorted(REPO_ROOT.iterdir())
        if path.is_dir()
        and path.name not in SKIP_DIRS
        and not path.name.startswith(".")
        and (path / "manifest.json").is_file()
    ]
    if not only:
        return directories
    found = {path.name: path for path in directories}
    missing = [name for name in only if name not in found]
    if missing:
        raise ModuleError(f"找不到模块：{' '.join(missing)}")
    return [found[name] for name in only]


def plan(out_dir: Path, only: list[str]) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    plan_items = []
    for directory in collect(only):
        module = read_module(directory)
        zip_name, zip_sha = build_package(module, out_dir)
        notes = write_notes(module, out_dir, zip_name, zip_sha)
        plan_items.append(
            {
                "id": module["id"],
                "name": module["name"],
                "version": module["version"],
                "tag": f"{module['id']}-v{module['version']}",
                "zip": zip_name,
                "zipPath": str(out_dir / zip_name),
                "sha256": zip_sha,
                "notes": str(notes),
                "files": module["sha256"],
            }
        )

    (out_dir / "plan.json").write_text(
        json.dumps(plan_items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with (out_dir / "plan.tsv").open("w", encoding="utf-8", newline="") as handle:
        for item in plan_items:
            handle.write(
                "\t".join(
                    [item["id"], item["name"], item["version"], item["tag"], item["zip"], item["notes"]]
                )
                + "\n"
            )

    for item in plan_items:
        print(f"打包 {item['tag']}：{item['zip']} sha256={item['sha256']}")
    print(f"共 {len(plan_items)} 个模块，计划写入 {out_dir / 'plan.json'}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="站源模块打包与发布规划")
    subparsers = parser.add_subparsers(dest="command", required=True)
    plan_parser = subparsers.add_parser("plan", help="校验并打包模块，写出 plan.json 与 plan.tsv")
    plan_parser.add_argument("--out", default="dist", help="输出目录，默认 dist")
    plan_parser.add_argument("--only", nargs="*", default=[], help="只处理这些模块标识")
    args = parser.parse_args(argv)

    out_dir = Path(args.out)
    if not out_dir.is_absolute():
        out_dir = REPO_ROOT / out_dir

    try:
        return plan(out_dir, args.only)
    except ModuleError as error:
        print(f"打包失败：{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
