define([
	'preppyjs/preppy'
], function(preppy) {
	function APlusPromise(prep) {
		this._prep = prep;
	}

	function isPromise(promise) {
		return typeof(promise) !== "undefined" && promise !== null && promise.constructor === APlusPromise;
	}

	function nowOrLater(prep, f) {
		if (prep.hasFired) {
			return preppy.async(function(continuation) {
				setTimeout(continuation, 0);
			}).bind(f);
		} else {
			return f();
		}
	}

	APlusPromise.prototype.then = function(onFulfilled, onRejected) {
		var prep = preppy.precache(this._prep.bind(function(success, value) {
			return nowOrLater(this, function() {
				var callbackFunction = success ? onFulfilled : onRejected;

				if (typeof(callbackFunction) !== 'function') {
					return preppy.value(success, value);
				}

				var result;
				try {
					result = callbackFunction(value);
				} catch (e) {
					return preppy.value(false, e);
				}

				if (isPromise(result)) {
					return result._prep;
				} else if (typeof(result) !== 'undefined' && result != null && typeof(result.then) === 'function') {
					return preppy.async(function(continuation) {
						function onFulfilled(value) {
							continuation(true, value);
						}

						function onRejected(reason) {
							continuation(false, reason);
						}

						result.then(onFulfilled, onRejected);
					});
				} else {
					return preppy.value(true, result);
				}
			});
		}));

		return new APlusPromise(prep);
	};

	return function(start) {
		var prep = preppy.precache(function(continuation) {
			function fulfill(value) {
				continuation(true, value);
			}

			function reject(reason) {
				continuation(false, reason);
			}

			start(fulfill, reject);
		});

		return new APlusPromise(prep);
	}
});