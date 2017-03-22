# What is it?

* A Javascript library for simple interfacing with Push 2 from Javascript, via WebMIDI
* A very experimental Chrome plugin for showing the contents of a window on the Push 2 display

# Requirements

* Python 3 if you want to run the simple secure web server for testing
* A secure web server is required because access to SysEx over WebMIDI requires a securely served page
* Chrome if you want to run the experimental Window2Push2 app

# Running example/demos

* ```python3 secureHttpServer.py```
* point your browser at one of these URLs and ignore the warning about the certificate
  * https://localhost:4162/example.html
  * https://localhost:4162/demos/hushygushy/hushygushy.html

# Known issues

* For obvious reasons, if Live is running, push2.js won't work. And if a push2.js page is running, Live won't be able to talk to Push.
* You might need to turn your Push off and on again between quitting one thing and starting another

# Running Window2Push2

* Go to Chrome extensions page: chrome://extensions/
* Tick "Developer mode" if it isn't ticked
* Click "Load unpacked extension"
* Browse to the experimental/Window2Push2 folder and select it
* Click through any scary warnings you get :)
* Click on "Launch" under the new Window2Push2 entry
* Select any window to relay its contents to the Push 2 screen
* To position the contents:
  * You can drag on the pop-up window to change where in the window is displayed
  * If the little bitmap in https://github.com/benbenbenbenbenbenbenbenben/push2.js/blob/master/experimental/Window2Push2/signature.png is seen in the window, then it will try and snap the top left to two pixels below that signature
  * This sometimes doesn't work due to the known issues below

## Known issues

* The image is a little blurry sometimes. This is because of some kind of compression/rescaling used in streaming window contents to the Chrome extension. I haven't found a workaround.
* There's a problem with the pixel format sent to the Push 2 screen - I have a fix, need to integrate it.
* Sometimes it just goes wrong... reload and restart it in the Chrome extensions page


# Disclaimers

Although I work for Ableton, this nothing to do with them.

Use at your own risk! I'm not responsible for your Push 2 blowing up if you use this stuff, and neither is Ableton :)

I'll happily take nice contributions. I see this code as being "public domain", use it as you wish, and I'll fold in your contributions on the same terms.
