define(['preppyjs/preppy'], function(preppy) {
	function NodePrep(prep) {
		this.prep = prep;
	}

	NodePrep.prototype.map = function map(f) {
		var newPrep = this.prep.bind(function(err, value) {
			if (err) {
				return preppy.value(err);
			} else {
				return preppy.value(null, f(value));
			}
		});
		return new NodePrep(newPrep);
	};


	NodePrep.prototype.bind = function bind(f) {
		var newPrep = this.prep.bind(function(err, value) {
			if (err) {
				return preppy.value(err);
			} else {
				return f(value);
			}
		});
		return new NodePrep(newPrep);
	};

	NodePrep.prototype.run = function run(callback) {
		this.prep.run(callback);
	};

	function isNodePrep(nprep) {
		return Object.getPrototypeOf(nprep) === NodePrep.prototype;
	}

	function value(v) {
		return new NodePrep(preppy.value(null, v));
	}

	function error(e) {
		return new NodePrep(preppy.value(e));
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
		join: join
	}
});