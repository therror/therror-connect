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
        .expect('X-Content-Type-Options', 'nosniff')
        .expect(500, done);
  });

  describe('writting status code', function() {
    it('should set 500 when invalid one provided', function(done) {
      var server = createServer({statusCode: 200});
      request(server)
          .get('/')
          .expect(500, done);
    });

    it('should set 500 when no one provided', function(done) {
      var server = createServer({});
      request(server)
          .get('/')
          .expect(500, done);
    });

    it('should set the provided one', function(done) {
      var server = createServer({statusCode: 404});
      request(server)
          .get('/')
          .expect(404, done);
    });
  });

  describe('in other environment than "development"', function() {
    describe('when client accepts text/plain', function() {
      it('should serialize error w/o stacktraces', function(done) {
        var error = new TypeError('boom!');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, 'TypeError: boom!', done);
      });

      it('should serialize therror w/o stacktraces', function(done) {
        var error = new Therror.HTTP.NotFound('boom!');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(404, 'NotFound: boom!', done);
      });

      it('should serialize strings', function(done) {
        var server = createServer('boom!');
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, 'boom!', done);
      });

      it('should serialize number', function(done) {
        var server = createServer(42.1);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, '42.1', done);
      });

      it('should not serialize objects to avoid property reveal', function(done) {
        var server = createServer({a: 1});
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, '[object Object]', done)
      });

      it('should not serialize objects with a toString method to avoid property reveal', function(done) {
        var server = createServer({toString: function() { return 'boom!' }});
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, '[object Object]', done)
      });
    });

    describe('when client accepts application/json', function() {
      it('should serialize error w/o stacktraces', function(done) {
        var error = new TypeError('boom!');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, JSON.stringify({
              error: 'TypeError',
              message: 'boom!'
            }), done);
      });

      it('should serialize therror w/o stacktraces', function(done) {
        var error = new Therror.HTTP.NotFound('boom!');
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

      it('should serialize strings', function(done) {
        var server = createServer('boom!');
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"boom!"', done);
      });

      it('should serialize number', function(done) {
        var server = createServer(42.1);
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"42.1"', done);
      });

      it('should not serialize objects to avoid property reveal', function(done) {
        var server = createServer({a: 1});
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"[object Object]"', done)
      });

      it('should not serialize objects with a toString method to avoid property reveal', function(done) {
        var server = createServer({toString: function() { return 'boom!' }});
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"[object Object]"', done)
      });
    });
  });


  describe('in "development" environment', function() {
    var prev;
    before(function() {
      prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
    });
    after(function() {
      process.env.NODE_ENV = prev;
    });
    describe('when client accepts text/plain', function() {
      it('should serialize error with stacktraces', function(done) {
        var error = new TypeError('boom!');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, 'TypeError: boom!\n\nDevelopment info:\n' + serr(error).toString(true), done);
      });

      it('should serialize therror with stacktraces', function(done) {
        var error = new Therror.HTTP.NotFound('boom!');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(404, 'NotFound: boom!\n\nDevelopment info:\n' + serr(error).toString(true), done);
      });

      it('should serialize strings', function(done) {
        var server = createServer('boom!');
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, 'boom!', done);
      });

      it('should serialize number', function(done) {
        var server = createServer(42.1);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, '42.1', done);
      });

      it('should not serialize objects', function(done) {
        var server = createServer({a: 1});
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, '[object Object]', done)
      });

      it('should not serialize objects with a toString method', function(done) {
        var server = createServer({toString: function() { return 'boom!' }});
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500, '[object Object]', done)
      });
    });

    describe('when client accepts application/json', function() {
      it('should serialize error with development info', function(done) {
        var error = new TypeError('boom!');
        var server = createServer(error);
        var $$delevelopmentInfo = serr(error).toObject(true);
        $$delevelopmentInfo.stack = $$delevelopmentInfo.stack.split('\n');
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, JSON.stringify({
              error: 'TypeError',
              message: 'boom!',
              $$delevelopmentInfo: $$delevelopmentInfo
            }), done);
      });

      it('should serialize therror with development info', function(done) {
        var error = new Therror.HTTP.NotFound('boom!');
        error.toPayload = function() {
          return {
            error: this.name,
            message: this.message,
            custom: true
          }
        };
        var $$delevelopmentInfo = serr(error).toObject(true);
        $$delevelopmentInfo.stack = $$delevelopmentInfo.stack.split('\n');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(404, JSON.stringify({
              error: 'NotFound',
              message: 'boom!',
              custom: true,
              $$delevelopmentInfo: $$delevelopmentInfo
            }), done);
      });

      it('should serialize strings', function(done) {
        var server = createServer('boom!');
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"boom!"', done);
      });

      it('should serialize number', function(done) {
        var server = createServer(42.1);
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"42.1"', done);
      });

      it('should not serialize objects, but append dev info', function(done) {
        var server = createServer({a: 1});
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"[object Object]\\n\\nDevelopment info:\\n{ a: 1 }"', done)
      });

      it('should not serialize objects with a toString method, but append dev info', function(done) {
        var server = createServer({toString: function() { return 'boom!' }});
        request(server)
            .get('/')
            .set('Accept', 'application/json')
            .expect('Content-Type', /application\/json/)
            .expect(500, '"boom!"', done)
      });
    });
  });

  describe('logging', function() {

    it('should log to console.error by default', function() {
      sandbox.stub(console, 'error');

      var errorHandlerMiddleware = errorHandler();
      var error = new Error('boom!');
      var server = http.createServer(function(req, res) {
        errorHandlerMiddleware(error, req, res, function() {});
      });

      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            expect(console.error).to.have.been.calledWith(error);
            expect(console.error.args[0][1]).to.not.exits;
            done();
          });
    });

    describe('when using log: true', function() {
      it('should log errors without the context in console.error', function(done) {
        sandbox.stub(console, 'error');
        var error = new Error('boom!');
        var server = createServer(error, {log: true});

        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500)
            .end(function(err, res) {
              if (err) return done(err);
              expect(console.error).to.have.been.calledWith(error);
              expect(console.error.args[0][1]).to.not.exits;
              done();
            });
      });
    });

    describe('when using log: false', function() {
      it('should not log errors to console.error', function(done) {
        sandbox.stub(console, 'error');
        var error = new Error('boom!');
        var server = createServer(error, {log: false});

        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500)
            .end(function(err, res) {
              if (err) return done(err);
              expect(console.error).to.not.have.been.called;
              done();
            });
      });
    });

    describe('when providing a log function', function() {
      it('should log errors there adding the request/response context', function(done) {
        var log = sandbox.spy();

        var error = new Error('boom!');
        var server = createServer(error, {log: log});

        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(500)
            .end(function(err, res) {
              if (err) return done(err);
              expect(log).to.have.been.calledWith(error);
              expect(log.args[0][1]).to.have.property('req');
              expect(log.args[0][1]).to.have.property('res');
              done();
            });
      });
    });

    describe('when a Loggable Therror reaches the middleware', function() {
      it('should use the log method from the Therror with the provided context', function(done) {
        class TestError extends Therror.ServerError() {}
        var error = new TestError('Boom!');

        sandbox.stub(error, 'log');
        var server = createServer(error);
        request(server)
            .get('/')
            .set('Accept', 'text/plain')
            .expect(503)
            .end(function(err, res) {
              if (err) return done(err);
              expect(error.log).to.have.been.called;
              expect(error.log.args[0][0]).to.have.property('req');
              expect(error.log.args[0][0]).to.have.property('res');
              done();
            });
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
    // Dont log by default in test
    log: false
  }, opt));

  return http.createServer(function(req, res) {
    errorHandlerMiddleware(error, req, res, function() {});
  });
}
