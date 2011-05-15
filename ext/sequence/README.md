Kapi Sequence API
===

The Kapi Sequence API (Kapi Sapi) is a tool for easily defining sub-timelines in a Kapi animation.  It is built around the core Kapi puppet methods - all it does is set them to start and stop at specified periods in the animation loop.

To use, just include `kapi.sequence.js` on your page, after `kapi.js`.

Methods:

  * `kapiInst.sequence.create()`
  * `kapiInst.sequence.startAt()`
  * `kapiInst.sequence.endAt()`
  * `kapiInst.sequence.destroy()`

---
`kapiInst.sequence.create( sequenceName, sequence )`


This defines the sequence to be controlled.  The first parameter is the name, a string, that identifies the sequence.  This is how the other Kapi Sapi methods will access the sequence.  The `sequence` parameter is a function that sets up the sequence.  A "sequence" in Kapi Sapi terms is nothing more than a Kapi animation.  Important thing to note:  This function receives a `kapi` instance object as the first parameter.  This is the `kapi` instance that you should use to define your animation.  This function does not need to call the `kapi()` constructor method, that's all taken care of for you.  All you need to do is add your actors and keyframe them.  Here's an example:

````javascript
var main, sequence1;

// Create the main kapi instance
main = kapi(document.getElementById('main'), {
    'fps': 30
});

// Create a sequence
sequence1 = main.sequence.create('sequence1', function (sequenceInst) {
	var circle1;
	
	// Add an actor to the sequence
	circle1 = sequenceInst.add(circle, {
		'name': 'circle1',
		'x': 70,
		'y': 70,
		'radius': 50
	});
	
	// Make some sequence keyframes
	circle1
		.keyframe(0, {})
		.keyframe('1.5s', {
			'x': 300,
			'y': 300
		});
});
````

You don't need to return anything from the `sequence` function.  Just remember to set up the function to receive the `sequenceInst` as demonstrated.

---
kapiInst.sequence.startAt( sequenceName, frameId )`

Tells Kapi when the sequence should start.  The second parameter is a keyframe ID (see documentation on [gotoFrame](http://jeremyckahn.github.com/kapi/kapi_doc.html#gotoframe)).  A few important things to note:

  * The sequence will be started at the specified frame each time through the animation loop, usually.  See the next bullet point.
  * If the main timeline reaches the frame in which the sequence is supposed to begin, and the sequence is already running, it will __not__ be started again.

Example, continuing from above:

````javascript
// sequence1 will start 3 seconds into the animation.
main.sequence.startAt('sequence1', '3s');
````

---
`kapiInst.sequence.endAt( sequenceName, frameId )`

Tells Kapi when the sequence MUST end at.  This is not mandatory.  If you would like a sequence to run to completion, you can omit this.

````javascript
// sequence1 will end 5 seconds into the animation, whether sequence1 is running or not.
main.sequence.endAt('sequence1', '5s');
````

---
`kapiInst.sequence.destroy(sequenceName)`

Removes a sequence from the Kapi instance.

````javascript
// Remove sequence1
main.sequence.destroy('sequence1');
````