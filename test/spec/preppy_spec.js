define(["helpers", "preppyjs/preppy"], function(helpers, preppy) {
	var spyToBeCalled = helpers.spyToBeCalled;

	function timeoutPrep(timeout, values) {
		return preppy.async(function(callback) {
			setTimeout(function() {
				callback.apply(null, values);
			}, timeout);
		});
	}

	function asyncPrep() {
		return timeoutPrep(1, arguments);
	}

	function describePreps(testFn) {
		testFn(preppy.value, "value");
		testFn(asyncPrep, "async");
	}

	function foreach_nonprep(f) {
		var values = [[ undefined, "undefined" ],
		              [ null, "null" ],
		              [ {}, "an object" ],
		              [ 1, "a number" ],
		              [ NaN, "NaN" ],
		              [ "foo", "a string" ],
		              [ /foo/, "a RegExp" ],
			          [ true, "a bool" ],
		              [new Date(), "a Date"]];
		values.forEach(function(i) {
			f(i[0], i[1]);
		});
	}

	function testCreationRejection(prepper) {
		foreach_nonprep(function(val, name) {
			it("throws if passed " + name, function() {
				expect(function() { preppy.async(val); }).toThrow();
			});
		});
	}

	function testCreationBehavior(prepper) {
		it("returns the same object if passed a prep", function() {
			var originalPrep = preppy.value(1, 2);
			var newPrep = prepper(originalPrep);
			expect(newPrep).toBe(originalPrep);
		});

		it("returns a different object if passed a function", function() {
			var originalPrep = function(callback) { callback(1, 2); };
			var newPrep = prepper(originalPrep);
			expect(newPrep).not.toBe(originalPrep);
		});

		testCreationRejection(prepper);
	}

	describe("preppy", function() {
		describe("::isPrep", function() {
			it("returns true if passed a prep", function() {
				expect(preppy.isPrep(preppy.value(1, 2))).toBe(true);
			});

			foreach_nonprep(function(val, name) {
				it("returns false if passed " + name, function() {
					expect(preppy.isPrep(val)).toBe(false);
				});
			});
		});

		describe("::value", function() {
			var p;

			beforeEach(function() {
				p = preppy.value(1, 2, 3);
			});

			it("immediately calls the callback with the values", function() {
				var callback = jasmine.createSpy();
				p.run(callback);
				expect(callback).toHaveBeenCalledWith(1, 2, 3);
			});

			it("can be reused", function() {
				var callback1 = jasmine.createSpy();
				var callback2 = jasmine.createSpy();
				p.run(callback1);
				p.run(callback2);
				expect(callback1).toHaveBeenCalledWith(1, 2, 3);
				expect(callback2).toHaveBeenCalledWith(1, 2, 3);
			});
		});

		describe(".run", function() {
			describePreps(function(prepper, name) {
				describe("of " + name + " preps", function() {
					it("passes the original prep as this", function() {
						var callbackSpy = jasmine.createSpy("callbackSpy");

						var originalP = prepper(15);

						originalP.run(callbackSpy);

						waitsFor(spyToBeCalled(callbackSpy));

						runs(function() {
							expect(callbackSpy.mostRecentCall.object).toBe(originalP);
						});
					});
				});
			});
		});

		describe(".then", function() {
			describePreps(function (prepper, name) {
				describe("of " + name + " preps", function() {
					var originalP, thenP, thenSpy, callbackSpy;

					beforeEach(function() {
						originalP = prepper(1, 2);
						thenSpy = jasmine.createSpy("thenSpy");
						callbackSpy = jasmine.createSpy("callbackSpy");
						thenP = originalP.then(thenSpy);
					});

					it("is different from the original prep", function() {
						expect(thenP).not.toBe(originalP);
					});

					it("does not call the then function if the original prep is invoked", function() {
						originalP.run(callbackSpy);

						waitsFor(spyToBeCalled(callbackSpy));

						runs(function() {
							expect(thenSpy).not.toHaveBeenCalled();
						})
					});

					it("calls the provided function with the prep's parameters", function() {
						thenP.run(callbackSpy);

						waitsFor(spyToBeCalled(thenSpy));

						runs(function() {
							expect(thenSpy).toHaveBeenCalledWith(1, 2);
						});
					});

					it("passes the original prep as this", function() {
						thenP.run(callbackSpy);

						waitsFor(spyToBeCalled(callbackSpy));

						runs(function() {
							expect(thenSpy.mostRecentCall.object).toBe(originalP);
							expect(callbackSpy.mostRecentCall.object).toBe(thenP);
						});
					});

					it("ignores the return value from the intermediate function", function() {
						thenSpy.andReturn("this will never appear anywhere");

						thenP.run(callbackSpy);

						waitsFor(spyToBeCalled(callbackSpy));

						runs(function() {
							expect(callbackSpy).toHaveBeenCalledWith(1, 2);
						});
					});
				});
			});
		});

		describe(".map", function() {
			describePreps(function(prepper, name) {
				describe("of " + name + " preps", function() {
					it("passes the original prep as this", function() {
						var mappingSpy = jasmine.createSpy("mappingSpy").andReturn(0);
						var callbackSpy = jasmine.createSpy("callbackSpy");

						var originalP = prepper(15);

						originalP.map(mappingSpy).run(callbackSpy);

						waitsFor(spyToBeCalled(callbackSpy));

						runs(function() {
							expect(mappingSpy.mostRecentCall.object).toBe(originalP);
						});
					});

					it("maps the parameters that are passed on", function() {
						var spy = jasmine.createSpy();
						prepper(1, 2).map(function(a, b) {
							return a + b;
						}).run(spy);

						waitsFor(spyToBeCalled(spy));

						runs(function() {
							expect(spy).toHaveBeenCalledWith(3);
						});
					});
				});
			});
		});

		describe(".bind", function() {
			describePreps(function(prepper, name) {
				describe("of " + name + " preps", function() {
					it("passes the original prep as this", function() {
						var bindingSpy = jasmine.createSpy("bindingSpy").andReturn(prepper(0));
						var callbackSpy = jasmine.createSpy("callbackSpy");

						var originalP = prepper(15);

						originalP.bind(bindingSpy).run(callbackSpy);

						waitsFor(spyToBeCalled(callbackSpy));

						runs(function() {
							expect(bindingSpy.mostRecentCall.object).toBe(originalP);
						});
					});

					it("binds the parameters that are passed on", function() {
						var spy = jasmine.createSpy();
						prepper(1, 2).bind(function(a, b) {
							return prepper(a, b, a, b);
						}).run(spy);

						waitsFor(spyToBeCalled(spy));

						runs(function() {
							expect(spy).toHaveBeenCalledWith(1, 2, 1, 2);
						});
					});
				});
			});
		});

		function describePromiseMethods(prepper) {
			it("only starts the original prep once, no matter how many listeners are registered", function() {
				var originalCompletionSpy = jasmine.createSpy();
				var listenerSpy1 = jasmine.createSpy();
				var listenerSpy2 = jasmine.createSpy();
				var p = preppy.promise(prepper(1, 2).then(originalCompletionSpy));

				p.run(listenerSpy1);
				p.run(listenerSpy2);

				waitsFor(spyToBeCalled(originalCompletionSpy));
				waitsFor(spyToBeCalled(listenerSpy1));
				waitsFor(spyToBeCalled(listenerSpy2));

				runs(function() {
					expect(originalCompletionSpy.callCount).toBe(1);
					expect(listenerSpy1.callCount).toBe(1);
					expect(listenerSpy2.callCount).toBe(1);
				});
			});

			it("calls listeners with the original prep's values", function() {
				var originalCompletionSpy = jasmine.createSpy();
				var listenerSpy1 = jasmine.createSpy();
				var listenerSpy2 = jasmine.createSpy();
				var p = preppy.promise(prepper(1, 2).then(originalCompletionSpy));

				p.run(listenerSpy1);
				p.run(listenerSpy2);

				waitsFor(spyToBeCalled(originalCompletionSpy));
				waitsFor(spyToBeCalled(listenerSpy1));
				waitsFor(spyToBeCalled(listenerSpy2));

				runs(function() {
					expect(originalCompletionSpy).toHaveBeenCalledWith(1, 2);
					expect(listenerSpy1).toHaveBeenCalledWith(1, 2);
					expect(listenerSpy1).toHaveBeenCalledWith(1, 2);
				});
			});

			describe(".hasFired", function() {
				it("returns false before the promise has fired", function() {
					var originalCompletionSpy = jasmine.createSpy();
					var p = preppy.promise(prepper(1, 2).then(originalCompletionSpy));

					expect(p.hasFired).toBe(false);
				});

				it("returns true after the promise has fired", function() {
					var listenerSpy = jasmine.createSpy();
					var p = preppy.promise(prepper(1, 2));

					p.run(listenerSpy);

					waitsFor(spyToBeCalled(listenerSpy));

					runs(function() {
						expect(p.hasFired).toBe(true);
					});
				});
			});
		}

		describe("::promise", function() {
			testCreationRejection(preppy.promise);

			describePreps(function(prepper, name) {
				describe("of " + name + " preps", function() {
					it("doesn't start the original prep right away", function() {
						var originalCompletionSpy = jasmine.createSpy();
						var timeoutSpy = jasmine.createSpy();
						var p = preppy.promise(prepper(1, 2).then(originalCompletionSpy));

						setTimeout(timeoutSpy, 10);

						waitsFor(spyToBeCalled(timeoutSpy));

						runs(function() {
							expect(originalCompletionSpy).not.toHaveBeenCalled();
						});
					});

					it("starts the original prep once a listener has been given a callback", function() {
						var originalCompletionSpy = jasmine.createSpy();
						var p = preppy.promise(prepper(1, 2).then(originalCompletionSpy));

						p.run(function() {});

						waitsFor(spyToBeCalled(originalCompletionSpy));
					});

					describePromiseMethods(prepper);
				});
			});
		});


		describe("::precache", function() {
			testCreationRejection(preppy.precache);

			describePreps(function(prepper, name) {
				describe("of " + name + " preps", function() {
					it("starts the original prep immediately", function() {
						var originalCompletionSpy = jasmine.createSpy();
						var p = preppy.precache(prepper(1, 2).then(originalCompletionSpy));

						waitsFor(spyToBeCalled(originalCompletionSpy));

						runs(function() {
							expect(originalCompletionSpy).toHaveBeenCalledWith(1, 2);
						});
					});

					describePromiseMethods(prepper);
				});
			});
		});

		describe("::join", function() {
			describePreps(function(prepper, name) {
				describe("of " + name + " preps", function() {
					var vp1, vp2, vp3;

					beforeEach(function() {
						vp1 = prepper(1, 2);
						vp2 = prepper(3, 4);
						vp3 = prepper(5, 6);
					});

					it("fires immediately with no preps", function() {
						var p = preppy.join([]);
						var listenerSpy = jasmine.createSpy();
						p.run(listenerSpy);

						waitsFor(spyToBeCalled(listenerSpy));

						runs(function() {
							expect(listenerSpy).toHaveBeenCalledWith();
						});
					});

					it("waits until all preps have completed", function() {
						var p = preppy.join([vp1, vp2]);
						var listenerSpy = jasmine.createSpy();
						p.run(listenerSpy);

						waitsFor(spyToBeCalled(listenerSpy));

						runs(function() {
							expect(listenerSpy).toHaveBeenCalledWith([1, 2], [3, 4]);
						});
					});

					it("can be interrupted", function() {
						var p = preppy.join([vp1, vp2, vp3], function() {
							return arguments[0] !== 3;
						});
						var listenerSpy = jasmine.createSpy();
						p.run(listenerSpy);

						waitsFor(spyToBeCalled(listenerSpy));

						runs(function() {
							expect(listenerSpy).toHaveBeenCalledWith([1, 2], [3, 4], undefined);
						});
					});
				});
			});
		});

		describe("::first", function() {
			it("fires immediately with no preps", function() {
				var p = preppy.first([]);
				var listenerSpy = jasmine.createSpy();
				p.run(listenerSpy);

				waitsFor(spyToBeCalled(listenerSpy));

				runs(function() {
					expect(listenerSpy).toHaveBeenCalledWith();
				});
			});

			it("only resolves the first prep to fire", function() {
				var vp1 = timeoutPrep(100, [1, 2]);
				var vp2 = timeoutPrep(1, [3, 4]);
				var p = preppy.first([vp1, vp2]);
				var listenerSpy = jasmine.createSpy();
				p.run(listenerSpy);

				waitsFor(spyToBeCalled(listenerSpy));

				runs(function() {
					expect(listenerSpy).toHaveBeenCalledWith(undefined, [3, 4]);
				});
			});
		});
	});
});
