/**
 * These functions have nothing to do with Kapi core code.  They are just useful for testing it out.
 */

function circle(ctx){
	ctx.beginPath();
	ctx.arc(
		this.x || 0,
		this.y || 0,
		this.radius || 0,
		0,
		Math.PI*2, 
		true
		);
	ctx.fillStyle = this.color || '#f0f';
	ctx.fill();
	ctx.closePath();
	
	return this;
}


function square(ctx){
	ctx.beginPath();
	
	ctx.moveTo(this.x, this.y);
	ctx.lineTo(this.x + this.width, this.y);
	ctx.lineTo(this.x + this.width, this.y + this.height);
	ctx.lineTo(this.x, this.y + this.height);
	
	ctx.fillStyle = ctx.strokeStyle = this.color || '#f0f';
	ctx.fill();
	ctx.stroke();
	ctx.closePath();
}