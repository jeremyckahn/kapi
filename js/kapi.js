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
		DEBUG = true;

	/* Define some useful methods that are private to Kapi. */

	// Adapted from the book, "JavaScript Patterns" by Stoyan Stefanov


	function extend(child, parent, doOverwrite) {
		var i, toStr = Object.prototype.toString,
			astr = '[object Array]';

		child = child || {};

		for (i in parent) {
			if (parent.hasOwnProperty(i)) {
				if (typeof parent[i] === 'object') {
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

	// Inspired by the map() method in Processing.js: http://processingjs.org/reference/map_


	function map(value, low1, high1, low2, high2) {
		value = norm(value, low1, high1);
		return lerp(value, low2, high2);
	}

	// Copied from Proccessing.js's norm function: http://processingjs.org/reference/norm()


	function norm(num, rangeBegin, rangeEnd) {
		return (num - rangeBegin) / (rangeEnd - rangeBegin);
	}

	// Copied from Proccessing.js's lerp function: http://processingjs.org/reference/lerp()


	function lerp(position, rangeBegin, rangeEnd) {
		return ((rangeEnd - rangeBegin) * position) + rangeBegin;
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

	/*function decToHex(dec){
		var ret = Number(parseInt(dec, 10)).toString(16);
		return ret.length === 1 ? '0' + ret : ret;
	}*/

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
						currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, this.ctx);
					}
				}
			}
		},

		// TODO:  This may in fact be the ugliest function ever written.
		// Make it faster and easier to follow.
		_calculateCurrentFrameStateProperties: function (stateObj) {
			var stateObjKeyframeIndex = this._objStateIndex[stateObj],
				latestKeyframeId = this._getLatestKeyFrameId(stateObjKeyframeIndex),
				nextKeyframeId = this._getNextKeyframeId(stateObjKeyframeIndex, latestKeyframeId),
				latestKeyframeProps = this._keyframes[stateObjKeyframeIndex[latestKeyframeId]][stateObj],
				nextKeyframeProps = this._keyframes[stateObjKeyframeIndex[nextKeyframeId]][stateObj],
				currentFrameProps = {},
				keyProp, currProp, nextProp, isColor, isRotation, i, unconvertedColor;


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

						// Not being used yet... but it will be!
/*if (typeof currProp === 'number' && (/rotation/i).test(keyProp.toLowerCase())){
							isRotation = true;
						}*/

						if (isColor) {
							// If the property is a color, do some extra logic to
							// blend it across the keyframes
							currentFrameProps[keyProp] = 'rgb(';

							for (i = 0; i < currProp.length; i++) {

								// Kind of a mess, but breaking this out into multiple
								// statements would hurt performance
								currentFrameProps[keyProp] += Math.floor(map(
								this._currentFrame, stateObjKeyframeIndex[latestKeyframeId], stateObjKeyframeIndex[nextKeyframeId], currProp[i], nextProp[i])) + ',';
							}

							// Swap the last RGB comma for an end-paren
							currentFrameProps[keyProp] = currentFrameProps[keyProp].replace(/,$/, ')');

						} else {
							currentFrameProps[keyProp] = map(
							this._currentFrame, stateObjKeyframeIndex[latestKeyframeId], stateObjKeyframeIndex[nextKeyframeId], currProp, nextProp);
						}
					}
				}
			}

			extend(currentFrameProps, latestKeyframeProps);
			return currentFrameProps;
		},

		_getLatestKeyFrameId: function (lookup) {
			var i;

			for (i = lookup.length - 1; i >= 0; i--) {
				if (lookup[i] < this._currentFrame) {
					if (i === lookup.length - 1) {
						return 0;
					} else {
						return i;
					}
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

				// If this keyframe does not already exist, create it
				if (typeof self._keyframes[keyframeId] == 'undefined') {
					self._keyframes[keyframeId] = {};
				}

				// If this keyframe does not already have state info for this object, create it
				self._keyframes[keyframeId][implementationObj.id] = stateObj;

				self._updateKeyframes(implementationObj, keyframeId);

				extend(stateObj, implementationObj.params);
				stateObj._params = implementationObj.params;

				// Calculate and update the number of seconds this animation will run for
				self._animationDuration =
				1000 * (self._keyframeIds[self._keyframeIds.length - 1] / self._params.fRate);

				return this;
			};

			return implementationObj;
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


				if (prevStateId) {
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