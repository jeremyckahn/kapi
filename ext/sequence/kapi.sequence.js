/*global kapi:true, console:true */

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
				masterPlayHandler,
				masterPauseHandler,
				masterStopHandler;
				
			master = this;
			
			actorSequenceName = '_sapi.' + sequenceName;
			
			actorTemplate = {
				setup: function () {
					
				},
				
				draw: function () {	
					if (this.val === 1 && !puppetInst.isPlaying()) {
						puppetInst.play();
					}
				},
				
				teardown: function () {
					master.unbind('onPlay', masterPlayHandler);
					master.unbind('onPause', masterPauseHandler);
					master.unbind('onStop', masterPauseHandler);
				}
			};
			
			masterPlayHandler = function () {
				var masterFrame,
					puppetStartFrame;
				
				masterFrame = master._expose()._currentFrame;
				puppetStartFrame = master._expose()._actorstateIndex[actorSequenceName][1];
				
				if (masterFrame >= puppetStartFrame) {
					puppetInst.play();
				}
			}
			
			masterPauseHandler = function () {
				puppetInst.pause();
			}
			
			masterStopHandler = function () {
				puppetInst.stop();
			}
			
			master.bind('onPlay', masterPlayHandler);
			master.bind('onPause', masterPauseHandler);
			master.bind('onStop', masterStopHandler);
			
			puppetInst = master.puppetCreate(actorTemplate);
			
			sequence(puppetInst);
			
			actorInst = master.add(actorTemplate, {
				'name': actorSequenceName,
				'val': 0
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
			
			// Once `val` reaches 1, the puppet will `play()`
			sequence.keyframe(keyframeId, {
				'val': 1
			});
		},
		
		/**
		 * @param {String} sequenceName
		 * @param {String|Number} keyframeId
		 */
		_endAt: function endAt (sequenceName, keyframeId) {
			
		},
		
		/**
		 * @param {String} sequenceName
		 */
		_destroy: function destroy (sequenceName) {
			
		}
	};
	
} (kapi));