/*	Kapi - Keyframe API (for canvas)
 *	jeremyckahn@gmail.com
 * 
 * A keyframe interface for the HTML 5 canvas.
 */

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
		},
		modifiers = {
			'+=': function (original, amount) {
				return original + amount;
			},
			
			'-=': function (original, amount) {
				return original - amount;
			},
			
			'*=': function (original, amount) {
				return original * amount;
			},
			
			'/=': function (original, amount) {
				return original / amount;
			}
		};

	/* Define some useful methods that are private to Kapi. */
	function applyEase (easing, previousKeyframe, nextKeyframe, currProp, nextProp, currentFrame) {
		if ((currentFrame || this._currentFrame) >= previousKeyframe) {
			return kapi.tween[easing]((currentFrame || this._currentFrame) - previousKeyframe, currProp, nextProp - currProp, (nextKeyframe - previousKeyframe) || 1);
		}
	}

	function isArray (arr) {
		return (toStr.call(arr) === '[object Array]');
	}

	function last (arr) {
		return arr.length > 0 ? arr[arr.length - 1] : undefined;
	}

	// Adapted from the book, "JavaScript Patterns" by Stoyan Stefanov
	// Contains some modifications to improve performance for Kapi, so
	// just copy pasting this for other implementations is likely not wise.
	function extend (child, parents, doOverwrite) {
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
					if (!child[i] || child[i] === 0 || doOverwrite) {
						child[i] = isArray(parent[i]) ? [] : {};
					}
					extend(child[i], parent[i], doOverwrite);
				} else {
					if (!child[i] || child[i] === 0 || doOverwrite) {
						child[i] = parent[i];
					}
				}
			}
		}

		return extend(child, extraParents, doOverwrite);
	}

	// Strip the 'px' from a style string and add it to the element directly
	// Meant to be called with Function.call()
	function setDimensionVal (dim) {
		this[dim] = this.style[dim].replace(/px/gi, '') || this._params[dim];
	}

	// Get UNIX epoch time
	function now () {
		return +new Date();
	}

	function generateUniqueName () {
		return parseInt(('' + Math.random()).substr(2), 10) + now();
	}

	function sortArrayNumerically (array) {
		return array.sort(function (a, b) {
			return a - b;
		});
	}

	function isHexString (str) {
		return typeof str === 'string' && (/^#([0-9]|[a-f]){6}$/i).test(str);
	}

	function isRGBString (str) {
		return typeof str === 'string' && (/^rgb\(\d+\s*,\d+\s*,\d+\s*\)\s*$/i).test(str);
	}

	function isColorString (str) {
		return isHexString(str) || isRGBString(str);
	}

	function hexToDec (hex) {
		return parseInt(hex, 16);
	}

	function hexToRGBArr (hex) {
		if (typeof hex === 'string') {
			hex = hex.replace(/#/g, '');
			return [hexToDec(hex.substr(0, 2)), hexToDec(hex.substr(2, 2)), hexToDec(hex.substr(4, 2))];
		}
	}
	
	function getRGBArr (str) {
		var arr;
		
		if (typeof str !== 'string') {
			return str;
		}
		
		if (/^(#|rgb)/.test(str)) {
			if (/^#/.test(str)) {
				return hexToRGBArr(str);
			} else {
				arr = str.match(/\d+/g);
				return [+arr[0], +arr[1], +arr[2]];
			}
		} else {
			// This isn't a valid color string, return it
			return str;
		}
	}

	function hexToRGBStr (hexStr) {
		if (isRGBString(hexStr)) {
			return hexStr;
		}

		var arr = hexToRGBArr(hexStr);

		return 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')';
	}

	function isModifierString (str) {
		return (typeof str === 'string' && (/^\s*(\+|\-|\*|\/)\=\d+\s*$/).test(str));
	}
	
	// This assumes that `str` is a valid modifier string ('+=x', '-=x', '*=x', '/=x')
	function getModifier (str) {
		return str.match(/(\+|\-|\*|\/)\=/)[0];
	}

	function isKeyframeableProp (prop) {
		return (typeof prop === 'number' || typeof prop === 'function' || isModifierString(prop) || isColorString(prop));
	}

	return {
		// init() is called immediately after this object is defined
		init: function (canvas, params, events) {
			var style, kapi;

			params = params || {};
			extend(params, defaults);
			this._params = params;
			
			// Save a reference to original canvas object
			this._params.canvas = canvas;
			this.events = events;
			this.el = canvas;
			this.ctx = canvas.getContext('2d');

			// Initialize some internal properties
			this._keyframeIds = [];
			this._keyframes = {};
			this._reachedKeyframes = [];
			this._objStateIndex = {};
			this._keyframeCache = {};
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

			return this;
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

			// If the animation was previously playing but was then stopped.
			// adjust for the time that the animation was not runnning.
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
			var obj;
			
			clearTimeout(this._updateHandle);
			delete this._loopStartTime;
			delete this._pausedAtTime;
			this._isStopped = true;
			
			// Delete any queued Immediate Actions
			for (obj in this._objStateIndex) {
				if (this._objStateIndex.hasOwnProperty(obj)) {
					this._objStateIndex[obj].queue = [];
				}
			}
		},

		add: function (implementationFunc, initialParams) {
			var inst = {};
			inst.draw = implementationFunc;
			inst.params = initialParams;
			inst.constructor = implementationFunc;
			inst.name = implementationFunc.name;

			return this._keyframize(inst);
		},

		// Handle high-level frame management logic
		update: function () {
			// Abandon all hope, ye who enter here.
			var self = this,
				currTime = now();

			this.state.fCount++;
			this._updateHandle = setTimeout(function () {
				var reachedKeyframeLastIndex, prevKeyframe, cachedObject;

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
					
					// Clear out the dynamic keyframe cache
					self._keyframeCache = {};
				}

				// Determine where we are in the loop
				if (self._animationDuration) {
					self._loopPosition = self._loopLength / self._animationDuration;
				} else {
					self._loopPosition = 0;
				}
				
				// Calculate the current frame of the loop
				self._currentFrame = parseInt(self._loopPosition * self._lastKeyframe, 10);
				
				prevKeyframe = self._getLatestKeyframeId(self._keyframeIds);
				prevKeyframe = prevKeyframe === -1 ? self._lastKeyframe : self._keyframeIds[prevKeyframe];
				
				// Maintain a record of keyframes that have been run for this loop iteration
				if (prevKeyframe > (last(self._reachedKeyframes) || 0)) {
					self._reachedKeyframes.push(prevKeyframe);
					
					// Flush half of the `_keyframeCache` to maintain the "from" dynamic states
					// when transitioning to the new keyframe segment
					for (cachedObject in self._keyframeCache) {
						if (self._keyframeCache.hasOwnProperty(cachedObject)) {
							self._keyframeCache[cachedObject] = {
								'from': self._keyframeCache[cachedObject].to,
								'to': {}
							};
						}
					}
				}
				
				reachedKeyframeLastIndex = self._reachedKeyframes.length ? self._reachedKeyframes.length - 1 : 0;

				// If a keyframe was skipped, set self._currentFrame to the first skipped keyframe
				if (self._reachedKeyframes[reachedKeyframeLastIndex] !== self._keyframeIds[reachedKeyframeLastIndex] ) {
					self._currentFrame = self._reachedKeyframes[reachedKeyframeLastIndex] = self._keyframeIds[reachedKeyframeLastIndex];
				}
				
				// Only update the canvas if _currentFrame has not gone past the _lastKeyframe
				if (self._currentFrame <= self._lastKeyframe) {
					// Clear out the canvas
					self.ctx.clearRect(0, 0, self.el.width, self.el.height);

					if (typeof self.events.enterFrame === 'function') {
						self.events.enterFrame.call(self);
					}

					self._update(self._currentFrame);
				}
				
				self.update();
			}, 1000 / this._params.fRate);

			return this._updateHandle;
		},

		// Handle low-level drawing logic
		_update: function (currentFrame) {
			// Here be dragons.
			var objStateIndices, currentFrameStateProperties, adjustedProperties,
				objActionQueue, oldQueueLength, keyframeToModify;

			for (objStateIndices in this._objStateIndex) {
				if (this._objStateIndex.hasOwnProperty(objStateIndices)) {

					// The current object may have a first keyframe greater than 0.
					// If so, we don't want to calculate or draw it until we have
					// reached this object's first keyframe
					if (typeof this._objStateIndex[objStateIndices][0] !== 'undefined' && this._currentFrame >= this._objStateIndex[objStateIndices][0]) {
						currentFrameStateProperties = this._getObjectState(objStateIndices);

						// If there are remaining keyframes for this object, draw it.
						if (currentFrameStateProperties !== null) {
							objActionQueue = this._objStateIndex[objStateIndices].queue;
							
							// If there is a queued action, apply it to the current frame
							if ((oldQueueLength = objActionQueue.length) > 0) {
								if (objActionQueue[0]._internals.fromState === null) {
									objActionQueue[0]._internals.fromState = currentFrameStateProperties;
								}
								
								adjustedProperties = this._getQueuedActionState(objActionQueue);
								extend(currentFrameStateProperties, adjustedProperties, true);
								
								// If an immediate action finished running and was removed from the queue
								if (oldQueueLength !== objActionQueue.length) {
									
									// Save the modified state to the most recent keyframe for this object
									keyframeToModify = this._getLatestKeyframeId(this._objStateIndex[objStateIndices]);
									this._keyframes[ this._keyframeIds[keyframeToModify] ][objStateIndices] = currentFrameStateProperties;
									
									// TODO:  Fire an "action completed" event for the immediate action
								}
							}

							currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, this.ctx);
						}
					}
				}
			}
		},

		_getObjectState: function (stateObjName) {

			var stateObjKeyframeIndex = this._objStateIndex[stateObjName],
				latestKeyframeId = this._getLatestKeyframeId(stateObjKeyframeIndex),
				nextKeyframeId, 
				latestKeyframeProps, 
				nextKeyframeProps, 
				prop;

			// Do a check to see if any more keyframes remain in the animation loop for this object
			if (latestKeyframeId === -1) {
				return null;
			}

			nextKeyframeId = this._getNextKeyframeId(stateObjKeyframeIndex, latestKeyframeId);
			latestKeyframeProps = this._keyframes[stateObjKeyframeIndex[latestKeyframeId]][stateObjName];
			nextKeyframeProps = this._keyframes[stateObjKeyframeIndex[nextKeyframeId]][stateObjName];

			// If we are on or past the last keyframe
			if (latestKeyframeId === nextKeyframeId  && this._lastKeyframe > 0) {
				if ( this._keyframeIds[latestKeyframeId] === this._lastKeyframe) {
					// If the most recent keyframe is the last keyframe, just draw the "to" position
					// Use extend to create a copy of the object and not just a pointer to the actual keyframe data
					nextKeyframeProps = extend({}, nextKeyframeProps);
					
					// Ensure there any property functions are run
					for (prop in nextKeyframeProps) {
						if (nextKeyframeProps.hasOwnProperty(prop)) {
							if (typeof nextKeyframeProps[prop] === 'function') {
								nextKeyframeProps[prop] = nextKeyframeProps[prop].call(nextKeyframeProps);
							}
						}
					}
					
					// Something dumb must have happened for this code to have been reached.
					return nextKeyframeProps;
					
				} else {
					// Otherwise just don't draw anything
					return null;
				}
			}
			
			if (!this._keyframeCache[stateObjName]) {
				this._keyframeCache[stateObjName] = {
					'from': {},
					'to': {}
				};
			}

			return this._calculateCurrentFrameProps(
				latestKeyframeProps, 
				nextKeyframeProps, 
				stateObjKeyframeIndex[latestKeyframeId], 
				stateObjKeyframeIndex[nextKeyframeId], 
				nextKeyframeProps.easing
			);
		},

		_getQueuedActionState: function (queuedActionsArr) {
			var currTime = now(),
				queuedAction = queuedActionsArr[0],
				internals = queuedAction._internals;

			if (internals.startTime === null) {
				internals.startTime = currTime;
			}
			
			if (!internals.pauseBufferUpdated) {
				internals.pauseBufferUpdated = currTime;
			}
			
			// Account for any animation pauses during the life of the action
			if (internals.pauseBufferUpdated < this._pausedAtTime) {
				internals.pauseBuffer += (currTime - this._pausedAtTime);
				internals.pauseBufferUpdated = currTime;
			}

			if (internals.toState === null) {
				internals.toState = {};
				extend(internals.toState, internals.fromState);
				extend(internals.toState, queuedAction.state, true);
			}
			
			internals.currFrame = ((currTime - (internals.startTime + internals.pauseBuffer)) / 1000) * this._params.fRate;

			if (internals.currFrame > queuedAction.duration) {
				queuedActionsArr.shift();
			}

			return this._calculateCurrentFrameProps(
				internals.fromState, 
				internals.toState, 
				0, 
				+queuedAction.duration, 
				(queuedAction.easing || internals.fromState.easing), 
				{
					currentFrame: internals.currFrame
				}
			);
		},

		_calculateCurrentFrameProps: function (fromState, toState, fromKeyframe, toKeyframe, easing, options) {
			// Magic.
			var i, 
				keyProp, 
				fromProp, 
				toProp, 
				isColor,
				fromStateId,
				toStateId,
				modifier,
				previousPropVal,
				currentFrameProps = {};
			
			easing = kapi.tween[easing] ? easing : 'linear';
			options = options || {};

			for (keyProp in fromState) {

				if (fromState.hasOwnProperty(keyProp)) {
					fromProp = fromState[keyProp];
					fromStateId = fromState.prototype.id;

					if (typeof this._keyframeCache[fromStateId].from[keyProp] !== 'undefined') {
						fromProp = this._keyframeCache[fromStateId].from[keyProp];
					} else if (typeof fromProp === 'function' || isModifierString(fromProp)) {
						// If fromProp is dynamic, preprocess it
						if (typeof fromProp === 'function') {
							fromProp = fromProp.call(fromState) || 0;
						} else {
							modifier = getModifier(fromProp);
							previousPropVal = this._getPreviousKeyframeId(this._objStateIndex[fromStateId]);
							
							// Convert the keyframe ID to its corresponding property value
							if (previousPropVal === -1) {
								// This is the first keyframe for this object, so modify the original parameter if it is available.
								previousPropVal = fromState.prototype.params[keyProp] || 0;
							} else {
								previousPropVal = this._keyframes[previousPropVal][fromStateId][keyProp];
							}
							
							// Convert the value into a number and perform the value modification
							fromProp = modifiers[modifier](previousPropVal, +fromProp.replace(/\D/g, ''));
						}
						
						// Update the cache
						this._keyframeCache[fromStateId].from[keyProp] = fromProp;
					}
					
					if (isKeyframeableProp(fromProp)) {
						isColor = false;
						toProp = toState[keyProp];
						toStateId = toState.prototype.id;
						
						if (typeof this._keyframeCache[toStateId].to[keyProp] !== 'undefined') {
							toProp = this._keyframeCache[toStateId].to[keyProp];
						} else if (typeof toProp === 'function' || isModifierString(toProp)) {
							if (typeof toProp === 'function') {
								toProp = toProp.call(toState) || 0;
							} else {
								modifier = getModifier(toProp);
								toProp = modifiers[modifier](fromProp, +toProp.replace(/\D/g, ''));
							}
							
							this._keyframeCache[toStateId].to[keyProp] = toProp;
						}
						
						if (!isKeyframeableProp(toProp) || typeof fromProp !== typeof toProp) {
							// The toProp isn't valid, so just make the current value for the this frame
							// the same as the fromProp
							currentFrameProps[keyProp] = fromProp;
						} else {
							if (typeof fromProp === 'string') {
								isColor = true;
								fromProp = getRGBArr(fromProp);
								toProp = getRGBArr(toProp);
							}

							// The fromProp and toProp have been validated.
							// Perform the easing calculation to find the middle value based on the _currentFrame
							if (isColor) {
								// If the property is a color, do some logic to
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
			}

			extend(currentFrameProps, fromState);
			return currentFrameProps;
		},
		
		_getPreviousKeyframeId: function (lookup) {
			return this._getLatestKeyframeId(lookup) - 1;
		},

		/**
		 * @param {Array} lookup A lookup array for the internal `_keyframes` object
		 * 
		 * @return {Number} The index of the last keyframe that was run in the animation.  Returns `-1` if there are no keyframes remaining for this object in the animation.
		 */
		_getLatestKeyframeId: function (lookup) {
			var i;
			
			if (this._currentFrame === 0) {
				return 0;
			}

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
			return latestKeyframeId === lookup.length - 1 ? latestKeyframeId : latestKeyframeId + 1;
		},

		_keyframize: function (implementationObj) {
			var self = this;

			// Make really really sure the id is unique, if one is not provided
			if (typeof implementationObj.id === 'undefined') {
				implementationObj.id =
					implementationObj.params.id || implementationObj.params.name || generateUniqueName();
			}

			if (typeof this._objStateIndex[implementationObj.id] === 'undefined') {
				this._objStateIndex[implementationObj.id] = [];
				this._objStateIndex[implementationObj.id].queue = [];
			}

			implementationObj.keyframe = function keyframe (keyframeId, stateObj) {
				stateObj.prototype = this;
				stateObj.prototype.originalStateObj = {};
				extend(stateObj.prototype.originalStateObj, stateObj);

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
				
				// Create keyframe zero if it was not done so already
				if (keyframeId > 0 && typeof self._keyframes['0'] === 'undefined') {
					self._keyframes['0'] = {};
					self._keyframeIds.unshift(0);
				}

				// If this keyframe does not already exist, create it
				if (typeof self._keyframes[keyframeId] === 'undefined') {
					self._keyframes[keyframeId] = {};
				}

				// Create the keyframe state info for this object
				self._keyframes[keyframeId][implementationObj.id] = stateObj;

				// Perform necessary maintenance upon all of the keyframes in the animation
				self._updateKeyframes(implementationObj, keyframeId);

				// Copy over any "missing" parameters for this keyframe from the original object definition
				extend(stateObj, implementationObj.params);
				self._updateAnimationDuration();

				return this;
			};

			implementationObj.to = function to (duration, stateObj) {
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
				last._internals.pauseBuffer = null;
				last._internals.pauseBufferUpdated = null;

				return this;
			};

			/**
			 * Cleanly removes `implementationObj` from `keyframeId`, as well as all internal references to it.  
			 * An error is logged if `implementationObj` does not exist at `keyframeId`.
			 *
			 * {param} keyframeId The desired keyframe to remove `implementationObj` from.
			 *
			 * {returns} `implementationObj` for chaining.
			 */
			implementationObj.remove = function remove (keyframeId) {
				var i,
					keyframe,
					keyframeHasObjs = false;
				
				keyframeId = self._getRealKeyframe(keyframeId);
				
				if (self._keyframes[keyframeId] && self._keyframes[keyframeId][implementationObj.id]) {
					
					delete self._keyframes[keyframeId][implementationObj.id];
					
					// Check to see if there's any objects left in the keyframe.
					// If not, delete the keyframe.
					for (keyframe in self._keyframes[keyframeId]) {
						if (self._keyframes[keyframeId].hasOwnProperty(keyframe)) {
							keyframeHasObjs = true;
						}
					}
					
					if (!keyframeHasObjs) {
						
						delete self._keyframes[keyframeId];
						
						for (i = 0; i < self._keyframeIds.length; i++) {
							if (self._keyframeIds[i] === keyframeId) {
								self._keyframeIds.splice(i, 1);
								break;
							}
						}
						
						for (i = 0; i < self._reachedKeyframes.length; i++) {
							if (self._reachedKeyframes[i] === keyframeId) {
								self._reachedKeyframes.splice(i, 1);
								break;
							}
						}
					}
					
					for (i = 0; i < self._objStateIndex[implementationObj.id].length; i++) {
						if (self._objStateIndex[implementationObj.id][i] === keyframeId) {
							self._objStateIndex[implementationObj.id].splice(i, 1);
						}
					}
					
					self._updateAnimationDuration();
					
				} else {
					if (console && console.error) {
						if (self._keyframes[keyframeId]) {
							console.error('Trying to remove ' + implementationObj.id + ' from keyframe ' + keyframeId + ', but ' + implementationObj.id + ' does not exist at that keyframe.');
						} else {
							console.error('Trying to remove ' + implementationObj.id + ' from keyframe ' + keyframeId + ', but keyframe ' + keyframeId + ' does not exist.');
						}
					}
				}
				
				return this;
			};

			implementationObj.updateKeyframe = function updateKeyframe (keyframeId, newProps) {
				var keyframeToUpdate;
				
				keyframeId = self._getRealKeyframe(keyframeId);
				
				if (self._keyframes[keyframeId] && self._keyframes[keyframeId][implementationObj.id]) {
					keyframeToUpdate = self._keyframes[keyframeId][implementationObj.id];
					//extend(keyframeToUpdate, newProps, true)
					console.log(extend(keyframeToUpdate, newProps, true));
					implementationObj.keyframe(keyframeId, newProps);
				} else {
					if (window.console && window.console.error) {
						if (!self._keyframes[keyframeId]) {
							console.error('Keyframe ' + keyframeId + ' does not exist.');
						} else {
							console.error('Keyframe ' + keyframeId + ' does not contain ' + implementationObj.id);
						}
					}
				}
				
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
					calculatedKeyframe = parseInt(calcKeyframe[unit].call(this, quantifier), 10);
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
			var index = this._objStateIndex[implementationObj.id];

			if (typeof params.add !== 'undefined') {
				index.push(params.add);
				sortArrayNumerically(index);
			}
		},

		_updateAnimationDuration: function () {
			// Calculate and update the number of seconds this animation will run for
			this._lastKeyframe = last(this._keyframeIds);
			this._animationDuration = 1000 * (this._lastKeyframe / this._params.fRate);
		}

	}.init(canvas, params, events);
}

// Attach tween methods to the `kapi.tween` function to extend it.
kapi.tween = {
	// All equations are copied from here: http://www.gizma.com/easing/
	// Originally written by Robert Penner, copied under BSD License (http://www.robertpenner.com/)
	//
	// Params are as follows
	// t = current time
	// b = start value
	// c = change in value
	// d = duration
	// no easing, no acceleration
	linear: function (t, b, c, d) {
		return c * t / d + b;
	}
};