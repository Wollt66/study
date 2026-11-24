# -*- coding: utf-8 -*-
"""南京3天劳动节旅行攻略 Web 服务（纯标准库，零依赖）"""
import http.server, socketserver, webbrowser, socket, os, sys

PORT = 0
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *args):
        pass

def find_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("", 0))
    p = s.getsockname()[1]
    s.close()
    return p

def main():
    port = find_port()
    url = f"http://127.0.0.1:{port}/index.html"
    print("=" * 56)
    print("  南京3天劳动节旅行攻略 · Web 服务启动中")
    print("=" * 56)
    print(f"  访问地址: {url}")
    print(f"  工作目录: {ROOT}")
    print("  按 Ctrl+C 停止服务")
    print("=" * 56)
    with socketserver.ThreadingTCPServer(("", port), Handler) as httpd:
        httpd.daemon_threads = True
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务已停止。")

if __name__ == "__main__":
    main()