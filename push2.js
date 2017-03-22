
var NoMidiSupportInBrowserException = function()
{
    this.toString = function() {
        return "No MIDI support present in browser"
    }
}

var MidiAccessFailedException = function()
{
    this.toString = function() {
        return "The MIDI system failed to start"
    }
}

var Push2InputNotFoundException = function()
{
    this.toString = function() {
        return "No Push 2 MIDI input device found"
    }
}

var Push2OutputNotFoundException = function()
{
    this.toString = function() {
        return "No Push 2 MIDI output device found"
    }
}

var FunctionNeedsSysExPermissionException = function(functionName)
{
    this.functionName = functionName;
    this.toString = function()
    {
        return "Function "
            + this.functionName
            + " requires permission to send MIDI SysEx messages - this is only"
            + " granted when pages are served via HTTPS"
    }
}

var TooManyColoursException = function()
{
    this.toString = function() {
        return "Attempted to add too many colours to Push 2 palette - at most"
            +" 128 (including black) are supported"
    }
}

var PaletteManagementConflictException = function()
{
    this.toString = function() {
        return "Only use Push2.colour/Push2.white OR Push2.setPaletteColour"
    }
}

var TouchstripLightIntensityOutOfRange = function()
{
    this.toString = function() {
        return "Touchstrip light intensity out of range 0..7 inclusive"
    }
}

var TouchstripValueOutOfRange = function(range)
{
    this.toString = function() {
        return "Touchstrip value out of range "+range
    }
}

var ScreenWebsocketNotOpen = function()
{
    this.toString = function() {
        return "WebSocket needed for sending data to screen not open"
    }
}

var StillSendingLastScreen = function()
{
    this.toString = function() {
        return "Still sending last screen to WebSocket"
    }
}

