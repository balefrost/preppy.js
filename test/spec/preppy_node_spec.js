define(["helpers", "preppyjs/preppy_node", "preppyjs/preppy"], function(helpers, pnode, preppy) {
	var spyToBeCalled = helpers.spyToBeCalled;

	function asyncSuccess(v) {
		return pnode.async(function(callback) {
			setTimeout(function() {
				callback(null, v);
			}, 1);
		});
	}

	function asyncError(e) {
		return pnode.async(function(callback) {
			setTimeout(function() {
				callback(e);
			}, 1);
		});
	}

	describe("preppy_node", function() {
		describe("::isNodePrep", function() {
			it("returns true if passed a NodePrep", function() {
				expect(pnode.isNodePrep(pnode.value(1, 2))).toBe(true);
			});

			it("returns false if passed an object", function() {
				expect(pnode.isNodePrep({})).toBe(false);
			});
		});

		describe("::value", function() {
			var p;

			beforeEach(function() {
				p = pnode.value(42);
			});

			it("immediately calls the callback with the value", function() {
				var callback = jasmine.createSpy();
				p.run(callback);
				expect(callback).toHaveBeenCalledWith(null, 42);
			});

			it("can be reused", function() {
				var callback1 = jasmine.createSpy();
				var callback2 = jasmine.createSpy();
				p.run(callback1);
				p.run(callback2);
				expect(callback1).toHaveBeenCalledWith(null, 42);
				expect(callback2).toHaveBeenCalledWith(null, 42);
			});
		});

		describe("::error", function() {
			var p;

			beforeEach(function() {
				p = pnode.error("error");
			});

			it("immediately calls the callback with the error", function() {
				var callback = jasmine.createSpy();
				p.run(callback);
				expect(callback).toHaveBeenCalledWith("error");
			});

			it("can be reused", function() {
				var callback1 = jasmine.createSpy();
				var callback2 = jasmine.createSpy();
				p.run(callback1);
				p.run(callback2);
				expect(callback1).toHaveBeenCalledWith("error");
				expect(callback2).toHaveBeenCalledWith("error");
			});
		});

		describe("::async", function() {
			it("returns the same object if passed a node-prep", function() {
				var originalPrep = pnode.value(37);
				var newPrep = pnode.async(originalPrep);
				expect(newPrep).toBe(originalPrep);
			});

			it("returns a different object if passed a prep", function() {
				var originalPrep = preppy.value(1, 2, 3);
				var newPrep = pnode.async(originalPrep);
				expect(newPrep).not.toBe(originalPrep);
			});

			it("returns a different object if passed a function", function() {
				var originalPrep = function(callback) { callback(null, 37); };
				var newPrep = pnode.async(originalPrep);
				expect(newPrep).not.toBe(originalPrep);
			});
		});

		describe("::prepify", function() {
			it("does not invoke the provided function immediately", function() {
				var spy = jasmine.createSpy();
				pnode.prepify(spy);
				expect(spy).not.toHaveBeenCalled();
			});

			it("returns a function that does not invoke the provided function immediately", function() {
				var spy = jasmine.createSpy();
				var pspy = pnode.prepify(spy);
				pspy(1, 2, 3)
				expect(spy).not.toHaveBeenCalled();
			});
		});

		describe("::join", function() {
		});

		describe(".map", function() {
		});

		function describePreps(name, testFn) {
			describe(name, function() {
				describe("value preps", function() {
					testFn(pnode.value, pnode.error);
				});
				describe("async preps", function() {
					testFn(asyncSuccess, asyncError);
				});
			});
		}

		describePreps(".map", function(successPrepper, errorPrepper) {
			describe("success preps", function() {
				it("maps the parameter that is passed on", function() {
					var callbackSpy = jasmine.createSpy("callbackSpy");
					successPrepper(19).map(function(v) {
						console.log(v);
						return v + 11;
					}).run(function(v) {
						console.log(arguments);
						callbackSpy.apply(null, arguments);
					});

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(callbackSpy).toHaveBeenCalledWith(null, 30);
					});
				});
			});

			describe("error preps", function() {
				var mappingSpy, callbackSpy;

				beforeEach(function() {
					mappingSpy = jasmine.createSpy();
					callbackSpy = jasmine.createSpy();
				});

				it("does not call the mapping function", function() {
					errorPrepper("err").map(mappingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(mappingSpy).not.toHaveBeenCalled();
					});
				});

				it("passes the error through verbatim", function() {
					errorPrepper("err").map(mappingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(callbackSpy).toHaveBeenCalledWith("err");
					});
				});
			});
		});

		describePreps(".bind", function(successPrepper, errorPrepper) {
			describe("success preps producing success preps", function() {
				it("binds the parameter that is passed in", function() {
					var callbackSpy = jasmine.createSpy();

					successPrepper(15).bind(function(v) {
						return successPrepper(16);
					}).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(callbackSpy).toHaveBeenCalledWith(null, 16);
					});
				});
			});

			describe("success preps producing error preps", function() {
				it("binds the parameter that is passed in", function() {
					var callbackSpy = jasmine.createSpy();

					successPrepper(15).bind(function(v) {
						return errorPrepper("e");
					}).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(callbackSpy).toHaveBeenCalledWith("e");
					});
				});
			});

			describe("error preps", function() {
				var bindingSpy, callbackSpy;
				beforeEach(function() {
					bindingSpy = jasmine.createSpy();
					callbackSpy = jasmine.createSpy();
				});

				it("does not call the binding function", function() {
					errorPrepper("e").bind(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy).not.toHaveBeenCalled();
					});
				});

				it("passes the error through verbatim", function() {
					errorPrepper("e").bind(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(callbackSpy).toHaveBeenCalledWith("e");
					});
				});
			});
		});

		xdescribe("::join", function() {
		});
	});
});
