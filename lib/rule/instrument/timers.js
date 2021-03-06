var t1 = [];
var t2 = [];
var t3 = [];
var t4 = [];

function wrapTimeouts(api) {
    t1.push(api.wrap('setTimeout'));
    t2.push(api.wrap('setInterval'));
    t4.push(api.wrap('clearTimeout'));

    // phantom.js at version 1.9.2 doesnt even include these.
    var impl = function(fn){
        return window.setTimeout(fn, 0);
    };
    t3.push(api.wrap('requestAnimationFrame', impl));
    t3.push(api.wrap('webkitRequestAnimationFrame', impl));
}

module.exports = {
    'onResourceReceived': function (response, api, config) {
        if (response.stage === 'end' && response.url.indexOf(config.nameToTriggerWrap) > -1) {
            wrapTimeouts(api);
        }
    },
    'onBeforeExit': function (api) {
        api.switchToIframe();
        function resolve(fn) { return fn(); }

        api.set('setTimeout', t1.map(resolve));
        api.set('setInterval', t2.map(resolve));
        api.set('requestAnimationFrame', t3.map(resolve));
        api.set('clearTimeout', t4.map(resolve));
    }
};
