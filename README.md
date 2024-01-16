# Chiastic Slide

Chiastic Slide is a Max for Live device that acts as a crossfader to a multi-chain device such as Instrument Rack or Audio Effect Rack. It can handle up to 32 chains, with control over the crossfade width.

![How it Looks](images/device.gif)

This allows you to have multiple chains of parallel material, instruments, etc and fade between them while time marches forward.

I created this plugin when I saw that the Abelton's Rack devices (Instrument Rack, Audio Effect Rack) `Chain Selector` parameter only controlled input rather than output. I was looking to have any number of sounds playing simultaneously, but be able to smoothly fade between them without disrupting time.

Traditionally, you can use this to fade between several different instruments or effects chains. Load up a few different pads in an Instrument Rack and give it a try.

Getting into the creative possibilities for this, things get pretty cool. Imagine 2-bar slices of an entire song playing simultaneously, in a loop, and being able to smoothly control which of those slices were audible. You can scrub through a song over the course of a two measures, locked in time. You can do this by slicing a longer recording into equal sized pieces, cropping those pieces, then select the pieces and drag them to an Instrument Rack device. This will create a Simpler device on each chain. Add an instance of Chiastic Slide after the Instrument Rack, sequence some notes the same length as your slices, and you can get jamming.

Or overlay a conversation between two people over time, scrubbing forward and backward through their exchange over the course of a measure or eight.

Time becomes just another creative dimension, without ever losing connection with the recording's inherent rhythm.

## Installation

[Download the newest .amxd file from the frozen/ directory](https://github.com/zsteinkamp/m4l-ChiasticSlide/raw/main/frozen/ChiasticSlide%20v2.amxd) or clone this repository, and drag the `ChiasticSlide.amxd` device into a track in Ableton Live.

## Changelog

- 2024-01-15 [v2](https://github.com/zsteinkamp/m4l-ChiasticSlide/raw/main/frozen/ChiasticSlide%20v2.amxd) - Pretty big rework to fix an undo buffer flood bug.
- 2024-01-09 [v1](https://github.com/zsteinkamp/m4l-ChiasticSlide/raw/main/frozen/ChiasticSlide%20v1.amxd) - Initial Release.

## Usage

Add this device immediately after an Instrument Rack or Audio Effect Rack device. If you need to move it, press the `RESCAN` button to have it detect the chains again.

Use the `Crossfade` knob to fade between your chains.

Use the `Width` knob to control the width of the crossfade -- from surgical precision to wide swaths of your mixtures.

## TODO

- ...

## Contributing

I'd love it if others extended this device. If you would like to contribute, simply fork this repo, make your changes, and open a pull request and I'll have a look.
