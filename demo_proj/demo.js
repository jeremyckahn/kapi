/*global kapi:true, window:true, document:true, Image:true */

/** Kapi demo animation
    by Jeremy Kahn - jeremyckahn@gmail.com

This is a demonstration of the type of animation that can be made with the Kapi, a keyframing API for the HTML 5 canvas.  Images are used under the Creative Commons License, and were obtained from: http://www.w3.org/html/logo/

For more information and to download Kapi, please visit: https://github.com/jeremyckahn/kapi
*/

(function () {
	var FRAME_RATE = 30,
		CANVAS_HEIGHT = 375,
		CANVAS_WIDTH = 500,
		BADGE_SIZE = 256,
		BADGE_OFFSET_TOP = 20,
		SUB_TECH_Y = 300,
		SUB_TECH_SIZE = 40,
		SUB_TECH_SPACING = 10,
		actors = {},
		subTechNameList = [],
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
		numImages = 0,
		img,
		canvas,
		demo,
		actor,
		i;
		
	if (!window._demoApp) {
		window._demoApp = {};
	}
	
	for (img in imageUrls) {
		if (imageUrls.hasOwnProperty(img)) {
			numImages++;
		}
	}
		
	canvas = document.getElementsByTagName('canvas')[0];
	
	/////////////////
	// KAPI INSTANCE SETUP
	/////////////////
	
	window._demoApp.kapiInst = demo = kapi(canvas, {
		'fps': FRAME_RATE,
		styles: {
			'background': '#f2f2f2',
			'height': CANVAS_HEIGHT,
			'width': CANVAS_WIDTH
		}
	});
	
	// The animation will begin as soon as all of the images have loaded.
	window._demoApp.imageLoadComplete = function () {
		numImages--;
		if (numImages === 0) {
			window._demoApp.kapiInst.play();
		}
	};
	
	// Set a pause toggle for when the user clicks the canvas.
	canvas.addEventListener('click', function () {
		if (demo.isPlaying()) {
			demo.pause();
		}  else {
			demo.play();
		}
	}, true);
	
	/////////////////
	// ACTOR SETUP
	/////////////////
	
	actors.rays = demo.add(window._demoApp.actors.rays, {
		x: CANVAS_WIDTH / 2,
		y: 140,
		rotate: 0,
		alpha: 0
	});
	
	// Setup all the image actors and add them to the kapi instance
	for (actor in imageUrls) {
		if (imageUrls.hasOwnProperty(actor)) {
			
			actors[actor] = window._demoApp.actors.img(imageUrls[actor]);
			actors[actor] = demo.add(actors[actor], {
				'name': actor,
				x: 0,
				y: 0,
				scaleX: 0,
				scaleY: 0,
				alpha: 1,
				easing:'easeInOutQuint'
			});
			
			// All of the little black symbols (sub-techs) will be animated separately from the badge, 
			// this is a helpful way to keep track of them and loop through later
			if (actor !== 'badge') {
				subTechNameList.push(actor);
			}
		}
	}
	
	/////////////////
	// KEYFRAME SETUP
	/////////////////
	
	// Keyframes for the light rays.
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
			rotate: window._demoApp.utils.revsPerSecond(0.5)
		});
	
	// Keyframes for the big HTML5 badge image.
	actors.badge
		.keyframe(0, {
			scaleX: 1,
			scaleY: 1,
			alpha: 0,
			rotate: 45
		})
		.keyframe('1.75s', {
			scaleX: BADGE_SIZE,
			scaleY: BADGE_SIZE,
			x: (CANVAS_WIDTH / 2) - (BADGE_SIZE / 2),
			y: BADGE_OFFSET_TOP,
			alpha: 1,
			rotate: 0
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
		
	// Helper functions for sub-tech actor positioning.  Seems a bit messier, but JSLint yells at you
	// if you define the functions inside of the for loop.  These are used in the loop below.
	function getXofOffscreenSubTech () {
		return -this.scaleX;
	}
	
	function getXofOnScreenSubTech (index) {
		return function () {
			return ((this.scaleX + SUB_TECH_SPACING) * index) + 50;
		};
	}
	
	// Loop through all of the "sub-tech" image actors and keyframe them.
	for (i = 0; i < subTechNameList.length; i++) {
		// We have the name of the actor, so grab it out of the `actors` Object
		actor = actors[subTechNameList[i]];
		
		actor
			.keyframe(0, {
				y: SUB_TECH_Y,
				x: getXofOffscreenSubTech,
				alpha: 0,
				scaleX: SUB_TECH_SIZE,
				scaleY: SUB_TECH_SIZE
			})
			.keyframe('1s', {
				x: getXofOnScreenSubTech(i),
				alpha: 1
			})
			.keyframe('4s', {})
			.keyframe('4.5s', {
				alpha: 0
			});
	}
	
}());