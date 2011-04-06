/*global kapi:true, window:true, document:true, Image:true */

(function () {
	var FRAME_RATE = 30,
		CANVAS_HEIGHT = 375,
		CANVAS_WIDTH = 500,
		BADGE_SIZE = 256,
		BADGE_OFFSET_TOP = 20,
		SUB_TECH_SIZE = 40,
		SUB_TECH_SPACING = 10,
		actors = {},
		subTechNameList = [],
		canvas,
		demo,
		actor,
		i;
		
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
	
	//actors.rays = demo.add(rays, {
	actors.rays = demo.add(window._demoApp.actors.rays, {
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
	
	imageUrls = window._demoApp.imageUrls;
	
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
	
	actors.rays
		.keyframe(0, {
			
		})
		.keyframe('1s', {})
		.keyframe('2s', {
			rotate: window._demoApp.utils.revsPerSecond(1),
			alpha: 1
		})
		.keyframe('6s', {
			rotate: window._demoApp.utils.revsPerSecond(4)
		}).keyframe('6.5s', {
			alpha: 0,
			rotate: window._demoApp.utils.revsPerSecond(.5)
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