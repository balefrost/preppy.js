define(function() {
	var prepProto = {
		run: function run(callback) {
			this.prepFn.call(this, callback.bind(this));
		},

		map: function map(f) {
			var prep = this;
			return async(function(callback) {
				prep.run(function() {
					callback(f.apply(prep, arguments));
				});
			});
		},

		bind: function bind(f) {
			var prep = this;
			return async(function(callback) {
				prep.run(function() {
					var nextPrep = f.apply(prep, arguments);
					if (!isPrep(nextPrep)) {
						throw "Expected " + (f.name || "(anonymous function)") + " to return a prep, but it returned " + typeof(nextPrep);
					}
					nextPrep.run(callback);
				});
			});
		},

		then: function then(f) {
			var prep = this;
			return async(function(callback) {
				prep.run(function() {
					f.apply(prep, arguments);
					callback.apply(this, arguments);
				});
			});
		},

		strip: function strip() {
			var prep = this;
			return async(function(callback) {
				prep.run(function() {
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
		if (obj === null || obj === undefined) {
			return false;
		}

		var t = typeof(obj);
		if (t === "number" || t === "boolean" || t === "string") {
			return false;
		}
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
		if (!isPrep(prep)) {
			throw "promise takes a prep";
		}

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
		if (!isPrep(prep)) {
			throw "precache takes a prep";
		}
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

		if (!preps.every(isPrep)) {
			throw "only accepts preps";
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
