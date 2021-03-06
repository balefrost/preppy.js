define(['preppyjs/preppy'], function(preppy) {
	var nodePrepPrototype = {
		map: function map(f) {
			var newPrep = this.prep.bind(function(err) {
				if (err) {
					return this;
				} else {
					var values = Array.prototype.slice.call(arguments, 1);
					return preppy.value(null, f.apply(null, values));
				}
			});
			return new NodePrep(newPrep);
		},

		bind: function bind(f) {
			var nodePrep = this;
			return this.bindall(function(err) {
				if (err) {
					return error.apply(this, arguments);
				} else {
					var values = Array.prototype.slice.call(arguments, 1);
					var nextPrep = f.apply(nodePrep, values);
					return nextPrep;
				}
			});
		},

		bindall: function bindall(f) {
			var nodePrep = this;
			return new NodePrep(nodePrep.prep.bind(function() {
				var nextPrep = f.apply(nodePrep, arguments);
				if (!isNodePrep(nextPrep)) {
					throw "expected " + (f.name || "(anonymous function)") + " to return a NodePrep, but it returned " + typeof(nextPrep);
				}
				return nextPrep.prep;
			}));
		},

		runall: function runall(callback) {
			this.prep.run(callback || function() {});
		},

		run: function run(callback) {
			callback = callback || function() { };

			this.prep.run(function(err) {
				if (!err) {
					var args = Array.prototype.slice.call(arguments, 1);
					callback.apply(null, args);
				}
			})
		},

		finally: function fnally(finallyPrepper) {
			var prep = this;
			return function(bodyPrepper) {
				return prep.bind(function() {
					var bodyPrep = bodyPrepper.apply(null, arguments);
					var finallyPrep = finallyPrepper.apply(null, arguments);

					return bodyPrep.bindall(function() {
						var bodyResultPrep = new NodePrep(preppy.value.apply(preppy, arguments))
						return finallyPrep.bindall(function(err) {
							if (err) {
								console.error("exception while processing finally");
							}
							return bodyResultPrep;
						});
					})
				});
			}
		},

		finallyall: function finallyall(finallyPrepper) {
			var prep = this;
			return function(bodyPrepper) {
				return prep.bindall(function(err) {
					var bodyPrep = bodyPrepper.apply(null, arguments);

					if (!err) {
						var finallyPrep = finallyPrepper.apply(null, Array.prototype.slice.call(arguments, 1, arguments.length));
					}

					return bodyPrep.bindall(function() {
						var bodyResultPrep = new NodePrep(preppy.value.apply(preppy, arguments))

						if (finallyPrep) {
							return finallyPrep.bindall(function(err) {
								if (err) {
									console.error("exception while processing finally");
								}
								return bodyResultPrep;
							});
						} else {
							return bodyResultPrep;
						}
					})
				});
			}
		}
	};

	NodePrep.prototype = nodePrepPrototype;

	function NodePrep(prep) {
		this.prep = prep;
	}

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
		} else if (preppy.isPrep(prepOrFn)) {
			return new NodePrep(prepOrFn);
		} else {
			return new NodePrep(preppy.async(prepOrFn));
		}
	}

	function prepify(node_fn, module) {
		return function() {
			var args = Array.prototype.slice.call(arguments);
			return async(function(callback) {
				node_fn.apply(module ? module : null, args.concat([callback]));
			});
		};
	}

	function unprepify(returns_prep) {
		return function() {
			var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
			var callback = arguments[arguments.length - 1];
			returns_prep.apply(this, args).runall(callback);
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

	//TODO: detect when prepOrFn is an already-promised prep and reuse it
	function promise(prepOrFn) {
		var prep = async(prepOrFn);

		var promisedNodePrep = async(preppy.promise(prep.prep));

		Object.defineProperty(promisedNodePrep, "hasFired", {
			configurable: true,
			enumerable: true,
			get: function() {
				return promisedPrep.hasFired;
			}
		});

		return promisedNodePrep;
	}

	function precache(prepOrFn) {
		var thePromise = promise(prepOrFn);
		thePromise.run();
		return thePromise;
	}

	return {
		isNodePrep: isNodePrep,
		value: value,
		error: error,
		promise: promise,
		precache: precache,
		async: async,
		prepify: prepify,
		unprepify: unprepify,
		join: join
	}
});