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
      Therror = require('therror'),
      util = require('util');

module.exports = errorHandler;

function errorHandler(options) {

  let opts = options || /* istanbul ignore next */ {};

  let development = opts.development || false;
  // get log option
  let log = !(_.isBoolean(opts.log) && !opts.log);

  return function errorHandlerMiddleware(err, req, res, next) {

    if (!err.isTherror || !_.isFunction(err.toPayload) || _.isUndefined(err.statusCode)) {
      err = new Therror.ServerError.InternalServerError(err, 'Unexpected Error');
    }

    log && _.isFunction(err.log) && err.log({
      req: req,
      res: res
    });

    // cannot actually respond
    if (res._header) {
      return req.socket.destroy();
    }

    // Security header for content sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // respect err.statusCode
    res.statusCode = err.statusCode;

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
        response = JSON.stringify(response);
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
    res.end(response);
  };
}

// node 6 adds the stacktrace when toStringing an error
function errToString(err) {
  return err.name + ': ' + err.message;
}
