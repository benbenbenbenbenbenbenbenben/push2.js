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

var audioContext = new AudioContext();

var clap;
var clave;
var cowbell;
var jingle;
var kick;
var snare;

loadAudio("sounds/clap.wav", function (buffer) { clap = buffer; });
loadAudio("sounds/clave.wav", function (buffer) { clave = buffer; });
loadAudio("sounds/cowbell.wav", function (buffer) { cowbell = buffer; });
loadAudio("sounds/jingle.wav", function (buffer) { jingle = buffer; });
loadAudio("sounds/kick.wav", function (buffer) { kick = buffer; });
loadAudio("sounds/snare.wav", function (buffer) { snare = buffer; });

function play(buffer)
{
    if (buffer != undefined)
    {
        player = audioContext.createBufferSource();
        player.buffer = buffer;

        player.connect(audioContext.destination);
        player.start();
    }
}

function playClap()
{
    play(clap);
}

function playClave()
{
    play(clave);
}

function playCowbell()
{
    play(cowbell);
}

function playJingle()
{
    play(jingle);
}

function playKick()
{
    play(kick);
}

function playSnare()
{
    play(snare);
}
