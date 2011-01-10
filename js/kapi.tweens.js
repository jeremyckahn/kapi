kapi.tween.easeInQuad = function (t, b, c, d) {
	t /= d;
	return c * t * t + b;
};

// decelerating to zero velocity
kapi.tween.easeOutQuad = function (t, b, c, d) {
	t /= d;
	return -c * t * (t - 2) + b;
};

// acceleration until halfway, then deceleration
kapi.tween.easeInOutQuad = function (t, b, c, d) {
	t /= d / 2;
	if (t < 1) {
		return c / 2 * t * t + b;
	}
	t--;
	return -c / 2 * (t * (t - 2) - 1) + b;
};

// accelerating from zero velocity
kapi.tween.easeInCubic = function (t, b, c, d) {
	t /= d;
	return c * t * t * t + b;
};

// decelerating to zero velocity
kapi.tween.easeOutCubic = function (t, b, c, d) {
	t /= d;
	t--;
	return c * (t * t * t + 1) + b;
};

// acceleration until halfway, then deceleration
easeInOutCubic = function (t, b, c, d) {
	t /= d / 2;
	if (t < 1) {
		return c / 2 * t * t * t + b;
	}
	t -= 2;
	return c / 2 * (t * t * t + 2) + b;
};

// accelerating from zero velocity
kapi.tween.easeInQuart = function (t, b, c, d) {
	t /= d;
	return c * t * t * t * t + b;
};

// decelerating to zero velocity
kapi.tween.easeOutQuart = function (t, b, c, d) {
	t /= d;
	t--;
	return -c * (t * t * t * t - 1) + b;
};

// acceleration until halfway, then deceleration
kapi.tween.easeInOutQuart = function (t, b, c, d) {
	t /= d / 2;
	if (t < 1) {
		return c / 2 * t * t * t * t + b;
	}
	t -= 2;
	return -c / 2 * (t * t * t * t - 2) + b;
};

// accelerating from zero velocity
kapi.tween.easeInQuint = function (t, b, c, d) {
	t /= d;
	return c * t * t * t * t * t + b;
};

// decelerating to zero velocity
kapi.tween.easeOutQuint = function (t, b, c, d) {
	t /= d;
	t--;
	return c * (t * t * t * t * t + 1) + b;
};

// acceleration until halfway, then deceleration
kapi.tween.easeInOutQuint = function (t, b, c, d) {
	t /= d / 2;
	if (t < 1) {
		return c / 2 * t * t * t * t * t + b;
	}
	t -= 2;
	return c / 2 * (t * t * t * t * t + 2) + b;
};

// accelerating from zero velocity
kapi.tween.easeInSine = function (t, b, c, d) {
	return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
};

// decelerating to zero velocity
kapi.tween.easeOutSine = function (t, b, c, d) {
	return c * Math.sin(t / d * (Math.PI / 2)) + b;
};

// accelerating until halfway, then decelerating
kapi.tween.easeInOutSine = function (t, b, c, d) {
	return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
};

// accelerating from zero velocity
kapi.tween.easeInExpo = function (t, b, c, d) {
	return c * Math.pow(2, 10 * (t / d - 1)) + b;
};

// decelerating to zero velocity
kapi.tween.easeOutExpo = function (t, b, c, d) {
	return c * (-Math.pow(2, -10 * t / d) + 1) + b;
};

// accelerating until halfway, then decelerating
kapi.tween.easeInOutExpo = function (t, b, c, d) {
	t /= d / 2;
	if (t < 1) {
		return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
	}
	t--;
	return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
};

// accelerating from zero velocity
kapi.tween.easeInCirc = function (t, b, c, d) {
	t /= d;
	return -c * (Math.sqrt(1 - t * t) - 1) + b;
};

// decelerating to zero velocity
kapi.tween.easeOutCirc = function (t, b, c, d) {
	t /= d;
	t--;
	return c * Math.sqrt(1 - t * t) + b;
};

// acceleration until halfway, then deceleration
kapi.tween.easeInOutCirc = function (t, b, c, d) {
	t /= d / 2;
	if (t < 1) {
		return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
	}
	t -= 2;
	return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
}