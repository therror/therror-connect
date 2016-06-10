# therror-connect

therror-express implements a connect/express error handler. It also supports ServerError [therror](https://github.com/therror/therror)s

This middleware can be used in a development or production environment

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
