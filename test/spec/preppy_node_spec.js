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
					bindingSpy2 = jasmine.createSpy();
					callbackSpy = jasmine.createSpy();
				});

				it("does not call the binding function", function() {
					errorPrepper("e").bind(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy).not.toHaveBeenCalled();
					});
				});

				it("stops the prep pipeline", function() {
					errorPrepper("e").bind(bindingSpy).bind(bindingSpy2).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy2).not.toHaveBeenCalled();
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

		describePreps(".bindall", function(successPrepper, errorPrepper) {
			describe("success preps", function() {
				it("binds the parameters that are passed in, producing a value", function() {
					var bindingSpy = jasmine.createSpy("bindingSpy").andReturn(pnode.value(6, 7, 8));
					var callbackSpy = jasmine.createSpy("callbackSpy");

					successPrepper(19).bindall(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy).toHaveBeenCalledWith(null, 19)
						expect(callbackSpy).toHaveBeenCalledWith(null, 6, 7, 8);
					});
				});

				it("binds the parameters that are passed in, producing an error", function() {
					var bindingSpy = jasmine.createSpy("bindingSpy").andReturn(pnode.error(6, 7, 8));
					var callbackSpy = jasmine.createSpy("callbackSpy");

					successPrepper(19).bindall(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy).toHaveBeenCalledWith(null, 19)
						expect(callbackSpy).toHaveBeenCalledWith(6, 7, 8);
					});
				});
			});

			describe("error preps", function() {
				it("binds the parameters that are passed in, producing a value", function() {
					var bindingSpy = jasmine.createSpy("bindingSpy").andReturn(pnode.value(6, 7, 8));
					var callbackSpy = jasmine.createSpy("callbackSpy");

					errorPrepper("err", 78).bindall(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy).toHaveBeenCalledWith("err", 78)
						expect(callbackSpy).toHaveBeenCalledWith(null, 6, 7, 8);
					});
				});

				it("binds the parameters that are passed in, producing an error", function() {
					var bindingSpy = jasmine.createSpy("bindingSpy").andReturn(pnode.error(6, 7, 8));
					var callbackSpy = jasmine.createSpy("callbackSpy");

					errorPrepper("err", 78).bindall(bindingSpy).run(callbackSpy);

					waitsFor(spyToBeCalled(callbackSpy));

					runs(function() {
						expect(bindingSpy).toHaveBeenCalledWith("err", 78)
						expect(callbackSpy).toHaveBeenCalledWith(6, 7, 8);
					});
				});
			});
		});

		describePreps(".finally", function(successPrepper, errorPrepper) {
			var bodyPrepperSpy, finallyPrepperSpy, callbackSpy;

			beforeEach(function() {
				bodyPrepperSpy = jasmine.createSpy();
				finallyPrepperSpy = jasmine.createSpy();
				callbackSpy = jasmine.createSpy();
			});

			describe("success preps producing success preps with successful finally block", function() {
				beforeEach(function() {
					bodyPrepperSpy.andReturn(pnode.value(2));
					finallyPrepperSpy.andReturn(pnode.value(3));

					var p = successPrepper(1).finally(finallyPrepperSpy)(bodyPrepperSpy);
					p.run(callbackSpy);
					waitsFor(spyToBeCalled(callbackSpy));
				});

				it("asks for the finally prep", function() {
					expect(finallyPrepperSpy).toHaveBeenCalledWith(1);
				});

				it("runs the callback function", function() {
					expect(callbackSpy).toHaveBeenCalledWith(null, 2);
				});
			});

			describe("success preps producing error preps with successful finally block", function() {
				beforeEach(function() {
					bodyPrepperSpy.andReturn(pnode.error("e"));
					finallyPrepperSpy.andReturn(pnode.value(3));

					var p = successPrepper(1).finally(finallyPrepperSpy)(bodyPrepperSpy);
					p.run(callbackSpy);
					waitsFor(spyToBeCalled(callbackSpy));
				});

				it("asks for the finally prep", function() {
					expect(finallyPrepperSpy).toHaveBeenCalledWith(1);
				});

				it("runs the callback function", function() {
					expect(callbackSpy).toHaveBeenCalledWith("e");
				});
			});

			describe("error preps", function() {
				beforeEach(function() {
					var p = errorPrepper("er").finally(finallyPrepperSpy)(bodyPrepperSpy);
					p.run(callbackSpy);
					waitsFor(spyToBeCalled(callbackSpy));
				});

				it("does not ask for finally prep", function() {
					expect(finallyPrepperSpy).not.toHaveBeenCalled();
				});

				it("runs the callback function", function() {
					expect(callbackSpy).toHaveBeenCalledWith("er");
				});
			});
		});

		describe("bugs", function() {
			it("actually stops the prep pipeline", function() {
				//this test demonstrates an odd bug, where an error can cause the preceding pipeline to execute twice.
				var invocationSpy = jasmine.createSpy();
				pnode.async(function(continuation) {
					invocationSpy();
					continuation(null, "s");
				}).bind(function() {
					return pnode.error("e");
				}).bind(function() {
					throw "this bound function exists just to pull on the initial operation again, but it should never be called";
				}).run(function() {
					expect(invocationSpy.callCount).toBe(1);
				});
			});
		});

		xdescribe("::join", function() {
		});
	});
});
