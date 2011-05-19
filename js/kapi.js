/*global clearTimeout: true, setTimeout: true, window: true, console: true */

/**
 * Kapi - A keyframe API
 * v1.0.7
 * by Jeremy Kahn - jeremyckahn@gmail.com
 * Maintained at: https://github.com/jeremyckahn/kapi
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
 *   @param {Number} fps The frame rate that Kapi refreshes at.  60 is the limit of human perception, and 12 is choppy.  A happy medium is between 20 and 30.
 *   @param {Object} styles CSS styles to be set upon `canvas`.  They are to be supplied as an object.
 *   @param {Boolean} autoclear Controls whether or not the `canvas` is cleared out after each frame is rendered.  This is `true` by default.
 *   @param {Boolean} clearOnStop Determines whether to call `.clear()` automatically after `.stop()` is called.  This is `false` by default.
 *   @param {Boolean} clearOnComplete Determines whether to call `.clear()` automatically after an `.iterate()` or `repeat()` sequence completes. This is `false` by default. 
 * @param {Object} events An object containing events that can be set on this instance of Kapi.
 *   @param {Function} enterFrame This event fires each time a new frame is processed, before it is rendered.
 * 
 * @codestart
 * var myKapi = kapi(document.getElementsByTagName('canvas')[0], 
 *   // params
 *   {
 *     fps : 30,
 *     styles : {
 *       'height':  '300px',
 *       'width': '500px',
 *       'background': '#000'
 *     }
 *   },
 *   // events
 *   {
 *     enterFrame: function(){
 *       console.log(inst._currentFrame);
 *     }
 *   });
 * @codeend
 * 
 * @returns {Object} A `kapi` instance.
 */
