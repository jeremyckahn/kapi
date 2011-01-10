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
		toStr = Object.prototype.toString,
		DEBUG = true,
		calcKeyframe = {
			'ms': function (num) {
				return (num * this._params.fRate) / 1000;
			},

			's': function (num) {
				return num * this._params.fRate;
			}

		};

	/* Define some useful methods that are private to Kapi. */
	function applyEase(easing, previousKeyframe, nextKeyframe, currProp, nextProp, currentFrame) {
		if ((currentFrame || this._currentFrame) >= previousKeyframe) {
			return kapi.tween[easing]((currentFrame || this._currentFrame) - previousKeyframe, currProp, nextProp - currProp, (nextKeyframe - previousKeyframe) || 1);
		}
	}

	function isArray(arr) {
		return (toStr.call(arr) === '[object Array]');
	}

	function last (arr) {
		return arr.length > 0 ? arr[arr.length - 1] : undefined;
	}

	// Adapted from the book, "JavaScript Patterns" by Stoyan Stefanov
	// Contains some modifications to improve performance for Kapi, so
	// just copy pasting this for other implementations is likely not wise.
	function extend(child, parents, doOverwrite) {
		var i, parent, extraParents;

		if (!parents) {
			return child;
		}

		if (isArray(parents)) {
			if (!parents.length) {
				return child;
			}

			extraParents = parents.slice(1);
			parent = parents.shift();
		} else {
			parent = parents;
		}

		child = child || {};

		for (i in parent) {
			if (parent.hasOwnProperty(i)) {
				if (typeof parent[i] === 'object' && i !== 'prototype') {
					if (!child[i] || doOverwrite) {
						child[i] = isArray(parent[i]) ? [] : {};
					}
					extend(child[i], parent[i], doOverwrite);
				} else {
					if (!child[i] || doOverwrite) {
						child[i] = parent[i];
					}
				}
			}
		}

		return extend(child, extraParents, doOverwrite);
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
			this._reachedKeyframes = [];
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

			return this._keyframize(inst);
		},

		// Handle high-level frame management logic
		update: function () {
			var self = this,
				currTime = now();

			this.state.fCount++;
			this._updateHandle = setTimeout(function () {
				var reachedKeyframeLastIndex, prevKeyframe;

				// Calculate how long this iteration of the loop has been running for
				self._loopLength = currTime - self._loopStartTime;

				// Start the loop over if need be.
				if ( (self._loopLength > self._animationDuration) && self._reachedKeyframes.length === self._keyframeIds.length) {
					self._hasHitValidFrame = false;
	
					// Reset the loop start time relative to when the animation began,
					// not to when the final keyframe last completed
					self._loopStartTime = self._startTime + parseInt((currTime - self._startTime) / (self._animationDuration || 1), 10) * self._animationDuration;
					self._loopLength -= self._animationDuration || self._loopLength;
					self._reachedKeyframes = [];
				}

				// Determine where we are in the loop
				if (self._animationDuration) {
					self._loopPosition = self._loopLength / self._animationDuration;
				} else {
					self._loopPosition = 0;
				}
				
				// Calculate the current frame of the loop
				self._currentFrame = parseInt(self._loopPosition * self._lastKeyframe, 10);
				
				prevKeyframe = self._getLatestKeyFrameId(self._keyframeIds);
				prevKeyframe = prevKeyframe === -1 ? self._lastKeyframe : self._keyframeIds[prevKeyframe];
				
				// Maintain a record of keyframes that have been run for this loop iteration
				if (prevKeyframe > (last(self._reachedKeyframes) || 0)) {
					console.log(prevKeyframe, last(self._reachedKeyframes) || 0, self._reachedKeyframes.toString())
					self._reachedKeyframes.push(prevKeyframe);	
				}
				
				reachedKeyframeLastIndex = self._reachedKeyframes.length - 1;

				// If a keyframe was skipped, set self._currentFrame to the first skipped keyframe
				if (self._reachedKeyframes[reachedKeyframeLastIndex] !== self._keyframeIds[reachedKeyframeLastIndex]) {
					self._currentFrame = self._reachedKeyframes[reachedKeyframeLastIndex] = self._keyframeIds[reachedKeyframeLastIndex];
				}
				
				// If we have gone past the last keyframe, set the self._currentFrame to the last keyframe
				if (self._currentFrame > self._lastKeyframe) {
					self._currentFrame = self._lastKeyframe;
				}
				
				// Clear out the canvas
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
			var objStateIndices, currentFrameStateProperties, adjustedProperties;

			for (objStateIndices in this._objStateIndex) {
				if (this._objStateIndex.hasOwnProperty(objStateIndices)) {

					// The current object may have a first keyframe greater than 0.
					// If so, we don't want to calculate or draw it until we have
					// reached this object's first keyframe
					if (typeof this._objStateIndex[objStateIndices][0] !== 'undefined' && this._currentFrame >= this._objStateIndex[objStateIndices][0]) {
						currentFrameStateProperties = this._getObjectState(objStateIndices);

						// If there are remaining keyframes for this object, draw it.
						if (currentFrameStateProperties !== null) {
							// If there is a queued action, apply it
							if (this._objStateIndex[objStateIndices].queue.length > 0) {
								if (this._objStateIndex[objStateIndices].queue[0]._internals.fromState === null) {
									this._objStateIndex[objStateIndices].queue[0]._internals.fromState = currentFrameStateProperties;
								}

								adjustedProperties = this._getQueuedActionState(this._objStateIndex[objStateIndices].queue);
								extend(currentFrameStateProperties, adjustedProperties, true);
							}

							currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, this.ctx);
						}
					}
				}
			}
		},

		_getObjectState: function (stateObjName) {

			var stateObjKeyframeIndex = this._objStateIndex[stateObjName],
				latestKeyframeId = this._getLatestKeyFrameId(stateObjKeyframeIndex),
				nextKeyframeId, latestKeyframeProps, nextKeyframeProps;

			// Do a check to see if any more keyframes remain in the animation loop for this object
			if (latestKeyframeId === -1) {
				return null;
			}

			nextKeyframeId = this._getNextKeyframeId(stateObjKeyframeIndex, latestKeyframeId);
			latestKeyframeProps = this._keyframes[stateObjKeyframeIndex[latestKeyframeId]][stateObjName];
			nextKeyframeProps = this._keyframes[stateObjKeyframeIndex[nextKeyframeId]][stateObjName];

			return this._calculateCurrentFrameProps(
			latestKeyframeProps, nextKeyframeProps, stateObjKeyframeIndex[latestKeyframeId], stateObjKeyframeIndex[nextKeyframeId], nextKeyframeProps.easing);
		},

		_getQueuedActionState: function (queuedActionsArr) {
			var currTime = now(),
				queuedAction = queuedActionsArr[0],
				internals = queuedAction._internals;

			if (internals.startTime === null) {
				internals.startTime = currTime;
			}

			if (internals.toState === null) {
				internals.toState = {};
				extend(internals.toState, internals.fromState);
				extend(internals.toState, queuedAction.state, true);
			}

			internals.currFrame = ((currTime - internals.startTime) / 1000) * this._params.fRate;

			if (internals.currFrame > queuedAction.duration) {
				queuedActionsArr.shift();
			}

			return this._calculateCurrentFrameProps(
			internals.fromState, internals.toState, 0, +queuedAction.duration, queuedAction.easing || internals.fromState.easing, {
				currentFrame: internals.currFrame
			});
		},

		_calculateCurrentFrameProps: function (fromState, toState, fromKeyframe, toKeyframe, easing, options) {
			var i, keyProp, fromProp, toProp, isColor, currentFrameProps = {};

			easing = kapi.tween[easing] ? easing : 'linear';
			options = options || {};

			for (keyProp in fromState) {

				if (fromState.hasOwnProperty(keyProp)) {
					fromProp = fromState[keyProp];

					if (typeof fromProp === 'number' || isColorString(fromProp)) {
						toProp = toState[keyProp];
						isColor = false;

						if (typeof fromProp === 'string') {
							isColor = true;
							fromProp = hexToRGBArr(fromProp);
							toProp = hexToRGBArr(toProp);
						}

						if (isColor) {
							// If the property is a color, do some extra logic to
							// blend it across the states
							currentFrameProps[keyProp] = 'rgb(';

							for (i = 0; i < fromProp.length; i++) {
								currentFrameProps[keyProp] += Math.floor(applyEase.call(this, easing, fromKeyframe, toKeyframe, fromProp[i], toProp[i], options.currentFrame)) + ',';
							}

							// Swap the last RGB comma for an end-paren
							currentFrameProps[keyProp] = currentFrameProps[keyProp].replace(/,$/, ')');

						} else {
							currentFrameProps[keyProp] = applyEase.call(this, easing, fromKeyframe, toKeyframe, fromProp, toProp, options.currentFrame);
						}
					}
				}
			}

			extend(currentFrameProps, fromState);
			return currentFrameProps;
		},

		/**
		 * @param {Array} lookup A lookup array for the internal `_keyframes` object
		 * 
		 * @return {Number} The index of the last keyframe that was run in the animation.  Returns `-1` if there are no keyframes remaining for this object in the animation.
		 */
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

			// Make really really sure the id is unique, if one is not provided
			if (typeof implementationObj.id === 'undefined') {
				implementationObj.id =
					implementationObj.params.id || implementationObj.params.name || parseInt(('' + Math.random()).substr(2), 10) + now();
			}

			if (typeof this._objStateIndex[implementationObj.id] === 'undefined') {
				this._objStateIndex[implementationObj.id] = [];
				this._objStateIndex[implementationObj.id].queue = [];
			}

			// TODO:  keyframe() blows up if given a keyframeId that is a string.
			// It should accept strings.
			implementationObj.keyframe = function (keyframeId, stateObj) {
				stateObj.prototype = this;

				try {
					keyframeId = self._getRealKeyframe(keyframeId);
				} catch (ex) {
					if (window.console && window.console.error) {
						console.error(ex);
					}
					return undefined;
				}
				
				if (keyframeId < 0) {
					throw 'keyframe ' + keyframeId + ' is less than zero!';
				}
				
				if (keyframeId > 0 && typeof self._keyframes['0'] === 'undefined') {
					self._keyframes['0'] = {};
				}

				// If this keyframe does not already exist, create it
				if (typeof self._keyframes[keyframeId] === 'undefined') {
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

			implementationObj.to = function (duration, stateObj) {
				var last, queue = self._objStateIndex[implementationObj.id].queue;

				queue.push({
					'duration': self._getRealKeyframe(duration),
					'state': stateObj
				});

				last = queue[queue.length - 1];
				last._internals = {};

				last._internals.startTime = null;
				last._internals.fromState = null;
				last._internals.toState = null;

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
		_getRealKeyframe: function (identifier) {
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
			this._lastKeyframe = last(this._keyframeIds);
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
			var index = this._objStateIndex[implementationObj.id];

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

// Attach tween methods to the `kapi.tween` function to extend it.
kapi.tween = {
	// All equations are copied from here: http://www.gizma.com/easing/
	// Originally written by Robert Penner, copied under BSD License (http://www.robertpenner.com/)
	//
	// Params are as follows
	// c = current time
	// b = start value
	// c = change in value
	// d = duration
	// no easing, no acceleration
	linear: function (t, b, c, d) {
		return c * t / d + b;
	}
};