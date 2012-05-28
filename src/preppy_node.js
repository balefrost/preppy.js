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
		var newPrep = this.prep.bind(function(err) {
			if (err) {
				return this;
			} else {
				var values = Array.prototype.slice.call(arguments, 1);
				return f.apply(null, values).prep;
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

	var makeValuePrep = preppy.value.bind(preppy, null);

	function value(v) {
		return new NodePrep(makeValuePrep.apply(null, arguments));
	}

	function error(e) {
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