function kapi(canvas, params, events) {

	var version = '1.0.7',
		defaults = {
			'fps': 20,
			'autoclear': true,
			'clearOnStop': false,
			'clearOnComplete': false
		},
		self = {},
		inst = {
			_params : {},
			_events : {},
			_keyframeIds : [],
			_reachedKeyframes : [],
			_layerIndex : [],
			_keyframes : {},
			_actors : {},
			_actorstateIndex : {},
			_keyframeCache : {},
			_originalStates : {},
			_liveCopies : {},
			_currentState : {},
			_puppets: {},
			_animationDuration : 0,
			_repsRemaining : -1,
			_lastKeyframe : undefined,
			_currentFrame : undefined,
			_loopStartTime : undefined,
			_startTime : undefined,
			_pausedAtTime : undefined,
			_isPaused : undefined,
			_isStopped : undefined,
			_loopLength : undefined,
			_loopPosition : undefined,
			_updateHandle : undefined,
			_repeatCompleteHandler : undefined,
			el: undefined,
			ctx: undefined,
			frameCount : 0
		},
		toStr = Object.prototype.toString,
		rModifierComponents = /(\+|\-|=|\*|\/)/g,
		calcKeyframe = {
			/**
			 * Calculates the keyframe based on a given amount of amount of *milliseconds*.  To be invoked with `Function.call`.
			 * @param {Number} num The amount of milliseconds to determine a keyframe by.
			 * @returns {Number} A floating-point equivalent of the keyframe equivalent of `num`.
			 */
			'ms': function (num) {
				return (num * inst._params.fps) / 1000;
			},
			/**
			 * Calculates the keyframe based on a given amount of amount of *seconds*.  To be invoked with `Function.call`.
			 * @param {Number} num The amount of seconds to determine a keyframe by.
			 * @returns {Number} A floating-point equivalent of the keyframe equivalent of `num`.
			 */

			's': function (num) {
				return num * inst._params.fps;
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
	 * Returns whether or not `arr` is an Array.
	 * @param {Array} arr The item to inspect.
	 * @returns {Boolean} Whether or not `arr` is an Array.
	 */
	function isArray (arr) {
		return (toStr.call(arr) === '[object Array]');
	}
	
	/**
	* Removes any whitespace from a string.
	* @param {String} str The string to remove whitespace from.
	* @returns {String}
	*/
	function removeWhitespace (str) {
		if (typeof str === 'string') {
			str = str.replace(/\s/g, '');
		}
		
		return str;
	}

	/**
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
	 * Applies an easing formula defined in `kapi.tween`.
	 * @param {String} easing The name of the easing formula to apply.
	 * @param {Number} previousKeyframe The ID of the keyframe to ease from.
	 * @param {Number} nextKeyframe The ID of the keyframe to ease to.
	 * @param {Number} currProp The the current value of the property that is being eased.
	 * @param {Number} nextProp The value to ease to.
	 * @param {Number} currentProp The current frame that animation is processing.
	 */
	function applyEase (easing, previousKeyframe, nextKeyframe, currProp, nextProp, currentFrame) {
		if ((currentFrame || inst._currentFrame) >= previousKeyframe) {
			if (typeof currentFrame === 'undefined') {
				return kapi.tween[easing](inst._currentFrame - previousKeyframe, currProp, nextProp - currProp, (nextKeyframe - previousKeyframe) || 1);
			} else {
				return kapi.tween[easing](currentFrame - previousKeyframe, currProp, nextProp - currProp, (nextKeyframe - previousKeyframe) || 1);
			}
		}
	}

	/** 
	 * Return the last element in an array.
	 * @param {Array} arr The array to get the last item from
	 * @returns {Any|undefined} If there are no items in the `arr`, this returns `undefined`.
	 */
	function last (arr) {
		return arr.length > 0 ? arr[arr.length - 1] : undefined;
	}

	/**
	 * Get a dimension value (height/width) and set it on a DOM element.  This gets the value from the element's CSS and applies it inline.  Useful for changing the `height` and `width` of the `canvas` element, because according to the HTML5 spec, as CSS styles are not the same as the inline dimension values unless specified.
	 * Note:  This is meant to be called with `Function.call()`.
	 * @param {String} dim The dimension to set (either "height" or "width")
	 */
	function setDimensionVal (dim) {
		this[dim] = this.style[dim].replace(/px/gi, '') || inst._params[dim];
	}

	/**
	 * Get the current UNIX time as an integer
	 * @returns {Number} An integer representing the current timestamp.
	 */
	function now () {
		return +new Date();
	}

	/**
	 * Create a unique number.
	 * @returns {Number} A really random number.
	 */
	function generateUniqueName () {
		return parseInt((Math.random().toString()).substr(2), 10) + now();
	}

	/**
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
	 * Determines if a string is a hexadecimal string (`#xxxxxx`)
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isHexString (str) {
		return typeof str === 'string' && ((/^#([0-9]|[a-f]){3}$/i).test(str) || (/^#([0-9]|[a-f]){6}$/i).test(str));
	}

	/**
	 * Determines if a string is an RGB string (`rgb(x,x,x)`)
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isRGBString (str) {
		return typeof str === 'string' && (/^rgb\(\d+\s*,\d+\s*,\d+\s*\)\s*$/i).test(str);
	}

	/**
	 * Determines if a string is either a hexadecimal or RGB string
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isColorString (str) {
		return isHexString(str) || isRGBString(str);
	}

	/**
	 * Convert a base-16 number to base-10.
	 * @param {Number|String} hex The value to convert
	 * @returns {Number} The base-10 equivalent of `hex`.
	 */
	function hexToDec (hex) {
		return parseInt(hex, 16);
	}

	/**
	 * Convert a hexadecimal string to an array with three items, one each for the red, blue, and green decimal values.
	 * @param {String} hex A hexadecimal string.
	 * @returns {Array} The converted Array of RGB values if `hex` is a valid string, or an Array of three 0's.
	 */
	function hexToRGBArr (hex) {
		if (typeof hex === 'string') {
			hex = hex.replace(/#/g, '');
			
			// If the string is a shorthand three digit hex notation, normalize it to the standard six digit notation
			if (hex.length === 3) {
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
			}
			return [hexToDec(hex.substr(0, 2)), hexToDec(hex.substr(2, 2)), hexToDec(hex.substr(4, 2))];
		} else {
			return [0, 0, 0];
		}
	}
	
	/**
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
	 * Determines if a string is keyframe modifier string (`+=x`, `-=x`, `*=x`, `/=x`).
	 * @param {String} str The string to test.
	 * @returns {Boolean}
	 */
	function isModifierString (str) {
		return (typeof str === 'string' && (/^\s*(\+|\-|\*|\/)\=/).test(str));
	}
	
	/**
	 * Determines if a keyframe property is a modifier string or a function.
	 * @param {Anything} prop The value to test
	 * @param {Boolean}
	 */
	function isDynamic (prop) {
		return (isModifierString(prop) || typeof prop === 'function');
	}
	
	/**
	 * Extract the modifier portion of a keyframe modifier string. This assumes that `str` is a valid modifier string ('+=x', '-=x', '*=x', '/=x')
	 * @param {String} str The string to extract the modifier from
	 * @returns {String} Either `+=x`, `-=x`, `*=x`, or `/=x`.
	 */
	function getModifier (str) {
		return str.match(/(\+|\-|\*|\/)\=/)[0];
	}

	/**
	 * Determines if a property can be keyframed.
	 * @param {Any} prop The property to evaluate.
	 * @returns {Boolean}
	 */
	function isKeyframeableProp (prop) {
		return (typeof prop === 'number' || isDynamic(prop) || isColorString(prop));
	}

	/**
	 * A kapi extension can be either a function or an object.  If it is an object, the extension's methods' `this` keyword will not be referencing the Kapi instance.  This method fixes that, allowing for namespaced extensions.
	 * @param {Object} target The object to add extensions to.
	 * @param {Object} extension The object whose methods' need context need to be fixed.
	 * @param {String} extensionName The name of the Kapi extention to contextualize.
	 */
	function _contextualizeExtensionMethods (target, extension, extensionName) {
		var _private,
			func;
			
		function attachScopedFunc (func, newName) {
			target[extensionName][newName] = function () {
				return _private[func].apply(target, arguments);
			};
		}

		_private = {};

		for (func in target[extensionName]) {
			if (target[extensionName].hasOwnProperty(func)) {
				var newName;

				newName = func.slice(1);
				_private[func] = target[extensionName][func];
				attachScopedFunc (func, newName);
				delete target[extensionName][func];
			}
		}
	}
	
	/**
	 * Applies and sets up any Kapi extensions that were provided.
	 * @{param} target The object to extend.  Likely either a Kapi or actor instance.
	 * @{param} source The oject containing the methods to add.  Likely either a Kapi or actor instance.
	 */
	function _applyExtensions (target, source) {
		var extension;
		
		extend(target, source);
		
		// Loop through all of the extensions that are Objects, and set up their scope so that the `this`
		// keyword refers to the Kapi instance
		for (extension in source) {
			if (source.hasOwnProperty(extension) && target.hasOwnProperty(extension)) {
				if (typeof target[extension] !== 'function') {
					_contextualizeExtensionMethods.call(target, target, target[extension], extension);
				}
			}
		}
	}

	/**
	 * Calculates the "real" keyframe from `identifier`.  This means that you can speicify keyframes from things other than plain integers.  For example, you can calculate the real keyframe that will run at a certain period of time.
	 * 
	 * Valid formats:
	 * - x : keyframe integer
	 * - "xms" : keyframe at an amount of milliseconds
	 * - "xs" : keyframe at an amount of seconds
	 * @param {Number|String} identifier A value like the ones described above.
	 * @returns {Number} A valid keyframe identifier equivalent to `identifier`  
	 */
	function _getRealKeyframe (identifier) {
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
	}
	
	/**
	 * Create a unique entry for a keyframe ID in the internal `_keyframeIds` list and sort it.
	 * @param {Number} keyframeId The keyframe ID to add.
	 */
	function _updateKeyframeIdsList (keyframeId) {
		var i;

		for (i = 0; i < inst._keyframeIds.length; i++) {
			if (inst._keyframeIds[i] === keyframeId) {
				return;
			}
		}

		inst._keyframeIds.push(keyframeId);
		sortArrayNumerically(inst._keyframeIds);
	}
	
	/**
	 * Performs the actions specified in `params` in the internal state record for `actor`
	 * @param {Object} actor The actor to update the internal Kapi state of.
	 * @param {Object} params A description of the actions to perform on `actor`:
	 *   @param {Number} add The keyframe ID that `actor` is being placed into.
	 */
	function _updateActorStateIndex (actor, params) {
		// TODO:  This method should be used for removing keyframes as well.  Currently this is being performed in `actorObj.remove`.
		var index = inst._actorstateIndex[actor.id],
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
	}
	
	/**
	 * Validate a actor's state across all of the keyframe.  Essentially, this function fills in the gaps for keyframes that were missing parameters when created.  If a parameter is present for an actor in one keyframe, it is present in all of them.
	 * 
	 * Missing parameters are inferred from other keyframes.  Specifically, a keyframe missing parameter X will simply copy parameter X from the previous keyframe.  This "inheritance" will go all the way to the first keyframe, which inherited its parameters from when the actor was `kapi.add`ed.
	 * @param {Object} actorId The ID of the actor to normalize.
	 */
	function _normalizeActorAcrossKeyframes (actorId) {
		var newStateId, 
			prevStateId, 
			newStateObj, 
			prevStateObj, 
			prop,
			stateCopy,
			tempString,
			prevProp,
			i;

		for (i = 0; i < inst._actorstateIndex[actorId].length; i++) {
			newStateId = inst._actorstateIndex[actorId][i];
			
			if (typeof prevStateId === 'undefined') {
				stateCopy = extend({}, inst._actors[actorId].params);
			} else {
				stateCopy = extend({}, prevStateObj);
			}
			
			delete stateCopy.data;
			newStateObj = extend(stateCopy, inst._originalStates[newStateId][actorId], true);
			newStateObj.prototype = inst._actors[actorId];
			
			inst._keyframes[newStateId][actorId] = newStateObj;
						
			for (prop in newStateObj) {
				if (newStateObj.hasOwnProperty(prop) && typeof newStateObj[prop] === 'string') {
					if (prevStateObj) {
						prevProp = prevStateObj[prop];
					}
					
					// Trim any whitespace and make a temporary string to test
					tempString = newStateObj[prop].replace(/\s/g, '');
					if (isColorString(tempString)) {
						// Find any hex color strings and convert them to rgb(x, x, x) format.
						// More overhead for keyframe setup, but makes for faster frame processing later
						newStateObj[prop] = hexToRGBStr(tempString);
						
						// Check to see if the property was dynamic in the previous keyframe, and if it was not given a new value in `newStateObj`.
						// If true, just give it "+=0" value, which does nothing relative to the current value.
						// It's basically a no-op.  What this does, is fill in "no-op" dynamic keyframes until
						// a non-dynamic value is provided for the property.
					} else if (prevStateObj 
								&& prevProp 
								&& isDynamic(prevProp)
								&& typeof inst._originalStates[newStateId][actorId][prop] === 'undefined') {
						newStateObj[prop] = '+=0';
					}		
				}
			}
			
			prevStateId = newStateId;
			prevStateObj = newStateObj;
		}
	}
	
	/**
	 * Synchronize any liveCopy keyframes with the keyframe they are liveCopying.  This is done by updating the keyframe reference on the liveCopy to the original.  
	 */
	function _updateLiveCopies () {
		var liveCopyData,
			actorId,
			tempLiveCopy;
		
		for (actorId in inst._liveCopies) {
			if (inst._liveCopies.hasOwnProperty(actorId)) {
				tempLiveCopy = inst._liveCopies[actorId];
				
				for (liveCopyData in tempLiveCopy) {
					if (tempLiveCopy.hasOwnProperty(liveCopyData)) {
						// OH MY GOD WTF IS WITH THIS LINE
						inst._keyframes[liveCopyData][actorId] = inst._keyframes[inst._liveCopies[actorId][liveCopyData].copyOf][actorId];
						// IS THIS A JOKE
					}
				}
			}
		}
	}
	
	/**
	 * Refresh the `layer` property on each actor.  Actors sync to the internal `_layerIndex` property.
	 */
	function _updateLayers () {
		var i;
		
		for (i = 0; i < inst._layerIndex.length; i++) {
			inst._actors[inst._layerIndex[i]].params.layer = i;
		}
	}
	
	/**
	 * A maintenance function that calls a collection of other methods that, in turn, update and modify the animation keyframes.
	 * @param actor An actor Object.
	 * @param keyframeId The ID of the keyframe that a new state for `actor` is being placed. 
	 */
	function _updateKeyframes (actor, keyframeId) {
		_updateKeyframeIdsList(keyframeId);
		_updateActorStateIndex(actor, {
			add: keyframeId
		});
		_normalizeActorAcrossKeyframes(actor.id);
		_updateLiveCopies();
		_updateLayers();
	}
	
	/**
	 * Recalculate and internally store the length of time that the animation will run for.
	 */
	function _updateAnimationDuration () {
		// Calculate and update the number of seconds this animation will run for
		inst._lastKeyframe = last(inst._keyframeIds);
		inst._animationDuration = 1000 * (inst._lastKeyframe / inst._params.fps);
	}
	
	/**
	 * Lookup the ID of the most recent keyframe that was started, but not completed.
	 * @param {Array} lookup The list of keyframes to check against.
	 * @returns {Number} The index of the latest keyframe.  Returns `-1` if there are no keyframes remaining for `lookup` in the current loop.
	 */
	function _getLatestKeyframeId (lookup) {
		var i;
		
		if (inst._currentFrame === 0) {
			return 0;
		}

		if (inst._currentFrame > lookup[lookup.length - 1]) {
			// There are no more keyframes left in the animation loop for this object
			return -1;
		}

		for (i = lookup.length - 1; i >= 0; i--) {
			if (lookup[i] < inst._currentFrame) {
				return i;
			}
		}

		return lookup.length - 1;
	}
	
	/**
	 * Look up the ID of the last keyframe that was completed in the current animation loop.
	 * @param {Array} lookup The list of keyframes to check against.
	 * @returns {Number}    
	 */
	/*function _getPreviousKeyframeId (lookup) {
		return _getLatestKeyframeId(lookup) - 1;
	}*/
	
	/**
	 * Get the ID of the next keyframe that has not been started yet.
	 * @param {Array} lookup The list of keyframes to check against.
	 * @param {Number} latestKeyframeId The ID of the most recent keyframe to have started.  Find this with `_getLatestKeyframeId()`.
	 * @returns {Number}
	 */
	function _getNextKeyframeId (lookup, latestKeyframeId) {
		return latestKeyframeId === lookup.length - 1 ? latestKeyframeId : latestKeyframeId + 1;
	}

	/**
	 * Augment an actor object with properties that enable it to interact with Kapi.  See the documentation for `add()` for more details on the properties this method adds (`add()` is a public method that wraps `_addActorMethods()`.).
	 * @param {Object} actorObj The object to prep for Kapi use and add properties to.
	 * @returns {Object} The "decorated" version of `actorObj`. 
	 */
	function _addActorMethods (actorObj) {
		/**
		 * Create a keyframe for an actor.
		 * @param {Number|String|Object} keyframeId Where in the animation to place this keyframe.  Can either be the actual keyframe number, or a valid time format string ("_x_ms" or "_x_s".
		 * @param {Object} stateObj The properties of the keyframed state.  Any missing parameters on this keyframe will be inferred from other keyframes in the animation set for this actor.  Individual properties can have tweening formulas applied to them and only them.  To do this, pass those properties as Object literals that contain one property.  That property's name must be the same as a valid `kapi.tween` formula.
		 * @returns {Object} The actor Object (for chaining).
		 *
		 * @codestart
		 * var demo = kapi(document.getElementById('myCanvas')),
		 *  circle1 = demo.add(circle, {
		 *    name : 'myCircle',
		 *      x : 50,
		 *      y : 50,
		 *      radius : 50,
		 *      color : '#0f0',
		 *      easing : 'easeInOutQuad'
		 *    });
		 * 
		 * circle1
		 *   .keyframe(0, {
		 *     x: 50,
		 *     y: 50
		 *   })
		 *   .keyframe('3s', {
		 *     x: {easeInSine: 450},
		 *     y: {easeOutSine: 250},
		 *     color: '#f0f'
		 *   }).liveCopy('5s', 0);
		 * @codeend
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
					// Yeah it's ugly.  But it's relatively fast and DRY.
					if (typeof stateObj[prop] === 'string' && stateObj[prop] === (digits = +(stateObj[prop].replace(rModifierComponents, ''))).toString() ) {
						stateObj[prop] = digits;
					}
				}
			}
			
			orig = extend({}, stateObj);
			orig._keyframeID = keyframeId;

			try {
				keyframeId = _getRealKeyframe(keyframeId);
			} catch (ex) {
				if (window.console && window.console.error) {
					console.error(ex);
				}
				return undefined;
			}
			
			if (keyframeId < 0) {
				throw 'Keyframe ' + keyframeId + ' is less than zero!';
			}
			
			// Create keyframe zero if it was not done so already
			if (keyframeId > 0 && typeof inst._keyframes['0'] === 'undefined') {
				inst._keyframes['0'] = {};
				inst._keyframeIds.unshift(0);
			}

			// If this keyframe does not already exist, create it
			if (typeof inst._keyframes[keyframeId] === 'undefined') {
				inst._keyframes[keyframeId] = {};
			}
			
			if (typeof inst._originalStates[keyframeId] === 'undefined') {
				inst._originalStates[keyframeId] = {};
			}

			// Create the keyframe state info for this object
			inst._keyframes[keyframeId][actorObj.id] = stateObj;
			
			// Save a copy of the original `stateObj`.  This is used for updating keyframes after they are created.
			inst._originalStates[keyframeId][actorObj.id] = orig;

			// Perform necessary maintenance upon all of the keyframes in the animation
			_updateKeyframes(actorObj, keyframeId);
			
			// The `layer` property does not belong in the keyframe states, as it is part of the actor object itself
			// and can be changed at any time by other parts of the API.
			delete stateObj.layer;
			
			_updateAnimationDuration();
			
			return this;
		};

		/**
		 * Creates an Immediate Action and adds it to the Immediate Actions queue.  This immediately starts applying a state change over time.
		 * @param {Number|String} duration The length of time to apply the change.  This can be either an amount of frames or a period of time, expressed in Kapi time syntax ("_x_ms" or "_x_s").
		 * @param {Object} stateObj The state to animate the actor to.
		 * @param {Object} events Event handlers to attach to this immediate action.  This paramter is optional.  In an event handler function, the `this` keyword refers to the actor object.  Available events:
		 *   - `start` {Function}: Fires when the Immediate Action starts.
		 *   - `complete` {Function}: Fires when the Immediate Action completes.
		 * @returns {Object} The actor Object (for chaining).
		 * 
	     * @codestart
	     * 
	     * var demo = kapi(document.getElementById('myCanvas')),
	     *  circle1 = demo.add(circle, {
	     *    name : 'myCircle',
	     *      x : 0,
	     *      y : 0,
	     *      radius : 50,
	     *      color : '#00ff00'
	     *    });
	     * 
	     * circle1.keyframe(0, { })
	     *   .to('2s', {
	     *      x: '+=100',
	     *      y: 50,
	     *      color: '#3f0000'
	     *    }, {
	     *      'start': function () {
	     *         console.log('Immediate action started!', this);
	     *       },
	     *       'complete': function () {
	     *         console.log('Immediate action completed!', this);
	     *       }
	     *   });
	     * @codeend
		 */
		actorObj.to = function to (duration, stateObj, events) {
			var newestAction, 
				queue = inst._actorstateIndex[actorObj.id].queue;

				queue.push({
					'duration': _getRealKeyframe(duration),
					'state': stateObj || {},
					'events': events || {}
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
		
		/*
		 * Removes any queued Immediate Actions that have not yet begun.  This does not cancel or affect the currently executing Immediate Action.
		 * @returns {Object} The actor Object (for chaining).
		 */
		actorObj.clearQueue = function clearQueue () {
			var queue = inst._actorstateIndex[actorObj.id].queue;
			queue.length = 1;
			
			return this;
		};
		
		/**
		 * Skips to the end of the currently executing Immediate Action.  The `complete` event is fired, if it was set.  The Immediate Action queue is not affected.
		 * @returns {Object} The actor Object (for chaining).
		 */
		actorObj.skipToEnd = function skipToEnd () {
			var queue = inst._actorstateIndex[actorObj.id].queue,
				currAction = queue[0];
				
			if (!queue.length) {
				return this;
			}
			
			currAction._internals.forceStop = true;
			return this;
		};
		
		/**
		 * Stops and ends the currently executing Immediate Action in its current state.  Note:  Internally, this method calls `actor.skipToEnd()`, so the functionality of that method applies here as well.
		 * @returns {Object} The actor Object (for chaining).
		 */
		actorObj.endCurrentAction = function endCurrentAction () {
			var queue = inst._actorstateIndex[actorObj.id].queue,
				currAction = queue[0];
				
			if (!queue.length) {
				return this;
			}
			
			currAction._internals.toState = this.getState();
			this.skipToEnd();
			
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
			
			keyframeId = _getRealKeyframe(keyframeId);
			
			if (inst._keyframes[keyframeId] && inst._keyframes[keyframeId][actorObj.id]) {
				
				delete inst._keyframes[keyframeId][actorObj.id];
				delete inst._originalStates[keyframeId][actorObj.id];
				
				// Check to see if there's any objects left in the keyframe.
				// If not, delete the keyframe.
				for (keyframe in inst._keyframes[keyframeId]) {
					if (inst._keyframes[keyframeId].hasOwnProperty(keyframe)) {
						keyframeHasObjs = true;
					}
				}
				
				// You can't delete keyframe zero!  Logically it must always exist!
				if (!keyframeHasObjs && keyframeId !== 0) {
					
					delete inst._keyframes[keyframeId];
					delete inst._originalStates[keyframeId];
					
					for (i = 0; i < inst._keyframeIds.length; i++) {
						if (inst._keyframeIds[i] === keyframeId) {
							inst._keyframeIds.splice(i, 1);
							break;
						}
					}
					
					for (i = 0; i < inst._reachedKeyframes.length; i++) {
						if (inst._reachedKeyframes[i] === keyframeId) {
							inst._reachedKeyframes.splice(i, 1);
							break;
						}
					}
				}
				
				for (i = 0; i < inst._actorstateIndex[actorObj.id].length; i++) {
					if (inst._actorstateIndex[actorObj.id][i] === keyframeId) {
						inst._actorstateIndex[actorObj.id].splice(i, 1);
						
						if (i <= inst._actorstateIndex[actorObj.id].reachedKeyframes.length) {
							inst._actorstateIndex[actorObj.id].reachedKeyframes.pop();
						}
						
						break;
					}
				}
				
				// Delete any liveCopies.
				if (inst._liveCopies[actorObj.id] && inst._liveCopies[actorObj.id].hasOwnProperty(keyframeId)) {
					delete inst._liveCopies[actorObj.id][keyframeId];
				}
				
				for (liveCopy in inst._liveCopies[actorObj.id]) {
					if (inst._liveCopies[actorObj.id].hasOwnProperty(liveCopy) && inst._liveCopies[actorObj.id][liveCopy].copyOf === keyframeId) {
						actorObj.remove(liveCopy);
						liveCopiesRemain = true;
					}
				}
				
				if (!liveCopiesRemain) {
					delete inst._liveCopies[actorObj.id];
				}
				
				_updateAnimationDuration();
				
			} else {
				if (console && console.error) {
					if (inst._keyframes[keyframeId]) {
						console.error('Trying to remove ' + actorObj.id + ' from keyframe ' + keyframeId + ', but ' + actorObj.id + ' does not exist at that keyframe.');
					} else {
						console.error('Trying to remove ' + actorObj.id + ' from keyframe ' + keyframeId + ', but keyframe ' + keyframeId + ' does not exist.');
					}
				}
			}
			
			return this;
		};

		/**
		 * Removes the actor from all keyframes.
		 * @returns {Object} The actor Object (for chaining).
		 */
		actorObj.removeAll = function removeAll () {
			var id = actorObj.id;
			
			while (inst._actorstateIndex[id] && inst._actorstateIndex[id].length) {
				inst._actors[id].remove(last(inst._actorstateIndex[id]));
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
				originalState,
				originalKeyframeId;
			
			originalKeyframeId = keyframeId;
			keyframeId = _getRealKeyframe(keyframeId);
			
			if (inst._keyframes[keyframeId] && inst._keyframes[keyframeId][actorObj.id]) {
				originalState = inst._originalStates[keyframeId][actorObj.id];
				keyframeToUpdate = inst._keyframes[keyframeId][actorObj.id];
				extend(originalState, newProps, true);
				actorObj.keyframe(originalKeyframeId, originalState);
			} else {
				if (window.console && window.console.error) {
					if (!inst._keyframes[keyframeId]) {
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
			
			var originalKeyframeId,
				originalKeyframeIdToCopy;
			
			
			originalKeyframeId = keyframeId;
			originalKeyframeIdToCopy = keyframeIdToCopy;
			keyframeId = _getRealKeyframe(keyframeId);
			keyframeIdToCopy = _getRealKeyframe(keyframeIdToCopy);
			
			if (inst._keyframes[keyframeIdToCopy] && inst._keyframes[keyframeIdToCopy][actorObj.id]) {
				
				inst._liveCopies[actorObj.id][keyframeId] = {
					'copyOf': keyframeIdToCopy,
					'originalKeyframeId': originalKeyframeId,
					'originalKeyframeIdCopyOf': originalKeyframeIdToCopy
				};
				
				actorObj.keyframe(keyframeId, {});
			} else {
				if (window.console && window.console.error) {
					if (!inst._keyframes[keyframeIdToCopy]) {
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
			return inst._currentState[actorObj.id] || {};
		};
		
		/**
		 * Get the current value of a single state property from the actor.
		 * @param {String} prop The state property to retrieve.  If `prop` is "layer," this function will return the layer that this actor is currently in.
		 * @return {Anything} Whatever the current value for `prop` is. 
		 */
		actorObj.get = function get (prop) {
			return prop.toLowerCase() === 'layer' ? inst._actors[actorObj.id].params.layer : actorObj.getState()[prop];
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
			
			if (layerId > -1 && layerId < inst._layerIndex.length) {
				slicedId = inst._layerIndex.splice(actorObj.params.layer, 1)[0];
				inst._layerIndex.splice(layerId, 0, slicedId);
				_updateLayers();
			} else {
				throw '"' + layerId + '" is out of bounds.  There are only ' + inst._layerIndex.length + ' layers in the animation, ' + actorObj.id + ' can only be moved to layers 0-' + inst._layerIndex.length;
			}
			
			return actorObj;
		};

		/**
		 * Store and retrieves arbitrary data on an actor.  This data can be anything, in any format.
		 * @param {Anything} newData The data to store on an actor.
		 * @returns {Anything} Whatever data is currently stored on an actor.
		 */
		actorObj.data = function data (newData) {
			if (newData) {
				actorObj.params.data = newData;
			}
			
			return actorObj.params.data;
		};

		// actorObj maintains a reference to the kapi instance.
		actorObj.kapi = self;
		
		_applyExtensions(actorObj, kapi.actorFn);

		return actorObj;
	}

	/**
	 * Invokes all of the Kapi event handlers for a specified event.  Handlers are invoked in the order they were attached.
	 * 
	 * @param {String} eventName The name of the event to fire the handlers for.
	 */
	function _fireEvent (eventName) {
		var i;
		
		if (typeof eventName === 'string' && inst._events[eventName]) {
			for (i = 0; i < inst._events[eventName].length; i++) {
				inst._events[eventName][i].call(inst);
			}
		}
	}

	/**
	 * Determines the resultant value of a dynamic actor property, despite the presence of keyframe cache data (which is normally what is used to quickly determine such a value).  This is slow, so it should only be used when cache data is not available (such as after calling `gotoKeyframe()`).
	 * @param {String} actorName The name of the actor to check against.
	 * @param {String} prop The name of the dynamic property.
	 * @returns {Any} The value that would normally be reached by the normal execution logic if the cache was available.
	 */
	function _calculateUncachedProperty (actorName, prop) {
		var latestKeyframeId,
			stateIndex,
			actorPropVal,
			dynamicStateProps = [],
			currentVal,
			dynamicProp,
			modifier,
			i;

		latestKeyframeId = _getLatestKeyframeId(inst._actorstateIndex[actorName]);
		stateIndex = inst._actorstateIndex[actorName];
		
		// Loop backwards through the actor's state's values for `prop` until the beginning is reached,
		// or a static property is found.
		for (i = latestKeyframeId; i >= 0; i--) {
			actorPropVal = inst._keyframes[stateIndex[i]][actorName][prop];
			dynamicStateProps.unshift(actorPropVal);

			// If we are looking at a static property, quit out of the loop.
			// By setting `i` to `-2` we know that the last property added to the `dynamicStateProps` array was static.
			// Otherwise, `i` would just go to `-1` and there would be no leading static property.
			if (!isDynamic(actorPropVal)) {
				i = -2;
			}
		}

		if (i > -2) {
			// A static property was never found.  So, use the actor's initial value for the property as the base.
			dynamicStateProps.unshift(inst._actors[actorName].params[prop]);
		}
		
		// Get the "base" value to modify
		currentVal = dynamicStateProps.shift();
		
		// Loop through all the dynamics that were collected in the loop above and apply them.
		while (dynamicStateProps.length) {
			dynamicProp = dynamicStateProps.shift();
			
			if (typeof dynamicProp === 'function') {
				// Yes, this overwrites the `currentVal`.  
				// But that's ok, because that's what the natural update cycle would do as well.
				// Note:  All property functions are being called in the context of the `latestKeyframeId` keyframe,
				// but that really shouldn't make a difference.  It's faster to do it this way.
				currentVal = dynamicProp.call( inst._keyframes[stateIndex[latestKeyframeId]][actorName] ) || 0;
			} else {
				modifier = getModifier(dynamicProp);
				
				// Convert the value into a number and perform the value modification
				currentVal = modifiers[modifier](currentVal, +dynamicProp.replace(rModifierComponents, ''));
			}
		}
		
		return currentVal;
	}
	
	/**
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
	function _calculateCurrentFrameProps (fromState, toState, fromKeyframe, toKeyframe, easing, options) {
		// Magic.
		var i, 
			keyProp, 
			fromProp, 
			toProp, 
			isColor,
			fromStateId,
			toStateId,
			modifier,
			fromPropType,
			easeProp,
			currentFrameProps = {};
		
		easing = kapi.tween[easing] ? easing : 'linear';
		options = options || {};

		for (keyProp in fromState) {

			if (fromState.hasOwnProperty(keyProp)) {
				fromProp = fromState[keyProp];
				fromStateId = fromState.prototype.id;
				
				// Extract the property from the object if the "from" property has a custon easing
				if (typeof fromProp === 'object' && keyProp !== 'prototype') {
					for (easeProp in fromProp) {
						if (fromProp.hasOwnProperty(easeProp)) {
							// Do not apply custom eases from the "from" property.  Only the "to" property
							fromProp = fromProp[easeProp];
							break;
						}
					}
				}

				// If the property value was cached, use the cached value
				if (typeof inst._keyframeCache[fromStateId].from[keyProp] !== 'undefined') {
					fromProp = inst._keyframeCache[fromStateId].from[keyProp];
				} else if (isDynamic(fromProp)) {
					fromProp = _calculateUncachedProperty(fromState.prototype.id, keyProp);
					
					// Update the cache
					inst._keyframeCache[fromStateId].from[keyProp] = fromProp;
				}
				
				if (isKeyframeableProp(fromProp)) {
					isColor = false;
					toProp = toState[keyProp];
					toStateId = toState.prototype.id;
					
					// Check to see if the "to" property has a custom easing and apply it
					if (typeof toProp === 'object' && keyProp !== 'prototype') {
						for (easeProp in toProp) {
							if (toProp.hasOwnProperty(easeProp)) {
								easing = kapi.tween[easeProp] ? easeProp : 'linear';
								toProp = toProp[easeProp];
								break;
							}
						}
					}
					
					if (typeof inst._keyframeCache[toStateId].to[keyProp] !== 'undefined') {
						toProp = inst._keyframeCache[toStateId].to[keyProp];
					} else if (isDynamic(toProp)) {
						if (typeof toProp === 'function') {
							toProp = toProp.call(toState) || 0;
						} else {
							modifier = getModifier(toProp);
							toProp = modifiers[modifier](fromProp, +toProp.replace(rModifierComponents, ''));
						}
						
						inst._keyframeCache[toStateId].to[keyProp] = toProp;
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
	}
	
	/**
	 * Apply the current keyframe state and any other state modifiers (such as Immediate Actions like `actor.to()`) to an actor.
	 * @param {String} actorName The identifier string corresponding the desired actor object.
	 * @returns {Object} The current state properties of `actorName`.  
	 */
	function _getActorState (actorName) {

		var actorKeyframeIndex = inst._actorstateIndex[actorName],
			latestKeyframeId = _getLatestKeyframeId(actorKeyframeIndex),
			nextKeyframeId, 
			latestKeyframeProps, 
			nextKeyframeProps,
			lastRecordedKeyframe;

		// Do a check to see if any more keyframes remain in the animation loop for this actor
		if (latestKeyframeId === -1) {
			return null;
		}

		nextKeyframeId = _getNextKeyframeId(actorKeyframeIndex, latestKeyframeId);
		latestKeyframeProps = inst._keyframes[actorKeyframeIndex[latestKeyframeId]][actorName];
		nextKeyframeProps = inst._keyframes[actorKeyframeIndex[nextKeyframeId]][actorName];

		// If we are on or past the last keyframe
		if (latestKeyframeId === nextKeyframeId  && inst._lastKeyframe > 0) {
			return null;
		}
		
		// Manage the actor cache
		lastRecordedKeyframe = last(inst._actorstateIndex[actorName].reachedKeyframes) || 0;
		
		if (!inst._keyframeCache[actorName]) {
			inst._keyframeCache[actorName] = {
				'from': {},
				'to': {}
			};
			
			inst._actorstateIndex[actorName].reachedKeyframes = [];
		}
		
		// Are we transitioning to a new keyframe segment for the actor?
		if (latestKeyframeId !== lastRecordedKeyframe) {
			// We are!
			
			// Flush half of the `_keyframeCache` to maintain the "from" dynamic states
			if (latestKeyframeId > lastRecordedKeyframe) {
				inst._actorstateIndex[actorName].reachedKeyframes.push(latestKeyframeId);
				
				inst._keyframeCache[actorName] = {
					'from': inst._keyframeCache[actorName].to,
					'to': {}
				};	
			}
		}

		return _calculateCurrentFrameProps(
			latestKeyframeProps, 
			nextKeyframeProps, 
			actorKeyframeIndex[latestKeyframeId], 
			actorKeyframeIndex[nextKeyframeId], 
			nextKeyframeProps.easing
		);
	}
	
	/**
	 * Gets the current state of the queued-up Immediate Action.  Also updates the Immediate Actions queue if necessary.
	 * @param {Array} queuedActionsArr The queue of Immediate Actions to be applied.
	 * @returns {Object} An Object containing the current properties of the queued Immediate Action. 
	 */
	function _getQueuedActionState (queuedActionsArr, actorName) {
		var currTime = now(),
			queuedAction = queuedActionsArr[0],
			internals = queuedAction._internals,
			completeHandler;

		if (internals.startTime === null) {
			internals.startTime = currTime;
		}
		
		if (!internals.pauseBufferUpdated) {
			internals.pauseBufferUpdated = currTime;
		}
		
		// Correct for any animation pauses during the life of the action
		if (internals.pauseBufferUpdated < inst._pausedAtTime) {
			internals.pauseBuffer += (currTime - inst._pausedAtTime);
			internals.pauseBufferUpdated = currTime;
		}

		if (internals.toState === null) {
			internals.toState = {};
			extend(internals.toState, internals.fromState);
			extend(internals.toState, queuedAction.state, true);
		}
		
		// If this is true, the user called `actor.endCurrentAction()`
		if (internals.forceStop) {
			internals.currFrame = queuedAction.duration + 1;
		} else {
			internals.currFrame = ((currTime - (internals.startTime + internals.pauseBuffer)) / 1000) * inst._params.fps;
		}
			

		if (internals.currFrame > queuedAction.duration) {
			completeHandler = queuedAction.events.complete;
			
			if (typeof completeHandler === 'function') {
				completeHandler.call(inst._actors[actorName]);
			}
			
			queuedActionsArr.shift();
		}
		
		return _calculateCurrentFrameProps(
			internals.fromState, 
			internals.toState, 
			0, 
			+queuedAction.duration, 
			(queuedAction.easing || internals.fromState.easing), 
			{
				currentFrame: internals.currFrame
			}
		);
	}
	
	function _callMethodOnAllPuppets (methodName, args) {
		var puppet;
		
		for (puppet in inst._puppets) {
			if (inst._puppets.hasOwnProperty(puppet)) {
				inst._puppets[puppet][methodName].apply(inst._puppets[puppet], args);
			}
		}
	}
	
	/**
	 * Update the state properties for the all of the actors in the animation.
	 * @param {Number} currentFrame The deisred frame to process.
	 */
	function _updateActors (currentFrame) {
		// Here be dragons.
		var actorName,
			currentFrameStateProperties,
			adjustedProperties,
			objActionQueue,
			objActionEvents,
			oldQueueLength,
			keyframeToModify,
			currentAction,
			i;

		for (i = 0; i < inst._layerIndex.length; i++) {				
			actorName = inst._layerIndex[i];
			
			// The current object may have a first keyframe greater than 0.
			// If so, we don't want to calculate or draw it until we have
			// reached this object's first keyframe
			if (typeof inst._actorstateIndex[actorName][0] !== 'undefined' && currentFrame >= inst._actorstateIndex[actorName][0]) {
				
				currentFrameStateProperties = _getActorState(actorName);
				
				// If there are remaining keyframes for this object, draw it.
				if (currentFrameStateProperties !== null) {
					objActionQueue = inst._actorstateIndex[actorName].queue;
					
					// If there is a queued action, apply it to the current frame
					if ((oldQueueLength = objActionQueue.length) > 0) {
						currentAction = objActionQueue[0];
						objActionEvents = currentAction.events;
						
						if (typeof objActionEvents.start === 'function') {
							objActionEvents.start.call(inst._actors[actorName]);
							delete objActionEvents.start;
						}
						
						if (currentAction._internals.fromState === null) {
							currentAction._internals.fromState = currentFrameStateProperties;
						}
						
						adjustedProperties = _getQueuedActionState(objActionQueue, actorName);
						extend(currentFrameStateProperties, adjustedProperties, true);
						
						// If an immediate action finished running and was removed from the queue
						if (oldQueueLength !== objActionQueue.length) {
							// Save the modified state to the most recent keyframe for this object
							keyframeToModify = _getLatestKeyframeId(inst._actorstateIndex[actorName]);
							inst._keyframes[ inst._keyframeIds[keyframeToModify] ][actorName] = currentFrameStateProperties;
						}
					}

					currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, inst.ctx, self, currentFrameStateProperties.prototype);
				}
			}
			inst._currentState[actorName] = currentFrameStateProperties;
		}
	}
	
	/**
	 *  Updates the internal Kapi properties to reflect the current state - which is dependant on the current time.  `_updateState` manages all of the high-level frame logic such as determining the current keyframe, starting over the animation loop if needed, clearing the canvas and managing the keyframe cache.
	 *  
	 *  This function calls itself repeatedly at the rate defined by the `fps` property.  `fps` was provided when the `kapi()` constructor was orignally called.
	 * 
	 *  You probably don't want to modify this unless you really know what you're doing.
	 * 
	 * @param {Boolean} frameWasCleared If this Kapi instance is a puppet, it needs to know if the frame was cleared from the master.  That information is passed in this boolean.
	 * @param {Boolean} masterAutoclear If this Kapi instance is a puppet, it needs to know the master's value for `autoclear`.  That information is passed in this boolean.
	 *
	 *  @return {Number} The setTimeout identifier for the timer callback.
	 */
	function _updateState (frameWasCleared, masterAutoclear) {
		// Abandon all hope, ye who enter here.
		var currTime,
			reachedKeyframeLastIndex, 
			prevKeyframe;
			
		currTime = now();

		// Calculate how long this iteration of the loop has been running for
		inst._loopLength = currTime - inst._loopStartTime;
		
		// Check to see if the loop is starting over.
		if ( (inst._loopLength > inst._animationDuration) && inst._reachedKeyframes.length === inst._keyframeIds.length ) {
			// It is!
			
			_fireEvent('loopComplete');

			// Reset the loop start time relative to when the animation began,
			// not to when the final keyframe last completed
			inst._loopStartTime = inst._startTime + parseInt((currTime - inst._startTime) / (inst._animationDuration || 1), 10) * inst._animationDuration;
			inst._loopLength -= inst._animationDuration || inst._loopLength;
			inst._reachedKeyframes = [];
			
			// Clear out the dynamic keyframe cache
			inst._keyframeCache = {};
			
			if (inst._repsRemaining > -1) {
				inst._repsRemaining--;
				
				if (inst._repsRemaining === 0) {
					self.stop();
					
					// Sets the current frame to the final frame in the animation, clears and redraws.
					inst._currentFrame = inst._lastKeyframe;

					if (inst._params.clearOnComplete === true) {
						self.clear();
					}

					if (typeof inst._repeatCompleteHandler === 'function') {
						inst._repeatCompleteHandler.call(inst);
						inst._repeatCompleteHandler = undefined;
					}
					// Allow the animation to run indefinitely if `.play()` is called later.
					inst._repsRemaining = -1;
					return false;
				}
			}
			
			_fireEvent('loopStart');
		}
		
		// If this is a puppet Kapi, and it is not playing, return.
		// This code is down here, after the loop "start over" check, 
		// so that the `loopComplete` event can fire before the loop
		// actually starts over.
		if (inst._params.isPuppet && !self.isPlaying()) {
			return;
		}

		// Determine where we are in the loop
		if (inst._animationDuration) {
			inst._loopPosition = inst._loopLength / inst._animationDuration;
		} else {
			inst._loopPosition = 0;
		}
		
		// Calculate the current frame of the loop
		inst._currentFrame = parseInt(inst._loopPosition * inst._lastKeyframe, 10);
		
		prevKeyframe = _getLatestKeyframeId(inst._keyframeIds);
		prevKeyframe = prevKeyframe === -1 ? inst._lastKeyframe : inst._keyframeIds[prevKeyframe];
		
		// Maintain a record of keyframes that have been run for this loop iteration
		if (prevKeyframe > (last(inst._reachedKeyframes) || 0)) {
			inst._reachedKeyframes.push(prevKeyframe);
		}
		
		reachedKeyframeLastIndex = inst._reachedKeyframes.length ? inst._reachedKeyframes.length - 1 : 0;

		// If a keyframe was skipped, set inst._currentFrame to the first skipped keyframe
		if (inst._reachedKeyframes[reachedKeyframeLastIndex] !== inst._keyframeIds[reachedKeyframeLastIndex] ) {
			inst._currentFrame = inst._reachedKeyframes[reachedKeyframeLastIndex] = inst._keyframeIds[reachedKeyframeLastIndex];
		}
		
		
		// Only update the canvas if _currentFrame has not gone past the _lastKeyframe
		if (inst._currentFrame <= inst._lastKeyframe) {
			// Clear out the canvas
			if (inst.autoclear === true 
				// This is fixes an edge case issue with puppets.
				// It's kind of expensive, but it usually won't run too often.
				|| (inst._params.isPuppet && !frameWasCleared && masterAutoclear)) {
				self.clear();
				frameWasCleared = true;
			}
			
			_fireEvent('enterFrame');
			_updateActors(inst._currentFrame);
			
		} else if (inst._params.isPuppet){

			// If the last keyframe has been passed, and this Kapi is a puppet kapi,
			// set the current frame to equal the last keyframe and draw anyways.
			// This prevents any gaps or flashes in puppet Kapi loops.
			inst._currentFrame = inst._lastKeyframe;
			_updateActors(inst._currentFrame);
		}
		
		_callMethodOnAllPuppets('updateState', [frameWasCleared, inst.autoclear]);
		
		return true;
	}
	
	function _scheduleUpdate () {
		inst.frameCount++;
		inst._updateHandle = setTimeout(function () {
			if (_updateState()) {
				_scheduleUpdate();
			}
		}, 1000 / inst._params.fps);

		return inst._updateHandle;
	}
	
	self = {
		/**
		 * Called immediately when `kapi()` is invoked, there is no need for the user to invoke it (`init` essentially acts as the Kapi constructor).  Sets up some properties that are used internally, and also sets up the `canvas` element that it acts upon.
		 * 
		 * Not meant to be used directly - it is called automatically by the `kapi` constructor.  The parameters are identical, please see the constructor for use info. 
		 * @returns {Object} A `kapi` object.
		 */
		init: function (canvas, params, events) {
			var style, 
				eventName,
				hook;

			params = params || {};
			events = events || {};
			
			// Fill in any missing parameters
			extend(params, defaults);
			inst._params = params;			
			inst.autoclear = !!inst._params.autoclear;
			
			// Save a reference to original canvas object
			inst._params.canvas = canvas;
			inst.el = canvas;
			inst.ctx = canvas.getContext('2d');
			
			// Bind any event passed to the constructor
			for (eventName in events) {
				if (events.hasOwnProperty(eventName)) {
					this.bind(eventName, events[eventName]);
				}
			}

			// Apply CSS styles specified in `params.styles` to `canvas`.
			for (style in inst._params.styles) {
				if (inst._params.styles.hasOwnProperty(style)) {

					// Make the style value a lowercase string
					inst._params.styles[style] = (inst._params.styles[style].toString()).toLowerCase();

					// These styles all require a trailing "px"
					if (style === 'height'
						|| style === 'width'
						|| style === 'top'
						|| style === 'left') {
						
						// If the user forgot to supply the aforemontioned "px", kindly add it for them.
						if (!inst._params.styles[style].match(/px/)) {
							inst._params.styles[style] = inst._params.styles[style] + 'px';
						}
					}
					
					inst.el.style[style] = removeWhitespace(inst._params.styles[style]);
				}
			}
			
			if (inst._params.isPuppet) {
				// Expose some methods publicly that will be needed by puppets
				this.updateState = _updateState;
				this.getRealKeyframe = _getRealKeyframe;
			}

			// The height and width of the canvas draw area do not sync
			// up with the CSS height/width values, so set those manually here
			if (inst._params.styles) {
				if (inst._params.styles.height) {
					setDimensionVal.call(inst.el, 'height');
				}
				if (inst._params.styles.width) {
					setDimensionVal.call(inst.el, 'width');
				}
			}
			
			// Attach all extension methods
			_applyExtensions(self, kapi.fn);
			
			// `call` all of the init hooks
			for (hook in kapi.hook.init) {
				if (kapi.hook.init.hasOwnProperty(hook)) {
					kapi.hook.init[hook].call(this);
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
		 * Returns the context of the canvas that Kapi is controlling.
		 * @returns {CanvasObject} An HTML5 canvas context.
		 */
		getContext: function () {
			return inst.ctx;
		},

		/**
		 * Determines whether or not the animation is running
		 * @returns {Boolean}
		 */
		isPlaying: function () {
			return (inst._isStopped === false && inst._isPaused === false);
		},

		/**
		 * Starts the animation if it was not running before, or resumes the animation if it was not running previously.
		 * @returns {Kapi} The Kapi instance.
		 */
		//play: function (params) {
		play: function (playPuppets) {
			var pauseDuration,
				currTime = now();

			if (this.isPlaying()) {
				return this;
			}

			inst._isStopped = inst._isPaused = false;

			if (!inst._startTime) {
				inst._startTime = currTime;
			}

			// If the animation was previously playing but was then stopped,
			// adjust for the time that the animation was not runnning.
			if (inst._loopStartTime) {
				pauseDuration = currTime - inst._pausedAtTime;
				inst._loopStartTime += pauseDuration;

				// _startTime needs to be adjusted so that the loop doesn't
				// start somewhere other than the beginning in update()
				inst._startTime += pauseDuration;
			} else {
				inst._loopStartTime = currTime;
				_updateAnimationDuration();
				_fireEvent('loopStart');
				
				// The loop is starting from the beginning, so set `_currentFrame` to 0
				inst._currentFrame = 0;
			}

			if (!inst._params.isPuppet) {
				_scheduleUpdate();
			}
			
			if (playPuppets) {
				_callMethodOnAllPuppets('play');
			}
			
			_fireEvent('onPlay');
			
			return this;
		},

		/**
		 * Pause the animation.  Resuming from the paused state does not start the animation from the beginning, the state of the animation is maintained.
		 * @returns {Kapi} The Kapi instance.
		 */
		pause: function (pausePuppets) {
			clearTimeout(inst._updateHandle);
			inst._pausedAtTime = now();
			inst._isPaused = true;
			
			if (pausePuppets) {
				_callMethodOnAllPuppets('pause');
			}
			
			_fireEvent('onPause');
			
			return this;
		},

		/**
		 * Stops the animation.  When the animation is started again with `play()`, it starts from the beginning of the loop.  Note:  The canvas will be cleared out automatically for you if the `clearOnStop` option is set to `true`.  This option is set to `false` by default.

		 * @returns {Kapi} The Kapi instance.
		 */
		stop: function (stopPuppets) {
			var obj;
			
			clearTimeout(inst._updateHandle);
			delete inst._loopStartTime;
			delete inst._startTime;
			delete inst._pausedAtTime;
			inst._isStopped = true;
			
			// Allow the animation to run indefinitely if `.play()` is called later.
			inst._repsRemaining = -1;

			// Flush the keyframe cache
			inst._keyframeCache = {};
			
			// Reset any info stored in `_actorStateIndex`
			for (obj in inst._actorstateIndex) {
				if (inst._actorstateIndex.hasOwnProperty(obj)) {
					inst._actorstateIndex[obj].queue = [];
					inst._actorstateIndex[obj].reachedKeyframes = [];
				}
			}
			
			if (inst._params.clearOnStop === true) {
				self.clear();
			}
			
			if (stopPuppets) {
				_callMethodOnAllPuppets('stop');
			}
			
			_fireEvent('onStop');
			
			return this;
		},
		
		/**
		 * Clears out the canvas and sets it to its default color.
		 * @returns {Object} The Kapi instance
		 */
		clear: function () {
			inst.ctx.clearRect(0, 0, inst.el.width, inst.el.height);
			
			return this;
		},

		/**
		 * Forces a redraw of the current actors' states.  Handy if used in tandem with `.clear()`.
		 * @returns {Object} The Kapi instance
		 */
		redraw: function () {
			_updateActors(inst._currentFrame);
			_callMethodOnAllPuppets('redraw');

			return this;
		},
		
		/**
		 * Play the animation for a set amount of repetitions.  After starting over the specified amount of times, the animation will call `stop()`.  Note:  The canvas will be cleared out automatically for you if the `clearOnComplete` option is set to `true`.  This option is set to `false` by default.
		 * @param {Number} repetitions The number of times to start over.
		 * @param {Function} callback An optional callback function that will be invoked when the `repeat()` sequence completes.
		 * @returns {Kapi} The Kapi instance.
		 */
		repeat: function (repetitions, callback) {
			if (typeof repetitions === 'number' && repetitions >= -1) {
				inst._repeatCompleteHandler = callback;
				inst._repsRemaining = parseInt(repetitions, 10) + 1;
			} else {
				inst._repsRemaining = -1;
			}
			return this.play();
		},
		
		/**
		 * Play the animation and let it run for a set amount of iterations.  After running for the specified amount of times, the animation will call `stop()`.  This is extremely similar to the functionality of `kapi.repeat()`, but the parameter controls how many times the animation runs for, not how many times it starts over.  Note:  The canvas will be cleared out automatically for you if the `clearOnComplete` option is set to `true`.  This option is set to `false` by default.
		 * @param {Number} iterations The number of times to run for.
		 * @param {Function} callback An optional callback function that will be invoked when the `iterate()` sequence completes.
		 * @returns {Kapi} The Kapi instance.
		 */
		iterate: function (iterations, callback) {
			if (typeof iterations === 'number' && iterations >= -1) {
				this.repeat(iterations - 1, callback);
			}
			
			return this.play();
		},

		/**
		 * Add an actor to Kapi.  This method creates an actor object with the following properties:
		 * ========================
		 * TODO:  UPDATE THIS LIST
		 * ========================
		 * - *draw()*: The initial function that contains the drawing logic.
		 * - *get(prop)*: Retrieve the current value for `prop`.
		 * - *getState()*: Retrieve an object that contains the current state info.
		 * - *keyframe(keyframeId, stateObj)*: Create a keyframe state for this actor.
		 * - *liveCopy(keyframeId, keyframeIdToCopy)*: Create a clone of `keyframeId` that changes as the original does.
		 * - *remove()*: Removes the actor instance from the animation.
		 * - *to(duration, stateObj)*: Immediately starts tweening the state of the actor to the state specified in `stateObj` over the course of `duration`.
		 * - *moveToLayer(layerId)*: Change the layer that the actor draws to.  There can only be one actor per layer.
		 * - *updateKeyframe(keyframeId, newProps)*: Update the keyframe for this actor at `keyframeId` with the properties defined in `newProps`.  
		 * - *id* The identifier that Kapi uses to address the actor internally.
		 * - *params*: A copy of `initialParams`.
		 * 
		 * @param {Function|Object} actor The function or Object that defines an actor.
		 *   If you are providing an object, you can supply any number of the following properties:
		 *   @param {Function} draw This is required.  This defines the drawing logic for the actor.  It is passed the canvas context as the first parameter, the kapi instance (which exposes the kapi methods) as the second, and the actor object (which exposes the actor methods) as the third.
		 *   @param {Function} setup This is called once the actor is added to Kapi.  Handy for any actor initialization logic.  It is passed the Kapi instance as the first parameter, the actor instance as the third, and whatever you passed as `setupParams` to the call `kapiInst.add()` as the third.
		 *   @param {Function} teardown This is called after the actor is removed from the Kapi instance (with `kapi.removeActor()`).  This method receives the actor's `name` as a string for the first parameter, and the Kapi instance as the second parameter.
		 * You can also just pass a Function, which should look exactly like the draw function described above.
		 * @param {Object} initialParams The intial state of the actor.  These are stored internally on the actor as the `params` property.  There is a special `data` parameter you can add here.  It simply stores arbitrary data on the actor, and can be updated and accessed at any time with `actor.data()`.  This `data` property is not present on any of the keyframes.
		 * @param {Anything} setupParams Arbitrary data that the actor's `setup` method will receive.
		 * @returns {Object} An actor Object with the properties described above.  The actor returned by this function can also be retrieved at any time in the future with `kapi.getActor()`.
		 */
		add: function (actor, initialState, setupParams) {
			var actorInst = {},
				validProps = ['setup', 'draw', 'teardown'],
				i,
				funcFactory = function () {
					return function () {
						// This is a silly workaround for a silly JSLint error.
					};
				};
			
			// Normalize `actor`, since it can be either a Function or an Object
			if (actor instanceof Function) {
				// Tack on the extra maintenance functions as empty functions, 
				// since they will be called later.
				actorInst = {
					'setup': function () {
						
					},
					'draw': actor,
					'teardown': function () {
						// Uh, this doesn't get used yet...
					}
				};
			} else if (actor instanceof Object) {
				// Check to see if the Object has a usable `draw()` method
				if (!(actor.draw instanceof Function)) {
					if (console && console.error) {
						console.error('Trying to add an Object as an actor, but it does not have a draw function.');
					}
				}
				
				for (i = 0; i < validProps.length; i++) {
					if (actor[validProps[i]] instanceof Function) {
						actorInst[validProps[i]] = actor[validProps[i]];
					} else {
						// Just attach an empty function if one was not supplied
						actorInst[validProps[i]] = funcFactory();
					}
				}
			} else {
				if (console && console.error) {
					console.error(actor + ' is not a valid actor Object.');
				}
				
				return;
			}
			
			actorInst.params = initialState;
			actorInst.params.data = actorInst.params.data || {};
			actorInst.constructor = actor.draw;
			
			// Make really really sure the id is unique, if one is not provided
			if (typeof actorInst.id === 'undefined') {
				actorInst.id = actorInst.params.id || actorInst.params.name || generateUniqueName();
			}
			
			// This property is only useful for giving an actor a name, and are useless otherwise.
			// Delete it here to prevent user confusion.
			delete actorInst.params.name;

			if (typeof inst._actorstateIndex[actorInst.id] === 'undefined') {
				inst._actorstateIndex[actorInst.id] = [];
				inst._actorstateIndex[actorInst.id].queue = [];
				inst._actorstateIndex[actorInst.id].reachedKeyframes = [];
			}
			
			inst._actors[actorInst.id] = actorInst;
			inst._liveCopies[actorInst.id] = {};
			inst._layerIndex.push(actorInst.id);
			actorInst.params.layer = inst._layerIndex.length - 1;
			actorInst = _addActorMethods(actorInst);
			
			// Call the actor's `setup` function
			// TODO:  Document this.
			actorInst.setup.apply(actorInst, [this].concat(actorInst).concat(setupParams || null));
			delete actorInst.setup;

			return actorInst;
		},
		
		/**
		 * Completely removes an actor from the animation.  This also removes all keyframes for the removed actor.  This method calls the actor's `teardown` method, if one was defined when the actor was `add`ed.
		 * 
		 * @param {String} actorName The name of the actor to be removed.
		 * @returns {Object} The Kapi object (for chaining).
		 */
		removeActor: function (actorName) {
			var actor,
				actorKeyframes,
				teardownFunc,
				i;
			
			if (typeof actorName === 'string' && inst._actors[actorName]) {
				actor = inst._actors[actorName];
				actorKeyframes = inst._actorstateIndex[actorName].slice(0);
				
				for (i = 0; i < actorKeyframes.length; i++) {
					actor.remove(actorKeyframes[i]);
				}
				
				delete inst._actorstateIndex[actorName];
				delete inst._currentState[actorName];
				
				for (i = 0; i < inst._layerIndex.length; i++) {
					if (inst._layerIndex[i] === actorName) {
						inst._layerIndex.splice(i, 1);
						break;
					}
				}
				
				teardownFunc = actor.teardown;
				delete inst._actors[actorName];
				
				teardownFunc(actorName, this);
				
			} else {
				if (console && console.error) {
					console.error(actorName, ' is not a valid actor ID.');
				}
			}
			
			return this;
		},
		
		/**
		 * Get a specific actor object.
		 * @param {String} actorName The name of the actor to fetch
		 * @returns {Object} An actor object.
		 */
		getActor: function (actorName) {
			return inst._actors[actorName];
		},
		
		/**
		 * Returns a list of all the actors currently registered with this Kapi instance.
		 * @returns {Array} A list of all the string names of the actors that can be accessed with `kapi.getActor()`.
		 */
		getActorList: function () {
			var arr = [],
				actor;
			
			for (actor in inst._actors) {
				if (inst._actors.hasOwnProperty(actor)) {
					arr.push(actor);
				}
			}
			
			return arr;
		},
		
		/**
		 * Remove all of the keyframes for all of the actors in the animation.  Aside from the fact that `add`ed actors are still available in the Kapi instance, this effectively resets the state of Kapi.
		 * @returns {Object} The Kapi object (for chaining).
		 */
		removeAllKeyframes: function (alsoRemovePuppetKeyframes) {
			var currActor;
			
			for (currActor in inst._actors) {
				if (inst._actors.hasOwnProperty(currActor)) {
					inst._actors[currActor].removeAll();
				}				
			}
			
			
			// TODO:  TEST AND DOCUMENT THIS
			if (alsoRemovePuppetKeyframes) {
				_callMethodOnAllPuppets('removeAllKeyframes');
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
			var oldFps,
				fpsChange,
				originalStatesIndexCopy = {},
				originalStatesCopy = {},
				originalLiveCopies = {},
				originalReachedKeyframeCopy,
				originalKeyframeId,
				actorName,
				liveCopy,
				tempLiveCopy,
				originalSourceState,
				i;
			
			if (newFramerate && typeof newFramerate === 'number' && newFramerate > 0) {
				oldFps = inst._params.fps;
				fpsChange = newFramerate / oldFps;
				inst._params.fps = parseInt(newFramerate, 10);
				
				// Make a safe copy of `inst._liveCopies`.
				extend(originalLiveCopies, inst._liveCopies);
				
				// Remove any liveCopy keyframes.  They are stored safely in `inst._liveCopies`,
				// and will added back into the animation after the regular keyframes are added back.
				for (actorName in originalLiveCopies) {
					if (originalLiveCopies.hasOwnProperty(actorName)) {
						for (liveCopy in originalLiveCopies[actorName]) {
							if (originalLiveCopies[actorName].hasOwnProperty(liveCopy)) {
								inst._actors[actorName].remove(liveCopy);
							}
						}
					}	
				}
				
				// Make safe copies of `inst._actorstateIndex` and `inst._originalStates`,
				// they have to be re-added after the framerate change.
				extend(originalStatesIndexCopy, inst._actorstateIndex);
				extend(originalStatesCopy, inst._originalStates);
				originalReachedKeyframeCopy = inst._reachedKeyframes.slice(0);
				
				// All needed data has been safely saved, dump it all from the currently executing instance.
				this.removeAllKeyframes();
				
				// And add it all back at the new framerate.
				for (actorName in originalStatesIndexCopy) {
					if (originalStatesIndexCopy.hasOwnProperty(actorName)) {
						
						// Re-add all of the keyframes.
						for (i = originalStatesIndexCopy[actorName].length - 1; i > -1; i--) {
							originalKeyframeId = originalStatesCopy[originalStatesIndexCopy[actorName][i]][actorName]._keyframeID;
							inst._actors[actorName].keyframe(originalKeyframeId, originalStatesCopy[originalStatesIndexCopy[actorName][i]][actorName]);
						}
						
						// Update the durations on the Immediate Actions.
						for (i = 0; i < originalStatesIndexCopy[actorName].queue.length; i++) {
							inst._actorstateIndex[actorName].queue[i].duration = parseInt(inst._actorstateIndex[actorName].queue[i].duration * fpsChange, 10);
						}
						
						// Restore the actor's reachedKeyframes list.
						inst._actorstateIndex[actorName].reachedKeyframes = originalStatesIndexCopy[actorName].reachedKeyframes.splice(0);
					}
				}
				
				// Recreate all of the liveCopies				
				for (actorName in originalLiveCopies) {
					if (originalLiveCopies.hasOwnProperty(actorName)) {
						inst._liveCopies[actorName] = {};
						for (liveCopy in originalLiveCopies[actorName]) {
							if (originalLiveCopies[actorName].hasOwnProperty(liveCopy)) {
								tempLiveCopy = originalLiveCopies[actorName][liveCopy];
								originalSourceState = originalStatesCopy[tempLiveCopy.copyOf][actorName]._keyframeID;
								inst._actors[actorName].liveCopy(tempLiveCopy.originalKeyframeId, tempLiveCopy.originalKeyframeIdCopyOf);
							}
						}
					}
				}
				
				for (i = 0; i < originalReachedKeyframeCopy.length; i++) {
					inst._reachedKeyframes[i] = parseInt(originalReachedKeyframeCopy[i] * fpsChange, 10);
				}
				
				_callMethodOnAllPuppets('framerate', [newFramerate]);
			}
			
			return inst._params.fps;
		},
		
		/**
		 * Renders a specified frame and upates the internal Kapi state to match that frame.
		 * @param {Number|String} frame A keyframe identifier (integer, "_x_s" or "_x_ms") specifying which frame to go to and render.
		 * @returns {Object} The Kapi instance.
		 */
		gotoFrame: function (frame) {
			var currTime = now(),
				actorName;
			
			if (this.isPlaying()) {
				this.stop();
			}
			
			frame = _getRealKeyframe(frame) % inst._lastKeyframe;
			
			// Fake a bunch of properties to make `update` properly emulate the desired `frame`
			inst._currentFrame = frame;
			inst._loopStartTime = inst._startTime = currTime - (frame * (1000 / inst._params.fps));
			inst._pausedAtTime = currTime;
			inst._reachedKeyframes = inst._keyframeIds.slice(0, _getLatestKeyframeId(inst._keyframeIds) + 1);
			
			// Flush the keyframe cache
			inst._keyframeCache = {};
			
			self.clear();
			
			for (actorName in inst._actors) {
				if (inst._actors.hasOwnProperty(actorName)) {
					
					inst._keyframeCache[actorName] = {
						'from': {},
						'to': {}
					};
					
					inst._actorstateIndex[actorName].reachedKeyframes.push(_getLatestKeyframeId(inst._actorstateIndex[actorName]));
				}
			}
			
			_updateActors(inst._currentFrame);
			_callMethodOnAllPuppets('updateState');
			
			if (inst._params.isPuppet) {
				inst._params.master.redraw();
			}
			
			return this;
		},
		
		/**
		 *  Wraps the `gotoFrame` method and then plays the animation.
		 *   @param {Number|String} frame A keyframe identifier (integer, "_x_s" or "_x_ms") specifying which frame to go to and render.
		 *   @returns {Object} The Kapi instance.
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
			return inst._layerIndex.length;
		},

		/**
		 * Gets the current state of all of the actors in the animation.
		 * @returns {Object} A container of all of the animation's actors and their states at the time of invokation.
		 */
		getState: function () {
			return inst._currentState;
		},
		
		/**
		 * Bind an event handler to a Kapi event.  Throughout the course of its execution, Kapi fires events at verious key points.  You can attach an event handler that gets invoked when these events fire.  You can attach as many event handlers to an event as you'd like; event handlers are invoked in the order they are attached.  Event handlers are invoked in the context of the Kapi instance.  This means the `this` keyword is a reference to the Kapi object.
		 * 
		 * You can bind event handlers to the following events:
		 * 
		 * - `enterFrame`: Fires at the beginning of every frame.
		 * - `loopStart`: Fires once per loop, at the beginning of the loop.
		 * - `loopComplete`: Fires once per loop, at the end of the loop.
		 * 
		 * @param {String} eventName The name of the event to bind an event handler to.
		 * @param {Function} handler The event handler to attach.
		 * @returns {Object} The Kapi istance.
		 */
		bind: function (eventName, handler) {
			if (typeof eventName === 'string' && typeof handler === 'function') {
				if (!inst._events[eventName]) {
					inst._events[eventName] = [];
				}
				
				inst._events[eventName].push(handler);
			}
			
			return this;
		},
		
		/**
		 * Remove an event handler from the Kapi instance.  You can either remove a specific handler from the event, or all of them - this is determined by the presence of the `handler` parameter.  If present, this method will only unbind the specified event handler.  If the `handler` parameter is omitted, all of the event handlers for this event are unbound.  Valid event names are the same as those listed in `.bind()`.
		 * 
		 * @param {String} eventName The name of the event to unbind an event handler from.
		 * @param {Function} handler A reference to the handler function to unbind.
		 * @returns {Object} The Kapi istance.
		 * 
		 * @codestart
		 * // Using a named function as a handler so we can maintain a reference to it
		 * function myHandler () {
		 *   console.log('Hello there.');
		 * }
		 * 
		 * var demo = kapi(document.getElementById('myCanvas'));
		 * 
		 * demo
		 *   .bind('enterFrame', myHandler)
		 *   .unbind('enterFrame', myHandler);
		 * @codeend
		 */
		unbind: function (eventName, handler) {
			var i;
			
			if (typeof eventName === 'string' && inst._events[eventName]) {
				if (typeof handler === 'function') {
					for (i = 0; i < inst._events[eventName].length; i++) {
						if (inst._events[eventName][i] === handler) {
							inst._events[eventName].splice(i, 1);
						}
					}
				} else {
					inst._events[eventName] = [];
				}
			}
			
			return this;
		},
		
		puppetGet: function (puppetName) {
			return inst._puppets[puppetName];
		},
		
		puppetCreate: function (puppetName, events) {
			if (!puppetName) {
				throw 'Puppet name not specified.';
			}
			
			inst._puppets[puppetName] = kapi(inst.el, {
				'isPuppet': true,
				'master': this,
				'fps': this.framerate(),
				'clearOnComplete': false,
				'clearOnStop': false,
				'autoclear': false
			}, events);
			
			return this.puppetGet(puppetName);
		},

		puppetDelete: function (puppetName) {
			return delete inst._puppets[puppetName];
		},
		
		/**
		 * Returns an object of internal state properties.  You probably don't need to use this, it's for Kapi development and extension authoring.
		 * @returns {Object}
		 */
		_expose: function () {
			return inst;
		}
		
	};
	
	return self.init(canvas, params, events);
}

/**
 * This is a namespaced container for any actor templates you'd care to add.
 */
kapi.actorTemplates = {};

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

/**
 * Special object to attach Kapi extensions to.
 */
kapi.fn = {};

/**
 * Special object to attach actor extensions to.
 */
kapi.actorFn = {};

/**
 * Container for various Kapi core extension hooks. 
 */
kapi.hook = {
	init: {}
};

// Adding in kapi.tweens.js for convenience.  It is not a part of the Kapi core code.

// All equations are copied from here: http://www.gizma.com/easing/
// Originally written by Robert Penner, copied under BSD License (http://www.robertpenner.com/)
//
// Params are as follows:
// t = current time
// b = start value
// c = change in value
// d = duration
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
kapi.tween.easeInOutCubic = function (t, b, c, d) {
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
};
