/*	Kapi - Keyframe API (for canvas)
 *	jeremyckahn@gmail.com
 * 
 * A keyframe interface for the HTML 5 canvas.
 */


// kapi works by augmenting the Canvas element on the DOM.
function kapi(canvas, params, events) {

	var version = '0.0.1',
		defaults = {
			fillColor: '#f0f',
			fRate: 20
		},
		DEBUG = true,
		tween = {
			// All equations are copied from here: http://www.gizma.com/easing/
			// Originally written by Robert Penner, copied under BSD License (http://www.robertpenner.com/)
			//
			// Params are as follows
			// c = current time
			// b = start value
			// c = change in value
			// d = duration
			
			// no easing, no acceleration
			linear: function(t, b, c, d){
				return c * t / d + b;
			},
			
			// accelerating from zero velocity
			easeInQuad: function(t, b, c, d){
				t /= d;
				return c * t * t + b;
			},
			
			// decelerating to zero velocity
			easeOutQuad: function (t, b, c, d) {
				t /= d;
				return -c * t * (t - 2) + b;
			},
			
			// acceleration until halfway, then deceleration
			easeInOutQuad: function (t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return c/2*t*t + b;
				}
				t--;
				return -c/2 * (t*(t-2) - 1) + b;
			},
			
			// accelerating from zero velocity
			easeInCubic: function (t, b, c, d) {
				t /= d;
				return c*t*t*t + b;
			},
			
			// decelerating to zero velocity
			easeOutCubic: function (t, b, c, d) {
				t /= d;
				t--;
				return c*(t*t*t + 1) + b;
			},
			
			// acceleration until halfway, then deceleration
			easeInOutCubic: function (t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return c/2*t*t*t + b;
				}
				t -= 2;
				return c/2*(t*t*t + 2) + b;
			},
			
			// accelerating from zero velocity
			easeInQuart: function (t, b, c, d) {
				t /= d;
				return c*t*t*t*t + b;
			},
			
			// decelerating to zero velocity
			easeOutQuart: function (t, b, c, d) {
				t /= d;
				t--;
				return -c * (t*t*t*t - 1) + b;
			},
			
			// acceleration until halfway, then deceleration
			easeInOutQuart: function (t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return c/2*t*t*t*t + b;
				}
				t -= 2;
				return -c/2 * (t*t*t*t - 2) + b;
			},
			
			// accelerating from zero velocity
			easeInQuint: function (t, b, c, d) {
				t /= d;
				return c*t*t*t*t*t + b;
			},
			
			// decelerating to zero velocity
			easeOutQuint: function (t, b, c, d) {
				t /= d;
				t--;
				return c*(t*t*t*t*t + 1) + b;
			},
			
			// acceleration until halfway, then deceleration
			easeInOutQuint: function (t, b, c, d) {
				t /= d/2;
				if (t < 1){
					return c/2*t*t*t*t*t + b;
				}
				t -= 2;
				return c/2*(t*t*t*t*t + 2) + b;
			},
			
			// accelerating from zero velocity
			easeInSine: function (t, b, c, d) {
				return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
			},
			
			// decelerating to zero velocity
			easeOutSine: function (t, b, c, d) {
				return c * Math.sin(t/d * (Math.PI/2)) + b;
			},
			
			// accelerating until halfway, then decelerating
			easeInOutSine: function (t, b, c, d) {
				return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
			},
			
			// accelerating from zero velocity
			easeInExpo: function (t, b, c, d) {
				return c * Math.pow( 2, 10 * (t/d - 1) ) + b;
			},
			
			// decelerating to zero velocity
			easeOutExpo: function (t, b, c, d) {
				return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
			},
			
			// accelerating until halfway, then decelerating
			easeInOutExpo: function (t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
				}
				t--;
				return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
			},
			
			// accelerating from zero velocity
			easeInCirc: function (t, b, c, d) {
				t /= d;
				return -c * (Math.sqrt(1 - t*t) - 1) + b;
			},
			
			// decelerating to zero velocity
			easeOutCirc: function (t, b, c, d) {
				t /= d;
				t--;
				return c * Math.sqrt(1 - t*t) + b;
			},
			
			// acceleration until halfway, then deceleration
			easeInOutCirc: function (t, b, c, d) {
				t /= d/2;
				if (t < 1) {
					return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
				}
				t -= 2;
				return c/2 * (Math.sqrt(1 - t*t) + 1) + b;
			}
		},
		calcKeyframe = {
			'ms': function(num) {
				return (num * this._params.fRate) / 1000;
			},
			
			's': function(num) {
				return num * this._params.fRate;
			}
				
		};

	/* Define some useful methods that are private to Kapi. */
	
	function applyEase(easing, previousKeyframe, nextKeyframe, currProp, nextProp){
		return tween[easing](
			this._currentFrame - previousKeyframe,
			currProp,
			nextProp - currProp,
			nextKeyframe - previousKeyframe);
	}

	// Adapted from the book, "JavaScript Patterns" by Stoyan Stefanov
	// Contains some modifications to improve performance for Kapi, so
	// just copy pasting this for other implementations is likely not wise.
	function extend(child, parent, doOverwrite) {
		var i, toStr = Object.prototype.toString,
			astr = '[object Array]';

		child = child || {};

		for (i in parent) {
			if (parent.hasOwnProperty(i)) {
				if (typeof parent[i] === 'object' && i !== 'prototype') {
					if (!child[i] || doOverwrite) {
						child[i] = (toStr.call(parent[i]) === astr) ? [] : {};
					}
					extend(child[i], parent[i]);
				} else {
					if (!child[i] || doOverwrite) {
						child[i] = parent[i];
					}
				}
			}
		}
	}

	// Strip the 'px' from a style string and add it to the element directly
	// Meant to be called with Function.call()
	function setDimensionVal(dim) {
		this[dim] = this.style[dim].replace(/px/gi, '') || this._params[dim];
	}

	// Get UNIX epoch time
	function now() {
		return +new Date();
	}

	function sortArrayNumerically(array) {
		return array.sort(function (a, b) {
			return a - b;
		});
	}

	function isHexString(str) {
		return typeof str === 'string' && (/^#([0-9]|[a-f]){6}$/i).test(str);
	}

	function isRGBString(str) {
		return typeof str === 'string' && (/^#([0-9]|[a-f]){6}$/i).test(str);
	}

	function isColorString(str) {
		return isHexString(str) || isRGBString(str);
	}

	function hexToDec(hex) {
		return parseInt(hex, 16);
	}

	function hexToRGBArr(hex) {
		if (typeof hex === 'string') {
			hex = hex.replace(/#/g, '');
			return [hexToDec(hex.substr(0, 2)), hexToDec(hex.substr(2, 2)), hexToDec(hex.substr(4, 2))];
		}
	}

	function hexToRGBStr(hexStr) {
		if (isRGBString(hexStr)) {
			return hexStr;
		}

		var arr = hexToRGBArr(hexStr);

		return 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')';
	}

	return {
		// init() is called immediately after this object is defined
		init: function (canvas, params, events) {
			var style, kapi;

			// Augment the canvas element
			canvas.kapi = this;

			params = params || {};
			extend(params, defaults);
			this._params = params;
			this.events = events;
			this.el = canvas;
			this.ctx = canvas.getContext('2d');

			// Initialize some internal properties
			this._keyframeIds = [];
			this._keyframes = {};
			this._objStateIndex = {};

			this._animationDuration = 0;

			this.state = {
				fCount: 0
			};

			for (style in this._params.styles) {
				if (this._params.styles.hasOwnProperty(style)) {
					this.el.style[style] = this._params.styles[style];
				}
			}

			// The height and width of the canvas draw area do not sync
			// up with the CSS height/width values, so set those manually here
			if (this._params.styles) {
				if (this._params.styles.height) {
					setDimensionVal.call(this.el, 'height');
				}
				if (this._params.styles.width) {
					setDimensionVal.call(this.el, 'width');
				}
			}

			return canvas;
		},

		getVersion: function () {
			return version;
		},

		isPlaying: function () {
			return (this._isStopped === false && this._isPaused === false);
		},

		play: function () {
			var pauseDuration;

			if (this.isPlaying()) {
				return;
			}

			this._isStopped = this._isPaused = false;

			if (!this._startTime) {
				this._startTime = now();
			}

			if (this._loopStartTime) {
				pauseDuration = now() - this._pausedAtTime;
				this._loopStartTime += pauseDuration;

				// _startTime needs to be adjusted so that the loop doesn't
				// start somewhere other than the beginning in update()
				this._startTime += pauseDuration;
			} else {
				this._loopStartTime = now();
			}

			this.update();
		},

		pause: function () {
			clearTimeout(this._updateHandle);
			this._pausedAtTime = now();
			this._isPaused = true;
		},

		stop: function () {
			clearTimeout(this._updateHandle);
			delete this._loopStartTime;
			delete this._pausedAtTime;
			this._isStopped = true;
		},

		add: function (implementationFunc, initialParams) {
			var inst = {};
			inst.draw = implementationFunc;
			inst.params = initialParams;

			return this._keyframize(inst, initialParams);
		},

		// Handle high-level frame management logic
		update: function () {
			var self = this;

			this.state.fCount++;

			this._updateHandle = setTimeout(function () {

				self._loopLength = now() - self._loopStartTime;

				// Start the loop over if need be.
				if (self._loopLength > self._animationDuration) {
					// Reset the loop start time relative to when the animation began,
					// not to when the final keyframe last completed
					self._loopStartTime = self._startTime + parseInt((now() - self._startTime) / self._animationDuration, 10) * self._animationDuration;
					self._loopLength -= self._animationDuration;
				}

				// Determine where we are in the loop
				self._loopPosition = self._loopLength / self._animationDuration;

				// Calculate the current frame of the loop
				self._currentFrame = parseInt(self._loopPosition * self._keyframeIds[self._keyframeIds.length - 1], 10);

				self.ctx.clearRect(0, 0, self.el.width, self.el.height);

				if (typeof self.events.enterFrame === 'function') {
					self.events.enterFrame.call(self);
				}

				self._update(self._currentFrame);
				self.update();
			}, 1000 / this._params.fRate);

			return this._updateHandle;
		},

		// Handle low-level drawing logic
		_update: function (currentFrame) {
			var objStateIndices, currentFrameStateProperties;

			for (objStateIndices in this._objStateIndex) {
				if (this._objStateIndex.hasOwnProperty(objStateIndices)) {

					// The current object may have a first keyframe greater than 0.
					// If so, we don't want to calculate or draw it until we have
					// reached this object's first keyframe
					if (typeof this._objStateIndex[objStateIndices][0] !== 'undefined' && this._currentFrame >= this._objStateIndex[objStateIndices][0]) {
						currentFrameStateProperties = this._calculateCurrentFrameStateProperties(objStateIndices);
						
						// If there are no more keyframes for this object, don't draw it.
						if (currentFrameStateProperties !== null) {
							currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, this.ctx);
						}
					}
				}
			}
		},

		// TODO:  This may in fact be the ugliest function ever written.
		// Make it faster and easier to follow.
		_calculateCurrentFrameStateProperties: function (stateObj) {
			
			var stateObjKeyframeIndex = this._objStateIndex[stateObj],
				latestKeyframeId = this._getLatestKeyFrameId(stateObjKeyframeIndex),
				nextKeyframeId,
				latestKeyframeProps,
				nextKeyframeProps,
				currentFrameProps = {},
				keyProp, currProp, nextProp, isColor, isRotation, i, 
				easing;
				
			// Do a check to see if any more keyframes remain in the animation loop for this object
			if (latestKeyframeId === -1) {
				return null;
			}	
				
			nextKeyframeId = this._getNextKeyframeId(stateObjKeyframeIndex, latestKeyframeId);
			latestKeyframeProps = this._keyframes[stateObjKeyframeIndex[latestKeyframeId]][stateObj];
			nextKeyframeProps = this._keyframes[stateObjKeyframeIndex[nextKeyframeId]][stateObj];
			currentFrameProps = {};
			easing = tween[nextKeyframeProps.easing] ? nextKeyframeProps.easing : 'linear';
			
			for (keyProp in latestKeyframeProps) {

				if (latestKeyframeProps.hasOwnProperty(keyProp)) {
					currProp = latestKeyframeProps[keyProp];

					if (typeof currProp === 'number' || isColorString(currProp)) {
						nextProp = nextKeyframeProps[keyProp];
						isColor = isRotation = false;

						if (typeof currProp === 'string') {
							isColor = true;
							currProp = hexToRGBArr(currProp);
							nextProp = hexToRGBArr(nextProp);
						}

						if (isColor) {
							// If the property is a color, do some extra logic to
							// blend it across the keyframes
							currentFrameProps[keyProp] = 'rgb(';

							for (i = 0; i < currProp.length; i++) {
								currentFrameProps[keyProp] += Math.floor(applyEase.call(this, easing, stateObjKeyframeIndex[latestKeyframeId], stateObjKeyframeIndex[nextKeyframeId], currProp[i], nextProp[i])) + ',';
							}

							// Swap the last RGB comma for an end-paren
							currentFrameProps[keyProp] = currentFrameProps[keyProp].replace(/,$/, ')');

						} else {
							currentFrameProps[keyProp] = applyEase.call(this, easing, stateObjKeyframeIndex[latestKeyframeId], stateObjKeyframeIndex[nextKeyframeId], currProp, nextProp);
								
						}
					}
				}
			}

			extend(currentFrameProps, latestKeyframeProps);
			return currentFrameProps;
		},

		_getLatestKeyFrameId: function (lookup) {
			var i;
			
			if (this._currentFrame > lookup[lookup.length - 1]) {
				// There are no more keyframes left in the animation loop for this object
				return -1;
			}

			for (i = lookup.length - 1; i >= 0; i--) {
				if (lookup[i] < this._currentFrame) {
					return i;
				}
			}

			return lookup.length - 1;
		},

		_getNextKeyframeId: function (lookup, latestKeyframeId) {
			return latestKeyframeId === lookup.length - 1 ? 0 : latestKeyframeId + 1;
		},

		_keyframize: function (implementationObj) {
			var self = this;

			// TODO:  keyframe() blows up if given a keyframeId that is a string.
			// It should accept strings.
			implementationObj.keyframe = function (keyframeId, stateObj) {
				stateObj.prototype = this;

				// Make really really sure the id is unique, if one is not provided
				if (typeof implementationObj.id === 'undefined') {
					implementationObj.id =
						implementationObj.params.id || implementationObj.params.name || parseInt(('' + Math.random()).substr(2), 10) + now();
				}
				
				try {
					keyframeId = self._getRealKeyframe(keyframeId);
				} catch (ex) {
					console.error(ex);
					return undefined;
				}

				// If this keyframe does not already exist, create it
				if (typeof self._keyframes[keyframeId] == 'undefined') {
					self._keyframes[keyframeId] = {};
				}

				// If this keyframe does not already have state info for this object, create it
				self._keyframes[keyframeId][implementationObj.id] = stateObj;
				
				// Perform necessary maintenance upon all of the keyframes in the animation
				self._updateKeyframes(implementationObj, keyframeId);
				
				// Copy over any "missing" parameters for this keyframe from the original object definition
				extend(stateObj, implementationObj.params);

				// Calculate and update the number of seconds this animation will run for
				self._animationDuration =
				1000 * (self._keyframeIds[self._keyframeIds.length - 1] / self._params.fRate);

				return this;
			};

			return implementationObj;
		},
		
		// Calculates the "real" keyframe from `identifier`.
		// This means that you can speicify keyframes from things other than plain integers.
		// For example, you can calculate the real keyframe that will run at a certain period of time.
		// Valid formats:
		// 
		// x : keyframe integer
		// xms : kayframe at an amount of milliseconds
		// xs : kayframe at an amount of seconds
		_getRealKeyframe: function(identifier) {
			var quantifier, unit, calculatedKeyframe;
			
			if (typeof identifier === 'number') {
				return parseInt(identifier, 10);
			} else if (typeof identifier === 'string') {
				// Strip spaces
				identifier = identifier.replace(/\s/g, '');
				
				quantifier = /^(\d|\.)+/.exec(identifier)[0];
				unit = /\D+$/.exec(identifier);
				
				// The quantifier was passed as a string... just return it as a number
				if (!unit) {
					return parseInt(quantifier, 10);
				}
				
				if (calcKeyframe[unit]) {
					calculatedKeyframe = calcKeyframe[unit].call(this, quantifier);
				} else {
					throw 'Invalid keyframe identifier unit!';
				}
				
				return calculatedKeyframe;
			} else {
				throw 'Invalid keyframe identifier type!';
			}
			
		},

		_updateKeyframes: function (implementationObj, keyframeId) {
			this._updateKeyframeIdsList(keyframeId);
			this._normalizeObjectAcrossKeyframes(implementationObj.id);
			this._updateObjStateIndex(implementationObj, {
				add: keyframeId
			});
		},

		_updateKeyframeIdsList: function (keyframeId) {
			var i;

			for (i = 0; i < this._keyframeIds.length; i++) {
				if (this._keyframeIds[i] === keyframeId) {
					return;
				}
			}

			this._keyframeIds.push(keyframeId);
			sortArrayNumerically(this._keyframeIds);
		},

		_normalizeObjectAcrossKeyframes: function (keyframedObjId) {
			var newStateId, prevStateId, i, length = this._keyframeIds.length,
				newStateObj, prevStateObj, prop;

			// Traverse all keyframes in the animation
			for (i = 0; i < length; i++) {

				newStateId = this._keyframeIds[i];
				newStateObj = this._keyframes[newStateId][keyframedObjId];

				if (typeof prevStateId !== 'undefined') {
					prevStateObj = this._keyframes[prevStateId][keyframedObjId];
					extend(newStateObj, prevStateObj);
				}

				// Find any hex color strings and convert them to rgb(x, x, x) format.
				// More overhead for keyframe setup, but makes for faster frame processing later
				for (prop in newStateObj) {
					if (newStateObj.hasOwnProperty(prop)) {
						if (isColorString(newStateObj[prop])) {
							newStateObj[prop] = hexToRGBStr(newStateObj[prop]);
						}
					}
				}

				// Only store the prevState if keyframedObjId actually exists in this keyframe 
				if (newStateObj) {
					prevStateId = newStateId;
				}
			}
		},

		_updateObjStateIndex: function (implementationObj, params) {
			var index;

			if (typeof this._objStateIndex[implementationObj.id] === 'undefined') {
				this._objStateIndex[implementationObj.id] = [];
			}

			index = this._objStateIndex[implementationObj.id];

			if (typeof params.add !== 'undefined') {
				index.push(params.add);
				sortArrayNumerically(index);
			}

			// TODO:  Fill this in and test it!
			/*if (typeof params.remove !== 'undefined'){
				
			}*/
		}

	}.init(canvas, params, events);
}