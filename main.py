#!/usr/bin/env python3
"""
GitCity 3D — Local Development Server Launcher
Launches a lightweight HTTP server and opens GitCity 3D directly in your browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers for smooth WebGL asset handling
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = PORT
    server = None
    
    # Attempt port 8080, fallback to 8081..8090 if occupied
    for p in range(PORT, PORT + 10):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            server = socketserver.TCPServer(("", p), CustomHTTPHandler)
            port = p
            break
        except OSError:
            continue

    if not server:
        print("[!] Error: Could not bind to an available port.")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print("=" * 64)
    print("  🏙️  GitCity 3D — Cyberpunk Repository Metropolis Visualizer")
    print("=" * 64)
    print(f"[*] Local Server running at: {url}")
    print("[*] Press Ctrl+C to terminate.")
    print("=" * 64)

    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down GitCity 3D server. Goodbye!")
        server.server_close()

if __name__ == "__main__":
    run()
