define(['preppyjs/preppy'], function(preppy) {
	function NodePrep(prep) {
		this.prep = prep;
	}

	NodePrep.prototype.map = function map(f) {
		var newPrep = this.prep.bind(function(err) {
			if (err) {
				return this;
			} else {
				var values = Array.prototype.slice.call(arguments, 1);
				return preppy.value(null, f.apply(null, values));
			}
		});
		return new NodePrep(newPrep);
	};


	NodePrep.prototype.bind = function bind(f) {
		var nodePrep = this;
		var newPrep = this.prep.bind(function(err) {
			if (err) {
				return this;
			} else {
				var values = Array.prototype.slice.call(arguments, 1);
				var nextPrep = f.apply(nodePrep, values);
				if (!isNodePrep(nextPrep)) {
					throw "expected " + (f.name || "(anonymous function)") + " to return a NodePrep, but it returned " + typeof(nextPrep);
				}
				return nextPrep.prep;
			}
		});
		return new NodePrep(newPrep);
	};

	NodePrep.prototype.run = function run(callback) {
		this.prep.run(callback);
	};

	function isNodePrep(obj) {
		if (obj === null || obj === undefined) {
			return false;
		}

		var t = typeof(obj);
		if (t === "number" || t === "boolean" || t === "string") {
			return false;
		}
		return Object.getPrototypeOf(obj) === NodePrep.prototype;
	}

	var makeValuePrep = preppy.value.bind(preppy, null);

	function value() {
		return new NodePrep(makeValuePrep.apply(null, arguments));
	}

	function error() {
		return new NodePrep(preppy.value.apply(preppy, arguments));
	}

	function async(prepOrFn) {
		if (isNodePrep(prepOrFn)) {
			return prepOrFn;
		} else if (typeof(prepOrFn === "function")) {
			return new NodePrep(preppy.async(prepOrFn));
		} else {
			return new NodePrep(prepOrFn);
		}
	}

	function prepify(node_fn) {
		return function() {
			var args = Array.prototype.slice.call(arguments);
			return async(function(callback) {
				node_fn.apply(this, args.concat([callback]));
			});
		};
	}

	function unprepify(returns_prep) {
		return function() {
			var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
			var callback = arguments[arguments.length - 1];
			returns_prep.apply(this, args).run(callback);
		};
	}

	function join(nodePreps) {
		var rawPreps = nodePreps.map(function(np) { return np.prep; });
		var joinedPrep = preppy.join(rawPreps).bind(function() {
			var values = new Array(arguments.length);
			for (var i = 0; i < arguments.length; ++i) {
				var arg = arguments[i];
				var err = arg[0];
				if (err) {
					console.log("node_join error");
					return preppy.value(err);
				}
				values[i] = arg[1];
			}

			return preppy.value(null, values);
		});
		return new NodePrep(joinedPrep);
	}

	return {
		isNodePrep: isNodePrep,
		value: value,
		error: error,
		async: async,
		prepify: prepify,
		unprepify: unprepify,
		join: join
	}
});