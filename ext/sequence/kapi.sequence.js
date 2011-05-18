/*global kapi:true, console:true */

/**
 *`state` reference:
 *
 *  0 = Sequence hasn't started playing
 *  1 = Sequence has started playing
 *  2 = Sequence has played and been stopped
 *
 * `controlProp` reference:
 * 1  = Start the sequence
 * -1 = Stop the sequence
 */

(function (kapi) {
	var sequences;
	
	sequences = {};
	
	kapi.fn.sequence = {
		/**
		 * @param {String} sequenceName
		 * @param {Function} sequence
		 */
		_create: function create (sequenceName, sequence) {
			var master,
				actorSequenceName,
				actorTemplate,
				actorInst,
				puppetInst,
				masterEnterFrameHandler,
				masterPlayHandler,
				masterPauseHandler,
				masterStopHandler;
				
			master = this;
			
			actorSequenceName = '_sequence.' + sequenceName;
			
			actorTemplate = {
				setup: function () {
					
				},
				
				draw: function () {	
					// If `controlProp` has reached exactly 1, it is time to `play()`
					if (this.controlProp === 1 && actorInst.data().state !== 1) {
						puppetInst.play();
						actorInst.data().state = 1;
						
						// If `controlProp` has reached exactly -1, and the sequence has started to `play()`,
						// it is time to `stop()`.
					} else if (this.controlProp === -1 && actorInst.data().state !== 2) {
						puppetInst.stop();
						actorInst.data().state = 2;
					}
				},
				
				teardown: function () {
					master.unbind('onPlay', masterPlayHandler);
					master.unbind('onPause', masterPauseHandler);
					master.unbind('onStop', masterPauseHandler);
					master.unbind('enterFrame', masterEnterFrameHandler);
				}
			};
			
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
			
			masterEnterFrameHandler = function () {
				
			};
			
			master.bind('onPlay', masterPlayHandler);
			master.bind('onPause', masterPauseHandler);
			master.bind('onStop', masterStopHandler);
			master.bind('enterFrame', masterEnterFrameHandler);
			
			puppetInst = master.puppetCreate(actorTemplate);
			
			sequence(puppetInst);
			
			actorInst = master.add(actorTemplate, {
				'name': actorSequenceName,
				'controlProp': 0
			});
			
			actorInst.data({
				'state': 0
			});
			
			actorInst.keyframe(0, {});
			sequences[sequenceName] = actorInst;
		},
		
		/**
		 * @param {String} sequenceName
		 * @param {String|Number} keyframeId
		 */
		_startAt: function startAt (sequenceName, keyframeId) {
			var sequence;
			
			sequence = sequences[sequenceName];
			
			// Once `controlProp` reaches 1, the puppet will `play()`
			sequence.keyframe(keyframeId, {
				'controlProp': 1
			});
		},
		
		/**
		 * @param {String} sequenceName
		 * @param {String|Number} keyframeId
		 */
		_endAt: function endAt (sequenceName, keyframeId) {
			var sequence;
			
			sequence = sequences[sequenceName];
			
			sequence.keyframe(keyframeId, {
				'controlProp': -1
			});
		},
		
		/**
		 * @param {String} sequenceName
		 */
		_destroy: function destroy (sequenceName) {
			
		}
	};
	
} (kapi));