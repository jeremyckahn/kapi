(function (kapi) {
	var _private;
	
	kapi.fn.sequence = {
		_thing1: function (testArg1, testArg2) {
			console.log('thing1: ', this, testArg1, testArg2);
		},
		
		_thing2: function () {
			
		}
	}
	
	kapi.hook.init.sequence = function () {
		var func;
		
		_private = {};
		
		for (func in this.sequence) {
			if (this.sequence.hasOwnProperty(func)) {
				var self = this,
					newName;
				
				newName = func.slice(1);
				_private[func] = self.sequence[func];

				(function (func, newName) {
					self.sequence[newName] = function () {
						return _private[func].apply(self, arguments);
					}
				}(func, newName));
			}
			
			delete self.sequence[func];
		}
	}
	
} (kapi));