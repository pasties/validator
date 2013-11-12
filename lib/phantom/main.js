/*
    PhantomJS "main"-script

*/
var getSource = require('./getSource.js');
var system = require('system');
//var fs = require('fs');

function output(data) {
    console.log(JSON.stringify(data));
}

function systemError(data) {
    data.systemError = true;
    output(data);
    phantom.exit(1);
}

// phantom breaking errors, most likely error in current file or arguments too the process
phantom.onError = function (msg, trace) {
    var msgStack = ['PHANTOM ERROR: ' + msg];
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function (t) {
            var fn = (t.function ? ' (in function ' + t.function +')' : '');
            msgStack.push(' -> ' + (t.file || t.sourceURL) + ':' + t.line + fn);
        });
    }
    systemError({
        message: msg,
        stack: msgStack.join('\n')
    });
    return false;
};

var page = require('webpage').create();

var result = {
    systemErrors: [],
    errors: [],
    logs: []
};

page.onError = function(message, trace){
    result.errors.push({type:'main::page.error', message: message, trace: trace, date: Date.now()});
    return true;
};

var createHooks;
var hooksApi;
try {
    createHooks = require('./createHooks.js');
    hooksApi = require('./hooksApi.js');
} catch (e) {
    systemError({
        message: 'Failed require inline modules:' + e.message,
        from: getSource(e)
    });
}

if (system.args.length <= 1) {
    systemError({
        message: 'Missing arguments / options'
    });
} else {


    // Extended by defaults before injected
    var opt = page.options = JSON.parse(system.args[1]);

    // debug
    // result.input = opt;

    // Init Hooks
    var api;
    try {
        api = hooksApi(phantom, page, result);
        api.trigger = createHooks(page, opt, api, result);
    } catch (e) {
        if (e) {
            systemError({
                message: 'Failed to create hooks:' + e.message,
                from: getSource(e)
            });
        }
    }

    /*
        CONFIG:
    */
    page.customHeaders = opt.headers;
    page.settings.userAgent = opt.userAgent;
    page.viewportSize = {
        width: opt.width,
        height: opt.height
    };

    page.javaScriptConsoleMessageSent('Page.open starting, opening up '+opt.parentUrl);

    page.open(opt.parentUrl, function (status) {
        if (status !== 'success') {
            return systemError({
                message: 'Failed to load the url: ' + opt.parentUrl,
                key: 'pageUrl',
                catchedBy: 'phantom.open'
            });
        }

        try {
            api.trigger('onPageOpen');
        } catch (e) {
            if (e) {
                return systemError({
                    message: 'Failed to trigger onOpen: ' + e.message,
                    from: getSource(e)
                });
            }
        }

        setTimeout(function () {
            page.javaScriptConsoleMessageSent('Exit started');

            try {
                api.trigger('onBeforeExit');
            } catch (e) {
                if (e) {
                    return systemError({
                        message: 'Failed to trigger onBeforeExit: ' + e.message,
                        from: getSource(e)
                    });
                }
            }

            page.javaScriptConsoleMessageSent('Exit done');

            //finish off
            result.endTime = Date.now();
            output(result);
            phantom.exit();

        }, opt.pageRunTime);
    });
}