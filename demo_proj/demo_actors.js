(function () {
	if (!window._demoApp) {
		window._demoApp = {};
	}
	
	var app = window._demoApp,
		NUM_RAYS = 15,
		RAY_RADIUS = 320,
		RAY_BASE_WIDTH = 40;
	
	app.imageUrls = {
		'badge': 'img/HTML5_Badge.png',
		'3d': 'img/3D_Effects.png',
		'connect': 'img/Connectivity.png',
		'access': 'img/Device_Access.png',
		'multi': 'img/Multimedia.png',
		'offline': 'img/Offline_Storage.png',
		'perf': 'img/Performance.png',
		'sem': 'img/Semantics.png',
		'style': 'img/Styling.png'
	};
	
	app.actors = {};
	app.actors.rays = function (ctx) {
		var i,
			color = '#eee',
			rotate = window._demoApp.utils.degToRad(this.rotate),
			rayRot;

		if (this.alpha === 0) {
			return;
		}

		ctx.beginPath();
		ctx.globalAlpha = this.alpha;

		for (i = 0; i < NUM_RAYS; i++) {
			ctx.moveTo(this.x, this.y);
			rayRot = window._demoApp.utils.degToRad( 360 * ( i / NUM_RAYS ) );


			ctx.lineTo(
				this.x + (RAY_BASE_WIDTH / 2) * Math.sin( this.rotate + rayRot - 90 ),
				this.y + (RAY_BASE_WIDTH / 2) * Math.cos( this.rotate + rayRot - 90 ));

			ctx.lineTo(
				this.x + RAY_RADIUS * Math.sin( this.rotate + rayRot ),
				this.y + RAY_RADIUS * Math.cos( this.rotate + rayRot ));

			ctx.lineTo(
				this.x + (RAY_BASE_WIDTH / 2) * Math.sin( this.rotate + rayRot + 90 ),
				this.y + (RAY_BASE_WIDTH / 2) * Math.cos( this.rotate + rayRot + 90 ));

		}

		ctx.lineWidth = 1;
		ctx.fillStyle = ctx.strokeStyle = color;
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		ctx.globalAlpha = 1;
	}
}())