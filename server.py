from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import threading
import webbrowser


ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep the local server terminal quiet during normal use.
        pass


if __name__ == "__main__":
    address = ("127.0.0.1", 8765)
    print(f"Mini Jarvis est prêt : http://localhost:{address[1]}")
    print("Arrêt : Ctrl+C")
    server = ThreadingHTTPServer(address, Handler)
    threading.Timer(0.7, lambda: webbrowser.open(f"http://localhost:{address[1]}")).start()
    server.serve_forever()
