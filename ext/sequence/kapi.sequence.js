(function (kapi) {
	kapi.fn.sequence = {
		_thing1: function () {
			console.log('thing1: ', this)
		},
		
		_thing2: function () {
			
		}
	}
	
	kapi.hook.init.sequence = function () {
		var func;
		
		for (func in this.sequence) {
			if (this.sequence.hasOwnProperty(func)) {
				var self = this,
					newName;
				
				newName = func.slice(1);

				(function (func, newName) {
					self.sequence[newName] = function () {
						return self.sequence[func].apply(self);
					}
				}(func, newName));
			}
		}
	}
	
} (kapi));