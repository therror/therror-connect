# therror-connect

therror-express implements a connect/express error handler middleware. It also supports ServerError [therror](https://github.com/therror/therror)s

Logs all errors (by default) and replies with an error payload with only the error relevant information. Currently supports [content negotiation](https://en.wikipedia.org/wiki/Content_negotiation) for `text/plain` and `application/json`.

This middleware behaves differently while in `development` or `production` environments. While in production, any internal details (such stack traces) will be revealed, while in development that useful info is **appended** to the production response payload. Set your flavour by using de-facto env var `NODE_ENV` (used also internally by [express](http://stackoverflow.com/questions/16978256/what-is-node-env-in-express)).

It's written in ES6, for node >= 4 

[![npm version](https://badge.fury.io/js/therror-connect.svg)](http://badge.fury.io/js/therror-connect)
[![Build Status](https://travis-ci.org/therror/therror-connect.svg)](https://travis-ci.org/therror/therror-connect)
[![Coverage Status](https://coveralls.io/repos/therror/therror-connect/badge.svg?branch=master)](https://coveralls.io/r/therror/therror-connect?branch=master)


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
app.use(errorHandler());
```

### Therror integration

If you are using Therror in an HTTP app, you should use [ServerErrors](https://github.com/therror/therror#servererrors), which provides lots of goodies for server error management. `therror-connect` will use the `statusCode` property, `toPayload()` and `log()` functions to automatically manage the response with 0 effort for your side
```js
const Therror = require('therror'),
      errorHandler = require('therror-connect');

Therror.Loggable.logger = require('logops');

class UnauthorizedError extends Therror.ServerError({
 statusCode: 401,
 level: 'error'
});

app.use(
 function(req, res, next) {
   user = { id: 12, email: 'john.doe@mailinator.com' };
   next(new UnauthorizedError('User ${id} not authorized', user));
 },
 errorHandler()
);
/* Writes:  
      ERROR UnauthorizedError: User 12 not authorized
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

**`options.log`** can be
 * `true`: logs the error using `console.error`. _default_
 * `false`: logs nothing. 
 * `function(err, context) {}`: provide your custom log function. `err` is the error that arrived to the middleware and `context` is an object with `req` (http request) and `res` (http response) properties
 
 ```js
 app.use(errorHandler({ log: customLog }));
 function customLog(err, context) {
   context.req.log.error(err); // get the logger that other mw has set in the request
 }
 ```

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
