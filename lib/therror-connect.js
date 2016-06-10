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
      util = require('util');

module.exports = errorHandler;

function errorHandler(options) {

  // get options
  let opts = options || {};

  // get log option
  let log = _.isUndefined(opts.log) ?
      true :
      opts.log;

  if (!_.isFunction(log) && !_.isBoolean(log)) {
    throw new TypeError('option log must be function or boolean');
  }

  // default logging using console.error
  if (log === true) {
    log = console.error;
  }

  return function errorHandlerMiddleware(err, req, res, next) {

    // respect err.statusCode
    if (err.statusCode) {
      res.statusCode = err.statusCode;
    }

    // default status code to 500
    if (res.statusCode < 400) {
      res.statusCode = 500;
    }

    if (err.isTherror && _.isFunction(err.log)) {
      err.log({
        req: req,
        res: res
      });
    } else if (log) {
      log(err, log !== console.error ? {
        req: req,
        res: res
      } : undefined);
    }

    // cannot actually respond
    if (res._header) {
      return req.socket.destroy();
    }

    // Security header for content sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    let response;
    // negotiate
    let accept = accepts(req);
    // the order of this list is significant; should be server preferred order
    switch (accept.type(['json'])) {
      case 'json':
        if (process.env.NODE_ENV === 'development') {
          if (err instanceof Error) {
            response = simplerr(err);
            Object.assign(response, {
              $$delevelopmentInfo: serr(err).toObject(true)
            });
            // Split stack in lines for better developer readability
            response.$$delevelopmentInfo.stack = response.$$delevelopmentInfo.stack.split('\n');
          } else {
            response = stringify(err);
          }
        } else {
          if (err instanceof Error) {
            response = simplerr(err);
          } else {
            response = saferialize(err);
          }
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        response = JSON.stringify(response);
        break;

      default:
        // the fallback is text/plain, so no need to specify it above
        if (process.env.NODE_ENV === 'development') {
          if (err instanceof Error) {
            response = errToString(err) + '\n\nDevelopment info:\n' +
                serr(err).toString(true);
          } else {
            response = saferialize(err);
          }
        } else {
          if (err instanceof Error) {
            response = errToString(err);
          } else {
            response = saferialize(err);
          }
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        break;
    }
    res.end(response);
  };
}

function simplerr(err) {
  if (_.isFunction(err.toPayload)) {
    return err.toPayload();
  } else {
    return {
      error: err.name,
      message: err.message
    };
  }
}

// node 6 adds the stacktrace when toStringing an error
function errToString(err) {
  return err.name + ': ' + err.message;
}

function saferialize(err) {
  return Object.prototype.toString.call(err) === '[object Object]' ?
    // hide objects in production mode!
      String({}) :
      String(err) ;
}

function stringify(val) {
  let str = String(val);

  return str += str === Object.prototype.toString.call(val) ?
      '\n\nDevelopment info:\n' + util.inspect(val) :
      '';
}

