/**
 * @license
 * Copyright 2016,2017 Telefónica I+D
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

const accepts = require('accepts');
const serr = require('serr');
const _ = require('lodash');
const stringify = require('json-stringify-safe');
const Therror = require('therror');
const util = require('util');
const escapeHtml = require('escape-html');

module.exports = errorHandler;

class HtmlRenderError extends Therror.ServerError.InternalServerError {}

function errorHandler(options) {

  let opts = options || /* istanbul ignore next */ {};

  let development = opts.development || false;
  // get log option
  let log = !(_.isBoolean(opts.log) && !opts.log);

  let UnexpectedErrorClass = opts.unexpectedClass || Therror.ServerError.InternalServerError;

  let render = opts.render || renderTherrorConnect;

  if (!isServerTherror(UnexpectedErrorClass.prototype)) {
    throw new Therror('You must provide a ServerError error');
  }

  return function errorHandlerMiddleware(err, req, res, next) {

    if (err instanceof HtmlRenderError) {
      // An error in userland was raised when rendering using the provided options.render
      // use our safe one
      render = renderTherrorConnect;
    } else if (!err.isTherror || !isServerTherror(err)) {
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
    // TODO check it's a number
    res.statusCode = err.statusCode;

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    let response;
    // negotiate
    let accept = accepts(req);
    // the order of this list is significant; should be server preferred order
    switch (accept.type(['json', 'html'])) {
      case 'json':
        response = err.toPayload();
        if (development) {
          Object.assign(response, {
            $$delevelopmentInfo: serr(err).toObject(true)
          });
          // Split stack in lines for better developer readability
          response.$$delevelopmentInfo.stack = response.$$delevelopmentInfo.stack.split('\n');
        }
        response = stringify(response);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        end(res, response);
        break;

      case 'html':
        let payload = err.toPayload();
        let data = {
          error: err,
          name: escapeHtml(payload.error || 'Error'),
          message: escapeHtml(payload.message || 'Error'),
          statusCode: err.statusCode,
          stack: development ? escapeHtml(serr(err).toString(true)) : ''
        };

        try {
          render(data, req, res, htmlCb);
        } catch (err) {
          return htmlCb(err);
        }

        function htmlCb(err, html) {
          if (err) {
            let error = new HtmlRenderError(err, 'Cannot render with provided renderer');
            return errorHandlerMiddleware(error, req, res);
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          end(res, html);
        }

        break;

      default:
        // the fallback is text/plain, so no need to specify it above
        response = errToString(err);
        if (development) {
          response += '\n\nDevelopment info:\n' + serr(err).toString(true);
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        end(res, response);
        break;
    }
  };
}

function end(res, response) {
  res.setHeader('Content-Length', Buffer.byteLength(response, 'utf8'));
  res.end(response);
}

// node 6 adds the stacktrace when toStringing an error
function errToString(err) {
  let payload = err.toPayload();
  return payload.error + ': ' + payload.message;
}

function isServerTherror(obj) {
  return _.isFunction(obj.toPayload) && !_.isUndefined(obj.statusCode);
}

function renderTherrorConnect(data, req, res, cb) {
  return cb(null, `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Error ${data.statusCode}</title>
  </head>
  <body>
    <h1>${data.name} <i>(${data.statusCode})</i></h1>
    <h2>${data.message}</h2>
    <pre>${data.stack}</pre>
  </body>
</html>`);
}
