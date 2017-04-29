'use strict';

var errorHandler = require('../lib/therror-connect'),
    Therror = require('therror'),
    http = require('http'),
    request = require('supertest'),
    serr = require('serr');

describe('errorHandler()', function() {
  it('should set nosniff header', function(done) {
    var server = createServer(new Error('boom!'));
    request(server)
        .get('/')
        .expect('X-Content-Type-Options', 'nosniff', done);
  });

  it('should set CSP header', function(done) {
    var server = createServer(new Error('boom!'));
    request(server)
        .get('/')
        .expect('Content-Security-Policy', 'default-src \'self\'', done);
  });

  it('should set Content-Length header', function(done) {
    var error = new Error('boom!');
    var server = createServer(error);
    var msg = 'InternalServerError: An internal server error occurred';

    request(server)
        .get('/')
        .set('Accept', 'text/plain')
        .expect('Content-Length', String(msg.length), done);
  });

  it('should end with no content with HEAD requests', function(done) {
    var server = createServer(new Error('boom!'));
    request(server)
      .head('/')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('Content-Security-Policy', 'default-src \'self\'')
      .expect(function(res) {
        if (res.headers['Content-Type'] || res.headers['Content-Length']) {
          throw new Error('Unexpected header');
        }
      })
      .expect(500, undefined, done);
  });

  describe('fallback to ServerError', function() {
    it('should catch errors and transform to Internal Server Error', function(done) {
      var error = new Error('boom!');
      var server = createServer(error);

      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: An internal server error occurred', done);
    });

    it('should catch strings and transform to Internal Server Error', function(done) {
      var server = createServer('boom!');
      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: An internal server error occurred', done);
    });

    it('should catch numbers and transform to Internal Server Error', function(done) {
      var server = createServer(1);
      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: An internal server error occurred', done);
    });

    it('should catch objects and transform to Internal Server Error', function(done) {
      var server = createServer({foo: 1});
      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: An internal server error occurred', done);
    });

    it('should use UnexpectedError class provided', function(done) {
      class MyError extends Therror.ServerError({
        statusCode: 499
      }) {};

      var server = createServer({foo: 1}, { unexpectedClass: MyError });
      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(499, done);
    });

    it('should throw if the configured UnexpectedError is not a therror', function() {

      function catheo() {
        errorHandler({ unexpectedClass: Error });
      }

      expect(catheo).to.throw(Therror, /You must provide a ServerError error/);
    });
  });

  describe('in other environment than "development"', function() {
    describe('when client accepts text/plain', function() {
      it('should serialize ServerErrors w/o stacktraces', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(404, 'NotFound: boom!', done);
      });
    });

    describe('when client accepts application/json', function() {
      it('should serialize therror w/o stacktraces', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        error.toPayload = function() {
          return {
            error: this.name,
            message: this.message,
            custom: true
          }
        };
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(404, JSON.stringify({
              error: 'NotFound',
              message: 'boom!',
              custom: true
            }), done);
      });
    });

    describe('when client accepts text/html', function() {
      it('should return default html', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'text/html')
            .expect('Content-Type', /text\/html/)
            .expect(404, `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Error 404</title>
  </head>
  <body>
    <h1>NotFound <i>(404)</i></h1>
    <h2>boom!</h2>
    <pre></pre>
  </body>
</html>`, done);
      });

      it('should return user defined html', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error, {
          render(data, req, res, next) {
            next(null, '<hello>')
          }
        });
        request(server)
            .get('/')
            .set('Accept', 'text/html')
            .expect('Content-Type', /text\/html/)
            .expect(404, '<hello>', done);
      });

      it('should pass precomputed arguments to the render function', function(done) {
        var error = new Therror.ServerError.NotFound('<p>boom!</p>');
        var server = createServer(error, {
          render(data, req, res, next) {
            expect(data.error).to.be.eql(error);
            expect(data.name).to.be.eql('NotFound');
            expect(data.message).to.be.eql('&lt;p&gt;boom!&lt;/p&gt;');
            expect(data.statusCode).to.be.eql(404);
            expect(data.stack).to.be.eql('');
            next(null, '<hello>');
          }
        });
        request(server)
            .get('/')
            .set('Accept', 'text/html')
            .expect('Content-Type', /text\/html/, done);
      });

      it('should return default html when the user render fails async', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error, {
          render(data, req, res, next) {
            next(new Error('RenderError'));
          }
        });
        request(server)
            .get('/')
            .set('Accept', 'text/html')
            .expect('Content-Type', /text\/html/)
            .expect(500, /<!DOCTYPE html>/, done);
      });

       it('should return default html when the user render fails sync', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error, {
          render(data, req, res, next) {
            throw new Error('RenderError');
          }
        });
        request(server)
            .get('/')
            .set('Accept', 'text/html')
            .expect('Content-Type', /text\/html/)
            .expect(500, /<!DOCTYPE html>/, done);
      });
      
    });
  });

  describe('in "development" environment', function() {
    describe('when client accepts text/plain', function() {
      it('should serialize ServerErrors with stacktraces', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error, { development: true });
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(404, /NotFound: boom!\n\nDevelopment info:.*/, done);
      });
    });

    describe('when client accepts application/json', function() {
      it('should serialize error with development info', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error, { development: true });
        var $$delevelopmentInfo = serr(error).toObject(true);
        $$delevelopmentInfo.stack = $$delevelopmentInfo.stack.split('\n');
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(404, JSON.stringify({
              error: 'NotFound',
              message: 'boom!',
              $$delevelopmentInfo: $$delevelopmentInfo
            }), done);
      });
    });

    describe('when client accepts text/html', function() {
      it('should return default html with dev info ', function(done) {
        var error = new Therror.ServerError.NotFound('boom!');
        var server = createServer(error, { development: true });
        request(server)
            .get('/')
            .set('Accept', 'text/html')
            .expect('Content-Type', /text\/html/)
            //.expect(404,  /.*<pre>(.+)<\/pre>/, done);
            .expect(404,  /<pre>(.|\n)+<\/pre>/, done);
      });
    })
  });

  describe('logging', function() {

    it('should log using err.log', function(done) {
      var error = new Therror.ServerError.NotFound('boom!');
      sandbox.stub(error, 'log');

      var server = createServer(error, { log: true });

      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            expect(error.log).to.have.been.called;
            var params = error.log.args[0][0]; // {req, res}
            expect(params).to.have.property('req');
            expect(params).to.have.property('res');
            done();
          });
    });

    it('should not log using err.log when configured', function(done) {
      var error = new Therror.ServerError.NotFound('boom!');
      sandbox.stub(error, 'log');

      var server = createServer(error, { log: false });

      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            expect(error.log).to.not.have.been.called;

            done();
          });
    });

  });

  describe('headers sent', function() {
    var server;

    before(function() {
      var errorHandlerMiddleware = errorHandler({log: false});
      server = http.createServer(function(req, res) {
        res.end('0');
        process.nextTick(function() {
          errorHandlerMiddleware(new Error('boom!'), req, res, function(error) {
            process.nextTick(function() {
              throw error
            });
          });
        });
      });
    });

    it('should not die', function(done) {
      request(server)
          .get('/')
          .expect(200, done);
    });
  });
});


function createServer(error, opt) {
  var errorHandlerMiddleware = errorHandler(Object.assign({
    // dont log by default in test
    log: false,
    development: false
  }, opt));

  return http.createServer(function(req, res) {
    errorHandlerMiddleware(error, req, res, function() {});
  });
}
