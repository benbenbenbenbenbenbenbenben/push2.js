
chrome.app.runtime.onLaunched.addListener(function() {
    var unclaimedUsbConnection = null;

    function onClaimCallback() {
        console.log("Interface claimed.");
        var usbConnection = unclaimedUsbConnection;
        chrome.runtime.sendMessage(usbConnection);
    }

    function onOpenCallback(connection) {
      if (connection) {
        chrome.usb.claimInterface(connection, 0, onClaimCallback)
        unclaimedUsbConnection = connection;
        console.log("Device opened.");
      }
      else {
        console.log("Device failed to open.");
      }
    };

    function onDeviceFound(devices) {
        console.log("FOUND PUSH 2? "+devices[0]);
        chrome.usb.openDevice(devices[0], onOpenCallback);
    }

    /*
    function onSuspend() {
        if (usbConnection !== null) {
            chrome.usb.releaseInterface(usbConnection, 0)
        }
    }

    chrome.runtime.onSuspend.addListener(onSuspend);
    */

    chrome.app.window.create('window.html', {
        'innerBounds': {
          'width': 960,
          'height': 160
        }
    }, function(windows) {
        chrome.usb.getDevices(
            {
                "vendorId": 0x2982,
                "productId": 0x1967
            }, onDeviceFound);
    });
});

