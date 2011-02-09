$(function () {
	var canvas1;
	
	/* Demo 1 ******************************************/
	canvas1 = $('#demo1');
	
	(function () {
		var myKapi,
			circle1;
		
		myKapi = kapi(canvas1[0], {
			fRate: 30,
			styles: {
				height: '500px',
				width: '600px',
				background: '#333'
			}
		}, {
			// events
		}).play();
		
		// The actor `circle` is defined in shapes.js
		circle1 = myKapi.add(circle, {
			name: 'circle1',
			x: 70,
			y: 70,
			radius: 50,
			color: '#00ffaa',
			easing : 'easeInOutQuint'
		}).keyframe(0, {
			// Blank, defining keyframe zero as the same as the initial state
		}).keyframe('3s', {
			x: 400,
			y: 400
		}).liveCopy('3s', '3.25s')
		.keyframe('6s', {
			x: '+=50',
			y: 100
		}).liveCopy('5s', '6.5s')
		.liveCopy('8s', 0);
	}())
	
	
	
	/****************************************** Demo 1 */
});