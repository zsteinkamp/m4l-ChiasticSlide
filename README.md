# Chiastic Slide

Chiastic Slide is a Max for Live device that acts as a crossfader to a multi-chain device such as a Group Track, Instrument Rack or Audio Effect Rack. It can handle up to 32 chains, with control over the crossfade width.

![How it Looks](images/device.gif)

Chains or child tracks are shown as colored balls on the perimeter of a circle. You can control a virtual mic with the Direction control. The "pickup pattern" of the mic can be controlled with the Width and Curve controls.

This allows you to have multiple chains of parallel material, instruments, or effects and fade between them while time marches forward.

I created this plugin when I saw that the Abelton's Rack devices (Instrument Rack, Audio Effect Rack) `Chain Selector` parameter only controlled input rather than output. I was looking to have any number of sounds playing simultaneously, but be able to smoothly fade between them without disrupting time.

Traditionally, you can use this to fade between several different tracks, instruments, or effects chains. Load up a few different pads in an Instrument Rack and give it a try by adding Chiastic Slide right after the rack.

If you're interested in this, then you may also be interested in my other device called [SimulScrub](https://github.com/zsteinkamp/m4l-SimulScrub).

## Installation

[Download the .amxd file from the latest release](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases) or clone this repository, and drag the `ChiasticSlide.amxd` device into a track in Ableton Live.

## Changelog

- 2024-12-11 [v9](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v9/ChiasticSlide-v9.amxd) - Adds an automation-aware toggle for the endless direction knob. Thanks again @Luke-KB for the feedback! Also makes the visualization more accurate when min/max vol is used.
- 2024-12-07 [v8](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v8/ChiasticSlide-v8.amxd) - Fixes a bug when the endless direction knob is automated to 0 or 360 disabling automation.
- 2024-11-29 [v7](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v7/ChiasticSlide-v7.amxd) - Accurately show pickup pattern. Math is fun! Direction knob is _endless_. Feedback welcome on if this is problematic. For me it is 10x the fun.
- 2024-10-29 [v6](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v6/ChiasticSlide-v6.amxd) - Add non-blocking telemetry ping on load. Does not send any identifying information, only the plugin name, the local computer name, type of computer, and CPU type. I just want to see which plugins are used the most.
- 2024-09-13 [v5](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v5/ChiasticSlide-v5.amxd) - Track changes in track/chain colors and children adding/removing/reordering.
- 2024-09-10 [v4](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v4/ChiasticSlide.v4.amxd) - Re-imagine UI as a circle, add a Curve control.
- 2024-04-27 [v3](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v3/ChiasticSlide.v3.amxd) - Support group tracks. Provide a visual for volumes.
- 2024-01-15 [v2](https://github.com/zsteinkamp/m4l-ChiasticSlide/releases/download/v2/ChiasticSlide.v2.amxd) - Pretty big rework to fix an undo buffer flood bug.
- 2024-01-09 v1 - Initial Release (download disabled).

## Usage

Add this device to a Group Track or immediately after an Instrument Rack or Audio Effect Rack device.

`Direction` - Controls where the virtual microphone is pointed.

`Width` - Adjust how many adjacent sources are audible, i.e. the "pickup pattern" of the mic.

`Curve` - Adjusts the falloff of the pickup pattern. Low values raise the volume of adjacent sources.

`Min Vol` - The minimum volume level.

`Max Vol` - Maximum volume level.

`Rescan` - Click this if you add, remove, or change the color of  tracks/chains.

## Constant Power

If you are looking to perfectly fade betweeen some number of sources, with constant volume regardless of `Direction` setting, then consider the following.

1) Set the `Width` to 2 * (360 / N), where N is the number of sources. So for 6 sources, set the width to 120. For 4 sources, set to 180, etc.
2) Set the `Curve` value to 0.32. If you are using the experimental, unreleased Constant Power option, then set `Curve` to 0.64.

## TODO
- ...

## Contributing

I'd love it if others extended this device. If you would like to contribute, simply fork this repo, make your changes, and open a pull request and I'll have a look.
