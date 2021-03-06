var path = require('path');
var buster = require('referee');
var assert = buster.assert;
var refute = buster.refute;
var helpers = require('../../lib/helpers.js');
var validatorLib = require('../../lib/validate.js');
var validate = validatorLib.validate;

//var CUSTOM_HOOK_PATH = path.resolve(path.join(__dirname, 'fixtures', 'customhook', 'hooky.js'));
var VALIDATOR_PATH_1 = path.resolve(path.join(__dirname, 'fixtures', 'customvalidator', 'validator1.js'));
var VALIDATOR_PATH_2 = path.resolve(path.join(__dirname, 'fixtures', 'customvalidator', 'validator2.js'));

describe('Validate', function () {
    var files = helpers.collectValidator([
        {name: 'validator1', path: VALIDATOR_PATH_1},
        {name: 'validator2', path: VALIDATOR_PATH_2}
    ]);

    it('should throw when missing validators', function(){
        assert.exception(function(){
            validate();
        });


        assert.exception(function(){
            validate({}, [], function(){});
        });
    });

    it('should throw on missing validator', function(){
        var invalidFiles = ['INVALID_PATH'];

        validate({}, {validate: invalidFiles}, function(err){
            assert(err);
        });
    });

    it('should not require objects, but return error on missing validate function', function(done){
        var options = {
            validate: ['INVALID_MODULE']
        };
        validate({}, options, function(err){
            assert(err);
            done();
        });
    });

    it('should run a set of validators on probed data', function (done) {

        assert.equals(files.length, 2);
        assert.equals(files[0].path, VALIDATOR_PATH_1);
        assert.equals(files[1].path, VALIDATOR_PATH_2);

        var harvested = {
            'common': {
                'logs': []
            },
            'hooky': {},
            'hooky2': {}
        };

        var options = {
            'validate': files,
            config: {}
        };

        validate(harvested, options, function (err, harvested, report) {
            refute(err);
            assert.isObject(report);
            assert.equals(report.info.length, 1);
            assert.equals(report.debug.length, 1);
            assert.equals(report.warn.length, 1);
            assert.equals(report.error.length, 1);
            done();
        });

    });

    it('should only provide depedencies properties from hasvested data to validation function', function (done) {

        var data = {
            'custom': {
                'data': 1
            },
            'common': {},
            'filterOut': true
        };
        var validators = {
            'config': {},
            'instrument': [{name: 'custom'}],
            'validate': [{
                'validate': function (harvested, report, next) {
                    refute(harvested.filterOut, 'should only provide dependencies');
                    assert.equals(harvested.custom.data, data.custom.data);
                    next();
                },
                dependencies: ['custom'],
                name: 'validatorx'
            }]
        };

        validate(data, validators, done);
    });

    it('should run preprocessors', function(done){

        var data = {
            'custom': {
                'data': 1
            },
            'common': {},
            'hooky': {},
            'filterOut': true
        };
        var called = 0;

        var options = {
            'config': {},
            'instrument': [
                {name: 'custom'}
            ],
            'validate': [{
                name: 'validate1',
                path: VALIDATOR_PATH_1
            }],
            'preprocess': [{
                preprocess: function (harvested, output, next) {
                    called++;
                    output('custom', 'key', 'value');
                    output('key2', 'value2');
                    refute(harvested.filterOut, 'should only provide dependencies');
                    assert.equals(harvested.custom.data, data.custom.data);
                    next();
                },
                dependencies: ['custom'],
                name: 'custom'
            }]
        };

        validate(data, options, function(err, harvested){
            refute(err);
            assert.equals(called, 1, 'expect preprocessors to be called 1 time');
            assert.equals(harvested.custom.key, 'value');
            assert.equals(harvested.custom.key2, 'value2');
            done();
        });

    });

    it('should error if trying to output on non-key-dependcies', function(){

        var data = {
            'common': {}
        };

        var options = {
            'config': {},
            'validate': [],
            'preprocess': [{
                preprocess: function (harvested, output, next) {
                    output('custom', 'key', 'value');
                    next();
                },
                dependencies: [],
                name: 'preprocessY'
            }]
        };

        validate(data, options, function(err){
            assert(err, 'should return an error');
            assert.isObject(err, 'error should be a object');
        });
    });

    describe('Reporthelpers', function(){
        var reportKeys = validatorLib.REPORT_KEYS;

        it('should provide report fn', function(){
            var result = {};
            var reporter = validatorLib.createReportHelper(result)('test');

            reportKeys.forEach(function(key){
                reporter[key](key+'Message');
            });

            var _result = reporter.getResult();
            assert.equals(_result, result);

            reportKeys.forEach(function(key){
                assert(_result[key]);
            });

        });

        describe('Checklist', function(){

            var result = {};
            var reporter = validatorLib.createReportHelper(result)('test');

            it('should create an default empty checklist array', function(){
                assert.isArray(result.checklist);
            });


            it('should add a entry to called helper, but not to checklist if not active', function(){
                reporter.info(1);

                assert.equals(result.checklist.length, 0);
                assert.equals(result.info.length, 1);
            });


            it('should add items to checklist', function(){
                var list = reporter.setChecklist('LIST', 'DESCRIPTION');

                assert.equals(result.checklist.length, 1);

                reporter.info(2);

                var items = list.info;

                assert.equals(items.length, 1, 'item should be added');

                reporter.info(3);

                assert.equals(items.length, 2, 'item should be added');
                assert.equals(result.info.length, 3);
            });


            it('should exit an checklist', function(){
                reporter.exitChecklist();

                var inserted = reporter.info(4);

                refute(inserted.isInChecklist);

                assert.equals(result.checklist[0].info.length, 2, 'item should NOT be added');
                assert.equals(result.info.length, 4);
            });

            it('should reuse existing checklist if same name', function(){
                var inserted;

                var list2 = reporter.setChecklist('LIST2', 'DESCRIPTION');

                inserted = reporter.info(5);
                assert(inserted.isInChecklist);
                assert.equals(inserted.checklistName, 'LIST2');

                var list1 = reporter.setChecklist('LIST', 'DESCRIPTION');

                inserted = reporter.info(6);
                assert(inserted.isInChecklist);
                assert.equals(inserted.checklistName, 'LIST');

                assert.equals(list1.info.length, 3);
                assert.equals(list2.info.length, 1);
            });
        });

        function createEntry(a, b){
            return {
                file: a||'filename1',
                sourceURL: b||'sourceurl1',
                line: 1
            };
        }

        it('should fix trace data and remove duplicates', function(){
            var result = {};
            var reporter = validatorLib.createReportHelper(result)('test');

            var longSourceUrl = 'very_very_very_long_very_long_very_long_url_and?some_arg';
            var trunc = 'very_very_very_long_very_';
            var trace = [
                createEntry(),
                createEntry('a'),
                createEntry(),
                createEntry('b', longSourceUrl),
                createEntry(),
                createEntry(),
                createEntry(),
                createEntry()
            ];
            reporter.info('msg', {trace: trace});
            var _result = reporter.getResult();
            //console.log(_result.info[0].data.trace);
            assert.equals(_result.info.length, 1);
            assert.equals(_result.info[0].data.trace.length, 3);
            refute.equals(_result.info[0].data.trace[2].file, 'b');
            assert.equals(_result.info[0].data.trace[2].file, trunc);
        });

        it('sending in a trace object should wrap in array', function(){
            var reporter = validatorLib.createReportHelper({})('test');

            reporter.info('msg', {trace: {sourceURL: '....'}});

            assert(reporter.getResult().info[0].data.trace.length, 1);

        });
    });

    describe('createoutputter', function(){

        // validatorLib.createoutputter

        it('should output with context predefined', function(){
            var harvest = {'dummy': {}};
            var o = validatorLib.createOutputter({
                dependencies: ['dummy_ignore', 'dummy'],
                output: 'dummy'
            }, harvest);

            o('key', 'value');
            o('key2', 'value2');
            o('child.key', 'value');
            assert.equals(harvest.dummy.key, 'value');
            assert.equals(harvest.dummy.key2, 'value2');
            assert.equals(harvest.dummy.child.key, 'value');
        });

        it('should output with context implied to first dependency', function(){
            var harvest = {'dummy1': {}};
            var o = validatorLib.createOutputter({
                dependencies: ['dummy1']
            }, harvest);

            o('key', 'value');
            assert.equals(harvest.dummy1.key, 'value');
        });

        it('should throw when no context provided', function(){
            var harvest = {'dummy1': {}};
            var o = validatorLib.createOutputter({}, harvest);

            assert.exception(function(){
                o('key', 'value');
            });
        });
    });

    describe('filterDataByDependencies', function () {
        it('should throw if attempts to change current object', function () {

            var input = {
                common: {deep: {inner: {}}}
            };

            var o = validatorLib.filterDataByDependencies(input, ['dep'], 'test');

            assert(Object.isFrozen(o));
            assert.exception(function () {
                'use strict';
                o.key2 = 'value2';
                o.common.deep.inner.key3 = 'value3';
            });
            refute.equals(o.key2, 'value2');
            refute.equals(o.common.deep.inner.key3, 'value3');
        });

        it('should default to common if missing dependencies', function(){
            var o = validatorLib.filterDataByDependencies({common: {}}, null, 'test');
            assert(Object.isFrozen(o));
            assert(o.common);
        });

        it('should emit warnings when missing dependency data', function(done){
            var _warn = global.console.warn;
            global.console.warn = function(){
                global.console.warn = _warn;
                assert(true);
                done();
            };
            validatorLib.filterDataByDependencies({}, ['missing'], 'not_named_test');
        });

        it('should provide empty object if no data collected to avoid deep if-expressions', function(){

            var o = validatorLib.filterDataByDependencies({common: {}}, ['dep1', 'dep2'], 'test');

            assert.isObject(o.dep1);
            assert.isObject(o.dep2);
            assert.isObject(o.common);
        });
    });
});
