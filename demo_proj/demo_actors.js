/*global window:true, Image:true */

/** Kapi demo animation - actors
    by Jeremy Kahn - jeremyckahn@gmail.com
*/

(function () {
	if (!window._demoApp) {
		window._demoApp = {};
	}
	
	var app = window._demoApp,
		NUM_RAYS = 15,
		RAY_RADIUS = 320,
		RAY_BASE_WIDTH = 30;
	
	app.imageUrls = {
		
	};
	
	app.actors = {};
	app.actors.rays = function (ctx) {
		var i,
			color = '#fff',
			rayRot,
			adjustedAngle1,
			adjustedAngle2,
			adjustedAngle3;

		// A simple optimization.  If the opacity is `0`, then the rays are not visible,
		// and there is no reason to draw them at all.  Just return.
		if (this.alpha === 0) {
			return;
		}

		ctx.beginPath();
		ctx.globalAlpha = this.alpha;

		// Loop through all the rays and draw them at their respective angles
		for (i = 0; i < NUM_RAYS; i++) {
			ctx.moveTo(this.x, this.y);
			rayRot = window._demoApp.utils.degToRad( 360 * ( i / NUM_RAYS ) );
			
			adjustedAngle1 = this.rotate + rayRot - 90;
			adjustedAngle2 = this.rotate + rayRot;
			adjustedAngle3 = this.rotate + rayRot + 90;

			ctx.lineTo(
				this.x + (RAY_BASE_WIDTH / 2) * Math.sin( adjustedAngle1 ),
				this.y + (RAY_BASE_WIDTH / 2) * Math.cos( adjustedAngle1 ));

			ctx.lineTo(
				this.x + RAY_RADIUS * Math.sin( adjustedAngle2 ),
				this.y + RAY_RADIUS * Math.cos( adjustedAngle2 ));

			ctx.lineTo(
				this.x + (RAY_BASE_WIDTH / 2) * Math.sin( adjustedAngle3 ),
				this.y + (RAY_BASE_WIDTH / 2) * Math.cos( adjustedAngle3 ));
		}

		ctx.lineWidth = 1;
		ctx.fillStyle = ctx.strokeStyle = color;
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		ctx.globalAlpha = 1;
	};
	
	app.actors.img = function (src) {
		return {
			'setup': function setup () {
				this.img = new Image();
				// Call the `imageLoadComplete` function when the image is loaded.
				// Once the last image is loaded, the animation with `play()`.
				this.img.onload = window._demoApp.imageLoadComplete;
				this.img.src = src;
			},
			'draw': function draw (ctx) {
				
				// This is kind of a weak check...
				/*if (!this.prototype.img.complete) {
					return;
				}*/
				
				//ctx.globalAlpha = this.alpha > 0.0001 ? this.alpha : 0;
				ctx.globalAlpha = this.alpha;
				ctx.drawImage(this.prototype.img, this.x, this.y, this.scaleX, this.scaleY);
				ctx.globalAlpha = 1;
			} 
		};
	};
}());