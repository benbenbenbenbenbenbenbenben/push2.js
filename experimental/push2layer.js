var Push2Layers = function(push2)
{
    this.push2 = push2;
    this.layers = [];
    this.dirty = true;
    this.heldButtons = new Set();
    this.heldPads = []

    for(var x = 0; x < 8; x++)
    {
        this.heldPads.push([])
        for(var y = 0; y < 8; y++)
        {
            this.heldPads[x].push(false);
        }
    }

    this.openLayer = function(layer)
    {
        index = this.layers.indexOf(layer);
        if (index >= 0)
        {
            this.layers.splice(index, 1);
        }

        this.layers.unshift(layer);
    }

    this.closeLayer = function(layer)
    {
        index = this.layers.indexOf(layer);
        if (index >= 0)
        {
            this.layers.splice(index, 1);
        }
    }

    this.makeDirty = function()
    {
        this.dirty = true;
    }

    propagateEvent = function(functionName)
    {
        if (functionName == "buttonPressed")
        {
            this.heldButtons.add(arguments[1]);
        }
        else if (functionName == "buttonReleased")
        {
            this.heldButtons.delete(arguments[1]);
        }
        else if (functionName == "padPressed")
        {
            this.heldPads[arguments[1], arguments[2]] = true;
        }
        else if (functionName == "padReleased")
        {
            this.heldPads[arguments[1], arguments[2]] = false;
        }

        for (var i = 0; i < this.layers.length; i++)
        {
            handled = this.layers[i][functionName].apply(
                this.layers[i],
                Array.prototype.slice.call(arguments, 1));

            if (handled) break;
        }
    }.bind(this);

    eventFunctionNames = [
        "padPressed",
        "padReleased",
        "padPressureChanged",
        "channelPressureChanged",
        "buttonPressed",
        "buttonReleased",
        "screenTopButtonReleased",
        "screenTopButtonPressed",
        "screenBottomButtonReleased",
        "screenBottomButtonPressed",
        "sceneLaunchButtonReleased",
        "sceneLaunchButtonPressed",
        "touchstripReleased",
        "touchstripTouched",
        "touchstripModWheelChanged",
        "touchstripPitchBendChanged",
        "screenEncoderTouched",
        "screenEncoderTurned",
        "screenEncoderReleased",
        "encoderTouched",
        "encoderTurned",
        "encoderReleased",
    ]

    eventFunctionNames.forEach(function(eventFunctionName)
    {
        push2[eventFunctionName] = propagateEvent.bind(this, eventFunctionName);
    });

    this.get = function (propertyName)
    {
        for (var i = 0; i < this.layers.length; i++)
        {
            colour = this.layers[i]["get"+propertyName].apply(
                this.layers[i],
                Array.prototype.slice.call(arguments, 1));

            if (colour !== undefined) return colour;
        }

        return 0;
    }

    this.getWithDefault = function (propertyName, def)
    {
        for (var i = 0; i < this.layers.length; i++)
        {
            colour = this.layers[i]["get"+propertyName].apply(
                this.layers[i],
                Array.prototype.slice.call(arguments, 2));

            if (colour !== undefined) return colour;
        }

        return def;
    }

    this.defaultTouchstripLights = []
    for (var i = 0; i < 31; i++)
    {
        this.defaultTouchstripLights.push(0);
    }

    this.update = function()
    {
        if (!this.dirty) return;

        for (var x = 0; x < 8; x++)
        {
            this.push2.setScreenTopButtonColour(x, this.get("ScreenTopButtonColour", x));
            this.push2.setScreenBottomButtonColour(x, this.get("ScreenBottomButtonColour", x));
            this.push2.setSceneLaunchButtonColour(x, this.get("SceneLaunchButtonColour", x));

            for (var y = 0; y < 8; y++)
            {
                this.push2.setPadColour(x, y, this.get("PadColour", x, y));
            }
        }

        for (buttonName in this.push2.buttons)
        {
            button = this.push2.buttons[buttonName];
            if (button < 36 || button > 43)
            {
                this.push2.setButtonColour(button, this.get("ButtonColour", button));
            }
            else
            {
                colour = this.getWithDefault("ButtonColour", undefined, button);
                if (colour !== undefined)
                {
                    this.push2.setButtonColour(button, colour);
                }
            }
        }

        this.push2.setTouchstripValue(this.get("TouchstripValue"));
        this.push2.setTouchstripLights(this.getWithDefault("TouchstripLights", this.defaultTouchstripLights));

        this.dirty = false;
    }
}

