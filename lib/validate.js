var async = require('async');

var KEYS = ['info','debug', 'warn', 'error'];

function createReportHelper(result){
    return function entryReporter(validatorFileName){
        var reportHelpers = {};

        KEYS.forEach(function(key){
            result[key] = result[key]||[];
            reportHelpers[key] = function(message, data){
                var res = {'message': message, 'validatorFileName': validatorFileName};
                if (data){
                    res.data = data;
                }
                result[key].push(res);
            };
            reportHelpers.getResult = function(){
                return result;
            };
        });
        return reportHelpers;
    };
}

function validate(harvestedData, validators, done){
    var resultData = {};
    var entryReporter = createReportHelper(resultData);

    if (!Array.isArray(validators)){
        throw new Error('validators should be an list');
    }

    async.map(validators, function(fileName, done){

        var mod = require(fileName);

        if (!mod || !mod.validate){
            return done();
        }

        mod.validate(harvestedData, entryReporter(fileName), function(){
            // ...
            done();
        });

    }, function(err){
        done(err, harvestedData, resultData);
    });
}


module.exports = {
    validate: validate,
    createReportHelper: createReportHelper
};