var Push2 = function() {
    this.midiOutput = undefined;
    this.displayWebSocket = undefined;

    ///////////////////////////////////////////////////////////
    // Initialisation

    this.canSysex = false;

    this.initialise = function (callback) {
        var pageIsSecure = window.location.protocol === "https:";
        this.canSysex = pageIsSecure;

        window.addEventListener('load', function() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;

            if (window.navigator.requestMIDIAccess) {
                window.navigator.requestMIDIAccess({sysex: this.canSysex})
                    .then(function (midi) {
                        this.__onMIDIInit(midi, callback);
                    }.bind(this),
                    function () {
                        throw new MidiAccessFailedException();
                    }
                );
            }
            else {
                throw new NoMidiSupportInBrowserException();
            }
        }.bind(this));
    }

    this.__onMIDIInit = function (midiAccess, callback) {
        inputDeviceRegexps = [
            /Ableton Push 2( \d+)?/,
            /Ableton Push 2 User Port/,
            /Ableton Push 2 \d+:1/
        ]

        outputDeviceRegexps = [
            /Ableton Push 2( \d+)?/,
            /Ableton Push 2 User Port/,
            /Ableton Push 2 \d+:1/
        ]

        var foundInputDevice = false;
        var inputs = midiAccess.inputs.values();

        for ( var input = inputs.next(); input && !input.done; input = inputs.next()) {
            if (inputDeviceRegexps.some(function (re) {
                return re.test(input.value.name);
            })) {
                input.value.onmidimessage = function(event) {
                    this.__handleMidiEvent(event);
                }.bind(this)

                foundInputDevice = true;
            }
        }

        if (!foundInputDevice)
        {
            throw new Push2InputNotFoundException();
        }

        var foundOutputDevice = false;
        var outputs = midiAccess.outputs.values();

        for (var output = outputs.next(); output && !output.done; output = outputs.next())
        {
            if (outputDeviceRegexps.some(function (re) {
                return re.test(output.value.name);
            })) {
                this.midiOutput = output.value

                if (this.canSysex) {
                    this.midiOutput.send([0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x0A,
                        0x01, 0xF7])
                }

                this.midiOutput.send([0x91, 80, 0x0])
                foundOutputDevice = true;
            }
        }

        if (!foundOutputDevice)
        {
            throw new Push2OutputNotFoundException();
        }

        if (foundInputDevice && foundOutputDevice && callback !== undefined) {
            callback();
        }
    }

    ///////////////////////////////////////////////////////////
    // Configuring behaviour

    this.__touchstripValuesSentAsPitchBend = true;

    /** Sets flags controlling behaviour of Push 2's touchstrip

    @param {object} flags - object with the following properties
    with true or false values:

    pushControlsLEDs
    hostSendsValues
    valuesSentAsPitchBend
    ledsShowPoint
    barStartsAtBottom
    autoreturn
    autoreturnToCenter

    The function of these flags is described at:
    https://github.com/Ableton/push-interface/blob/master/doc/AbletonPush2MIDIDisplayInterface.asc#Aftertouch

    The default value for all of these flags is true.
    */
    this.setTouchstripFlags = function(flags)
    {
        if (this.canSysex)
        {
            this.__touchstripValuesSentAsPitchBend = flags.valuesSentAsPitchBend;

            flags =
                (flags.pushControlsLEDs ? 0 : 1)
                | (flags.hostSendsValues ? 0 : 1) << 1
                | (flags.valuesSentAsPitchBend ? 0 : 1) << 2
                | (flags.ledsShowPoint ? 1 : 0) << 3
                | (flags.barStartsAtBottom ? 0 : 1) << 4
                | (flags.autoreturn ? 1 : 0) << 5
                | (flags.autoreturnToCenter ? 1 : 0) << 6;

            this.midiOutput.send(
                [ 0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x17, flags, 0xF7 ]);
        }
        else
        {
            throw FunctionNeedsSysExPermissionException(
                "setTouchstripFlags");
        }
    }

    /** Tells Push 2 to send aftertouch information through channel pressure
    events, which are received with calls to Push2.channelPressureChanged
    */
    this.setAftertouchModeToChannelPressure = function()
    {
        if (this.canSysex)
        {
            this.midiOutput.send(
                [ 0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x1E, 0, 0xF7 ])
        }
        else
        {
            throw FunctionNeedsSysExPermissionException(
                "setAftertouchModeToChannelPressure");
        }
    }

    /** Tells Push 2 to send aftertouch information through polyphonic key
    pressure events, which are received with calls to Push2.padPressureChanged
    */
    this.setAftertouchModeToPolyphonicKeyPressure = function()
    {
        if (this.canSysex)
        {
            this.midiOutput.send(
                [ 0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x1E, 1, 0xF7 ])
        }
        else
        {
            throw FunctionNeedsSysExPermissionException(
                "setAftertouchModeToPolyphonicKeyPressure");
        }
    }

    ///////////////////////////////////////////////////////////
    // Constant definitions for colours, transitions, button names and encoder
    // names

    /** Enumeration with values that can be passed to the speed parameter
    of button and pad colour setting functions.

    Speeds are relative to a beat tempo of 120bpm

    instant - colour changes instantly
    twentyFourth - colour changes or blinks in 1/24 of the beat length
    sixteenth - colour changes or blinks in 1/16 of the beat length
    eighth - colour changes or blinks in 1/8 of the beat length
    quarter - colour changes or blinks in 1/4 of the beat length
    half - colour changes or blinks in 1/2 of the beat length
    */
    this.speed = {
        instant: 0,
        twentyFourth: 1,
        sixteenth: 2,
        eighth: 3,
        quarter: 4,
        half: 5,
    }

    /** Enumeration with values that can be passed to transition parameter
    of button and pad colour setting functions.

    set - set the colour of the pad
    pulse - pulse the colour (fading in and out)
    blink - blink the colour (switching on and off)
    */
    this.transition = {
        set: 0,
        pulse: 5,
        blink: 10
    }

    /** Enumeration with names of buttons used as a parameter to
    setButtonColour, and are passed to buttonPressed and buttonReleased
    functions.
    */
    this.buttons = {
        play: 85,
        record: 86,
        automate: 89,
        fixedLength: 90,
        newButton: 87,
        duplicate: 88,
        quantize: 35,
        doubleLoop: 117,
        convert: 116,
        mute: 60,
        solo: 61,
        stop: 29,
        undo: 119,
        deleteButton: 118,
        tapTempo: 3,
        metronome: 9,
        setup: 30,
        user: 59,
        addDevice: 52,
        addTrack: 53,
        device: 110,
        mix: 112,
        browse: 111,
        clip: 113,
        master: 28,
        up: 46,
        down: 47,
        left: 44,
        right: 45,
        repeat: 56,
        accent: 57,
        scale: 58,
        layout: 31,
        note: 50,
        session: 51,
        octaveUp: 55,
        octaveDown: 54,
        pageLeft: 62,
        pageRight: 63,
        shift: 49,
        select: 48,
        one32t: 36,
        one32: 37,
        one16t: 38,
        one16: 39,
        one8t: 40,
        one8: 41,
        one4t: 42,
        one4: 43
    }

    /** Enumeration with names of encoders passed to encoderTouched,
    encoderTurned and encoderReleased functions.
    */
    this.encoders = {
        tempo: 14,
        swing: 15,
        volume: 79,
    }

    ///////////////////////////////////////////////////////////
    // Setting LED colours

    // Hash for a colour that can be used as a key in a Map
    function __colourHash(red, green, blue) {
        return [red.toString(16), green.toString(16), blue.toString(16)].join();
    }

    this.__usingAutoPalette = false;
    this.__usingManualPalette = false;

    // It is important not to change the first colour as it is used for the
    // default "off" state of all buttons, and typically we want this to be
    // possible.
    this.__autoPalette = new Map([[__colourHash(0, 0, 0), 0]]);

    /** @returns a palette colour number for a coloured button or pad
    with the given red, green and blue values. These are automatically added
    to the palette if they don't already exist. Re-using exactly the same
    red, green and blue values re-uses the palette entry rather than assigning
    a new one.

    Note this should not be used at the same time as setPaletteColour.

    @param {int} red - amount of red in colour, 0..255
    @param {int} green - amount of green in colour, 0..255
    @param {int} blue - amount of blue in colour, 0..255
    */
    this.colour = function(red, green, blue)
    {
        if (this.__usingManualPalette)
        {
            throw new PaletteManagementConflictException();
        }

        this.__usingAutoPalette = true;

        var hash = __colourHash(red, green, blue);
        var colour = this.__autoPalette.get(hash);

        if (colour === undefined)
        {
            if (this.__autoPalette.size === 128)
            {
                throw new TooManyColoursException();
            }

            var colour = this.__autoPalette.size;
            this.__setPaletteColour(colour, red, green, blue, 0);
            this.__autoPalette.set(hash, colour);
        }

        return colour;
    }

    /** @returns a palette colour number for a greyscale button
    with the given intensity values. These are automatically added
    to the palette if they don't already exist. Re-using exactly the same
    intensity value re-uses the palette entry rather than assigning
    a new one.

    Note this should not be used at the same time as setPaletteColour.

    @param {int} intensity - amount of red in colour, 0..255
    */
    this.white = function(intensity)
    {
        if (this.__usingManualPalette)
        {
            throw new PaletteManagementConflictException();
        }

        this.__usingAutoPalette = true;

        var hash = intensity.toString(16)
        var colour = this.__autoPalette.get(hash);

        if (colour === undefined)
        {
            if (this.__autoPalette.size === 128)
            {
                throw new TooManyColoursException();
            }

            var colour = this.__autoPalette.size;
            this.__setPaletteColour(colour, 0, 0, 0, intensity);
            this.__autoPalette.set(hash, colour);
        }

        return colour;
    }

    /** Sets the palette entry to the given colour

    Note this should not be used at the same time as setPaletteColour.

    @param {int} colour Palette entry number
    @param {int} red Amount of red to use on an RGB button or pad
    @param {int} green Amount of green to use on an RGB button or pad
    @param {int} blue Amount of blue to use on an RGB button or pad
    @param {int} white Amount of white to use on a white button
    */
    this.setPaletteColour = function(colour, red, green, blue, white)
    {
        if (this.__usingAutoPalette)
        {
            throw new PaletteManagementConflictException();
        }

        this.__usingManualPalette = true;

        this.__setPaletteColour(colour, red, green, blue, white);
    }

    this.__setPaletteColour = function(colour, red, green, blue, white)
    {
        if (this.canSysex)
        {
            this.midiOutput.send([
                0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x03,
                colour,
                red & 0x7F, red >> 7,
                green & 0x7F, green >> 7,
                blue & 0x7F, blue >> 7,
                white & 0x7F, white >> 7,
                0xF7,
            ]);
        }
        else
        {
            throw FunctionNeedsSysExPermissionException(
                "setPaletteColour");
        }
    }

    this.__setButtonColour = function(asCC, button, colour, transition, speed)
    {
        if (transition == undefined) transition = this.transition.set;

        if (speed == undefined)
        {
            speed = (transition == this.transition.set ? this.speed.instant : this.speed.quarter);
        }

        this.midiOutput.send([(asCC ? 0xB0 : 0x90) | (speed+transition), button, colour])
    }

    /** Turn off all the button and pad lights on the Push 2

    Useful to initialise the display to start setting it up - the Push 2 often
    retains the colours set by applications after they have quit.

    It sets the pads and buttons to colour index 0 - this is only "off"
    if colour palette entry 0 is black, which is the default.
    */
    this.allLightsOff = function()
    {
        for (var x = 0; x < 8; x++)
        {
            for (var y = 0; y < 8; y++)
            {
                this.setPadColour(x, y, 0);
            }
        }

        for (var cc = 0; cc < 127; cc++)
        {
            this.setButtonColour(cc, 0)
        }

        this.setTouchstripValue(0);

        var touchstripLights = []
        for (var i = 0; i < 31; i++)
        {
            touchstripLights.push(0);
        }

        this.setTouchstripLights(touchstripLights);
    }

    /** Sets the colour of the given button

    @param {int} button Button to set colour of, from Push2.buttons
    @param {int} colour Colour palette entry for colour - use setPaletteColour()
        to set colours, or colour()/white() to get colours
    @param {int} transition Transition to use to move to colour, from
        Push2.transition - defaults to Push2.transition.set
    @param {int} speed Speed of transition, from Push2.speed - defaults to
        Push2.speed.instant if transition is Push2.transition.set, or
        Push2.speed.quarter otherwise
    */
    this.setButtonColour = function(button, colour, transition, speed)
    {
        if (button == push2.buttons.newButton) console.log("Setting clour: "
            +colour);
        this.__setButtonColour(true, button, colour, transition, speed);
    }

    /** Sets the colour of the given pad

    @param {int} x X position of pad, 0..7, 0 being left
    @param {int} y Y position of pad, 0..7, 0 being bottom
    @param {int} colour Colour palette entry for colour - use setPaletteColour()
        to set colours, or colour()/white() to get colours
    @param {int} transition Transition to use to move to colour, from
        Push2.transition - defaults to Push2.transition.set
    @param {int} speed Speed of transition, from Push2.speed - defaults to
        Push2.speed.instant if transition is Push2.transition.set, or
        Push2.speed.quarter otherwise
    */
    this.setPadColour = function(x, y, colour, transition, speed)
    {
        var button = __padToNoteNumber(x, y);
        this.__setButtonColour(false, button, colour, transition, speed);
    }

    /** Sets the colour of the given button above the screen

    @param {int} index Index position of button, 0..7, 0 being left
    @param {int} colour Colour palette entry for colour - use setPaletteColour()
        to set colours, or colour()/white() to get colours
    @param {int} transition Transition to use to move to colour, from
        Push2.transition - defaults to Push2.transition.set
    @param {int} speed Speed of transition, from Push2.speed - defaults to
        Push2.speed.instant if transition is Push2.transition.set, or
        Push2.speed.quarter otherwise
    */
    this.setScreenTopButtonColour = function(index, colour, transition, speed)
    {
        this.__setButtonColour(true, 102+index, colour, transition, speed);
    }

    /** Sets the colour of the given button below the screen

    @param {int} index Index position of button, 0..7, 0 being left
    @param {int} colour Colour palette entry for colour - use setPaletteColour()
        to set colours, or colour()/white() to get colours
    @param {int} transition Transition to use to move to colour, from
        Push2.transition - defaults to Push2.transition.set
    @param {int} speed Speed of transition, from Push2.speed - defaults to
        Push2.speed.instant if transition is Push2.transition.set, or
        Push2.speed.quarter otherwise
    */
    this.setScreenBottomButtonColour = function(index, colour, transition, speed)
    {
        this.__setButtonColour(true, 20+index, colour, transition, speed);
    }

    /** Sets the colour of the given scene launch button

    @param {int} index Index position of button, 0..7, 0 being bottom
    @param {int} colour Colour palette entry for colour - use setPaletteColour()
        to set colours, or colour()/white() to get colours
    @param {int} transition Transition to use to move to colour, from
        Push2.transition - defaults to Push2.transition.set
    @param {int} speed Speed of transition, from Push2.speed - defaults to
        Push2.speed.instant if transition is Push2.transition.set, or
        Push2.speed.quarter otherwise
    */
    this.setSceneLaunchButtonColour = function(index, colour, transition, speed)
    {
        this.__setButtonColour(true, 36+index, colour, transition, speed);
    }

    /** Set the intensity of the lights on the touchstrip.

    This only works if hostSendsValues has been set to false by setTouchstripFlags

    @param {array} lightValues An array of 31 integers from 0..7. The first sets
        the intensity of the bottom light, the last sets the intensity of the
        top light. 0 switches the light off, 7 puts it at full intensity.
    */
    this.setTouchstripLights = function(lightValues) {
        if (this.canSysex)
        {
            console.assert(lightValues.length === 31);

            var message = [ 0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x19 ]
            for (var i = 0; i < 30; i += 2) {
                if(lightValues[i] > 7 || lightValues[i+1] > 7)
                {
                    throw new TouchstripLightIntensityOutOfRange();
                }

                message.push(lightValues[i] | lightValues[i+1] << 3);
            }

            if(lightValues[30] > 7)
            {
                throw new TouchstripLightIntensityOutOfRange();
            }

            message.push(lightValues[30]);
            message.push(0xF7);

            this.midiOutput.send(message);
        }
        else
        {
            throw FunctionNeedsSysExPermissionException(
                "setTouchstripLights");
        }
    }

    /** Set the value shown on the touchstrip.

    This only works if hostSendsValues has been set to true by setTouchstripFlags

    @param {int} value Value for touchstrip to show. If valuesSentAsPitchBend
    has been set to true by setTouchstripFlags, this should be in range
    0..16320. If valuesSentAsPitchBend has been set to false by setTouchstripFlags,
    this should be in range 0..127
    */
    this.setTouchstripValue = function(value) {
        if (this.__touchstripValuesSentAsPitchBend)
        {
            if(value < 0 || value > 16320)
            {
                throw TouchstripValueOutOfRange("0..16320 (pitchbend units)");
            }

            this.midiOutput.send([ 0xE0, value & 0x40, value >> 7 ]);
        }
        else
        {
            if(value < 0 || value > 127)
            {
                throw TouchstripValueOutOfRange("0..127 (modwheel units)");
            }

            this.midiOutput.send([ 0xB0, 0x01, value ]);
        }
    }

    this.colouredButtons = [
        this.buttons.play, this.buttons.record, this.buttons.automate,
        this.buttons.mute, this.buttons.solo, this.buttons.stop,
        this.buttons.one32t,
        this.buttons.one32,
        this.buttons.one16t,
        this.buttons.one16,
        this.buttons.one8t,
        this.buttons.one8,
        this.buttons.one4t,
        this.buttons.one4
    ]

    function __padToNoteNumber(x, y)
    {
        return 36 + x + y * 8
    }

    ///////////////////////////////////////////////////////////
    // Screen

    var __displayPitch = 1920 + 128;
    var __processedImage = new Uint8ClampedArray(__displayPitch * 160);
    var __xorBytes = [ 0xE7, 0xF3, 0xE7, 0xFF ];
    var __xorOffset = 0;

    ///////////////////////////////////////////////////////////
    // Handling MIDI event input

    /** Logs MIDI events sent to functions you haven't yet overridden to the
    Javascript console. It helps to see what you need to do to handle events
    for specific buttons. Override this with an empty function to stop the logging.

    @param {string} text String description of the function and parameters that
    were called to handle the event.
    */
    this.logMidiEvent = function(text)
    {
        console.log(text)
    }

    /** Called when a pad is pressed.

    @param {int} x X position of pad, 0..7, 0 being left
    @param {int} y Y position of pad, 0..7, 0 being bottom
    @param {int} velocity Velocity 0..127 of pad press
    */
    this.padPressed = function(x, y, velocity)
    {
        this.logMidiEvent("padPressed: "+x+" "+y+" "+velocity);
    }

    /** Called when a pad is released.

    @param {int} x X position of pad, 0..7, 0 being left
    @param {int} y Y position of pad, 0..7, 0 being bottom
    */
    this.padReleased = function(x, y, velocity)
    {
        this.logMidiEvent("padReleased: "+x+" "+y+" "+velocity);
    }

    /** Called when pressure on a pressed pad changes

    Only called if setAftertouchModeToPolyphonicKeyPressure has previously been
    called.

    @param {int} x X position of pad, 0..7, 0 being left
    @param {int} y Y position of pad, 0..7, 0 being bottom
    @param {int} pressure New pad pressure
    */
    this.padPressureChanged = function(x, y, pressure)
    {
        this.logMidiEvent("padPressureChanged: "+x+" "+y+" "+pressure);
    }

    /** Called when pressure on a pressed pad changes

    Only called if setAftertouchModeToChannelPressure has previously been
    called.

    @param {int} x X position of pad, 0..7, 0 being left
    @param {int} y Y position of pad, 0..7, 0 being bottom
    @param {int} pressure New pad pressure
    */
    this.channelPressureChanged = function(messageChannel, pressure)
    {
        this.logMidiEvent("channelPressureChanged: "+messageChannel+" "+pressure);
    }

    /** Called when a button is pressed.

    @param {int} button Button to set colour of, from Push2.buttons
    */
    this.buttonPressed = function(button)
    {
        this.logMidiEvent("buttonPressed: "+button);
    }

    /** Called when a button is released.

    @param {int} button Button to set colour of, from Push2.buttons
    */
    this.buttonReleased = function(button)
    {
        this.logMidiEvent("buttonReleased: "+button);
    }

    /** Called when a button above the screen is released

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenTopButtonReleased = function(index)
    {
        this.logMidiEvent("screenTopButtonReleased: "+index);
    }

    /** Called when a button above the screen is pressed

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenTopButtonPressed = function(index)
    {
        this.logMidiEvent("screenTopButtonPressed: "+index);
    }

    /** Called when a button below the screen is released

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenBottomButtonReleased = function(index)
    {
        this.logMidiEvent("screenBottomButtonReleased: "+index);
    }

    /** Called when a button below the screen is pressed

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenBottomButtonPressed = function(index)
    {
        this.logMidiEvent("screenBottomButtonPressed: "+index);
    }

    /** Called when a scene launch button is released

    @param {int} index Index position of button, 0..7, 0 being bottom
    */
    this.sceneLaunchButtonReleased = function(index)
    {
        this.logMidiEvent("sceneLaunchButtonReleased: "+index);
    }

    /** Called when a scene launch button is pressed

    @param {int} index Index position of button, 0..7, 0 being bottom
    */
    this.sceneLaunchButtonPressed = function(index)
    {
        this.logMidiEvent("sceneLaunchButtonPressed: "+index);
    }

    /** Called when the touchstrip is untouched
    */
    this.touchstripReleased = function()
    {
        this.logMidiEvent("touchstripReleased")
    }

    /** Called when the touchstrip is touched
    */
    this.touchstripTouched = function()
    {
        this.logMidiEvent("touchstripTouched")
    }

    /** Called when the touchstrip is touched or the finger moves on the
    touchstrip, and valuesSentAsPitchBend has been set to false by
    setTouchstripFlags.

    @param {int} value New value 0..127
    */
    this.touchstripModWheelChanged = function(value)
    {
        this.logMidiEvent("touchstripModWheelChanged: "+value);
    }

    /** Called when the touchstrip is touched or the finger moves on the
    touchstrip, and valuesSentAsPitchBend has been set to true by
    setTouchstripFlags.

    @param {int} value New value 0..16320
    */
    this.touchstripPitchBendChanged = function(amount)
    {
        this.logMidiEvent("touchstripPitchBendChanged: "+amount);
    }

    /** Called when an encoder above the screen is touched

    @param {int} index Index of encoder 0..7, 0 being the left encoder
    */
    this.screenEncoderTouched = function(index)
    {
        this.logMidiEvent("screenEncoderTouched: "+index);
    }

    /** Called when an encoder above the screen is turned

    @param {int} index Index of encoder 0..7, 0 being the left encoder
    @param {int} amount Amount the encoder has been turned, negative for an
    anticlockwise turn, positive for a clockwise turn. In arbitrary units.
    */
    this.screenEncoderTurned = function(index, amount)
    {
        this.logMidiEvent("screenEncoderTurned: "+index+" "+amount);
    }

    /** Called when an encoder above the screen is released

    @param {int} index Index of encoder 0..7, 0 being the left encoder
    */
    this.screenEncoderReleased = function(index)
    {
        this.logMidiEvent("screenEncoderReleased: "+index);
    }

    /** Called when the tempo, swing or volume encoders are touched

    @param {int} encoder Encoder from Push2.encoders
    */
    this.encoderTouched = function(encoder)
    {
        this.logMidiEvent("encoderTouched: "+encoder);
    }

    /** Called when the tempo, swing or volume encoders are turned

    @param {int} encoder Encoder from Push2.encoders
    @param {int} amount Amount the encoder has been turned, negative for an
    anticlockwise turn, positive for a clockwise turn. In arbitrary units.
    */
    this.encoderTurned = function(encoder, amount)
    {
        this.logMidiEvent("encoderTurned: "+encoder+" "+amount);
    }

    /** Called when the tempo, swing or volume encoders are untouched

    @param {int} encoder Encoder from Push2.encoders
    */
    this.encoderReleased = function(encoder)
    {
        this.logMidiEvent("encoderReleased: "+encoder);
    }

    function __noteNumberToPad(noteNumber)
    {
        return {
            x: (noteNumber - 36) % 8,
            y: Math.floor((noteNumber - 36) / 8)
        }
    }

    this.__isButton = function(ccNumber)
    {
        for (var key in this.buttons)
        {
            if (this.buttons.hasOwnProperty(key) && this.buttons[key] == ccNumber)
            {
                return true;
            }
        }

        return false;
    }

    this.__handleNoteOnEvent = function(messageChannel, noteNumber, velocity)
    {
        if (noteNumber >= 36 && noteNumber < 100)
        {
            // Pad pressed
            if (velocity !== 0)
            {
                pad = __noteNumberToPad(noteNumber)
                this.padPressed(pad.x, pad.y, velocity);
            }
        }
        else if (noteNumber === 12)
        {
            if (velocity === 0) this.touchstripReleased();
            else this.touchstripTouched();
        }
        else if (noteNumber < 8)
        {
            if (velocity === 0) this.screenEncoderReleased(noteNumber);
            else this.screenEncoderTouched(noteNumber);
        }
        else if (noteNumber === 10)
        {
            if (velocity === 0) this.encoderReleased(this.encoders.tempo);
            else this.encoderTouched(this.encoders.tempo);
        }
        else if (noteNumber === 9)
        {
            if (velocity === 0) this.encoderReleased(this.encoders.swing);
            else this.encoderTouched(this.encoders.swing);
        }
        else if (noteNumber === 8)
        {
            if (velocity === 0) this.encoderReleased(this.encoders.volume);
            else this.encoderTouched(this.encoders.volume);
        }
    }

    this.__handleNoteOffEvent = function(messageChannel, noteNumber, velocity)
    {
        if (noteNumber >= 36 && noteNumber < 100)
        {
            if (velocity == 0) {
                // Pad released
                pad = __noteNumberToPad(noteNumber)
                this.padReleased(pad.x, pad.y, velocity);
            }
        }
    }

    this.__handleControlChangeEvent = function(messageChannel, ccNumber, value)
    {
        var isScreenEncoder = ccNumber >= 71 && ccNumber <= 78;
        var isTempoEncoder = ccNumber === 14;
        var isSwingEncoder = ccNumber === 15;
        var isVolumeEncoder = ccNumber === 79;

        // The scene launch buttons double as named buttons
        // So need to test this AND test __isButton below,
        // therefore no "else if".
        // Means both functions will be called - I think that's
        // desirable.
        if (ccNumber >= 36 && ccNumber <= 43)
        {
            if (value === 0) this.sceneLaunchButtonReleased(ccNumber - 36);
            else this.sceneLaunchButtonPressed(ccNumber - 36);
        }

        if (this.__isButton(ccNumber))
        {
            // A button has been pressed or released
            if (value === 0) this.buttonReleased(ccNumber);
            else this.buttonPressed(ccNumber);
        }
        else if (ccNumber >= 20 && ccNumber <= 27)
        {
            if (value === 0) this.screenBottomButtonReleased(ccNumber - 20);
            else this.screenBottomButtonPressed(ccNumber - 20);
        }
        else if (ccNumber >= 102 && ccNumber <= 109)
        {
            if (value === 0) this.screenTopButtonReleased(ccNumber - 102);
            else this.screenTopButtonPressed(ccNumber - 102);
        }
        else if (isScreenEncoder || isTempoEncoder || isSwingEncoder || isVolumeEncoder)
        {
            var amount = value & 0x3F;
            amount = value < 64 ? value : value - 128;

            if (isScreenEncoder)
            {
                this.screenEncoderTurned(ccNumber - 71, amount);
            }
            else
            {
                this.encoderTurned(ccNumber, amount);
            }
        }
        else if (ccNumber === 1)
        {
            this.touchstripModWheelChanged(value);
        }
    }

    this.__handleChannelPressureEvent = function(messageChannel, pressure)
    {
        this.channelPressureChanged(messageChannel, pressure);
    }

    this.__handlePolyphonicKeyPressureEvent = function(messageChannel, noteNumber, pressure)
    {
        if (noteNumber >= 36 && noteNumber < 100)
        {
            // Pad aftertouch pressure changed
            pad = __noteNumberToPad(noteNumber)
            this.padPressureChanged(pad.x, pad.y, pressure);
        }
    }

    this.__handlePitchBendEvent = function(messageChannel, amount)
    {
        this.touchstripPitchBendChanged(amount);
    }

    this.__handleMidiEvent = function(event) {
        var handled = false;

        var messageType = event.data[0] >> 4;
        var messageChannel = event.data[0] & 0xf;

        //console.log("Received event "+messageType);

        if (messageType == 0x9)
        {
            this.__handleNoteOnEvent(messageChannel, event.data[1], event.data[2]);
        }
        else if (messageType == 0x8)
        {
            this.__handleNoteOffEvent(messageChannel, event.data[1], event.data[2]);
        }
        else if (messageType == 0xB)
        {
            this.__handleControlChangeEvent(messageChannel, event.data[1], event.data[2]);
        }
        else if (messageType == 0xD)
        {
            this.__handleChannelPressureEvent(messageChannel, event.data[1]);
        }
        else if (messageType == 0xA)
        {
            this.__handlePolyphonicKeyPressureEvent(messageChannel, event.data[1], event.data[2]);
        }
        else if (messageType == 0xE)
        {
            this.__handlePitchBendEvent(messageChannel, event.data[1] & (event.data[2] << 7));
        }

        // todo:
        // Handle pedals
    }
}
