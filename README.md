# therror-connect

therror-express implements a connect/express error handler middleware for [Therror.ServerError](https://github.com/therror/therror)

Logs all errors (by default) and replies with an error payload with only the error relevant information. Currently supports [content negotiation](https://en.wikipedia.org/wiki/Content_negotiation) for `text/html`, `text/plain` and `application/json`.

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

// The last one middleware added to your app
app.use(errorHandler()); // Some options can be provided. See below
```

### Customize html with express
```js
const express = require('express');
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(errorHandler({
  render: function(data, req, res, cb) {
    res.render(`/errors/${data.statusCode}`, data, cb);
  }
}));
```

### API
```js
let errorHandler = require('therror-connect');
```
**errorHandler(options)**
Creates the middleware configured with the provided `options` object

**`options.log`** `[Boolean]` can be
 * `true`: logs the error using the `error.log({req, res})` method. _default_
 * `false`: does nothing. 
 
**`options.development`** `[Boolean]` can be
 * `false`: Dont add stack traces and development info to the payload. _default_
 * `true`: Add development info to the responses. 
 
**`options.unexpectedClass`** `[class]` The `Therror.ServerError` class to instantiate when an unmanegeable error reaches the middleware. _defaults to `Therror.ServerError.InternalServerError`_

**`options.render`** `Function` to customize the sent html sent. 
```js
function render(data, req, res, cb) {
  // data.error: the error instance. 
  // data.name: error name. Eg: UnauthorizedError
  // data.message: error message. Eg: User 12 not authorized 
  // data.statusCode: associated statusCode to the message. Eg: 401
  // data.stack: looong string with the stacktrace (if options.development === true; else '')

  // req: Incoming http request
  // res: Outgoing http response. Warning! don't send the html, give it to the callback
  // cb: function(err, html) callback to call with the html
}
```
 
## Peer Projects
* [therror](https://github.com/therror/therror): The Therror library, easy errors for nodejs
* [serr](https://github.com/therror/serr): Error serializer to Objects and Strings

## LICENSE

Copyright 2016,2017 [Telefónica I+D](http://www.tid.es)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
