define(function() {
	function spyToBeCalled(s) {
		return function() {
			return s.wasCalled;
		}
	}

	return {
		spyToBeCalled: spyToBeCalled
	};
});