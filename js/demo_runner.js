$(function () {
	
	SyntaxHighlighter.all();
	
	if (!$('canvas').length) {
		return;
	}
	
	/* Demo 1 ******************************************/
	(function () {
		var myKapi,
			circle1;
		
		myKapi = kapi(document.getElementById('demo1'), {
			fps: 30,
			// Set up some basic styles for the canvas
			styles: {
				height: 	'400px',
				width: 		'500px',
				background: '#333'
			}
		}).play(); // Start the animation
		
		// The actor `circle` is defined in shapes.js
		circle1 = myKapi.add(circle, {
			name: 		'circle1',
			x: 		70,
			y: 		70,
			radius: 50,
			color: 	'#00ffaa',
			easing: 'easeInOutQuint'
		}).keyframe(0, {
			// Blank, defining keyframe zero as the same as the initial state
		}).keyframe('3s', {
			x: 	300,
			y: 	300
		}).keyframe('3.25s', {
			// Empty keyframes act as a "wait"
		}).keyframe('6s', {
			x: 	'+=50',
			y: 	100
		}).liveCopy('8s', 0);
		
		// Some jQuery code to attach a click event for pausing.
		// It is not necessary to get the above code to run.
		$('#demo1').click(function (ev) {
			if (myKapi.isPlaying()) {
				myKapi.pause();
			} else {
				myKapi.play();
			}
		});
	}());
	/****************************************** Demo 1 */
});