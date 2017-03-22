from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import BaseServer
import threading
import ssl

httpd = HTTPServer(('localhost', 4161), SimpleHTTPRequestHandler)
httpdSecure = HTTPServer(('localhost', 4162), SimpleHTTPRequestHandler)

httpdSecure.socket = ssl.wrap_socket(httpdSecure.socket, certfile='localhost.pem', server_side=True)

serverThread = threading.Thread(target = lambda: httpd.serve_forever())

secureServerThread = threading.Thread(target = lambda: httpdSecure.serve_forever())

serverThread.start()
secureServerThread.start()

serverThread.join()
