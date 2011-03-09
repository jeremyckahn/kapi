/*global clearTimeout: true, setTimeout: true, window: true, console: true */

/**
 * Kapi - A keyframe API
 * v0.2.1
 * by Jeremy Kahn - jeremyckahn@gmail.com
 * hosted at: https://github.com/jeremyckahn/kapi
 * 
 * Kapi streamlines animation development for the HTML 5 canvas by providing a keyframing API.  It manages timing and tweening so you don't have to.   
 * 
 * Kapi is distributed under the MIT license.
 * Learn more about keyframes: http://en.wikipedia.org/wiki/Key_frame
 * 
 * Please use, distribute and enjoy.
 */

/**
 * The Kapi constructor.  This function sets up the `canvas` to be used with the returned `kapi` object.
 * 
 * @param {HTMLCanvasElement} canvas The canvas element to be used with Kapi.
 * @param {Object} params Parameters to set on the new Kapi instance. They are as follows:
 *   @param {Number} fRate The frame rate that Kapi refreshes at.  60 is the limit of human perception, and 12 is choppy.  A happy medium is between 20 and 30.
 *   @param {Object} styles CSS styles to be set upon `canvas`.  They are to be supplieds as an object
 * @param {Object} events An object containing events that can be set on this instance of Kapi.
 *   @param {Function} enterFrame This event fires each time a new frame is processed, before it is rendered.     
 * 
 * @codestart
 * var myKapi = kapi(document.getElementsByTagName('canvas')[0], 
 *   // params
 *   {
 *     fRate : 30,
 *     styles : {
 *       'height':  '300px',
 *       'width': '500px',
 *       'background': '#000'
 *     }
 *   },
 *   // events
 *   {
 *     enterFrame: function(){
 *       console.log(this._currentFrame);
 *     }
 *   });
 * @codeend
 * 
 * @returns {Object} A `kapi` instance.
 */
