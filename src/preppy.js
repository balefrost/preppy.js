define(function() {
	var prepProto = {
		run: function run(callback) {
			this.prepFn(callback);
		},

		map: function map(f) {
			var prepFn = this.prepFn;
			return prepify(function(callback) {
				prepFn(function() {
					callback(f.apply(this, arguments));
				});
			});
		},

		bind: function bind(f) {
			var prepFn = this.prepFn;
			return prepify(function(callback) {
				prepFn(function() {
					f.apply(this, arguments).run(callback);
				});
			});
		},

		then: function then(f) {
			var prepFn = this.prepFn;
			return prepify(function(callback) {
				prepFn(function() {
					f.apply(this, arguments);
					callback.apply(this, arguments);
				});
			});
		},

		strip: function strip() {
			var prepFn = this.prepFn;
			return prepify(function(callback) {
				prepFn(function() {
					callback();
				});
			});
		},

		cache: function cache() {
			var PREPARED = 0;
			var STARTED = 1;
			var FINISHED = 2;
			var mode = PREPARED;

			var listenerList = [];
			var cachedData;

			var prepFn = this.prepFn;

			return prepify(function(callback) {
				if (mode === PREPARED) {
					mode = STARTED;
					listenerList.push(callback);
					prepFn(function() {
						mode = FINISHED;
						cachedData = arguments;
						while (listenerList.length > 0) {
							var listener = listenerList[0];
							listenerList.splice(0, 1);
							listener.apply(null, cachedData);
						}
					});
				} else if (mode === STARTED) {
					listenerList.push(callback);
				} else {
					callback.apply(null, cachedData);
				}
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

	function prepify(prep) {
		if (isPrep(prep)) {
			return prep;
		} else {
			return new Prep(prep);
		}
	}

	function value() {
		var values = arguments;
		return prepify(function(callback) {
			callback.apply(this, values);
		});
	}

	function join(preps, shouldContinue) {
		if (!shouldContinue) {
			shouldContinue = function() { return true; };
		}

		return prepify(function(callback) {
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
		prepify: prepify,
		value: value,
		join: join,
		first: first
	};
});
