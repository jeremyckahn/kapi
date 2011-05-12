(function (kapi) {
	var _private;
	
	kapi.fn.sequence = {
		_thing1: function () {
			console.log('thing1: ', this)
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
						return _private[func].apply(self);
					}
				}(func, newName));
			}
			
			delete self.sequence[func];
		}
	}
	
} (kapi));