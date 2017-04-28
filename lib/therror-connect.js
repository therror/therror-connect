/**
 * @license
 * Copyright 2016 Telefónica I+D
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const accepts = require('accepts'),
      serr = require('serr'),
      _ = require('lodash'),
      stringify = require('json-stringify-safe'),
      Therror = require('therror'),
      util = require('util');

module.exports = errorHandler;

function errorHandler(options) {

  let opts = options || /* istanbul ignore next */ {};

  let development = opts.development || false;
  // get log option
  let log = !(_.isBoolean(opts.log) && !opts.log);

  let UnexpectedErrorClass = opts.unexpectedClass || Therror.ServerError.InternalServerError;

  if (!isServerTherror(UnexpectedErrorClass.prototype)) {
    throw new Therror('You must provide a ServerError error');
  }

  return function errorHandlerMiddleware(err, req, res, next) {

    if (!err.isTherror || !isServerTherror(err)) {
      err = new UnexpectedErrorClass(err);
    }

    log && _.isFunction(err.log) && err.log({
      req: req,
      res: res
    });

    // cannot actually respond
    if (res._header) {
      return req.socket.destroy();
    }

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'default-src \'self\'');

    // respect err.statusCode
    res.statusCode = err.statusCode;

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    let response;
    // negotiate
    let accept = accepts(req);
    // the order of this list is significant; should be server preferred order
    switch (accept.type(['json'])) {
      case 'json':
        response = err.toPayload();
        if (development) {
          Object.assign(response, {
            $$delevelopmentInfo: serr(err).toObject(true)
          });
          // Split stack in lines for better developer readability
          response.$$delevelopmentInfo.stack = response.$$delevelopmentInfo.stack.split('\n');
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        response = stringify(response);
        break;

      default:
        // the fallback is text/plain, so no need to specify it above
        response = errToString(err);
        if (development) {
          response += '\n\nDevelopment info:\n' + serr(err).toString(true);
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        break;
    }
    res.setHeader('Content-Length', Buffer.byteLength(response, 'utf8'));
    res.end(response);
  };
}

// node 6 adds the stacktrace when toStringing an error
function errToString(err) {
  let payload = err.toPayload();
  return payload.error + ': ' + payload.message;
}

function isServerTherror(obj) {
  return _.isFunction(obj.toPayload) && !_.isUndefined(obj.statusCode);
}

