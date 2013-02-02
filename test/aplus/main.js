#!/usr/bin/env node
"use strict";

// Due to a rejected pull request (https://github.com/promises-aplus/promises-tests/pull/16), it's not possible to
// use the promises-aplus-tests cli runner to run tests against an AMD promise library. This file can be used to
// test such a library.

var programmaticRunner = require("promises-aplus-tests");
var adapterLoader = require("./adapter.js");

adapterLoader(function(adapter) {
	programmaticRunner(adapter, function (err) {
		if (err) {
			process.exit(err.failures || -1);
		}
	});
});
