#Preppy.js

Preppy.js adds promises (AKA deferreds or futures) to Javascript. It is intended to be directly usable by Javascript developers, as well as a reasonable base upon which to build other abstractions.

##Rationale

Javascript has a long history of using callback functions to deal with asynchronous actions. Callbacks are a great primitive in a language with first-class closures, like Javascript. However, managing a group of in-flight asynchronous actions can be a nightmare. For example, how do you wait until several asynchronous actions have completed? How do you invoke an asynchronous action with a timeout? How do you start multiple async actions, and assign a timeout to the whole group? Promises are one mechanism to help solve these problems.

There are already some implementations of promises in Javascript. For example, both JQuery and DOJO have support for promises (called deferreds in both cases). However, both JQuery and DOJO are large libraries. It might be overkill to use one of these libraries in a Node.js project. Furthermore, the implemenation of promises in these libraries is overly complex, treating success and failure as different cases. This is convenient from a user's point of view, but could make it hard to use in an environment that defines success and failure in its own way (like Node.js). 

Preppy is intended to be both lower-level and lighter-weight than either of these implementations. In doing so, I hope that Preppy can be used as a basis for higher-level abstractions.

##Installation

Preppy is packaged as an AMD module. I use [require.js](http://requirejs.org/) to load it into my project, but it should work with any AMD loader.

```javascript
require("preppy", function(preppy) {
	//preppy is defined in here
});
```

##Concepts

The most basic concept in Preppy is the "prepared, asynchronous function", or **prep**. A prep represents an asynchronous call that is ready to be executed. It knows exactly what it needs to do. It just hasn't been started yet. Preps are executed by providing a callback function - this is the function that will be called when the prep has finished executing.

##Creating

###preppy.value

It's possible to create a non-asynchronous prep with precomputed values:

```javascript
var p = preppy.value(1, 2, 3);
```

The value of such a value prep isn't immediately obvious, but it can be particularly useful with `bind`.

###preppy.async

The more useful way to create a prep is via the `async` method. 

```javascript
var p = preppy.async(function(callback) {
	setTimeout(function() {
		callback();
	}, 100);
});
```

Since preps don't start executing right away, you need to provide a function to `async` that can be used to kick off the async action. Your starter function will itself take a callback, which is the function to call when the async action has completed. Most of the time, a prep will produce an interesting value. Any outputs of an async action should be passed to the callback method.

```javascript
function prepTimeout(t) {
	return preppy.async(function(callback) {
		setTimeout(function() {
			callback(t);	//passes the delay to the callback
		}, t);
	});
}
```

##Starting

###.run

A prep can be started using its `run` method. 

```javascript
var p = prepTimeout(500);

p.run(function(t) {
	assert(t === 500);
});
```

Since a prep represents the specification of an async actions (and not the in-flight action itself), it's possible to start a prep multiple times.

```javascript
p.run(function(t) {
	console.log("first");
});

p.run(function(t) {
	console.log("second");
});

```

This property should hold for all well-behaved preps. Be careful if you create your own.

##Transforming Preps

###.map

The simplest transformation method is `map`. Suppose we have a prep that produces a JSON string. But suppose we need a prep that produces a Javascript object. The `map` method can be used to transform the prep:

```javascript
var stringP = preppy.value('{"a": 1, "b": 2}');

var objectP = stringP.map(function(jsonString) { 
	return JSON.parse(jsonString);
});
```

It's worth noting that nothing is started until `run` is called. The `map` method simply produces a new, unstarted prep. It's also worth noting that `map` does not affect the original prep. It builds a new prep that references the origin prep. The original prep can still be invoked, and it will behave as expected.

The mapping function can take multiple values. 

```javascript
var p = preppy.value(1, 2);

var mappedP = p.map(function(a, b) {
	return a + b;
});
```

However, `map` can only produce a single value. If you need the transformed prep to produce multiple values, you will need to use `bind` and `preppy.value`.

###.bind

There are some transformation cases where `map` isn't powerful enough. For these cases, we have `bind`. Like `map`, `bind` takes a function. The difference is that, while `map` is expected to return a value, `bind` is expected to return a prep.

The simplest use of `bind` is when the transformed prep needs to produce multiple values. For example, suppose we transform a prep to swap the order of the values it produces:

```javascript
var p = preppy.value(1, 2);

var reversedP = p.bind(function(a, b) {
	return preppy.value(b, a);
});
```

This is the most common use of `preppy.value`.

Another use for bind is when you need to build a prep that depends on other preps. For example, suppose you are calling a web service that deals with hierarchical data. Depending on the way our web service is structured, we might need to make multiple HTTP requests to get everything we need. However, you would like to hide all that behind a single prep:

```javascript
//Returns a prep that will call url with the ids in the querystring.
function ajaxGet(url, ids) {
	return preppy.async(function(callback) {
		//XMLHttpRequest magic
	});
}

var p = ajaxGet(rootUrl, [id]).bind(function(obj) {
	return ajaxGet(rootUrl, obj.childIds);
});
```

The result is a prep that makes an HTTP request, waits for the response, and then uses the response to make another HTTP request. The resulting prep will not be finish until the inner prep has finished. 

Finally, because bind takes a function and returns a prep, we might conditionally execute additional preps. For example, suppose that ajaxGet might fail:

```javascript
ajaxGet(rootUrl, id).bind(function(err, value) {
	if (err) {
		return preppy.value(err);
	} else {
		return ajaxGet(rootUrl, obj.childIds);
	}
});
```

Now, if the first ajaxGet call fails for whatever reason, we will not try to make the second request - the error will propagate along the prep pipeline immediately.

###Promising

I had mentioned earlier that preps aren't full-blown promises. A prep is merely the description of an async action. It doesn't correspond to an actual, in-flight action. If a prep's `run` method is invoked multiple times, it actually spawns several copies of the same async action. In fact, there is no object that corresponds to an in-flight async action.

However, it's possible to create a special kind of prep that asynchronously computes its value and then caches the result. It wouldn't make sense for a prep to cache its value if it only had one callback, so this caching prep can have multiple listeners. This thing, also called a promise, is an extremely important construct. It allows us to more loosely bind the async action and its interested parties. **Promises allow multiple functions to coordinate around a single asynchronous action.**

From the outside, a promise looks just like a prep. It has the same API, and behaves in generally the same way. They differ from other preps in the way that they determine their value. In essence, they sit somewhere between value preps and async preps, and for that reason, promises are created using top-level functions.

###preppy.promise

A prep can be cached, producing a promise, using `preppy.promise`.

```javascript
var p = ajaxGet(url);

var cachedP = preppy.promise(p);
```

As mentioned above Multiple callbacks can be registered with a single promise. In the following code, even though `run` is called multiple times, the underlying ajaxGet will only be started once.

```javascript
cachedP.run(function(value) {
	console.log("first", value);
});

cachedP.run(function(value) {
	console.log("second", value);
});
```

When a promise is fulfilled (when its async action terminates), the promise remembers the values that were produced. This means that callbacks can be registered either before or after the promise has been fulfilled. If you have some code that depends on a particular value, build a promise that computes that value, and wait on that promise. If multiple sections of code all depend on the same value, have them all wait on the same promise object. It can be handy to place promises into some sort of key/value map, so that they can easily be found by interested parties.

The underlying prep passed to `promise` will not be started immediately; rather, it will be started as soon as the promise is waited upon. To start the underlying prep immediately, see `precache`.

###preppy.precache

This creates a promise just like `preppy.promise`, but also starts the underlying prep immediately. This is useful if you are sure that the value will be needed, but you're not quite sure who needs it yet. While there are uses for this, `promise` is probably the right choice.

##Combining Preps

###preppy.join

Suppose you want to fire off several asynchronous actions, and want to be informed when they have all completed. For that, you can use `join`.

var p1 = ajaxGet(url1);
var p2 = ajaxGet(url2);
preppy.join([p1, p2]).run(function(result1, result2) {
	console.log(result1[0], result2[0]);
});

Because preps can produce multiple values, `join` produces one array per prep. Each array contains that prep's values. This is inconvenient, and there are many cases where a prep produces a single value. This will be made simpler in the future.

###preppy.first

If you want to fire off several asynchronous actions and want to be informed when the first has completed, you can use `first`.

var p1 = prepTimeout(500);
var p2 = prepTimeout(100);
preppy.first([p1, p2]).run(function(result1, result2) {
	assert(result1 === undefined);
	assert(result2[0] === 100);
});

The one prep that succeeds will have a value similar to the value produced by `preppy.join`. The other preps will all produce an undefined value. As with `preppy.join`, this API is awkward. In order to find the prep that succeeded, you must look for the single, non-undefined value. This will be improved in the future.

##History

Preppy started as a regular promise library. My goal was to define two high-level ways to combine promises: `wait_all` and `wait_first`. I reasoned that other things, like `with_timeout`, could be built on those primitives. That library was working well, and I had been using it in a Javascript project that I was building at the time. Then, I decided to try writing some Node.js code.

The thing I was trying to write in Node was an async function that produced a list of all files under a root directory (using asynchronous calls like `fs.stat` and `fs.readdir`). Seriously, if you know how to use Node, try writing this. Don't give into using `fs.statSync` and `fs.readdirSync`. It's a surprisingly hard problem if you don't have tools to help you. So, naturally, I wanted to use my promise library. 

I brought it into the Node code, and things were working fairly well. Node uses callback functions for many actions, and it was easy enough to transform these into promise-oriented functions. However, I became increasingly concerned with the complexity impedance mismatch between Node's use of lightweight callbacks and my use of heavier-weight promises. It was rare that a single async action needed to inform multiple listeners, yet promises brought along all that baggage to every async Node call.

That alone wouldn't have been a deal-breaker for me. However, at the same time, my implementations for map() and bind() were quite complex (this was to avoid creating listener lists at every step of a mapping pipeline - `p.map(f).map(g).map(h)` should only need a single listener list). I eventually realized that these problems were related - promises are really just a caching mechanism over function composition inside async actions. After a frustrating week of theorizing and poking at code, I came up with the idea of a prep. At that point, things seemed to fall into place.