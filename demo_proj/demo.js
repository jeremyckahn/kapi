(function () {
	var canvas,
		demo,
		imageUrls = {
			'badge': 'img/HTML5_Badge.png',
			'3d': 'img/3D_Effects.png',
			'connect': 'img/Connectivity.png',
			'access': 'img/Device_Access.png',
			'multi': 'img/Multimedia.png',
			'offline': 'img/Offline_Storage.png',
			'perf': 'img/Performance.png',
			'sem': 'img/Semantics.png',
			'style': 'img/Styling.png'
		},
		actors = {},
		subTechNameList = [],
		actor,
		i,
		CANVAS_HEIGHT = 400,
		CANVAS_WIDTH = 500,
		BADGE_SIZE = 256,
		BADGE_OFFSET_TOP = 20,
		SUB_TECH_SIZE = 40,
		SUB_TECH_SPACING = 10;
		
	canvas = document.getElementsByTagName('canvas')[0];
	
	window.demo = demo = kapi(canvas, {
		'fRate': 60,
		styles: {
			'background': '#ddd',
			'height': CANVAS_HEIGHT,
			'width': CANVAS_WIDTH
		}
	});
	
	// Setup all the actors and add them to the kapi instance
	for (actor in imageUrls) {
		if (imageUrls.hasOwnProperty(actor)) {
			actors[actor] = {
				setup: function () {
					var self = this;
					this.img = new Image();
					this.img.src = imageUrls[actor];
					this.img.onload = function () {
						//console.log(self.img);
					}
				},
				draw: function (ctx) {
					ctx.globalAlpha = this.alpha;
					ctx.drawImage(this.prototype.img, this.x, this.y, this.scaleX, this.scaleY);
					ctx.globalAlpha = 1;
				}
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
			
			// All of the little symbols will be animated separately from the badge, 
			// this is a helpful way to loop through them later
			if (actor !== 'badge') {
				subTechNameList.push(actor);
			}
		}
	}
	
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
			x: '-=35' // OMG BUG!  The dynamic keyframe is being repeated!
		})
		.keyframe('6s', {})
		.keyframe('7s', {
			alpha: 0
		});
		
	for (i = 0; i < subTechNameList.length; i++) {
		actor = actors[subTechNameList[i]];
		
		actor
			.keyframe(0, {
				y: 300,
				x: function () {
					return -this.scaleX;
				},
				alpha: 0,
				scaleX: SUB_TECH_SIZE,
				scaleY: SUB_TECH_SIZE
			})
			.keyframe('1s', {
				y: BADGE_OFFSET_TOP + BADGE_SIZE + 30,
				x: (function (i) {
					return function () {
						return ((this.scaleX + SUB_TECH_SPACING) * i) + 50;
					}
				})(i),
				alpha: 1
			})
			.keyframe('4s', {})
			.keyframe('4.5s', {
				alpha: 0
			});
	}
	
	demo.play();
	
}())