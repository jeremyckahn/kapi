/*global kapi:true, console:true */

/**
 *`state` reference:
 *
 *  0 = Sequence hasn't started playing
 *  1 = Sequence has started playing
 *  2 = Sequence has played and been stopped
 */

(function (kapi) {
	var sequences;
	
	// Don't allow the sequence to start on keyframe 0, that will overwrite the first keyframe
	function validateKeyframeId (keyframeId) {
		if (keyframeId === 0 || keyframeId === '0' || keyframeId === '0s') {
			keyframeId = 1;
		}
		
		return keyframeId;
	}
	
	sequences = {};
	
	kapi.fn.sequence = {
		/**
		 * @param {String} sequenceName
		 * @param {Function} sequence
		 */
		_create: function create (sequenceName, sequence) {
			var master,
				exposedMasterData,
				actorSequenceName,
				actorTemplate,
				actorInst,
				puppetInst,
				puppetKeyframeIndex,
				masterPlayHandler,
				masterPauseHandler,
				masterStopHandler;
				
			masterPlayHandler = function () {
				var masterFrame,
					puppetStartFrame;

				masterFrame = master._expose()._currentFrame;
				puppetStartFrame = master._expose()._actorstateIndex[actorSequenceName][1];

				if (masterFrame >= puppetStartFrame) {
					puppetInst.play();
					actorInst.data().state = 1;
				}
			};

			masterPauseHandler = function () {
				puppetInst.pause();
			};

			masterStopHandler = function () {
				puppetInst.stop();
			};
			
			actorTemplate = {
				setup: function () {
					
				},
				
				draw: function () {	
					// If `dummyProp` has reached exactly 1, it is time to `play()`
					if (puppetKeyframeIndex[1] <= exposedMasterData._currentFrame && actorInst.data().state !== 1) {
						puppetInst.play();
						actorInst.data().state = 1;
						
					// If `dummyProp` has reached exactly -1, and the sequence has started to `play()`,
					// it is time to `stop()`.
					} else if (puppetKeyframeIndex[2] <= exposedMasterData._currentFrame && actorInst.data().state !== 2) {
						puppetInst.stop();
						actorInst.data().state = 2;
					}
				},
				
				teardown: function () {
					master.unbind('onPlay', masterPlayHandler);
					master.unbind('onPause', masterPauseHandler);
					master.unbind('onStop', masterPauseHandler);
				}
			};
				
			master = this;
			exposedMasterData = master._expose();
			actorSequenceName = '_sequence.' + sequenceName;
			master.bind('onPlay', masterPlayHandler);
			master.bind('onPause', masterPauseHandler);
			master.bind('onStop', masterStopHandler);
			puppetInst = master.puppetCreate(actorSequenceName, actorTemplate);
			sequence(puppetInst);
			
			actorInst = master.add(actorTemplate, {
				'name': actorSequenceName,
				'dummyProp': 0
			}).keyframe(0, {
				// Nothing!
			});
			
			actorInst.data({
				'state': 0
			});
			
			puppetKeyframeIndex = master._expose()._actorstateIndex[actorSequenceName];
			sequences[sequenceName] = actorInst;
		},
		
		/**
		 * @param {String} sequenceName
		 * @param {String|Number} keyframeId
		 */
		_startAt: function startAt (sequenceName, keyframeId) {
			var sequence;
			
			sequence = sequences[sequenceName];
			keyframeId = validateKeyframeId(keyframeId);
			
			// Make a dummy keyframe, so that the sequence registers a valid keyframe
			// on the master timeline
			sequence.keyframe(keyframeId, {
				'dummyProp': 1
			});
		},
		
		/**
		 * @param {String} sequenceName
		 * @param {String|Number} keyframeId
		 */
		_endAt: function endAt (sequenceName, keyframeId) {
			var sequence;
			
			sequence = sequences[sequenceName];
			keyframeId = validateKeyframeId(keyframeId);
			
			sequence.keyframe(keyframeId, {
				'dummyProp': -1
			});
		},
		
		/**
		 * @param {String} sequenceName
		 */
		_destroy: function destroy (sequenceName) {
			var sequence,
				puppet;
			
			sequence = sequences[sequenceName];
			puppet = sequence.kapi._expose()._puppets[sequence.id];
			this.removeActor(sequence.id);
			
			puppet.stop();
			delete sequence.kapi._expose()._puppets[sequence.id];
		}
	};
	
} (kapi));