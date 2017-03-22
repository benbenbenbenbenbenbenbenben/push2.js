var audioContext = new AudioContext();

function loadAudio(url, callback)
{
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
        audioContext.decodeAudioData(request.response, function(buffer)
        {
            callback(buffer);
        });
    }
    request.send();
}