var Push2Layer = function()
{
    /** Gets the colour of the given button

    @param {int} button Button to set colour of, from Push2.buttons
    @return {int, int, int} colour, transition, speed
        colour Colour palette entry for colour - use setPaletteColour()
            to set colours, or colour()/white() to get colours
        transition Transition to use to move to colour, from
            Push2.transition - defaults to Push2.transition.set
        speed Speed of transition, from Push2.speed - defaults to
            Push2.speed.instant if transition is Push2.transition.set, or
            Push2.speed.quarter otherwise
    */
    this.getButtonColour = function(button)
    {
        return undefined;
    }

    /** Gets the colour of the given pad

    @param {int} x X position of pad, 0..7, 0 being left
    @param {int} y Y position of pad, 0..7, 0 being bottom
    @return {int, int, int} colour, transition, speed
        colour Colour palette entry for colour - use setPaletteColour()
            to set colours, or colour()/white() to get colours
        transition Transition to use to move to colour, from
            Push2.transition - defaults to Push2.transition.set
        speed Speed of transition, from Push2.speed - defaults to
            Push2.speed.instant if transition is Push2.transition.set, or
            Push2.speed.quarter otherwise
    */
    this.getPadColour = function(x, y)
    {
        return undefined;
    }

    /** Gets the colour of the given button above the screen

    @param {int} index Index position of button, 0..7, 0 being left
    @return {int, int, int} colour, transition, speed
        colour Colour palette entry for colour - use setPaletteColour()
            to set colours, or colour()/white() to get colours
        transition Transition to use to move to colour, from
            Push2.transition - defaults to Push2.transition.set
        speed Speed of transition, from Push2.speed - defaults to
            Push2.speed.instant if transition is Push2.transition.set, or
            Push2.speed.quarter otherwise
    */
    this.getScreenTopButtonColour = function(index)
    {
        return undefined;
    }

    /** Gets the colour of the given button below the screen

    @param {int} index Index position of button, 0..7, 0 being left
    @return {int, int, int} colour, transition, speed
        colour Colour palette entry for colour - use setPaletteColour()
            to set colours, or colour()/white() to get colours
        transition Transition to use to move to colour, from
            Push2.transition - defaults to Push2.transition.set
        speed Speed of transition, from Push2.speed - defaults to
            Push2.speed.instant if transition is Push2.transition.set, or
            Push2.speed.quarter otherwise
    */
    this.getScreenBottomButtonColour = function(index)
    {
        return undefined;
    }

    /** Gets the colour of the given scene launch button

    @param {int} index Index position of button, 0..7, 0 being bottom
    @return {int, int, int} colour, transition, speed
        colour Colour palette entry for colour - use setPaletteColour()
            to set colours, or colour()/white() to get colours
        transition Transition to use to move to colour, from
            Push2.transition - defaults to Push2.transition.set
        speed Speed of transition, from Push2.speed - defaults to
            Push2.speed.instant if transition is Push2.transition.set, or
            Push2.speed.quarter otherwise
    */
    this.getSceneLaunchButtonColour = function(index)
    {
        return undefined;
    }

    /** Get the intensity of the lights on the touchstrip.

    This is only called if hostSendsValues has been set to false by setTouchstripFlags

    @return {array} lightValues An array of 31 integers from 0..7. The first sets
        the intensity of the bottom light, the last sets the intensity of the
        top light. 0 switches the light off, 7 puts it at full intensity.
    */
    this.getTouchstripLights = function()
    {
        return undefined;
    }

    /** Get the value shown on the touchstrip.

    This is only called if hostSendsValues has been set to true by setTouchstripFlags

    @return {int} value Value for touchstrip to show. If valuesSentAsPitchBend
    has been set to true by setTouchstripFlags, this should be in range
    0..16320. If valuesSentAsPitchBend has been set to false by setTouchstripFlags,
    this should be in range 0..127
    */
    this.getTouchstripValue = function()
    {
        return undefined;
    }

    this.padPressed = function(x, y, velocity)
    {
        return false;
    }

    /** Called when a pad is released.

    @param {int} x X position of pad, 0..7, 0 being left
    @param {int} y Y position of pad, 0..7, 0 being bottom
    */
    this.padReleased = function(x, y, velocity)
    {
        return false;
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
        return false;
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
        return false;
    }

    /** Called when a button is pressed.

    @param {int} button Button to set colour of, from Push2.buttons
    */
    this.buttonPressed = function(button)
    {
        return false;
    }

    /** Called when a button is released.

    @param {int} button Button to set colour of, from Push2.buttons
    */
    this.buttonReleased = function(button)
    {
        return false;
    }

    /** Called when a button above the screen is released

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenTopButtonReleased = function(index)
    {
        return false;
    }

    /** Called when a button above the screen is pressed

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenTopButtonPressed = function(index)
    {
        return false;
    }

    /** Called when a button below the screen is released

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenBottomButtonReleased = function(index)
    {
        return false;
    }

    /** Called when a button below the screen is pressed

    @param {int} index Index position of button, 0..7, 0 being left
    */
    this.screenBottomButtonPressed = function(index)
    {
        return false;
    }

    /** Called when a scene launch button is released

    @param {int} index Index position of button, 0..7, 0 being bottom
    */
    this.sceneLaunchButtonReleased = function(index)
    {
        return false;
    }

    /** Called when a scene launch button is pressed

    @param {int} index Index position of button, 0..7, 0 being bottom
    */
    this.sceneLaunchButtonPressed = function(index)
    {
        return false;
    }

    /** Called when the touchstrip is untouched
    */
    this.touchstripReleased = function()
    {
        return false;
    }

    /** Called when the touchstrip is touched
    */
    this.touchstripTouched = function()
    {
        return false;
    }

    /** Called when the touchstrip is touched or the finger moves on the
    touchstrip, and valuesSentAsPitchBend has been set to false by
    setTouchstripFlags.

    @param {int} value New value 0..127
    */
    this.touchstripModWheelChanged = function(value)
    {
        return false;
    }

    /** Called when the touchstrip is touched or the finger moves on the
    touchstrip, and valuesSentAsPitchBend has been set to true by
    setTouchstripFlags.

    @param {int} value New value 0..16320
    */
    this.touchstripPitchBendChanged = function(amount)
    {
        return false;
    }

    /** Called when an encoder above the screen is touched

    @param {int} index Index of encoder 0..7, 0 being the left encoder
    */
    this.screenEncoderTouched = function(index)
    {
        return false;
    }

    /** Called when an encoder above the screen is turned

    @param {int} index Index of encoder 0..7, 0 being the left encoder
    @param {int} amount Amount the encoder has been turned, negative for an
    anticlockwise turn, positive for a clockwise turn. In arbitrary units.
    */
    this.screenEncoderTurned = function(index, amount)
    {
        return false;
    }

    /** Called when an encoder above the screen is released

    @param {int} index Index of encoder 0..7, 0 being the left encoder
    */
    this.screenEncoderReleased = function(index)
    {
        return false;
    }

    /** Called when the tempo, swing or volume encoders are touched

    @param {int} encoder Encoder from Push2.encoders
    */
    this.encoderTouched = function(encoder)
    {
        return false;
    }

    /** Called when the tempo, swing or volume encoders are turned

    @param {int} encoder Encoder from Push2.encoders
    @param {int} amount Amount the encoder has been turned, negative for an
    anticlockwise turn, positive for a clockwise turn. In arbitrary units.
    */
    this.encoderTurned = function(encoder, amount)
    {
        return false;
    }

    /** Called when the tempo, swing or volume encoders are untouched

    @param {int} encoder Encoder from Push2.encoders
    */
    this.encoderReleased = function(encoder)
    {
        return false;
    }
}
