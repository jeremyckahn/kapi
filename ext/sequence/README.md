Kapi Sequence API
===

The Kapi Sequence API (Kapi Sapi) is a tool for easily defining sub-timelines in a Kapi animation.  It is built around the core Kapi puppet methods. - all it does is set them to start and stop at specified periods in the animation loop.

To use, just include `kapi.sequence.js` on your page, after `kapi.js`.

Methods:

  * `kapiInst.sequence.create()`
  * `kapiInst.sequence.startAt()`
  * `kapiInst.sequence.endAt()`
  * `kapiInst.sequence.destroy()`