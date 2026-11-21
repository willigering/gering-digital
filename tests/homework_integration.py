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
        for name in ("HA.html", "homework-api.php", "homework-module.php", "homework-storage.php"):
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

            expect("Unterrichtsmaterial hinzufügen" in page, "Upload UI not present")
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
            # Categories seeded automatically, without overwriting modules or status.
            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            initial = json.loads(raw)
            expect(status == 200 and [c["name"] for c in initial["categories"][:6]] ==
                   ["IT I", "IT II", "IT III", "IT IV", "IT V", "IT VI"],
                   "Missing default IT I-VI categories")

            def mutate(action, payload, user=opener):
                data = json.dumps({"csrf": csrf, **payload}, ensure_ascii=False).encode()
                status_code, raw_response = make_request(
                    user, base, "/homework-api.php?action=" + action, data
                )
                return status_code, json.loads(raw_response)

            # Unauthenticated users cannot mutate data even with a known CSRF token.
            denied_status, denied = mutate("create-category", {"name": "Intruder"}, other)
            expect(denied_status in (401, 403), "Category creation must require authentication and CSRF")
            status_code, created = mutate("create-category", {"name": "Eigene Aufgaben"})
            expect(status_code == 200 and created["category"]["name"] == "Eigene Aufgaben",
                   "Creating a custom category failed")
            category_id = created["category"]["id"]
            status_code, duplicate = mutate("create-category", {"name": "eigene aufgaben"})
            expect(status_code == 409, "Case-insensitive duplicate category accepted")

            # Existing module can be renamed and assigned without changing HTML bytes.
            status_code, updated = mutate("rename-module",
                                          {"id": lesson_id, "title": "Neu benannt"})
            expect(status_code == 200 and updated["title"] == "Neu benannt",
                   "Module rename failed")
            status_code, assigned = mutate("set-category",
                                           {"id": lesson_id, "categoryId": category_id})
            expect(status_code == 200 and assigned["categoryId"] == category_id,
                   "Module category assignment failed")
            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            saved = next(m for m in json.loads(raw)["modules"] if m["id"] == lesson_id)
            expect(saved["title"] == "Neu benannt" and saved["category_id"] == category_id,
                   "Module edits did not persist after reload")
            expect(saved["status"] == "fertig", "Editing lost completion status")
            expect((dest / "data/homework" / (lesson_id + ".html")).read_bytes() == lesson,
                   "Editing must not alter original HTML")

            # The optional description is editable and validated without changing HTML.
            status_code, updated = mutate("rename-module", {
                "id": lesson_id, "title": "Neu benannt", "topic": "Neue Kurzbeschreibung"
            })
            expect(status_code == 200 and updated["topic"] == "Neue Kurzbeschreibung",
                   "Editing description failed")
            status_code, rejected = mutate("rename-module", {
                "id": lesson_id, "title": "Should not save", "topic": "x" * 101
            })
            expect(status_code == 400, "Overlong description accepted")
            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            edited = next(m for m in json.loads(raw)["modules"] if m["id"] == lesson_id)
            expect(edited["title"] == "Neu benannt" and edited["topic"] == "Neue Kurzbeschreibung",
                   "Description failed to persist or invalid edit changed title")
            expect((dest / "data/homework" / (lesson_id + ".html")).read_bytes() == lesson,
                   "Description edit changed original HTML")

            # Invalid categories and CSRF values are not accepted.
            status_code, rejected = mutate("set-category",
                                            {"id": lesson_id, "categoryId": "cat-not-found"})
            expect(status_code == 404, "Unknown categories must be rejected")
            status_code, rejected = make_request(
                opener, base, "/homework-api.php?action=delete-module",
                json.dumps({"csrf": "incorrect", "id": lesson_id}).encode()
            )
            expect(status_code == 403, "Deletion requires CSRF token")

            # A new upload directly into a user-created category must persist.
            second_id = "hw-" + uuid.uuid4().hex[:24]
            fields = {
                "csrf": csrf, "id": second_id, "title": "Zugeordnetes Modul",
                "topic": "Eigene", "date": "2026-11-20",
                "categoryId": category_id, "chunkIndex": 0, "chunkTotal": 1,
            }
            multipart, ctype = form_data(fields, "teil.html", lesson)
            status_code, raw = make_request(opener, base, "/homework-module.php", multipart, ctype)
            expect(status_code == 200 and json.loads(raw).get("moduleId") == second_id,
                   "Upload directly into custom category failed")
            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            saved_second = next(m for m in json.loads(raw)["modules"] if m["id"] == second_id)
            expect(saved_second["category_id"] == category_id, "Upload category not persisted")

            # Deletion removes both the record and original file; it must not
            # delete any other module, category or the existing status.
            status_code, deleted = mutate("delete-module", {"id": lesson_id})
            expect(status_code == 200 and deleted["deletedId"] == lesson_id,
                   "Deleting a module failed")
            expect(not (dest / "data/homework" / (lesson_id + ".html")).exists(),
                   "Deleting must remove uploaded HTML")
            status, raw = make_request(opener, base, "/homework-api.php?action=state")
            updated_state = json.loads(raw)
            expect(not any(m["id"] == lesson_id for m in updated_state["modules"]),
                   "Deleted module reappeared")
            expect(any(m["id"] == second_id for m in updated_state["modules"]),
                   "Deleting one module affected another")
            expect(any(c["id"] == category_id for c in updated_state["categories"]),
                   "Deleting a module must preserve its category")
            status, raw = make_request(opener, base, "/homework-module.php?id=" + lesson_id)
            expect(status == 404, "Deleted HTML still accessible")
            status_code, deleted = mutate("delete-module", {"id": lesson_id})
            expect(status_code == 404, "Deletion must reject unknown module")

            print("HomeWork integration: login, uploads, categories, rename, assignment, deletion and privacy PASSED")
        finally:
            server.terminate()
            try:
                server.communicate(timeout=4)
            except subprocess.TimeoutExpired:
                server.kill()
                server.communicate()


if __name__ == "__main__":
    run()
