#!/usr/bin/env python3
"""Fail a STRATO deployment if private runtime files are tracked or guards disappear.

This checks the Git index (not only .gitignore), because files added with -f are
tracked and a .gitignore rule no longer protects them. No private files are read.
"""
from pathlib import Path, PurePosixPath
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

root_rules = read(".htaccess")
data_rules = read("data/.htaccess")
workflow = read(".github/workflows/deploy-strato.yml")
gitignore = read(".gitignore")

if not any("RewriteRule ^data" in line and "[F" in line.upper()
           for line in root_rules.splitlines()):
    errors.append("Root .htaccess must deny direct requests to /data.")
if not ("Require all denied" in data_rules or "Deny from all" in data_rules):
    errors.append("data/.htaccess must deny all HTTP access.")
if "data/*" not in gitignore:
    errors.append(".gitignore must exclude the private root data directory.")
if "blocked_dirs" not in workflow or "'data'" not in workflow:
    errors.append("STRATO deploy must exclude private data directories.")
if "git', 'ls-files'" not in workflow:
    errors.append("STRATO deploy must use tracked files, never a blanket upload.")

tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).split(b"\0")
for raw in tracked:
    if not raw:
        continue
    name = raw.decode("utf-8", "surrogateescape")
    parts = PurePosixPath(name).parts
    lower = tuple(part.lower() for part in parts)
    if name == "data/.htaccess":
        continue  # Intentional deny rule; deployed after checkout if required.
    if "data" in lower or "uploads" in lower or "runtime" in lower:
        errors.append(f"Private runtime path is Git-tracked: {name}")
    if name.lower().endswith((".sqlite", ".sqlite3", ".sqlite-wal", ".sqlite-shm", ".db", ".env", ".pem", ".p12", ".pfx", ".key")):
        errors.append(f"Sensitive file type is Git-tracked: {name}")

if errors:
    for error in errors:
        print("PRIVATE DATA GUARD FAILED:", error, file=sys.stderr)
    sys.exit(1)
print("Private data guard passed: no tracked runtime data and access rules remain in place.")
