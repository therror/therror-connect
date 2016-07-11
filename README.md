# therror-connect

therror-express implements a connect/express error handler middleware for [Therror.ServerError](https://github.com/therror/therror)

Logs all errors (by default) and replies with an error payload with only the error relevant information. Currently supports [content negotiation](https://en.wikipedia.org/wiki/Content_negotiation) for `text/plain` and `application/json`.

It's written in ES6, for node >= 4 

[![npm version](https://badge.fury.io/js/therror-connect.svg)](http://badge.fury.io/js/therror-connect)
[![Build Status](https://travis-ci.org/therror/therror-connect.svg)](https://travis-ci.org/therror/therror-connect)
[![Coverage Status](https://coveralls.io/repos/github/therror/therror-connect/badge.svg?branch=master)](https://coveralls.io/github/therror/therror-connect?branch=master)

## Installation 
```bash
 npm install --save therror-connect
```

## Usage
```js
const errorHandler = require('therror-connect');
const connect = require('connect');

let app = connect();

// The last one middleware added to your express app
app.use(errorHandler({
  log: true, // use the `log` method in the ServerError to log it (default: true)
  development: process.NODE_ENV === 'development' // return stack traces and causes in the payload (default: false),
  unexpectedClass: Therror.ServerError.InternalServerError // When a strange thing reaches this middleware trying to behave as an error (such a Number, String, obj..), this error class will be instantiated, logged, and returned to the client. 
}));
```

### Full Example
```js
const Therror = require('therror'),
      errorHandler = require('therror-connect');

Therror.Loggable.logger = require('logops');

app.use(
 function(req, res, next) {
   user = { id: 12, email: 'john.doe@mailinator.com' };
   next(new Therror.ServerError.Unauthorized('User ${id} not authorized', user));
 },
 errorHandler()
);
/* Writes log:  
      UnauthorizedError: User 12 not authorized
      UnauthorizedError: User 12 not authorized { id: 12, email: 'john.doe@mailinator.com' }
          at Object.<anonymous> (/Users/javier/Documents/Proyectos/logops/deleteme.js:17:11)
          at Module._compile (module.js:409:26)
          at Object.Module._extensions..js (module.js:416:10)
          at Module.load (module.js:343:32)
          at Function.Module._load (module.js:300:12)
          at Function.Module.runMain (module.js:441:10)
          at startup (node.js:139:18)
          at node.js:968:3

 Replies: 
        401
        { error: 'UnauthorizedError',
         message: 'User 12 not authorized' }
*/
```

### API
```js
let errorHandler = require('therror-connect');
```
**errorHandler(options)**
Creates the middleware configured with the provided `options` object

**`options.log`** `[Boolean]` can be
 * `true`: logs the error using the `error.log` method. _default_
 * `false`: does nothing. 
 
**`options.development`** `[Boolean]` can be
 * `false`: Dont add stack traces and development info to the payload. _default_
 * `true`: Add development info to the payload. 
 
**`options.unexpectedClass`** `[class]` The `Therror.ServerError` class to instantiate when an unmanegeable error reaches the middleware. _defaults to `Therror.ServerError.InternalServerError`_
 
## Peer Projects
* [therror](https://github.com/therror/therror): The Therror library, easy errors for nodejs
* [serr](https://github.com/therror/serr): Error serializer to Objects and Strings

## LICENSE

Copyright 2016 [Telefónica I+D](http://www.tid.es)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
