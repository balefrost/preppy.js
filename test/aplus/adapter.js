(function() {
	"use strict";

	module.exports = function(runTests) {
		var requirejs = require('requirejs');

		requirejs.config({
			nodeRequire: require,
			paths: {
				preppyjs: './../../src'
			}
		});

		requirejs([
			"preppyjs/promises_aplus"
		], function(promise) {
			var adapter = {
				pending: function() {
					var fulfill, reject;
					var p = promise(function(f, r) {
						fulfill = f;
						reject = r;
					});

					return {
						promise: p,
						fulfill: fulfill,
						reject: reject
					};
				}
			};

			runTests(adapter);
		});
	};
})();