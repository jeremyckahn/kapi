/*global kapi:true, console:true */

(function (kapi) {
	var _private;
	
	kapi.fn.sequence = {
		/**
		 * @param {String} sequenceName
		 * @param {Function} sequence
		 */
		_create: function create (sequenceName, sequence) {
			var actorSequenceName,
				actorTemplate;
			
			actorSequenceName = '_sapi.' + sequenceName;
			
			actorTemplate = {
				setup: function () {
					
				},
				
				draw: function () {
					
				},
				
				teardown: function () {
					
				}
			};
			
			
		},
		
		/**
		 * @param {String} sequenceName
		 * @param {String|Number} keyframeId
		 */
		_startAt: function startAt (sequenceName, keyframeId) {
			
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