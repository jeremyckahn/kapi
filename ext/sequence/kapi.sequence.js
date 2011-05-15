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
			var actorSequenceName,
				actorTemplate,
				actorInst,
				puppetInst;
			
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
					
				}
			};
			
			puppetInst = this.puppetCreate(actorTemplate);
			sequence(puppetInst);
			
			actorInst = this.add(actorTemplate, {
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