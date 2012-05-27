define(function() {
	var prepProto = {
		run: function run(callback) {
			this.prepFn(callback);
		},

		map: function map(f) {
			var prepFn = this.prepFn;
			return async(function(callback) {
				prepFn(function() {
					callback(f.apply(this, arguments));
				});
			});
		},

		bind: function bind(f) {
			var prepFn = this.prepFn;
			return async(function(callback) {
				prepFn(function() {
					f.apply(this, arguments).run(callback);
				});
			});
		},

		then: function then(f) {
			var prepFn = this.prepFn;
			return async(function(callback) {
				prepFn(function() {
					f.apply(this, arguments);
					callback.apply(this, arguments);
				});
			});
		},

		strip: function strip() {
			var prepFn = this.prepFn;
			return async(function(callback) {
				prepFn(function() {
					callback();
				});
			});
		}
	};

	function Prep(prepFn) {
		this.prepFn = prepFn;
	}

	Prep.prototype = prepProto;

	function isPrep(obj) {
		return Object.getPrototypeOf(obj) === prepProto;
	}

	function async(prep) {
		if (isPrep(prep)) {
			return prep;
		} else {
			return new Prep(prep);
		}
	}

	var trivialValuePrep = async(function(callback) {
		callback();
	});

	function value() {
		if (arguments.length === 0) {
			return trivialValuePrep;
		}

		var values = arguments;
		return async(function(callback) {
			callback.apply(this, values);
		});
	}

	function promise(prep) {
		var PREPARED = { name: "PREPARED" };
		var STARTED = { name: "STARTED" };
		var FINISHED = { name: "FINISHED" };
		var mode = PREPARED;

		var listenerList = [];
		var cachedData;

		return async(function(callback) {
			if (mode === PREPARED) {
				listenerList.push(callback);
				mode = STARTED;
				prep.run(function() {
					if (mode === STARTED) {
						mode = FINISHED;
						cachedData = arguments;
						while (listenerList.length > 0) {
							var listener = listenerList[0];
							listenerList.splice(0, 1);
							listener.apply(null, cachedData);
						}
					}
				});
			} else if (mode === STARTED) {
				listenerList.push(callback);
			} else {
				callback.apply(null, cachedData);
			}
		});
	}

	function precache(prep) {
		var STARTED = { name: "STARTED" };
		var FINISHED = { name: "FINISHED" };
		var mode = STARTED;

		var listenerList = [];
		var cachedData;

		prep.run(function() {
			if (mode === STARTED) {
				mode = FINISHED;
				cachedData = arguments;
				while (listenerList.length > 0) {
					var listener = listenerList[0];
					listenerList.splice(0, 1);
					listener.apply(null, cachedData);
				}
			}
		});

		return async(function(callback) {
			if (mode === STARTED) {
				listenerList.push(callback);
			} else {
				callback.apply(null, cachedData);
			}
		});
	}

	function join(preps, shouldContinue) {
		if (preps.length === 0) {
			return value();
		}

		if (!shouldContinue) {
			shouldContinue = function() { return true; };
		}

		return async(function(callback) {
			var loadedList = new Array(preps.length);
			var resultList = new Array(preps.length);
			for (var i = 0; i < preps.length; ++i) {
				loadedList[i] = false;
				resultList[i] = undefined;
			}
			var terminated = false;

			preps.forEach(function(p, i) {
				p.run(function() {
					if (!terminated) {
						loadedList[i] = true;
						resultList[i] = arguments;

						if (!shouldContinue.apply(null, arguments)) {
							terminated = true;
							callback.apply(null, resultList);
						}

						if (loadedList.every(function(i) { return i; })) {
							terminated = false;
							callback.apply(null, resultList);
						}
					}
				});
			});
		});
	}

	function first(preps) {
		return join(preps, function() { return false; });
	}

	return {
		isPrep: isPrep,
		async: async,
		value: value,
		promise: promise,
		precache: precache,
		join: join,
		first: first
	};
});
