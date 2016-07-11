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

  describe('fallback to ServerError', function() {
    it('should catch errors and transform to Unexpected ServerError', function(done) {
      var error = new Error('boom!');
      var server = createServer(error);

      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: Unexpected Error', done);
    });

    it('should catch strings and transform to Unexpected ServerError', function(done) {
      var server = createServer('boom!');
      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: Unexpected Error', done);
    });

    it('should catch numbers and transform to Unexpected ServerError', function(done) {
      var server = createServer(1);
      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: Unexpected Error', done);
    });

    it('should catch objects and transform to Unexpected ServerError', function(done) {
      var server = createServer({foo: 1});
      request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'InternalServerError: Unexpected Error', done);
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
