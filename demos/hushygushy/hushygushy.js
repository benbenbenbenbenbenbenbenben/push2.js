
window.requestAnimFrame = (function(callback)
{
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

var push2 = new Push2();
var audioContext = new AudioContext();

var bodyReverb = audioContext.createConvolver();
bodyReverb.normalize = false;
bodyReverb.connect(audioContext.destination);

loadAudio("IRs/Taylor 314ce - Earthworks QTC30.wav", function(buffer)
{
    bodyReverb.buffer = buffer;
});


var wheelSpeed = 0.0;
var desiredWheelSpeed = 0.0;
var wheelAngle = 0.0;
var touchingWheel = false;
var lastTouchstripMod = undefined;
var lastTouchstripModTime = undefined;
var touchstripLights = []
for(var i = 0; i++; i <= 30)
{
    touchstripLights.push(0);
}

var Chanterelle = function(frequency)
{
    this.lastScheduledAmplitude = undefined;
    this.lastScheduledStep = undefined;

    this.phaserAmount = 0.005;

    this.frequency = frequency;
    this.oscillator = audioContext.createOscillator();
    this.amplitude = audioContext.createGain();
    this.delay = audioContext.createDelay(this.phaserAmount);
    this.step = audioContext.createGain();
    this.gain = audioContext.createGain();

    this.oscillator.frequency.value = this.frequency;
    this.oscillator.type = "sawtooth";
    this.gain.gain.value = 0.8;

    this.oscillator.connect(this.amplitude);
    this.amplitude.connect(this.step);
    this.step.connect(this.gain);
    this.gain.connect(this.delay);
    this.delay.connect(bodyReverb);
    //this.delay.connect(audioContext.destination);
    this.oscillator.start();

    this.updateAudio = function()
    {
        if (this.lastScheduledAmplitude !== wheelSpeed)
        {
            this.amplitude.gain.linearRampToValueAtTime(
                wheelSpeed,
                audioContext.currentTime + 1.0/60.0);
            this.lastScheduledAmplitude = wheelSpeed;
        }

        var phasePosition = Math.PI*2 * (this.sequencer.column/8.0);
        this.delay.delayTime.linearRampToValueAtTime(
            Math.cos(wheelAngle + phasePosition) * this.phaserAmount/2 + this.phaserAmount/2,
            audioContext.currentTime + 0.05
        )

        var step = this.sequencer.currentStep()

        if (this.lastScheduledStep !== step.number)
        {
            this.step.gain.linearRampToValueAtTime(
                step.pressure / 127.0,
                audioContext.currentTime + 0.1);

            this.lastScheduledStep = step.number;
        }
    }

    this.setFrequency = function(frequency)
    {
         this.frequency = frequency

         this.oscillator.frequency.linearRampToValueAtTime(
            this.frequency,
            audioContext.currentTime + 0.1);
    }

    this.screenEncoderTurned = function(amount)
    {
        this.setFrequency(this.frequency * Math.pow(1.01, amount));
    }
}

var Trompette = function(frequency)
{
    this.lastScheduledAmplitude = undefined;
    this.lastScheduledStep = undefined;

    this.phaserAmount = 0.005;

    this.frequency = frequency;
    this.oscillator = audioContext.createOscillator();
    this.amplitude = audioContext.createGain();
    this.gain = audioContext.createGain();
    this.delay = audioContext.createDelay(this.phaserAmount);
    this.chien = audioContext.createOscillator();
    this.chienAmplitude = audioContext.createGain();
    this.chienStep = audioContext.createGain();

    this.oscillator.frequency.value = this.frequency;
    this.oscillator.type = "sawtooth";

    this.chien.frequency.value = this.frequency / 2;
    this.chien.type = "square";

    this.gain.gain.value = 0.3;

    this.oscillator.connect(this.amplitude);
    this.amplitude.connect(this.gain);
    this.chien.connect(this.chienStep);
    this.chienStep.connect(this.chienAmplitude);
    this.chienAmplitude.connect(this.gain);
    this.gain.connect(this.delay);
    this.delay.connect(bodyReverb);
    //this.delay.connect(audioContext.destination);
    this.oscillator.start();
    this.chien.start();

    this.updateAudio = function()
    {
        if (this.lastScheduledAmplitude !== wheelSpeed)
        {
            this.amplitude.gain.linearRampToValueAtTime(
                wheelSpeed,
                audioContext.currentTime + 1.0/60.0);
            this.chienAmplitude.gain.linearRampToValueAtTime(
                wheelSpeed,
                audioContext.currentTime + 1.0/60.0);
            this.lastScheduledAmplitude = wheelSpeed;
        }

        var phasePosition = Math.PI*2 * (this.sequencer.column/8.0);
        this.delay.delayTime.linearRampToValueAtTime(
            Math.cos(wheelAngle + phasePosition) * this.phaserAmount/2 + this.phaserAmount/2,
            audioContext.currentTime + 0.05
        )

        var step = this.sequencer.currentStep()

        if (this.lastScheduledStep !== step.number)
        {
            this.chienStep.gain.linearRampToValueAtTime(
                step.pressure / 127.0,
                audioContext.currentTime + 0.1);

            this.lastScheduledStep = step.number;
        }
    }

    this.setFrequency = function(frequency)
    {
         this.frequency = frequency

         this.oscillator.frequency.linearRampToValueAtTime(
            this.frequency,
            audioContext.currentTime + 0.1);

         this.chien.frequency.linearRampToValueAtTime(
            this.frequency / 2,
            audioContext.currentTime + 0.1);
    }

    this.screenEncoderTurned = function(amount)
    {
        this.setFrequency(this.frequency * Math.pow(1.01, amount));
    }
}

var StringSequencer = function(column, bgColour, fgColour, string, stepLength)
{
    this.steps = [];
    this.column = column;
    this.bgColour = bgColour;
    this.fgColour = fgColour;
    this.string = string;
    this.string.sequencer = this;
    this.stepLength = stepLength === undefined ? 0.2 : stepLength;


    for(var i = 0; i < 8; i++)
    {
        this.steps.push(0);
    }

    this.updateAudio = function()
    {
        this.string.updateAudio();
    }

    this.currentStep = function()
    {
        var step = Math.floor(audioContext.currentTime / this.stepLength) %
            this.steps.length;
        return {
            number: step,
            pressure: this.steps[step]
        }
    }

    this.display = function()
    {
        var step = this.currentStep();

        function clampedColor(r, g, b)
        {
            return push2.color(
                Math.min(r, 255),
                Math.min(g, 255),
                Math.min(b, 255)
            )
        }

        for(var y = 0; y < 8; y++)
        {
            var stepIncrease = step.number === y ? 4 : 0;

            var intensity = this.steps[y] === 0
                ? stepIncrease / 16.0
                : (Math.ceil((this.steps[y]+1.0) / 8.0) + stepIncrease) / 16.0;

            push2.setPadColor(
                this.column, 7-y,
                clampedColor(
                    this.bgColour[0] + (this.fgColour[0] - this.bgColour[0]) * intensity,
                    this.bgColour[1] + (this.fgColour[1] - this.bgColour[1]) * intensity,
                    this.bgColour[2] + (this.fgColour[2] - this.bgColour[2]) * intensity
                )
            )
        }
    }

    this.lastPadPressed = undefined;
    this.lastPadPressedTime = undefined;

    this.padPressed = function(y, velocity)
    {
        var time = new Date().getTime();

        if (this.lastPadPressedTime !== undefined
            && this.lastPadPressed === y
            && time - this.lastPadPressedTime < 300)
        {
            this.steps[7 - y] = 0;
        }
        else
        {
            this.steps[7 - y] = velocity;
        }

        this.lastPadPressedTime = time;
        this.lastPadPressed = y;

        this.display();
    }

    this.screenEncoderTurned = function(amount)
    {
        this.string.screenEncoderTurned(amount);
    }
}

function animate()
{
    requestAnimFrame(function()
    {
        animate();
    });

    if (touchingWheel)
    {
        if (new Date().getTime() - lastTouchstripModTime > 100)
        {
            desiredWheelSpeed = 0;
        }
    }
    else
    {
            desiredWheelSpeed *= 0.5;
    }

    wheelSpeed += (desiredWheelSpeed - wheelSpeed) * 0.2;

    stringSequencers.forEach(function (string) { string.updateAudio(); });
    stringSequencers.forEach(function (string) { string.display(); });

    wheelAngle += wheelSpeed/2;

    for(var i = 0; i <= 30; i++)
    {
        touchstripLights[i] = 0;
    }

    function setLightAtAngle(angle)
    {
        var position = Math.round(Math.cos(angle) * 15 + 15);
        touchstripLights[position] =
            (angle % (Math.PI*2) > Math.PI)
            ? 4
            : Math.max(touchstripLights[position], 1);
    }

    for (var angle = 0.0; angle < Math.PI*2; angle += Math.PI * 2 / 6)
    {
        setLightAtAngle(wheelAngle + angle);
    }

    push2.setTouchstripLights(touchstripLights);
    push2.sendCanvasToScreen("hushy-gushy");
}

var stringSequencers = [];

push2.initialise(function () {
    console.log("MIDI initialised")

    push2.setTouchstripFlags({
        pushControlsLEDs: false,
        hostSendsValues: false,
        valuesSentAsPitchBend: false,
        ledsShowPoint: false,
        barStartsAtBottom: true,
        autoreturn: false,
        autoreturnToCenter: false
    });

    push2.allLightsOff();

    push2.touchstripTouched = function()
    {
        touchingWheel = true;
        lastTouchstripModTime = undefined;
        lastTouchstripMod = undefined;
    }

    push2.touchstripReleased = function()
    {
        touchingWheel = false;
        lastTouchstripModTime = undefined;
        lastTouchstripMod = undefined;
    }

    push2.touchstripModWheelChanged = function(value)
    {
        var time = new Date().getTime();

        if (lastTouchstripMod !== undefined) {
            if (time - lastTouchstripModTime > 50)
            {
                modSpeed = (value - lastTouchstripMod)
                    / (time - lastTouchstripModTime);

                desiredWheelSpeed +=
                    (Math.abs(modSpeed) - desiredWheelSpeed) * 0.2;

                lastTouchstripModTime = time;
                lastTouchstripMod = value;
            }
        }
        else
        {
            lastTouchstripModTime = time;
            lastTouchstripMod = value;
        }
    }

    push2.padPressed = function(x, y, velocity)
    {
        stringSequencers.forEach(function(sequencer)
        {
            if (sequencer.column === x)
            {
                sequencer.padPressed(y, velocity);
            }
        });
    }

    push2.screenEncoderTurned = function(index, amount)
    {
        stringSequencers.forEach(function(sequencer)
        {
            if (sequencer.column === index)
            {
                sequencer.screenEncoderTurned(amount);
            }
        });
    }


    stringSequencers.push(
        new StringSequencer(0,
            [0, 0, 50],
            [0, 128, 255],
            new Trompette(65.41*2),
            0.4));
    stringSequencers.push(
        new StringSequencer(1,
            [0, 0, 50],
            [0, 128, 255],
            new Trompette(98.00*2),
            0.4));
    stringSequencers.push(
        new StringSequencer(2,
            [0, 0, 50],
            [0, 128, 255],
            new Trompette(130.81*2),
            0.4));
    stringSequencers.push(
        new StringSequencer(3,
            [0, 0, 0],
            [255, 200, 0],
            new Chanterelle(146.83*2)));
    stringSequencers.push(
        new StringSequencer(4,
            [0, 0, 0],
            [255, 200, 0],
            new Chanterelle(164.81*2)));
    stringSequencers.push(
        new StringSequencer(5,
            [0, 0, 0],
            [255, 200, 0],
            new Chanterelle(196.00*2)));
    stringSequencers.push(
        new StringSequencer(6,
            [0, 0, 0],
            [255, 200, 0],
            new Chanterelle(220.00*2)));
    stringSequencers.push(
        new StringSequencer(7,
            [0, 0, 0],
            [255, 200, 0],
            new Chanterelle(261.63*2)));

    stringSequencers.forEach(function (string) { string.display() });

    animate();
});
