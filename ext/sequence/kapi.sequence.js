/*global kapi:true, console:true */

(function (kapi) {
	var _private;
	
	kapi.fn.sequence = {
		_thing1: function (testArg1, testArg2) {
			console.log('thing1: ', this, testArg1, testArg2);
		},
		
		_thing2: function () {
			console.log('thing2');
		}
	};
	
	kapi.hook.init.sequence = function () {
		var func;
		
		function attachScopedFunc (self, func, newName) {
			self.sequence[newName] = function () {
				return _private[func].apply(self, arguments);
			};
		}
		
		_private = {};
		
		for (func in this.sequence) {
			if (this.sequence.hasOwnProperty(func)) {
				var self = this,
					newName;
				
				newName = func.slice(1);
				_private[func] = self.sequence[func];
				attachScopedFunc (self, func, newName);
				
				delete self.sequence[func];
			}
		}
	};
	
} (kapi));