function kapi(canvas, params, events) {

	var version = '0.2.1',
		defaults = {
			'fRate': 20,
			'autoclear': true
		},
		toStr = Object.prototype.toString,
		calcKeyframe = {
			/**
			 * @hide
			 * Calculates the keyframe based on a given amount of amount of *milliseconds*.  To be invoked with `Function.call`.
			 * @param {Number} num The amount of milliseconds to determine a keyframe by.
			 * @returns {Number} A floating-point equivalent of the keyframe equivalent of `num`.
			 */
			'ms': function (num) {
				return (num * this._params.fRate) / 1000;
			},
			/**
			 * @hide
			 * Calculates the keyframe based on a given amount of amount of *seconds*.  To be invoked with `Function.call`.
			 * @param {Number} num The amount of seconds to determine a keyframe by.
			 * @returns {Number} A floating-point equivalent of the keyframe equivalent of `num`.
			 */

			's': function (num) {
				return num * this._params.fRate;
			}
		},
		/**
		 * @hide
		 * These are methods that apply one number to another, based on the operator they represent.
		 * @param {Number} original The number to change.
		 * @param {Number} amount The amount to modify `original` by.
		 * @returns {Number} The result of the operation.
		 */
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
	
	/**
	 * @hide
	 * Returns whether or not `arr` is an Array.
	 * @param {Array} arr The item to inspect.
	 * @returns {Boolean} Whether or not `arr` is an Array.
	 */
	function isArray (arr) {
		return (toStr.call(arr) === '[object Array]');
	}
	
	function removeWhitespace (str) {
		if (typeof str === 'string') {
			str = str.replace(/\s/g, '');
		}
		
		return str;
	}

	/**
	 * @hide
	 * Copy over properties from `parents` into `child`.  If multiple `parents` are supplied as an Array, `extend` them in order from right to left, and finally onto `child`.
	 * 
	 * @codestart
	 * extend({a:true, b:true}, {c:true});
	 *   --> {a:true, b:true, c:true}
	 * @codeend
	 * 
	 * @codestart
	 * extend({a:true}, [{b:true}, {c:true}]);
	 *   --> {a:true, b:true, c:true}
	 * @codeend
	 * 
	 * Another handy use for this method is to create a new copy of an object, free of any Object references.  You can do this like so:
	 * @codestart
	 * extend({}, objToCopy);
	 * @endcode
	 * 
	 * By default, `extend` will not overwrite properties that are present in the objects that it is extending into.  You can force this with `doOverwrite`.
	 * @codestart
	 * extend({a:5, c:20}, {a: 10, b:15});
	 *   --> {a:5, b:15, c:20}
	 *   
	 * extend({a:5, c:20}, {a: 10, b:15}, true);
	 *   --> {a:10, b:15, c:20}
	 * @codeend
	 * 
	 * This is adapted from the book, "JavaScript Patterns" by Stoyan Stefanov.  Contains some modifications to improve performance for Kapi, so just copy/pasting this for other implementations is likely not wise.  
	 * @param {Object} child The object to extend into.
	 * @param {Object|Array} parents Either the single parent to extend from, of an Array of Objects to extend from.  If multiple parents are give, they are extended sequentially from right to left, and finally onto `child`.
	 * @param {Boolean} doOverwrite Force the properties that are present in the parent object into child object, whether or not that property is already defined on the child object.
	 * @returns {Object} The extended `child`.
	 */
	function extend (child, parent, doOverwrite) {
		var i, 
			extraParents;

		if (!parent) {
			return child;
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
					if (typeof child[i] === 'undefined' || doOverwrite) {
						child[i] = parent[i];
					}
				}
			}
		}

		return extend(child, extraParents, doOverwrite);
	}

	/**
	 * @hide
	 * Applies an easing formula defined in `kapi.tween`.
	 * @param {String} easing The name of the easing formula to apply.
	 * @param {Number} previousKeyframe The ID of the keyframe to ease from.
	 * @param {Number} nextKeyframe The ID of the keyframe to ease to.
	 * @param {Number} currProp The the current value of the property that is being eased.
	 * @param {Number} nextProp The value to ease to.
	 * @param {Number} currentProp The current frame that animation is processing.
	 */
	function applyEase (easing, previousKeyframe, nextKeyframe, currProp, nextProp, currentFrame) {
		if ((currentFrame || this._currentFrame) >= previousKeyframe) {
			return kapi.tween[easing]((currentFrame || this._currentFrame) - previousKeyframe, currProp, nextProp - currProp, (nextKeyframe - previousKeyframe) || 1);
		}
	}

	/** 
	 * @hide
	 * Return the last element in an array.
	 * @param {Array} arr The array to get the last item from
	 * @returns {Any|undefined} If there are no items in the `arr`, this returns `undefined`.
	 */
	function last (arr) {
		return arr.length > 0 ? arr[arr.length - 1] : undefined;
	}

	/**
	 * @hide
	 * Get a dimension value (height/width) and set it on a DOM element.  This gets the value from the element's CSS and applies it inline.  Useful for changing the `height` and `width` of the `canvas` element, because according to the HTML5 spec, as CSS styles are not the same as the inline dimension values unless specified.
	 * Note:  This is meant to be called with `Function.call()`.
	 * @param {String} dim The dimension to set (either "height" or "width")
	 */
	function setDimensionVal (dim) {
		this[dim] = this.style[dim].replace(/px/gi, '') || this._params[dim];
	}

	/**
	 * @hide
	 * Get the current UNIX time as an integer
	 * @returns {Number} An integer representing the current timestamp.
	 */
	function now () {
		return +new Date();
	}

	/**
	 * @hide
	 * Create a unique number.
	 * @returns {Number} A really random number.
	 */
	function generateUniqueName () {
		return parseInt((Math.random().toString()).substr(2), 10) + now();
	}

	/**
	 * @hide
	 * Sorts an array numerically, from smallest to largest.
	 * @param {Array} array The Array to sort.
	 * @returns {Array} The sorted Array.
	 */
	function sortArrayNumerically (array) {
		return array.sort(function (a, b) {
			return a - b;
		});
	}

	/**
	 * @hide
	 * Determines if a string is a hexadecimal string (`#xxxxxx`)
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isHexString (str) {
		return typeof str === 'string' && (/^#([0-9]|[a-f]){6}$/i).test(str);
	}

	/**
	 * @hide
	 * Determines if a string is an RGB string (`rgb(x,x,x)`)
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isRGBString (str) {
		return typeof str === 'string' && (/^rgb\(\d+\s*,\d+\s*,\d+\s*\)\s*$/i).test(str);
	}

	/**
	 * @hide
	 * Determines if a string is either a hexadecimal or RGB string
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isColorString (str) {
		return isHexString(str) || isRGBString(str);
	}

	/**
	 * @hide
	 * Convert a base-16 number to base-10.
	 * @param {Number|String} hex The value to convert
	 * @returns {Number} The base-10 equivalent of `hex`.
	 */
	function hexToDec (hex) {
		return parseInt(hex, 16);
	}

	/**
	 * @hide
	 * Convert a hexadecimal string to an array with three items, one each for the red, blue, and green decimal values.
	 * @param {String} hex A hexadecimal string.
	 * @returns {Array} The converted Array of RGB values if `hex` is a valid string, or an Array of three 0's.
	 */
	function hexToRGBArr (hex) {
		if (typeof hex === 'string') {
			hex = hex.replace(/#/g, '');
			return [hexToDec(hex.substr(0, 2)), hexToDec(hex.substr(2, 2)), hexToDec(hex.substr(4, 2))];
		} else {
			return [0, 0, 0];
		}
	}
	
	/**
	 * @hide
	 * Converts a string, which must be either in RGB or hexadecimal format, into an RGB Array.
	 * @param {String} str A hexadecimal (`#xxxxxx`) or RGB (`rgb(x,x,x)`) string
	 * @returns {Array|String} The equivalent RGB array (three items) or `str` if it was not in a valid format. 
	 */
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

	/**
	 * @hide
	 * Convert a hexadecimal formatted string into an RGB string.
	 * @param {String} hexStr A hexadecimal or RGB string.
	 * @returns {String} The RGB equivalent of `hexStr`
	 */
	function hexToRGBStr (hexStr) {
		var arr;
		
		if (isRGBString(hexStr)) {
			return hexStr;
		}

		arr = hexToRGBArr(hexStr);

		return 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')';
	}

	/**
	 * @hide
	 * Determines if a string is keyframe modifier string (`+=x`, `-=x`, `*=x`, `/=x`).
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isModifierString (str) {
		return (typeof str === 'string' && (/^\s*(\+|\-|\*|\/)\=\d+\s*$/).test(str));
	}
	
	// This assumes that `str` is a valid modifier string ('+=x', '-=x', '*=x', '/=x')
	/**
	 * @hide
	 * Extract the modifier portion of a keyframe modifier string.
	 * @param {String} str The string to extract the modifier from
	 * @returns {String} Either `+=x`, `-=x`, `*=x`, or `/=x`.
	 */
	function getModifier (str) {
		return str.match(/(\+|\-|\*|\/)\=/)[0];
	}

	/**
	 * @hide
	 * Determines if a property can be keyframed.
	 * @param {Any} prop The property to evaluate.
	 * @returns {Boolean}
	 */
	function isKeyframeableProp (prop) {
		return (typeof prop === 'number' || typeof prop === 'function' || isModifierString(prop) || isColorString(prop));
	}

	return {
		/**
		 * Called immediately when `kapi()` is invoked, there is no need for the user to invoke it (`init` essentially acts as the Kapi constructor).  Sets up some properties that are used internally, and also sets up the `canvas` element that it acts upon.
		 * 
		 * Not meant to be used directly - it is called automatically by the `kapi` constructor.  The parameters are identical, please see the constructor for use info. 
		 * @returns {Object} A `kapi` object (for chaining).
		 */
		init: function (canvas, params, events) {
			var style;

			params = params || {};
			events = events || {};
			
			// Fill in any missing parameters
			extend(params, defaults);
			this._params = params;			
			this.autoclear = !!this._params.autoclear;
			
			// Save a reference to original canvas object
			this._params.canvas = canvas;
			this.events = events;
			this.el = canvas;
			this.ctx = canvas.getContext('2d');

			// Initialize some internal properties
			this._keyframeIds = [];
			this._reachedKeyframes = [];
			this._layerIndex = [];
			this._keyframes = {};
			this._actors = {};
			this._actorStateIndex = {};
			this._keyframeCache = {};
			this._originalStates = {};
			this._liveCopies = {};
			this._currentState = {};
			this._animationDuration = 0;
			
			// Frame counter.  Is incremented for each frame that is rendered.
			this.fCount = 0;

			// Apply CSS styles specified in `params.styles` to `canvas`.
			for (style in this._params.styles) {
				if (this._params.styles.hasOwnProperty(style)) {

					// Make the style value a lowercase string
					this._params.styles[style] = (this._params.styles[style].toString()).toLowerCase();

					// These styles all require a trailing "px"
					if (style === 'height'
						|| style === 'width'
						|| style === 'top'
						|| style === 'left') {
						
						// If the user forgot to supply the aforemontioned "px", kindly add it for them.
						if (!this._params.styles[style].match(/px/)) {
							this._params.styles[style] = this._params.styles[style] + 'px';
						}
					}
					
					this.el.style[style] = removeWhitespace(this._params.styles[style]);
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
			
			// Since `init` only runs once, just delete it.
			delete this.init;

			return this;
		},

		/**
		 * Returns the Kapi version.
		 * @returns {String} The current Kapi version.
		 */
		getVersion: function () {
			return version;
		},

		/**
		 * Determines whether or not the animation is running
		 * @returns {Boolean}
		 */
		isPlaying: function () {
			return (this._isStopped === false && this._isPaused === false);
		},

		/**
		 * Starts the animation if it was not running before, or resumes the animation if it was not running previously.
		 * @returns {Kapi} The Kapi instance.
		 */
		play: function () {
			var pauseDuration,
				currTime = now();

			if (this.isPlaying()) {
				return;
			}

			this._isStopped = this._isPaused = false;

			if (!this._startTime) {
				this._startTime = currTime;
			}

			// If the animation was previously playing but was then stopped,
			// adjust for the time that the animation was not runnning.
			if (this._loopStartTime) {
				pauseDuration = currTime - this._pausedAtTime;
				this._loopStartTime += pauseDuration;

				// _startTime needs to be adjusted so that the loop doesn't
				// start somewhere other than the beginning in update()
				this._startTime += pauseDuration;
			} else {
				this._loopStartTime = currTime;
			}

			this._updateState();
			return this;
		},

		/**
		 * Pause the animation.  Resuming from the paused state does not start the animation from the beginning, the state of the animation is maintained.
		 * @returns {Kapi} The Kapi instance.
		 */
		pause: function () {
			clearTimeout(this._updateHandle);
			this._pausedAtTime = now();
			this._isPaused = true;
			return this;
		},

		/**
		 * Stops the animation.  When the animation is started again with `play()`, it starts from the beginning of the loop.
		 * @returns {Kapi} The Kapi instance.
		 */
		stop: function () {
			var obj;
			
			clearTimeout(this._updateHandle);
			delete this._loopStartTime;
			delete this._pausedAtTime;
			this._isStopped = true;
			
			// Delete any queued Immediate Actions
			for (obj in this._actorStateIndex) {
				if (this._actorStateIndex.hasOwnProperty(obj)) {
					this._actorStateIndex[obj].queue = [];
				}
			}
			
			this.ctx.clearRect(0, 0, this.el.width, this.el.height);
			return this;
		},

		/**
		 * Add an "actor," which is just a function that performs drawing logic, to the animation.  This function creates an object with the following properties:
		 * - *draw()*: The initial function that contains the drawing logic.
		 * - *get(prop)*: Retrieve the current value for `prop`.
		 * - *getState()*: Retrieve an object that contains the current state info.
		 * - *keyframe(keyframeId, stateObj)*: Create a keyframe state for this actor.
		 * - *liveCopy(keyframeId, keyframeIdToCopy)*: Create a clone of `keyframeId` that changes as the original does.
		 * - *remove()*: Removes the actor instance from the animation.
		 * - *to(duration, stateObj)*: Immediately starts tweening the state of the actor to the state specified in `stateObj` over the course of `duration`.
		 * - *updateKeyframe(keyframeId, newProps)*: Update the keyframe for this actor at `keyframeId` with the properties defined in `newProps`.  
		 * - *id* The identifier that Kapi uses to address the actor internally.
		 * - *params*: A copy of `initialParams`.
		 * 
		 * @param {Function} actorFunc The function that defines the drawing logic for the actor.
		 * @param {Object} initialParams The intial state of the actor.  These are stored internally on the actor as the `params` property.
		 * @returns {Object} An actor Object with the properties described above.
		 */
		add: function (actorFunc, initialState) {
			var inst = {};
			inst.draw = actorFunc;
			inst.params = initialState;
			inst.constructor = actorFunc;
			inst.name = actorFunc.name;

			return this._keyframize(inst);
		},
		
		/**
		 * Get a specific actor object.
		 * @param {String} actorName The name of the actor to fetch
		 * @returns {Object} An actor object.
		 */
		getActor: function (actorName) {
			return this._actors[actorName];
		},
		
		/**
		 * Returns a list of all the actors currently registered with this Kapi instance.
		 * @returns {Array} A list of all the string names of the actors that can be accessed with `kapi.getActor()`.
		 */
		getActorList: function () {
			var arr = [],
				actor;
			
			for (actor in this._actors) {
				if (this._actors.hasOwnProperty(actor)) {
					arr.push(actor);
				}
			}
			
			return arr;
		},
		
		/**
		 * Remove all of the keyframes for all of the actors in the animation.  Aside from the fact that `add`ed actors are still available in the Kapi instance, this effectively resets the state of Kapi.
		 * @returns {Object} The Kapi object (for chaining).
		 */
		removeAllKeyframes: function () {
			var currActor;
			
			for (currActor in this._actorStateIndex) {
				if (this._actorStateIndex.hasOwnProperty(currActor)) {
					
					while (this._actorStateIndex[currActor] && this._actorStateIndex[currActor].length) {
						this._actors[currActor].remove(last(this._actorStateIndex[currActor]));
					}
				}				
			}
			
			return this;
		},
		
		/**
		 * Gets or sets the framerate that Kapi updates at.  The current framerate is always returned, but if an argument is specified, Kapi's framerate is set to that number.
		 * @param {Number|null} newFramerate The new framerate to set.
		 * @returns {Number} The current framerate.  If `newFramerate` is an integer and greater than 0, this number is the same as `newFramerate`.
		 * 
		 */
		framerate: function (newFramerate) {
			// Works great for keyframes, but breaks immediates.
			var oldFRate,
				fRateChange,
				originalStatesIndexCopy = {},
				originalStatesCopy = {},
				originalReachedKeyframeCopy,
				originalLiveCopies = {},
				index,
				liveCopy,
				liveCopyData,
				tempLiveCopy,
				i;
			
			if (newFramerate && typeof newFramerate === 'number' && newFramerate > 0) {
				oldFRate = this._params.fRate;
				fRateChange = newFramerate / oldFRate;
				this._params.fRate = parseInt(newFramerate, 10);
				
				// Make safe copies of a number of things that have to be re-processed after the framerate change.
				extend(originalStatesIndexCopy, this._actorStateIndex);
				extend(originalStatesCopy, this._originalStates);
				extend(originalLiveCopies, this._liveCopies);
				originalReachedKeyframeCopy = this._reachedKeyframes.slice(0);
				this.removeAllKeyframes();
				
				for (index in originalStatesIndexCopy) {
					if (originalStatesIndexCopy.hasOwnProperty(index)) {

						for (i = originalStatesIndexCopy[index].length - 1; i > -1; i--) {
							this._actors[index].keyframe(fRateChange * originalStatesIndexCopy[index][i], originalStatesCopy[originalStatesIndexCopy[index][i]][index]);
						}
						
						// Update the durations on the Immediate Actions.
						for (i = 0; i < originalStatesIndexCopy[index].queue.length; i++) {
							this._actorStateIndex[index].queue[i].duration *= fRateChange;
						}
						
						// Restore the actor's reachedKeyframes list.
						this._actorStateIndex[index].reachedKeyframes = originalStatesIndexCopy[index].reachedKeyframes.splice(0);
					}
				}
				
				// Recreate all of the liveCopies				
				for (liveCopyData in originalLiveCopies) {
					if (originalLiveCopies.hasOwnProperty(liveCopyData)) {
						this._liveCopies[liveCopyData] = {};
						for (liveCopy in originalLiveCopies[liveCopyData]) {
							if (originalLiveCopies[liveCopyData].hasOwnProperty(liveCopy)) {
								tempLiveCopy = originalLiveCopies[liveCopyData][liveCopy];
								this._actors[liveCopyData].liveCopy((+liveCopy) * fRateChange, originalLiveCopies[liveCopyData][liveCopy].copyOf);
							}
						}
					}
				}
				
				for (i = 0; i < originalReachedKeyframeCopy.length; i++) {
					this._reachedKeyframes[i] = originalReachedKeyframeCopy[i] * fRateChange;
				}
			}
			
			return this._params.fRate;
		},
		
		/**
		 * Renders a specified frame and upates the internal Kapi state to match that frame.
		 * @param {Number|String} frame A keyframe identifier (integer, "_x_s" or "_x_ms") specifying which frame to go to and render.
		 * @returns {Object} An Object with the properties described above.
		 */
		gotoFrame: function (frame) {
			// This is not designed to work correctly with dynamic keyframes, because 
			// there is really no good way to ensure accuracy for skipped dynamic keyframes.
			// This functionality may come in a future release.  Who knows.
			var currTime = now();
			
			if (this.isPlaying()) {
				this.stop();
			}
			
			frame = this._getRealKeyframe(frame) % this._lastKeyframe;
			
			// Fake a bunch of properties to make `update` properly emulate the desired `frame`
			this._currentFrame = frame;
			this._loopStartTime = this._startTime = currTime - (frame * this._params.fRate);
			this._pausedAtTime = currTime;
			this._reachedKeyframes = this._keyframeIds.slice(0, this._getLatestKeyframeId(this._keyframeIds));
			this.ctx.clearRect(0, 0, this.el.width, this.el.height);
			this._updateActors(this._currentFrame);
			return this;
		},
		
		/**
		 *  Wraps the `gotoFrame` method and then plays the animation.
		 *   @param {Number|String} frame A keyframe identifier (integer, "_x_s" or "_x_ms") specifying which frame to go to and render.
		 *   @returns {Object} An Object with the properties described above.
		 */
		gotoAndPlay: function (frame) {
			this.gotoFrame(frame);
			return this.play();
		},
		
		/**
		 * Gets the number of layers currently in the Kapi instance.  Note:  This is also the same as the number of actors in the animation.
		 * @returns {Number}
		 */
		getNumberOfLayers: function () {
			return this._layerIndex.length;
		},

		/**
		 * Gets the current state of all of the actors in the animation.
		 * @returns {Object} A container of all of the animation's actors and their states at the time of invokation.
		 */
		getState: function () {
			return this._currentState;
		},
		
		/**
		 *  @hide
		 *  Updates the internal Kapi properties to reflect the current state - which is dependant on the current time.  `_updateState` manages all of the high-level frame logic such as determining the current keyframe, starting over the animation loop if needed, clearing the canvas and managing the keyframe cache.
		 *  
		 *  This function calls itself repeatedly at the rate defined by the `fRate` property.  `fRate` was provided when the `kapi()` constructor was orignally called.
		 * 
		 *  You probably don't want to modify this unless you really know what you're doing.
		 *
		 *  @return {Number} The setTimeout identifier for the timer callback.
		 */
		_updateState: function () {
			// Abandon all hope, ye who enter here.
			var self = this,
				currTime = now();

			this.fCount++;
			this._updateHandle = setTimeout(function () {
				var reachedKeyframeLastIndex, 
					prevKeyframe;

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
				}
				
				reachedKeyframeLastIndex = self._reachedKeyframes.length ? self._reachedKeyframes.length - 1 : 0;

				// If a keyframe was skipped, set self._currentFrame to the first skipped keyframe
				if (self._reachedKeyframes[reachedKeyframeLastIndex] !== self._keyframeIds[reachedKeyframeLastIndex] ) {
					self._currentFrame = self._reachedKeyframes[reachedKeyframeLastIndex] = self._keyframeIds[reachedKeyframeLastIndex];
				}
				
				// Only update the canvas if _currentFrame has not gone past the _lastKeyframe
				if (self._currentFrame <= self._lastKeyframe) {
					// Clear out the canvas
					if (self.autoclear !== false) {
						self.ctx.clearRect(0, 0, self.el.width, self.el.height);
					}

					if (typeof self.events.enterFrame === 'function') {
						self.events.enterFrame.call(self);
					}

					self._updateActors(self._currentFrame);
				}
				
				self._updateState();
			}, 1000 / this._params.fRate);

			return this._updateHandle;
		},

		/**
		 * @hide
		 * Update the state properties for the all of the actors in the animation.
		 * @param {Number} currentFrame The deisred frame to process.
		 */
		_updateActors: function (currentFrame) {
			// Here be dragons.
			var actorName,
				currentFrameStateProperties,
				adjustedProperties,
				objActionQueue,
				oldQueueLength,
				keyframeToModify,
				i;

			for (i = 0; i < this._layerIndex.length; i++) {				
				actorName = this._layerIndex[i];
				
				// The current object may have a first keyframe greater than 0.
				// If so, we don't want to calculate or draw it until we have
				// reached this object's first keyframe
				if (typeof this._actorStateIndex[actorName][0] !== 'undefined' && currentFrame >= this._actorStateIndex[actorName][0]) {
					
					currentFrameStateProperties = this._getActorState(actorName);

					// If there are remaining keyframes for this object, draw it.
					if (currentFrameStateProperties !== null) {
						objActionQueue = this._actorStateIndex[actorName].queue;
						
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
								keyframeToModify = this._getLatestKeyframeId(this._actorStateIndex[actorName]);
								this._keyframes[ this._keyframeIds[keyframeToModify] ][actorName] = currentFrameStateProperties;
								
								// TODO:  Fire an "action completed" event for the immediate action
							}
						}
	
						currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, this.ctx);
					}
				}
				this._currentState[actorName] = currentFrameStateProperties;
			}
		},

		/**
		 * @hide
		 * Apply the current keyframe state and any other state modifiers (such as Immediate Actions like `actor.to()`) to an actor.
		 * @param {String} actorName The identifier string corresponding the desired actor object.
		 * @returns {Object} The current state properties of `actorName`.  
		 */
		_getActorState: function (actorName) {

			var actorKeyframeIndex = this._actorStateIndex[actorName],
				latestKeyframeId = this._getLatestKeyframeId(actorKeyframeIndex),
				nextKeyframeId, 
				latestKeyframeProps, 
				nextKeyframeProps,
				lastRecordedKeyframe;

			// Do a check to see if any more keyframes remain in the animation loop for this actor
			if (latestKeyframeId === -1) {
				return null;
			}

			nextKeyframeId = this._getNextKeyframeId(actorKeyframeIndex, latestKeyframeId);
			latestKeyframeProps = this._keyframes[actorKeyframeIndex[latestKeyframeId]][actorName];
			nextKeyframeProps = this._keyframes[actorKeyframeIndex[nextKeyframeId]][actorName];

			// If we are on or past the last keyframe
			if (latestKeyframeId === nextKeyframeId  && this._lastKeyframe > 0) {
				return null;
			}
			
			// Manage the actor cache
			lastRecordedKeyframe = last(this._actorStateIndex[actorName].reachedKeyframes) || 0;
			
			if (!this._keyframeCache[actorName]) {
				this._keyframeCache[actorName] = {
					'from': {},
					'to': {}
				};
				
				this._actorStateIndex[actorName].reachedKeyframes = [];
			}
			
			// Flush half of the `_keyframeCache` to maintain the "from" dynamic states
			// when transitioning to the new keyframe segment
			if (latestKeyframeId !== lastRecordedKeyframe) {
				if (latestKeyframeId > lastRecordedKeyframe) {
					this._actorStateIndex[actorName].reachedKeyframes.push(latestKeyframeId);
					
					this._keyframeCache[actorName] = {
						'from': this._keyframeCache[actorName].to,
						'to': {}
					};	
				}
			}

			return this._calculateCurrentFrameProps(
				latestKeyframeProps, 
				nextKeyframeProps, 
				actorKeyframeIndex[latestKeyframeId], 
				actorKeyframeIndex[nextKeyframeId], 
				nextKeyframeProps.easing
			);
		},

		/**
		 * @hide
		 * Gets the current state of the queued-up Immediate Action.  Also updates the Immediate Actions queue if necessary.
		 * @param {Array} queuedActionsArr The queue of Immediate Actions to be applied.
		 * @returns {Object} An Object containing the current properties of the queued Immediate Action. 
		 */
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

		/**
		 * @hide
		 * Calculate an actor's properties for the current frame.
		 * @param {Object} fromState An object containing all of the properties that defined the keyframe to animate _from_.  This can be considered the "starting state."
		 * @param {Object} toState An object containing all of the properties that defined the keyframe to animate _to_.  This can be considered the "ending state."
		 * @param {Number} fromKeyframe The Kapi keyframe ID that corresponds to `fromState`.
		 * @param {Number} toKeyframe The Kapi keyframe ID that corresponds to `toState`.
		 * @param {String} easing The easing formula to use.  Kapi comes prepackaged with "linear," but Kapi be extended with more easing formulas.  If `easing` is not valid, this method defaults to `linear`.
		 * @param {Object} options Extra, non-necessary options to set.  They include:
		 *   @param {Number} currentFrame If present, `currentFrame` overrides the internally maintained '_currentFrame' property.
		 * @returns {Object}
		 */
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
				fromPropType,
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
						// If fromProp is dynamic, preprocess it (by invoking it)
						if (typeof fromProp === 'function') {
							fromProp = fromProp.call(fromState) || 0;
						} else {
							modifier = getModifier(fromProp);
							previousPropVal = this._getPreviousKeyframeId(this._actorStateIndex[fromStateId]);
							
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
						
						// Superfluous workaround for a meaningless and nonsensical JSLint error. ("Weird relation")
						fromPropType = typeof fromProp;
						
						if (!isKeyframeableProp(toProp) || fromPropType !== typeof toProp) {
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
		
		/**
		 * @hide
		 * Look up the ID of the last keyframe that was completed in the current animation loop.
		 * @param {Array} lookup The list of keyframes to check against.
		 * @returns {Number}    
		 */
		_getPreviousKeyframeId: function (lookup) {
			return this._getLatestKeyframeId(lookup) - 1;
		},

		/**
		 * @hide
		 * Lookup the ID of the most recent keyframe that was started, but not completed.
		 * @param {Array} lookup The list of keyframes to check against.
		 * @returns {Number} The index of the latest keyframe.  Returns `-1` if there are no keyframes remaining for `lookup` in the current loop.
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

		/**
		 * @hide
		 * Get the ID of the next keyframe that has not been started yet.
		 * @param {Array} lookup The list of keyframes to check against.
		 * @param {Number} latestKeyframeId The ID of the most recent keyframe to have started.  Find this with `_getLatestKeyframeId()`.
		 * @returns {Number}
		 */
		_getNextKeyframeId: function (lookup, latestKeyframeId) {
			return latestKeyframeId === lookup.length - 1 ? latestKeyframeId : latestKeyframeId + 1;
		},

		/**
		 * @hide
		 * Augment an actor object with properties that enable it to interact with Kapi.  See the documentation for `add()` for more details on the properties this method adds (`add()` is a public method that wraps `_keyframize()`.).
		 * @param {Object} actorObj The object to prep for Kapi use and add properties to.
		 * @returns {Object} The "decorated" version of `actorObj`. 
		 */
		_keyframize: function (actorObj) {
			var self = this;

			// Make really really sure the id is unique, if one is not provided
			if (typeof actorObj.id === 'undefined') {
				actorObj.id = actorObj.params.id || actorObj.params.name || generateUniqueName();
			}

			if (typeof this._actorStateIndex[actorObj.id] === 'undefined') {
				this._actorStateIndex[actorObj.id] = [];
				this._actorStateIndex[actorObj.id].queue = [];
				this._actorStateIndex[actorObj.id].reachedKeyframes = [];
			}
			
			this._actors[actorObj.id] = actorObj;
			this._liveCopies[actorObj.id] = {};
			this._layerIndex.push(actorObj.id);
			actorObj.params.layer = this._layerIndex.length - 1;

			/**
			 * Create a keyframe for an actor.
			 * @param {Number|String} keyframeId Where in the animation to place this keyframe.  Can either be the actual keyframe number, or a valid time format string ("_x_ms" or "_x_s").
			 * @param {Object} stateObj The properties of the keyframed state.  Any missing parameters on this keyframe will be inferred from other keyframes in the animation set for this actor.
			 * @returns {Object} The actor Object (for chaining).
			 */
			actorObj.keyframe = function keyframe (keyframeId, stateObj) {
				// Save a "safe" copy of the state object before modifying it - will be used later in this function.
				// This is done here to prevent the `_originalStates` property from being changed
				// by other code that references it.
				var orig,
					prop,
					digits;
				
				// If any number values were passed as strings, convert them to numbers.
				for (prop in stateObj) {
					if (stateObj.hasOwnProperty(prop)) {
						// Yeah it's ugly.  But it's fast and DRY.
						if (typeof stateObj[prop] === 'string' && stateObj[prop] === (digits = +(stateObj[prop].replace(/\D/gi, ''))).toString() ) {
							stateObj[prop] = digits;
						}
					}
				}
				
				orig = extend({}, stateObj);

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
				
				if (typeof self._originalStates[keyframeId] === 'undefined') {
					self._originalStates[keyframeId] = {};
				}

				// Create the keyframe state info for this object
				self._keyframes[keyframeId][actorObj.id] = stateObj;
				
				// Save a copy of the original `stateObj`.  This is used for updating keyframes after they are created.
				self._originalStates[keyframeId][actorObj.id] = orig;

				// Perform necessary maintenance upon all of the keyframes in the animation
				self._updateKeyframes(actorObj, keyframeId);
				
				// The `layer` property does not belong in the keyframe states, as it is part of the actor object itself
				// and can be changed at any time by other parts of the API.
				delete stateObj.layer;
				
				self._updateAnimationDuration();
				
				return this;
			};

			/**
			 * Creates an Immediate Action and adds it to the Immediate Actions queue.  This immediately starts applying a state change over time.
			 * @param {Number|String} duration The length of time to apply the change.  This can be either an amount of frames or a period of time, expressed in Kapi time syntax ("_x_ms" or "_x_s").  
			 * @param {Object} stateObj The state to animate the actor to.
			 * @returns {Object} The actor Object (for chaining).
			 */
			actorObj.to = function to (duration, stateObj) {
				var newestAction, 
					queue = self._actorStateIndex[actorObj.id].queue;

					queue.push({
						'duration': self._getRealKeyframe(duration),
						'state': stateObj
					});
				
				newestAction = last(queue);
				newestAction._internals = {};

				newestAction._internals.startTime = null;
				newestAction._internals.fromState = null;
				newestAction._internals.toState = null;
				newestAction._internals.pauseBuffer = null;
				newestAction._internals.pauseBufferUpdated = null;

				return this;
			};

			/**
			 * Cleanly removes `actorObj` from `keyframeId`, as well as all internal references to it.
			 * 
			 * An error is logged if `actorObj` does not exist at `keyframeId`.
			 * @param {Number|String} keyframeId The desired keyframe to remove `actorObj` from.
			 * @returns {Object} The actor Object (for chaining).
			 */
			actorObj.remove = function remove (keyframeId) {
				var i,
					keyframe,
					liveCopy,
					liveCopiesRemain,
					keyframeHasObjs = false;
				
				keyframeId = self._getRealKeyframe(keyframeId);
				
				if (self._keyframes[keyframeId] && self._keyframes[keyframeId][actorObj.id]) {
					
					delete self._keyframes[keyframeId][actorObj.id];
					delete self._originalStates[keyframeId][actorObj.id];
					
					// Check to see if there's any objects left in the keyframe.
					// If not, delete the keyframe.
					for (keyframe in self._keyframes[keyframeId]) {
						if (self._keyframes[keyframeId].hasOwnProperty(keyframe)) {
							keyframeHasObjs = true;
						}
					}
					
					// You can't delete keyframe zero!  Logically it must always exist!
					if (!keyframeHasObjs && keyframeId !== 0) {
						
						delete self._keyframes[keyframeId];
						delete self._originalStates[keyframeId];
						
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
					
					for (i = 0; i < self._actorStateIndex[actorObj.id].length; i++) {
						if (self._actorStateIndex[actorObj.id][i] === keyframeId) {
							self._actorStateIndex[actorObj.id].splice(i, 1);
							
							if (i <= self._actorStateIndex[actorObj.id].reachedKeyframes.length) {
								self._actorStateIndex[actorObj.id].reachedKeyframes.pop();
							}
							
							break;
						}
					}
					
					// If there are no more states in the animation for this actor, remove it from the index.
					// NOTE!  Commenting this out for now - it belongs in kapi.remove(), which does not yet exist.
					// kapi.remove will remove an actor from kapi entirely.
					/*if (self._actorStateIndex[actorObj.id].length === 0) {
						delete self._actorStateIndex[actorObj.id];
						
						// Also remove its layer from the index.
						for (i = 0; i < self._layerIndex.length; i++) {
							if (self._layerIndex[i] === actorObj.id) {
								self._layerIndex.splice(i, 1);
								break;
							}
						}
					}*/
					
					// Delete any liveCopies.
					if (keyframeId in self._liveCopies) {
						delete self._liveCopies[actorObj.id][keyframeId];
					}
					
					for (liveCopy in self._liveCopies[actorObj.id]) {
						if (self._liveCopies[actorObj.id].hasOwnProperty(liveCopy) && self._liveCopies[actorObj.id][liveCopy].copyOf === keyframeId) {
							actorObj.remove(liveCopy);
							liveCopiesRemain = true;
						}
					}
					
					if (!liveCopiesRemain) {
						delete self._liveCopies[actorObj.id];
					}
					
					self._updateAnimationDuration();
					
				} else {
					if (console && console.error) {
						if (self._keyframes[keyframeId]) {
							console.error('Trying to remove ' + actorObj.id + ' from keyframe ' + keyframeId + ', but ' + actorObj.id + ' does not exist at that keyframe.');
						} else {
							console.error('Trying to remove ' + actorObj.id + ' from keyframe ' + keyframeId + ', but keyframe ' + keyframeId + ' does not exist.');
						}
					}
				}
				
				return this;
			};

			/**
			 * Selectively modify the state properties of a keyframe.  Properties that are missing from a call to `updateKeyframe()` are left unmodified in the keyframe it is modifying.
			 * 
			 * Note!  You cannot update the properties of a keyframe that is a liveCopy.  You can only update the properties of the original keyframe that it is copying.
			 * @param {Number|String} keyframeId Where in the animation to place this keyframe.  Can either be the actual keyframe number, or a valid time format string ("_x_ms" or "_x_s").
			 * @param {Object} newProps The properties on the keyframe to be updated.
			 * @returns {Object} The actor Object (for chaining).
			 */
			actorObj.updateKeyframe = function updateKeyframe (keyframeId, newProps) {
				var keyframeToUpdate,
					originalState;
				
				keyframeId = self._getRealKeyframe(keyframeId);
				
				if (self._keyframes[keyframeId] && self._keyframes[keyframeId][actorObj.id]) {
					originalState = self._originalStates[keyframeId][actorObj.id];
					keyframeToUpdate = self._keyframes[keyframeId][actorObj.id];
					extend(originalState, newProps, true);
					actorObj.keyframe(keyframeId, originalState);
				} else {
					if (window.console && window.console.error) {
						if (!self._keyframes[keyframeId]) {
							console.error('Keyframe ' + keyframeId + ' does not exist.');
						} else {
							console.error('Keyframe ' + keyframeId + ' does not contain ' + actorObj.id);
						}
					}
				}
				
				return this;
			};
			
			/**
			 * Add a keyframe to the animation that is a copy of another keyframe.  If the copied keyframe is modified, so is the live copy.
			 * 
			 * This is handy for tweening back to the first keyframe state in the animation right before the loop starts over.
			 * @param {Number|String} keyframeId Where in the animation to place this keyframe.  Can either be the actual keyframe number, or a valid time format string ("_x_ms" or "_x_s").
			 * @param {Number|String} keyframeIdToCopy The keyframe identifier of the keyframe to copy..  Can either be the actual keyframe number, or a valid time format string ("_x_ms" or "_x_s").
			 * @returns {Object} The actor Object (for chaining).  
			 */
			actorObj.liveCopy = function liveCopy (keyframeId, keyframeIdToCopy) {
				
				keyframeId = self._getRealKeyframe(keyframeId);
				keyframeIdToCopy = self._getRealKeyframe(keyframeIdToCopy);
				
				if (self._keyframes[keyframeIdToCopy] && self._keyframes[keyframeIdToCopy][actorObj.id]) {
					// Maintain an index of liveCopies so that they are updated in `_updateKeyframes`.
					/*self._liveCopies[keyframeId] = {
						'actorId': actorObj.id,
						'copyOf': keyframeIdToCopy
					};*/
					
					self._liveCopies[actorObj.id][keyframeId] = {
						//'actorId': actorObj.id,
						'copyOf': keyframeIdToCopy
					};
					
					actorObj.keyframe(keyframeId, {});
				} else {
					if (window.console && window.console.error) {
						if (!self._keyframes[keyframeIdToCopy]) {
							console.error('Trying to make a liveCopy of ' + keyframeIdToCopy + ', but keyframe ' + keyframeIdToCopy + ' does not exist.');
						} else {
							console.error('Trying to make a liveCopy of ' + keyframeIdToCopy + ', but  ' + actorObj.id + ' does not exist at keyframe ' + keyframeId + '.');
						}
					}
				}
				
				return this;
			};
			
			/**
			 * Get the current state of the actor as it exists in Kapi.
			 * @returns {Object} An object containing all of the properties defining the actor.  Returns an empty object if the actor does not have a state when `getState` is called. 
			 */
			actorObj.getState = function getState () {
				return self._currentState[actorObj.id] || {};
			};
			
			/**
			 * Get the current value of a single state property from the actor.
			 * @param {String} prop The state property to retrieve.  If `prop` is "layer," this function will return the layer that this actor is currently in.
			 * @return {Anything} Whatever the current value for `prop` is. 
			 */
			actorObj.get = function get (prop) {
				return prop.toLowerCase() === 'layer' ? self._actors[actorObj.id].params.layer : actorObj.getState()[prop];
			};
			
			/**
			 * Change the layer that the actor is currently in.  Valid parameters are any layer index between 0 and the max number of layers (inclusive).  You can get the upper bound by calling `kapiInstance.getNumberOfLayers()`.
			 * @param {Number} layerId The layer to move the actor to.
			 * @returns {Object} The actor Object (for chaining).
			 */
			actorObj.moveToLayer = function moveToLayer (layerId) {
				var slicedId;
				
				if (typeof layerId !== 'number') {
					throw 'moveToLayer requires a number specifying which layer to move ' + this.id + ' to.';
				}
				
				// Drop any decimal if the user for some reason passed in a float
				layerId = parseInt(layerId, 10);
				
				if (layerId > -1 && layerId < self._layerIndex.length) {
					slicedId = self._layerIndex.splice(actorObj.params.layer, 1)[0];
					self._layerIndex.splice(layerId, 0, slicedId);
					self._updateLayers();
				} else {
					throw '"' + layerId + '" is out of bounds.  There are only ' + self._layerIndex.length + ' layers in the animation, ' + actorObj.id + ' can only be moved to layers 0-' + self._layerIndex.length;
				}
				
				return actorObj;
			};

			return actorObj;
		},
		
		/**
		 * @hide
		 * Calculates the "real" keyframe from `identifier`.  This means that you can speicify keyframes from things other than plain integers.  For example, you can calculate the real keyframe that will run at a certain period of time.
		 * 
		 * Valid formats:
		 * - x : keyframe integer
		 * - "xms" : keyframe at an amount of milliseconds
		 * - "xs" : keyframe at an amount of seconds
		 * @param {Number|String} identifier A value like the ones described above.
		 * @returns {Number} A valid keyframe identifier equivalent to `identifier`  
		 */
		_getRealKeyframe: function (identifier) {
			var quantifier, 
				unit, 
				calculatedKeyframe;

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

		/**
		 * @hide
		 * A maintenance function that calls a collection of other methods that, in turn, update and modify the animation keyframes.
		 * @param actor An actor Object.
		 * @param keyframeId The ID of the keyframe that a new state for `actor` is being placed. 
		 */
		_updateKeyframes: function (actor, keyframeId) {
			this._updateKeyframeIdsList(keyframeId);
			this._updateActorStateIndex(actor, {
				add: keyframeId
			});
			this._normalizeActorAcrossKeyframes(actor.id);
			this._updateLiveCopies();
			this._updateLayers();
		},

		/**
		 * @hide
		 * Create a unique entry for a keyframe ID in the internal `_keyframeIds` list and sort it.
		 * @param {Number} keyframeId The keyframe ID to add.
		 */
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

		/**
		 * @hide
		 * Validate a actor's state across all of the keyframe.  Essentially, this function fills in the gaps for keyframes that were missing parameters when created.  If a parameter is present for an actor in one keyframe, it is present in all of them.
		 * 
		 * Missing parameters are inferred from other keyframes.  Specifically, a keyframe missing parameter X will simply copy parameter X from the previous keyframe.  This "inheritance" will go all the way to the first keyframe, which inherited its parameters from when the actor was `kapi.add`ed.
		 * @param {Object} actorId The ID of the actor to normalize.
		 */
		_normalizeActorAcrossKeyframes: function (actorId) {
			var newStateId, 
				prevStateId, 
				newStateObj, 
				prevStateObj, 
				prop,
				stateCopy,
				i;

			for (i = 0; i < this._actorStateIndex[actorId].length; i++) {
				newStateId = this._actorStateIndex[actorId][i];
				
				if (typeof prevStateId === 'undefined') {
					stateCopy = extend({}, this._actors[actorId].params);
				} else {
					stateCopy = extend({}, prevStateObj);
				}
				
				newStateObj = extend(stateCopy, this._originalStates[newStateId][actorId], true);
				newStateObj.prototype = this._actors[actorId];
				
				this._keyframes[newStateId][actorId] = newStateObj;
				
				// Find any hex color strings and convert them to rgb(x, x, x) format.
				// More overhead for keyframe setup, but makes for faster frame processing later
				for (prop in newStateObj) {
					if (newStateObj.hasOwnProperty(prop)) {
						if (isColorString(newStateObj[prop])) {
							newStateObj[prop] = hexToRGBStr(newStateObj[prop]);
						}
					}
				}
				
				prevStateId = newStateId;
				prevStateObj = newStateObj;
			}
		},

		/**
		 * @hide
		 * Performs the actions specified in `params` in the internal state record for `actor`
		 * @param {Object} actor The actor to update the internal Kapi state of.
		 * @param {Object} params A description of the actions to perform on `actor`:
		 *   @param {Number} add The keyframe ID that `actor` is being placed into.
		 */
		_updateActorStateIndex: function (actor, params) {
			// TODO:  This method should be used for removing keyframes as well.  Currently this is being performed in `actorObj.remove`.
			var index = this._actorStateIndex[actor.id],
				stateAlreadyExists = false,
				i;

			if (typeof params.add !== 'undefined') {
				for (i = 0; i < index.length; i++) {
					if (index[i] === params.add) {
						stateAlreadyExists = true;
					}
				}
				
				if (!stateAlreadyExists) {
					index.push(params.add);
					sortArrayNumerically(index);
				}
			}
		},
		
		/**
		 * @hide
		 * Refresh the `layer` property on each actor.  Actors sync to the internal `_layerIndex` property.
		 */
		_updateLayers: function () {
			var i;
			
			for (i = 0; i < this._layerIndex.length; i++) {
				this._actors[this._layerIndex[i]].params.layer = i;
			}
		},

		/**
		 * @hide
		 * Synchronize any liveCopy keyframes with the keyframe they are liveCopying.  This is done by updating the keyframe reference on the liveCopy to the original.  
		 */
		_updateLiveCopies: function () {
			var liveCopyData,
				actorId,
				tempLiveCopy;
			
			for (actorId in this._liveCopies) {
				if (this._liveCopies.hasOwnProperty(actorId)) {
					tempLiveCopy = this._liveCopies[actorId];
					
					for (liveCopyData in tempLiveCopy) {
						if (tempLiveCopy.hasOwnProperty(liveCopyData)) {
							// OH MY GOD WTF IS WITH THIS LINE
							this._keyframes[liveCopyData][actorId] = this._keyframes[this._liveCopies[actorId][liveCopyData].copyOf][actorId];
							// IS THIS A JOKE
						}
					}
				}
			}
		},

		/**
		 * Recalculate and internally store the length of time that the animation will run for.
		 */
		_updateAnimationDuration: function () {
			// Calculate and update the number of seconds this animation will run for
			this._lastKeyframe = last(this._keyframeIds);
			this._animationDuration = 1000 * (this._lastKeyframe / this._params.fRate);
		}

	}.init(canvas, params, events);
}

/**
 * This object contains all of the tweens available to Kapi.  It is extendable - simply attach properties to this Object following the same format at `linear`.
 * 
 * This pattern was copied from Robert Penner, under BSD License (http://www.robertpenner.com/)
 * 
 * @param t The current time
 * @param b Start value
 * @param c Change in value (delta)
 * @param d Duration of the tween
 */
kapi.tween = {
	linear: function (t, b, c, d) {
		// no easing, no acceleration
		return c * t / d + b;
	}
};