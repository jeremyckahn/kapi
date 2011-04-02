/*global kapi:true, window:true, document:true, Image:true */

(function () {
	var FRAME_RATE = 30,
		CANVAS_HEIGHT = 375,
		CANVAS_WIDTH = 500,
		BADGE_SIZE = 256,
		BADGE_OFFSET_TOP = 20,
		SUB_TECH_SIZE = 40,
		SUB_TECH_SPACING = 10,
		NUM_RAYS = 10,
		RAY_RADIUS = 1000,
		imageUrls = {
			'badge': 'img/HTML5_Badge.png',
			'3d': 'img/3D_Effects.png',
			'connect': 'img/Connectivity.png',
			'access': 'img/Device_Access.png',
			'multi': 'img/Multimedia.png',
			'offline': 'img/Offline_Storage.png',
			'perf': 'img/Performance.png',
			'sem': 'img/Semantics.png',
			'style': 'img/Styling.png'},
		actors = {},
		subTechNameList = [],
		canvas,
		demo,
		actor,
		i;
		
	function degToRad (deg) {
		return (deg / 180) * Math.PI;
	}
		
	function rays (ctx) {
		var i,
			color = '#eee',
			rotate = degToRad(this.rotate),
			rayRot;
		
		ctx.beginPath();
		ctx.globalAlpha = this.alpha;
		
		for (i = 0; i < NUM_RAYS; i++) {
			ctx.moveTo(this.x, this.y);
			
			// This is wrong, it needs to be fixed!
			
			rayRot = degToRad( 360 * ( i / NUM_RAYS ) );
			
			ctx.lineTo(
				
				this.x + RAY_RADIUS * Math.sin( this.rotate + rayRot ),
				this.y + RAY_RADIUS * Math.cos( this.rotate + rayRot ))
				
		}
		
		ctx.lineWidth = 30;
		ctx.fillStyle = ctx.strokeStyle = color;
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		ctx.globalAlpha = 1;
	}
		
	
		
	canvas = document.getElementsByTagName('canvas')[0];
	
	window.demo = demo = kapi(canvas, {
		'fRate': FRAME_RATE,
		styles: {
			'background': '#ddd',
			'height': CANVAS_HEIGHT,
			'width': CANVAS_WIDTH
		}
	});
	
	// Set a pause toggle for when the user clicks the canvas.
	canvas.addEventListener('click', function () {
		if (demo.isPlaying()) {
			demo.pause();
		}  else {
			demo.play();
		}
	}, true);
	
	actors.rays = demo.add(rays, {
		x: CANVAS_WIDTH / 2,
		y: 140,
		rotate: 0,
		alpha: 0
	});
	
	// Helper functions are defined up here, because JSLint yells at you if you define
	// an anonymous function inside of a loop.
	function imgSetup (src) {
		return function () {
			this.img = new Image();
			this.img.src = src;
		};
	}
	
	function imgDraw (ctx) {
		ctx.globalAlpha = this.alpha;
		ctx.drawImage(this.prototype.img, this.x, this.y, this.scaleX, this.scaleY);
		ctx.globalAlpha = 1;
	}
	
	// Setup all the actors and add them to the kapi instance
	for (actor in imageUrls) {
		if (imageUrls.hasOwnProperty(actor)) {
			actors[actor] = {
				setup: imgSetup(imageUrls[actor]),
				draw: imgDraw
			};
			
			actors[actor] = demo.add(actors[actor], {
				'name': actor,
				x: 0,
				y: 0,
				scaleX: 0,
				scaleY: 0,
				alpha: 1,
				easing:'easeInOutQuint'
			});
			
			// All of the little symbols (sub-techs) will be animated separately from the badge, 
			// this is a helpful way to loop through them later
			if (actor !== 'badge') {
				subTechNameList.push(actor);
			}
		}
	}
	
	function revPerSecond (seconds) {
		return '+=' + (seconds * 360);
	}
	
	actors.rays
		.keyframe(0, {
			
		})
		.keyframe('1s', {})
		.keyframe('2s', {
			rotate: revPerSecond(1),
			alpha: 1
		})
		.keyframe('6s', {
			rotate: revPerSecond(4)
		}).keyframe('6.5s', {
			alpha: 0,
			rotate: revPerSecond(.5)
		});
	
	actors.badge
		.keyframe(0, {
			scaleX: 1,
			scaleY: 1,
			alpha: 0
		})
		.keyframe('2s', {
			scaleX: BADGE_SIZE,
			scaleY: BADGE_SIZE,
			x: (CANVAS_WIDTH / 2) - (BADGE_SIZE / 2),
			y: BADGE_OFFSET_TOP,
			alpha: 1
		})
		.keyframe('4s', {})
		.keyframe('5s', {
			scaleX: BADGE_SIZE + 70,
			scaleY: BADGE_SIZE + 70,
			x: '-=35'
		})
		.keyframe('6s', {})
		.keyframe('7s', {
			alpha: 0
		});
		
	// Helper functions defined outside of the loop, making JSLint happy again
	function getXofOffscreenSubTech () {
		return -this.scaleX;
	}
	
	function getXofOnScreenSubTech (index) {
		return function () {
			return ((this.scaleX + SUB_TECH_SPACING) * index) + 50;
		};
	}
		
	for (i = 0; i < subTechNameList.length; i++) {
		actor = actors[subTechNameList[i]];
		
		actor
			.keyframe(0, {
				y: 300,
				x: getXofOffscreenSubTech,
				alpha: 0,
				scaleX: SUB_TECH_SIZE,
				scaleY: SUB_TECH_SIZE
			})
			.keyframe('1s', {
				y: BADGE_OFFSET_TOP + BADGE_SIZE + 30,
				x: getXofOnScreenSubTech(i),
				alpha: 1
			})
			.keyframe('4s', {})
			.keyframe('4.5s', {
				alpha: 0
			});
	}
	
	demo.play();
	
}());