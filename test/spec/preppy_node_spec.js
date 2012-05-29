define(["helpers", "preppyjs/preppy_node", "preppyjs/preppy"], function(helpers, pnode, preppy) {
	var spyToBeCalled = helpers.spyToBeCalled;

	function asyncSuccess() {
		var args = arguments;
		return pnode.async(function(callback) {
			setTimeout(function() {
				var theArgs = [null];
				theArgs.push.apply(theArgs, args);
				callback.apply(null, theArgs);
			}, 1);
		});
	}

	function asyncError() {
		var args = arguments;
		return pnode.async(function(callback) {
			setTimeout(function() {
				callback.apply(null, args);
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

			it("returns false if passed null", function() {
				expect(pnode.isNodePrep(null)).toBe(false);
			});

			it("returns false if passed undefined", function() {
				expect(pnode.isNodePrep(undefined)).toBe(false);
			});

			it("returns false if passed a number", function() {
				expect(pnode.isNodePrep(42)).toBe(false);
			});

			it("returns false if passed a NaN", function() {
				expect(pnode.isNodePrep(NaN)).toBe(false);
			});

			it("returns false if passed a string", function() {
				expect(pnode.isNodePrep("zoo")).toBe(false);
			});

			it("returns false if passed a boolean", function() {
				expect(pnode.isNodePrep(false)).toBe(false);
			});
		});

		describe("::value", function() {
			var p;

			beforeEach(function() {
				p = pnode.value(42, 57);
			});

			it("immediately calls the callback with the values", function() {
				var callback = jasmine.createSpy();
				p.run(callback);
				expect(callback).toHaveBeenCalledWith(null, 42, 57);
			});

			it("can be reused", function() {
				var callback1 = jasmine.createSpy();
				var callback2 = jasmine.createSpy();
				p.run(callback1);
				p.run(callback2);
				expect(callback1).toHaveBeenCalledWith(null, 42, 57);
				expect(callback2).toHaveBeenCalledWith(null, 42, 57);
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

		describePreps("::unprepify", function(successPrepper, errorPrepper) {
			describe("success preps", function() {
				it ("returns a function that builds and invokes the prep immediately", function() {
					var callbackSpy = jasmine.createSpy("callbackSpy");

					var unprepped = pnode.unprepify(function(a, b) {
						return successPrepper(a, b);
					});

					unprepped(1, 2, callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(callbackSpy).toHaveBeenCalledWith(null, 1, 2);
					});
				});
			});

			describe("error preps", function() {
				it ("returns a function that builds and invokes the prep immediately", function() {
					var callbackSpy = jasmine.createSpy("callbackSpy");

					var unprepped = pnode.unprepify(function(a) {
						return errorPrepper("ENOBOB", a);
					});

					unprepped("fred", callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(callbackSpy).toHaveBeenCalledWith("ENOBOB", "fred");
					});
				});
			});
		});

		describePreps(".map", function(successPrepper, errorPrepper) {
			describe("success preps", function() {
				it("maps the parameters that are passed in", function() {
					var callbackSpy = jasmine.createSpy("callbackSpy");
					successPrepper(19).map(function(v) {
						return v + 11;
					}).run(function(v) {
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
					mappingSpy = jasmine.createSpy("mappingSpy");
					callbackSpy = jasmine.createSpy("callbackSpy");
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
				it("binds the parameters that are passed in", function() {
					var bindingSpy = jasmine.createSpy("bindingSpy").andReturn(successPrepper(92));
					var callbackSpy = jasmine.createSpy("callbackSpy");

					successPrepper(15, 35).bind(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy).toHaveBeenCalledWith(15, 35);
						expect(callbackSpy).toHaveBeenCalledWith(null, 92);
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
