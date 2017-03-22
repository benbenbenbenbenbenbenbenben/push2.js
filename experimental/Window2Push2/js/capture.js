(function () {
    var __displayPitch = 1920 + 128;
    var __processedImage = new Uint8ClampedArray(__displayPitch * 160);
    var __xorBytes = [ 0xE7, 0xF3, 0xE7, 0xFF ];
    var __xorOffset = 0;
    var offsetX = 0;
    var offsetY = 0;

    requestAnimFrame = (function(callback)
    {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
        function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };
    })();

    function processFrame(e)
    {
        console.log("Got frame");
    }

    function startStreamingWindow(streamId) {
        navigator.webkitGetUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId,
                    maxWidth: 2000,
                    maxHeight: 2000
                }
            }
        },
        // successCallback
        function(screenStream) {
            video = document.querySelector('video');
            video.src = URL.createObjectURL(screenStream);
            canvas = document.getElementById("grab");
            context = canvas.getContext('2d');

            canvas.addEventListener("mousedown", function (event)
            {
                lastX = event.clientX;
                lastY = event.clientY;
            });

            canvas.addEventListener("mousemove", function (event)
            {
                if (lastX != undefined) {
                    console.log("dragging");
                    offsetX -= event.clientX - lastX;
                    offsetY -= event.clientY - lastY;

                    lastX = event.clientX;
                    lastY = event.clientY;
                }
            });

            canvas.addEventListener("mouseup", function (event)
            {
                lastX = undefined;
                lastY = undefined;
            });

            canvas.addEventListener("mouseleave", function (event)
            {
                lastX = undefined;
                lastY = undefined;
            });

            animate();
        },
        // errorCallback
        function(err) {
            console.log('getUserMedia failed!: ' + err);
        });
    }

    function sendData(data, data2) {
        chrome.usb.bulkTransfer(usbConnection,
        {
            "direction": "out",
            "endpoint": 1, // ??????????????
            "data": data.buffer
        },
        function () {
            chrome.usb.bulkTransfer(usbConnection,
            {
                "direction": "out",
                "endpoint": 1, // ??????????????
                "data": data2.buffer
            },
            function () { sending = false; });
        });
    }

    var canvas;
    var context;
    var lastX = undefined;
    var lastY = undefined;
    var timeLastSigCheck = undefined;
    var sigFoundOnce = false;

    function animate() {
        console.log(offsetX);
        context.drawImage(video, offsetX, offsetY, 960, 160, 0,0, 960, 160);
        var imageData = context.getImageData(0, 0, 960, 160).data;

        if (timeLastSigCheck == undefined || Date.now() - timeLastSigCheck > 5000)
        {
            // Look for a row of 10 alternating black/white pixels
            var goodPixelCount;
            var goodX, goodY;
            //var n = 0;
            for(var y = 0; y < 160; y++)
            {
                goodPixelCount = 0;
                for(var x = 0; x <= 960; x++)
                {
                    var sourceByte = (y * 960 + x) * 4;
                    var red = imageData[sourceByte];
                    var green = imageData[sourceByte + 1];
                    var blue = imageData[sourceByte + 2];
                    //console.log("Colour "+n+": "+red+", "+green+", "+blue);
                    //console.log(" gpc: "+goodPixelCount);
                    //n += 1;

                    if (Math.abs(red - green) > 2
                        || Math.abs(green - blue) > 2
                        || Math.abs(blue - red) > 2
                        || (red < 20 && (goodPixelCount % 2) != 0)
                        || (red > 220 && (goodPixelCount % 2) != 1)
                        || (red >= 20 && red <= 220))
                    {
                        goodPixelCount = 0;
                    }
                    else
                    {
                        if (goodPixelCount == 0) {
                            goodX = x;
                            goodY = y;
                        }

                        goodPixelCount += 1;
                        //console.log("goodPixelCount: "+goodPixelCount);
                        if (goodPixelCount == 10) break
                    }
                }

                if (goodPixelCount == 10) break
            }

            if (goodPixelCount == 10) {
                offsetX = offsetX + goodX;
                offsetY = offsetY + goodY + 3;
                sigFoundOnce = true;
            }

            timeLastSigCheck = Date.now();
        }

        if (usbConnection !== null && sending == false) {
            sending = true;

            for(var y=0; y < 160; y++)
            {
                for(var x=0; x < 960; x++)
                {
                    var sourceByte = (y * 960 + x) * 4;

                    var red = imageData[sourceByte];
                    var green = imageData[sourceByte + 1];
                    var blue = imageData[sourceByte + 2];

                    var destByte = y * __displayPitch + x * 2;
                    __processedImage[destByte] = (red >> 3) ^ __xorBytes[__xorOffset];
                    __xorOffset =  (__xorOffset + 1) % 4;
                    __processedImage[destByte + 1] = ((blue & 0xf8) | (green >> 5)) ^ __xorBytes[__xorOffset];
                    __xorOffset =  (__xorOffset + 1) % 4;
                }
            }

            sendData(new Uint8Array([ 0xFF, 0xCC, 0xAA, 0x88,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00]),
                __processedImage);
        }

        requestAnimFrame(animate);
    }

    var sending = false;
    var usbConnection = null;

    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        // Do something with the message
        console.log("Got message: "+message)
        usbConnection = message;

        chrome.desktopCapture.chooseDesktopMedia(["window", "tab"], function (streamId) {
            console.log("Capturing "+streamId);
            startStreamingWindow(streamId);
        });
    });
})();
