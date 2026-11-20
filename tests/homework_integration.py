#!/usr/bin/env python3
"""End-to-end HomeWork backend check with disposable data and PHP's HTTP server."""
import http.cookiejar
import json
import os
import pathlib
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
PASSWORD = "HomeWork-test-only-password-123"


def get_free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def make_request(opener, base, path, data=None, ctype="application/json"):
    req = urllib.request.Request(base + path, method="POST" if data is not None else "GET", data=data)
    if data is not None:
        req.add_header("Content-Type", ctype)
    try:
        with opener.open(req, timeout=8) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8")


def form_data(fields, filename, blob):
    boundary = "----HomeWorkCI" + uuid.uuid4().hex
    parts = []
    for name, value in fields.items():
        parts.extend([
            ("--" + boundary + "\r\n").encode(),
            ('Content-Disposition: form-data; name="' + name + '"\r\n\r\n').encode(),
            str(value).encode("utf-8"), b"\r\n"
        ])
    parts.extend([
        ("--" + boundary + "\r\n").encode(),
        ('Content-Disposition: form-data; name="lesson"; filename="' + filename + '"\r\n').encode(),
        b"Content-Type: text/html\r\n\r\n",
        blob, b"\r\n",
        ("--" + boundary + "--\r\n").encode()
    ])
    return b"".join(parts), "multipart/form-data; boundary=" + boundary


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def run():
    with tempfile.TemporaryDirectory(prefix="hw-ci-") as tmp:
        dest = pathlib.Path(tmp)
        for name in ("HA.html", "homework-api.php", "homework-module.php"):
            shutil.copy2(ROOT / name, dest / name)
        (dest / "data").mkdir()
        db = sqlite3.connect(dest / "data/bewerbungen-private.sqlite")
        db.execute("CREATE TABLE account (id INTEGER PRIMARY KEY, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)")
        hashed = subprocess.check_output(
            ["php", "-r", "echo password_hash($argv[1], PASSWORD_DEFAULT);", PASSWORD],
            text=True
        )
        db.execute("INSERT INTO account VALUES (1,?,datetime('now'))", (hashed,))
        db.commit()
        db.close()

        port = get_free_port()
        server = subprocess.Popen(
            ["php", "-S", "127.0.0.1:" + str(port), "-t", str(dest)],
            cwd=dest, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            text=True
        )
        base = "http://127.0.0.1:" + str(port)
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        other = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        try:
            for attempt in range(60):
                try:
                    status, page = make_request(opener, base, "/HA.html")
                    if status == 200:
                        break
                except (urllib.error.URLError, TimeoutError):
                    time.sleep(0.1)
            else:
                raise AssertionError("Local PHP server did not start")

            expect("HTML-Datei hinzufügen" in page, "Upload UI not present")
            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            state = json.loads(raw)
            expect(status == 200 and state["mode"] == "login", "Expected login mode")
            csrf = state["csrf"]

            body = json.dumps({"csrf": csrf, "password": PASSWORD}).encode()
            status, raw = make_request(opener, base, "/homework-api.php?action=login", body)
            expect(status == 200 and json.loads(raw).get("ok"), "Login failed: " + raw)
            csrf = json.loads(raw)["csrf"]

            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            expect(status == 200 and json.loads(raw)["mode"] == "ready", "HomeWork not ready after login: " + raw)

            lesson = (b"<!doctype html><html lang='de'><head><title>Testlektion</title></head>"
                      b"<body><h1>Wichtige Hausaufgabe</h1>" + b"<!--" + b"x" * 540000
                      + b"--></body></html>")
            lesson_id = "hw-" + uuid.uuid4().hex[:24]
            chunks = [lesson[i:i + 512 * 1024] for i in range(0, len(lesson), 512 * 1024)]
            for i, chunk in enumerate(chunks):
                fields = {
                    "csrf": csrf, "id": lesson_id, "title": "CI Testlektion",
                    "topic": "Test-Thema", "date": "2026-11-20",
                    "chunkIndex": i, "chunkTotal": len(chunks),
                }
                multipart, ctype = form_data(fields, "teil.html", chunk)
                status, raw = make_request(opener, base, "/homework-module.php", multipart, ctype)
                expect(status == 200, "Upload chunk failed: " + raw)
                ack = json.loads(raw)
                expect(ack.get("ok") and ack.get("part") == i + 1, "Chunk acknowledgement invalid")
                if i == len(chunks) - 1:
                    expect(ack.get("moduleId") == lesson_id, "No final server confirmation")

            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            listing = json.loads(raw)
            found = [m for m in listing.get("modules", []) if m["id"] == lesson_id]
            expect(status == 200 and len(found) == 1, "Saved module missing from list")
            expect(found[0]["status"] == "offen", "Initial status not open")

            status, raw = make_request(other, base, "/homework-module.php?id=" + lesson_id)
            expect(status == 401, "Private lesson must require login")
            status, raw = make_request(opener, base, "/homework-module.php?id=" + lesson_id)
            expect(status == 200 and "Wichtige Hausaufgabe" in raw, "Saved HTML not accessible")
            expect('id="hw-return"' in raw and 'href="/HA.html"' in raw, "Return navigation missing")

            status, raw = make_request(opener, base, "/homework-api.php?action=save-status",
                                       json.dumps({"csrf": csrf, "id": lesson_id, "status": "fertig"}).encode())
            expect(status == 200 and json.loads(raw).get("ok"), "Status update failed")
            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            persisted = next(m for m in json.loads(raw)["modules"] if m["id"] == lesson_id)
            expect(persisted["status"] == "fertig", "Saved status not persisted")
            original = (dest / "data/homework" / (lesson_id + ".html")).read_bytes()
            expect(original == lesson, "Uploaded HTML must remain byte-for-byte unchanged")
            print("HomeWork integration: login, two-part upload, list, authorized open, return link and status PASSED")
        finally:
            server.terminate()
            try:
                server.communicate(timeout=4)
            except subprocess.TimeoutExpired:
                server.kill()
                server.communicate()


if __name__ == "__main__":
    run()
