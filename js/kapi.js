/*  Kapi - Keyframe API (for canvas)
 *  jeremyckahn@gmail.com
 * 
 * A keyframe interface for the HTML 5 canvas.
 */


// kapi works by augmenting the Canvas element on the DOM.
function kapi(canvas, params, events){
	
	var version = '0.0.1',
		defaults = {
			fillColor : '#f0f',
			fRate : 20
		},
		DEBUG = true;
	
	/* Define some useful methods that are private to Kapi. */
	
	// Strip the 'px' from a style string and add it to the element directly
	// Meant to be called with Function.call()
	function setDimensionVal(dim){
		this[dim] = this.style[dim].replace(/px/gi, '') || this._params[dim];
	}
	
	// Get UNIX epoch time
	function now(){
		return + new Date();
	}
	
	// Find the difference between two numbers
	function difference(a, b){
		return Math.max(a, b) - Math.min(a, b);
	}
	
	// Inspired by the map() method in Processing.js: http://processingjs.org/reference/map_
	function map(value, low1, high1, low2, high2){
		value = norm(value, low1, high1);
		return lerp(value, low2, high2);
	}
	
	// Copied from Proccessing.js's norm function: http://processingjs.org/reference/norm()
	function norm(num, rangeBegin, rangeEnd){
		return (num - rangeBegin) / (rangeEnd - rangeBegin);
	}
	
	// Copied from Proccessing.js's lerp function: http://processingjs.org/reference/lerp()
	function lerp(position, rangeBegin, rangeEnd){
		return ((rangeEnd - rangeBegin) * position) + rangeBegin;		
	}
	
	// Adapted from the book, "JavaScript Patterns" by Stoyan Stefanov
	function extend(child, parent, doOverwrite){
		var i, 
			toStr = Object.prototype.toString,
			astr = '[object Array]';
			
		child = child || {};
		
		for (i in parent){
			if (parent.hasOwnProperty(i)){
				if (typeof parent[i] === 'object'){
					if (!child[i] || doOverwrite){
						child[i] = (toStr.call(parent[i]) === astr) ? [] : {};
					}
					extend(child[i], parent[i]);
				} else {
					if (!child[i] || doOverwrite){
						child[i] = parent[i];
					}
				}
			}
		}
	}
	
	function sortArrayNumerically(array){
		return array.sort(function(a, b){
			return a - b;
		});
	}
	
	return {
		// init() is called immediately after this object is defined
		init: function(canvas, params, events){
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
				fCount : 0
			};
			
			for (style in this._params.styles){
				if (this._params.styles.hasOwnProperty(style)){
					this.el.style[style] = this._params.styles[style];
				}
			}
			
			// The height and width of the canvas draw area do not sync
			// up with the CSS height/width values, so set those manually here
			if (this._params.styles){
				if (this._params.styles.height){
					setDimensionVal.call(this.el, 'height');
				}
				if (this._params.styles.width){
					setDimensionVal.call(this.el, 'width');
				}
			}
			
			return canvas;
		},
		
		getVersion: function(){
			return version;
		},
		
		isPlaying: function(){
			return (this._isStopped === false && this._isPaused === false);
		},
		
		play: function(){
			if (this.isPlaying()){
				return;
			}
			
			this._isStopped = this._isPaused = false;
			
			if (!this._startTime){
				this._startTime = now();
			}
			
			if (this._loopStartTime){
				this._loopStartTime += now() - this._pausedAtTime;
			} else {
				this._loopStartTime = now();
			}
			
			this.update();
		},
		
		pause: function(){
			clearTimeout(this._updateHandle);
			this._pausedAtTime = now();
			this._isPaused = true;
		},
		
		stop: function(){
			clearTimeout(this._updateHandle);
			delete this._loopStartTime;
			delete this._pausedAtTime;
			this._isStopped = true;
		},
		
		// Handle high-level frame management logic
		update: function(){
			var self = this;
			
			this.state.fCount++;
			
			this._updateHandle = setTimeout(function(){
				
				self._loopLength = now() - self._loopStartTime;
				
				// Start the loop over if need be.
				if (self._loopLength > self._animationDuration){
					self._loopStartTime = now();
					self._loopLength -= self._animationDuration;	
				}
				
				// Determine where we are in the loop
				self._loopPosition = self._loopLength / self._animationDuration;
				
				// Calculate the current frame of the loop
				self._currentFrame = parseInt(self._loopPosition * self._keyframeIds[self._keyframeIds.length - 1], 10);
				
				self.ctx.clearRect(0, 0, self.el.width, self.el.height);
				
				if (typeof self.events.enterFrame === 'function'){
					self.events.enterFrame.call(self);
				}
				
				self._update(self._currentFrame);
				self.update();
			}, 1000 / this._params.fRate);
			
			return this._updateHandle;
		},
		
		// Handle low-level drawing logic
		_update: function(currentFrame){
			var i, objStateIndices, currentFrameStateProperties;
			
			for(objStateIndices in this._objStateIndex){
				if (this._objStateIndex.hasOwnProperty(objStateIndices)){
					
					// The current object may have a first keyframe greater than 0.
					// If so, we don't want to calculate or draw it until we have
					// reached this object's first keyframe
					if (typeof this._objStateIndex[objStateIndices][0] !== 'undefined' && this._currentFrame >= this._objStateIndex[objStateIndices][0]){
						currentFrameStateProperties = this._calculateCurrentFrameStateProperties(objStateIndices);
						currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, this.ctx);
					}
				}
			}
		},
		
		// TODO:  This may in fact be the ugliest function ever written.
		// Make it faster and easier to follow.
		_calculateCurrentFrameStateProperties: function(stateObj){
			
			var self = this,
				stateObjKeyframeIndex = this._objStateIndex[stateObj],
				latestKeyframeId = this._getLatestKeyFrameId( stateObjKeyframeIndex ),
				nextKeyframeId = this._getNextKeyframeId( stateObjKeyframeIndex, latestKeyframeId ),
				latestKeyframeProps = this._keyframes[stateObjKeyframeIndex[latestKeyframeId]][stateObj],
				nextKeyframeProps = this._keyframes[stateObjKeyframeIndex[nextKeyframeId]][stateObj],
				positionBetweenKeyframes = norm( this._currentFrame, stateObjKeyframeIndex[latestKeyframeId], stateObjKeyframeIndex[nextKeyframeId] ),
				currentFrameProps = {},
				prop;
				
			
			for (prop in latestKeyframeProps){

				// TODO:  This needs to accept more than just numbers.
				// Example: Strings that represent colors should fade to the correct in-between color.
				if (latestKeyframeProps.hasOwnProperty(prop) && typeof latestKeyframeProps[prop] === 'number'){
					currentFrameProps[prop] = map(
							this._currentFrame,
							stateObjKeyframeIndex[latestKeyframeId],
							stateObjKeyframeIndex[nextKeyframeId],
							latestKeyframeProps[prop],
							nextKeyframeProps[prop]);
				}
			}
			
			extend(currentFrameProps, latestKeyframeProps);
			return currentFrameProps;		
		},
		
		_getLatestKeyFrameId: function(lookup){
			var i;
			
			for (i = lookup.length - 1; i >= 0; i--){
				if (lookup[i] < this._currentFrame){
					if (i === lookup.length - 1){
						return 0;
					} else {
						return i;
					}
				}
			}
			
			return lookup.length - 1;
		},
		
		_getNextKeyframeId: function(lookup, latestKeyframeId){
			return latestKeyframeId === lookup.length - 1 ? 0 : latestKeyframeId + 1;
		},
		
		add: function(implementationFunc, initialParams){
			var inst = {};
			inst.draw = implementationFunc;
			inst.params = initialParams;
			
			return this._keyframize(inst, initialParams);
		},
		
		_isFirstStateForObj: function(keyframeId, stateObj){
			
		},
		
		_keyframize: function(implementationObj){
			var self = this;

			// TODO:  keyframe() blows up if given a keyframeId that is a string.
			// It should accept strings.
			implementationObj.keyframe = function(keyframeId, stateObj){
				stateObj.prototype = this;
				
				// Make really really sure the id is unique, if one is not provided
				if (typeof implementationObj.id === 'undefined'){
					implementationObj.id = 
						implementationObj.params.id || implementationObj.params.name || parseInt(('' + Math.random()).substr(2), 10) + now();
				}

				// If this keyframe does not already exist, create it
				if (typeof self._keyframes[keyframeId] == 'undefined'){
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
		
		_updateKeyframes: function(implementationObj, keyframeId){
			this._updateKeyframeIdsList(keyframeId);
			this._sortKeyframes();
			this._normalizeObjectAcrossKeyframes(implementationObj.id);
			this._updateObjStateIndex(implementationObj, { add : keyframeId });
		},
		
		_updateKeyframeIdsList: function(keyframeId){
			var i;
			
			for (i = 0; i < this._keyframeIds.length; i++){
				if (this._keyframeIds[i] === keyframeId){
					return;
				}
			}
			
			this._keyframeIds.push(keyframeId);
			sortArrayNumerically(this._keyframeIds);
		},
		
		// Sort the keyframe properties numerically.
		_sortKeyframes: function(){
			var _keyframes = {}, 
				arr = [],
				prop,
				i;
			
			for (prop in this._keyframes){
				if (this._keyframes.hasOwnProperty(prop)){
					arr.push(parseInt(prop, 10));
				}
			}
			
			if (DEBUG){
				// Store the ordered keyframes into a temporary object
				for (i = 0; i < arr.length; i++){
					_keyframes[arr[i] + ''] = this._keyframes[arr[i]];
				}
			
				// Set the contents of the internal _keyframes object to that of the ordered temporary object
				this._keyframes = _keyframes;
			}
		},
		
		_normalizeObjectAcrossKeyframes: function(keyframedObjId){
			var state, prevState, tempParams, i,
				length = this._keyframeIds.length;
			
			// Traverse all keyframes in the animation
			for (i = 0; i < length; i++){
				state = this._keyframeIds[i];
				
				if (prevState){
					extend(
						this._keyframes[state][keyframedObjId],
						this._keyframes[prevState][keyframedObjId]);
				}
				
				prevState = state;
			}
		},
		
		_updateObjStateIndex: function(implementationObj, params){
			var index;
			
			if (typeof this._objStateIndex[implementationObj.id] === 'undefined'){
				this._objStateIndex[implementationObj.id] = [];
			}
			
			index = this._objStateIndex[implementationObj.id];
			
			if (typeof params.add !== 'undefined'){
				index.push(params.add);
				sortArrayNumerically(index);
			}
			
			// TODO:  Fill this in and test it!
			if (typeof params.remove !== 'undefined'){
				
			}
		}
		
	}.init(canvas, params, events);
}