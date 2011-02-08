Kapi - A keyframing API for the HTML 5 Canvas
=============================================

What Kapi does
-----------------------

Kapi is a keyframing API for the HTML 5 canvas.  It streamlines animation development by providing a simple interface for defining “actors” and their changing states over time.

A critical component of programmatically creating an animation is accurately calculating where things should be at a given time.  Doing something like

    function update() {
      myActor.x++;
      setTimeout(update, 33);
    }

is brittle, because it will lose accuracy.  System resource availability will affect the actual state of myActor over time.  A better approach is calculating the state of something based on real time.  This is precisely what Kapi does for you.

The important thing to understand is that Kapi is simply a timing layer for your animations.  It is designed to be modular, so you can use whatever drawing layer you prefer.

How Kapi works
-----------------------

At a high level, using Kapi comes down to five steps:

* Create a Kapi instance.
* Create some actors.
* Add the actors to the Kapi instance.
* Define keyframes (states) for the actors.
* Start the animation.

A Kapi animation is comprised of two metaphorical components:

* A stage.
* Actors.


The stage is a place for actors to do what they do.  In the literal sense, the stage is an HTML 5 canvas object, and actors are JavaScript functions that draw something on the canvas.  Here is a very simple example of an actor function that is compatible with Kapi:

    function circle(canvasContext){
      canvasContext.beginPath();
      canvasContext.arc(
        this.x,
        this.y,
        this.radius,
        0,
        Math.PI*2, 
        true
      );
      canvasContext.fillStyle = this.color;
      canvasContext.fill();
      canvasContext.closePath();
    }

Kapi only does one thing - it manages values based on the passage of time.  It passes those values to your actors, and your actors can do whatever you want them to with the values.

Using Kapi
==========

Setting up your animation
-------------------------------------

The first step is to create an instance of the Kapi object.  This can be done as simply as:

    var myKapi = kapi(document.getElementsByTagName('canvas')[0]);

`myKapi` is the object by which you will interface with the canvas.  There are optional parameters and events that you can pass along to the `kapi` constructor to configure the instance - please consult the public API documentation for more info.

The next step is to add actor instances.  You have complete freedom on how to you want to define your actors.  They are simply doing stuff with their instance variables, which are accessed with the JavaScript `this` keyword.  Let’s use the “circle” example actor defined earlier.  To add an instance of “circle” to Kapi, simply use `.add()`:

    var myCircle = myKapi.add(circle, {	
        name : 'myCircle',
        x : 0,
        y : 0,
        radius : 50,
        color : '#00ff00',
        easing : 'easeInOutQuad'
     });

`kapi.add()` defines the initial state of an actor - which is done in the second parameter with an object.  The properties of this object will be present in all keyframes of myCircle.  If there is a property that will be used anywhere by this actor in the animation, you need to define it in `kapi.add().`

A few important things to note:  If you do not specify a `name` property, one will be randomly generated for you.  It does need to have the same name as the variable that gets assigned the reference of the returned object from `kapi.add().`

You can add as many actors as you like with this approach.  Also, you can mix and match the actor types as you please (you can have multiple `circle`s.)

Defining states
---------------------

Now that you have set up your actors and your stage, you can define keyframed states.

To define a keyframe, call `actor.keyframe()`, like so:

    myCircle.keyframe(0, {
      x : 200,
      y : 150,
      radius : '*=2',
      color : '#0000ff'
    });

This would make a keyframe for `myCircle` at keyframe zero.  This particular keyframe would place the circle down and to the right, double the size, and fade it to blue (from green).  Since this is keyframe zero, the change would be completed as soon as the animation begins.  Any properties that are missing from a keyframe definition are inherited from the previous keyframe, if there is one.  If the property isn’t present on that keyframe, the same property from the keyframe before that is used.  This property lookup goes all the way back to the state that was passed to `kapi.add()` if necessary.

Actors will not appear on the screen until they are given a keyframe.  If the first keyframe that an actor is on is also the last keyframe in the animation, you won’t see that actor because the animation is starting over as soon as the actor “enters” the stage.

The `actor.keyframe()` function is chainable, so you can do this:

    myCircle.keyframe(0, {
      x : 60,
      y : 50,
      color : '#0000ff'
    }).keyframe(30, {
      x : 250,
      y : 50,
      radius : '/=2'
    });

Immediate actions
--------------------------

Another way to move your actors around is to use an Immediate Action.  Currently the only Immediate Action is `actor.to().`  Immediate actions work a little differently that keyframes.  Keyframes, collectively, form an animation loop that will repeat itself.  Immediate Actions, on the other hand, are executed immediately, and are executed only once and then discarded.  If multiple Immediate Actions are created for an actor, they are placed into a queue and fire in the order that they were created.

    myCircle.to('2s', {
      x: '+=100',
      y: 50,
      color: '#ff0000'
    });

From the instant this method is called, `myCircle` will move 100 pixels to the right of its current position, to the 50th pixel down in the canvas, and fade to red.  This will happen over the course of two seconds, which is defined by the first parameter.

Immediate Actions, like keyframes, are chainable.  It is easiest to use Immediate Actions with animations that only have one keyframe, defined on keyframe zero.  However, mixing Immediate Actions with keyframe is entirely valid.

    myCircle.keyframe(0, {
      x : 100,
      y : 100,
      color : '#0000ff'
    }).to('2s', {
      x: '+=100',
      y: 50,
      color: '#ff0000'
    }).to('1s', {
      x: 75,
      y: '*=2'
    });

This snippet defines keyframe zero, and adds two Immediate Actions to the queue.  In total, this animation will run for 3 seconds and then just stop.

Controlling Kapi
----------------------

Once you have set up your stage and actors, you can start and stop the animation.  Additionally, you can specify any point in the animation’s timeline that you’d like to view and play from.  Using our `myKapi` instance from before, we can call the following methods:

    myKapi.play();

Runs the animation from the beginning if it was not running before, or resumes from the paused state.

    myKapi.pause();

Pauses the animation, but does not clear the canvas.  The state of the animation is “frozen” until it is started again.

    myKapi.stop();

Stops the animation, clears, the canvas, and resets the state back to the beginning of the animation loop.

If you would like to go to a specific point in the timeline of the animation, you can do so with 

    myKapi.gotoFrame(desiredFrame);

`desiredFrame` is any frame in the animation.  For your convenience, there is also 

    myKapi.gotoAndPlay(desiredFrame);

This simply calls  `gotoFrame()` and then `play()`.

Tweening
--------------

There is only one tweening method built into Kapi - Linear.  Tweens are extensible; just add methods to the global `kapi.tween` object.  Please consult the docs for more info regarding this.

If you want more tweens than Linear, you are in luck.  The file `shapes.js` is included in the Kapi repository, which contains a collection of tweening methods.  All you have to do is include `shapes.js` in your page to use all the fun tweens.

More info
-------------

More technical documentation can be found within the `kapi.js` source file itself.  Each method has an explanation of the expected parameters and output.