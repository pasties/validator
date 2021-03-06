var referee = require('referee');
var assert = referee.assert;
var refute = referee.refute;

var proxyquire = require('proxyquire');

var help = require('../lib/validateHelpers.js');
var instrumentation = require('../../lib/rule/instrument/jquery.js');

describe('jQuery instrumentation', function() {

    it('should call wrap', function() {

        var calls = 0;
        var api = {
            wrap: function() {
                calls++;
            }
        };

        instrumentation.onResourceReceived({
            url: 'someUrl',
            stage: 'end'
        }, api);

        assert.equals(calls, 0);

        instrumentation.onResourceReceived({
            url: 'jquery.js',
            stage: 'start'
        }, api);

        assert.equals(calls, 0);

        instrumentation.onResourceReceived({
            url: 'jquery.js',
            stage: 'end'
        }, api);

        assert.equals(calls, 1);

        instrumentation.onResourceReceived({
            url: 'jquery.js',
            stage: 'end'
        }, api);

        assert.equals(calls, 1, 'should only wrap once');
    });

    it('should collect wrapped and jquery version', function() {

        var calls = 0;
        var result = {
            jquery: {}
        };
        var key = ('12345' + Math.round(Math.random() + Date.now()));
        var apiShim = {
            switchToIframe: function() {
                calls++;
            },
            set: function(key, value) {
                result.jquery[key] = value;
            },
            evaluate: function(fn) {
                global.window = {
                    jQuery: {
                        fn: {
                            jquery: key
                        }
                    }
                };
                calls++;
                var result = fn();
                global.window = undefined;
                return result;
            }
        };

        instrumentation.onBeforeExit(apiShim);

        assert.equals(calls, 2);
        assert.equals(result.jquery.version, key);

    });

});

var jqueryValidator = require('../../lib/rule/validate/jquery.js');

describe('jQuery validator', function() {

    it('should report error if animate called', function(done) {
        var harvested = {
            jquery: {
                animate: [
                    [help.getTraceObject(1), help.getTraceObject(2), help.getTraceObject(3)],
                    [help.getTraceObject(4), help.getTraceObject(5), help.getTraceObject(6)]
                ]
            }
        };

        var report = help.createReporter.call(this);

        jqueryValidator.validate(harvested, report, function() {
            var result = report.getResult();
            assert.equals(result.error.length, 2);
            done();
        });

    });

    it('should report error when version doesnt match latest', function(done) {
        this.timeout(3000);
        var report = help.createReporter.call(this);
        var harvested = {
            jquery:  {
                version: '1.10.1'
            }
        };

        function output(key, value) {
            harvested.jquery[key] = value;
        }

        var mock = {
            '../lib/getLatestJquery.js': {
                getLatest: function(vb, cb) {
                    cb([
                        {
                            "major":1,"minor":11,"patch":3,"sortKey":11103
                        },{
                            "major":2,"minor":1,"patch":4,"sortKey":20104
                        }
                    ]);
                }
            }
        };

        help.callPreprocessor('jquery', harvested, output, function() {
            help.callValidator('jquery', harvested, report, function() {
                var result = report.getResult();
                assert.equals(result.error.length, 1);
                done();
            });
        }, {}, mock);

    });
});

var getGithubTags = proxyquire('../../lib/rule/lib/getGithubTags.js', {
    request: function(url, opt, cb) {
        setTimeout(function() {
            cb(null, {}, JSON.stringify(require('./fixtures/tags.js')));
        }, 1);
    }
})

var getLatestJquery = proxyquire('../../lib/rule/lib/getLatestJquery.js', {
    './getGithubTags.js': getGithubTags
});

describe('getLatestJquery', function() {

    it('should fetch 2 tags from jquery github repo tags, and return same object', function(done) {
        this.timeout(100);
        getLatestJquery.getLatest(1, function(tags) {
            getLatestJquery.getLatest(1, function(tagsCached) {
                assert.equals(tags, tagsCached);
                assert.equals(tags.length, 2);
                done();
            });
        });
    });


    it('should fetch 3 tags', function(done) {
        this.timeout(100);
        getLatestJquery.getLatest(3, function(tags) {
            assert.equals(tags.length, 6);
            done();
        });

    });

});
