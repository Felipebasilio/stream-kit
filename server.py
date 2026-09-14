#!/usr/bin/env python3
"""
Stream Kit Local - servidor de overlays para OBS.

Sem dependencias externas: so precisa do Python 3 que ja vem no macOS.

Como usar:
    python3 server.py            # porta padrao 7373
    python3 server.py --port 8080

Depois:
    Painel de controle -> http://localhost:7373/
    Cenas para o OBS   -> http://localhost:7373/overlay/fullscreen.html?scene=starting
                          http://localhost:7373/overlay/fullscreen.html?scene=brb
                          http://localhost:7373/overlay/fullscreen.html?scene=ending
                          http://localhost:7373/overlay/ingame.html
                          http://localhost:7373/overlay/talking.html
                          http://localhost:7373/overlay/alerts.html
"""

import argparse
import json
import mimetypes
import os
import queue
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(ROOT, "state.json")
DEFAULTS_FILE = os.path.join(ROOT, "state.default.json")

_lock = threading.Lock()
_state = {}
_clients = []  # lista de queue.Queue, uma por conexao SSE


# --------------------------------------------------------------------------
# estado
# --------------------------------------------------------------------------

def load_state():
    global _state
    for path in (STATE_FILE, DEFAULTS_FILE):
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    _state = json.load(fh)
                return
            except (json.JSONDecodeError, OSError) as exc:
                print(f"[aviso] nao consegui ler {path}: {exc}")
    _state = {}


def save_state():
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(_state, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)


def deep_merge(base, patch):
    """Mescla patch dentro de base, recursivamente, no lugar."""
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


# --------------------------------------------------------------------------
# broadcast (SSE)
# --------------------------------------------------------------------------

def broadcast(event, payload):
    message = f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
    with _lock:
        dead = []
        for q in _clients:
            try:
                q.put_nowait(message)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _clients.remove(q)


# --------------------------------------------------------------------------
# http
# --------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "StreamKitLocal/1.0"

    def log_message(self, fmt, *args):  # silencia o log por request
        pass

    def handle_one_request(self):
        """Navegador fechando uma conexao keep-alive nao e erro: ignora."""
        try:
            super().handle_one_request()
        except (ConnectionResetError, BrokenPipeError, TimeoutError, OSError):
            self.close_connection = True

    # ---- helpers -------------------------------------------------------

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}

    def _safe_path(self, url_path):
        """Resolve o caminho pedido dentro de ROOT, bloqueando ../"""
        rel = url_path.lstrip("/")
        if rel in ("", "index.html"):
            rel = "control.html"
        full = os.path.normpath(os.path.join(ROOT, rel))
        if not full.startswith(ROOT):
            return None
        return full

    # ---- rotas ---------------------------------------------------------

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]

        if path == "/api/state":
            with _lock:
                self._send_json(_state)
            return

        if path == "/api/stream":
            self._serve_sse()
            return

        full = self._safe_path(path)
        if not full or not os.path.isfile(full):
            self.send_error(404, "nao encontrado")
            return

        ctype, _ = mimetypes.guess_type(full)
        with open(full, "rb") as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        payload = self._read_json()

        if path == "/api/state":
            with _lock:
                deep_merge(_state, payload)
                save_state()
                snapshot = json.loads(json.dumps(_state))
            broadcast("state", snapshot)
            self._send_json({"ok": True})
            return

        if path == "/api/alert":
            payload.setdefault("id", str(time.time()))
            broadcast("alert", payload)
            self._send_json({"ok": True})
            return

        if path == "/api/countdown":
            # {"minutes": 10} inicia; {"minutes": 0} para
            minutes = float(payload.get("minutes") or 0)
            ends_at = int(time.time() * 1000 + minutes * 60000) if minutes > 0 else 0
            with _lock:
                _state.setdefault("countdown", {})
                _state["countdown"]["endsAt"] = ends_at
                _state["countdown"]["enabled"] = ends_at > 0
                save_state()
                snapshot = json.loads(json.dumps(_state))
            broadcast("state", snapshot)
            self._send_json({"ok": True, "endsAt": ends_at})
            return

        self.send_error(404, "nao encontrado")

    # ---- SSE -----------------------------------------------------------

    def _serve_sse(self):
        q = queue.Queue(maxsize=64)
        with _lock:
            _clients.append(q)
            snapshot = json.loads(json.dumps(_state))

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        try:
            first = f"event: state\ndata: {json.dumps(snapshot, ensure_ascii=False)}\n\n"
            self.wfile.write(first.encode("utf-8"))
            self.wfile.flush()
            while True:
                try:
                    msg = q.get(timeout=15)
                except queue.Empty:
                    msg = ": ping\n\n"  # mantem a conexao viva
                self.wfile.write(msg.encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with _lock:
                if q in _clients:
                    _clients.remove(q)


class QuietServer(ThreadingHTTPServer):
    """Igual ao ThreadingHTTPServer, mas sem cuspir traceback quando o
    navegador simplesmente fecha uma conexao (acontece o tempo todo com
    o EventSource e com o iframe de previa do painel)."""

    daemon_threads = True

    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, (ConnectionResetError, BrokenPipeError, TimeoutError)):
            return
        super().handle_error(request, client_address)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7373)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    load_state()

    server = QuietServer((args.host, args.port), Handler)

    base = f"http://localhost:{args.port}"
    print("\n  Stream Kit Local no ar")
    print(f"  Painel de controle: {base}/")
    print("\n  URLs para o OBS (Browser Source, 1920x1080):")
    for label, url in [
        ("Starting", "/overlay/fullscreen.html?scene=starting"),
        ("BRB", "/overlay/fullscreen.html?scene=brb"),
        ("Ending", "/overlay/fullscreen.html?scene=ending"),
        ("Overlay in-game", "/overlay/ingame.html"),
        ("Talking", "/overlay/talking.html"),
        ("Alertas", "/overlay/alerts.html"),
    ]:
        print(f"    {label:<16} {base}{url}")
    print("\n  Ctrl+C para parar.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Encerrado.")


if __name__ == "__main__":
    main()
