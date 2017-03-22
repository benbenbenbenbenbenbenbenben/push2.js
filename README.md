Requirements:
- Python 3
- PyUSB http://walac.github.io/pyusb/
- LibUSB http://libusb.info/
- Autobahn http://autobahn.ws/python/index.html

Installation
- Mac
 - Edit push2DisplayServer.py to point to the built libusb dynamic library for your system (default to "libusb-1.0.0.dylib")
- Windows
 - More needs doing

Running
- python3 secureHttpServer.py
- python3 push2DisplayServer.py
- Point web browser to https://localhost:4162/your_page_name.html
 - Example app is at https://localhost:4162/hushygushy.html
 - Add html files to root of push2.js folder to create new toys
