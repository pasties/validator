// keep everything inline, as function will be tostringed and evaluated between phantomjs contexts
module.exports = function wrapEvaluate(opt) {
    return (function (opt) {
        // generate id, we use id as a global probe storage
        var key     = opt.name.join('.') + '_store_' + Math.round(Date.now() * Math.random() * 100);
        var store   = (window.top[key] = []);

        function getErrorObject() {
            var catched;
            try {
                throw new Error('Usage violation');
            } catch (err) {
                catched = err;
            }
            if (catched) {
                var res = catched.stackArray[catched.stackArray.length - 1];
                return res;
            }
        }

        var name = opt.name;
        var cursor = window;
        var oldCursor = window;
        var methodName = name[name.length - 1];
        var timer = 0;
        var done = false;

        function query() {
            if (done === true){
                return;
            }
            try {
                // only support 3 levels atm,eg: window.level1.level2.level3;
                // using ugly notation here because couldnt get the references to stick otherwise
                if (name.length === 3) {
                    oldCursor = cursor[name[0]][name[1]][name[2]];
                    cursor[name[0]][name[1]][name[2]] = shim;
                } else if (name.length === 2) {
                    oldCursor = cursor[name[0]][name[1]];
                    cursor[name[0]][name[1]] = shim;
                } else {
                    oldCursor = cursor[name[0]];
                    cursor[name[0]] = shim;
                }
                //console.log('replaced '+methodName+' timer:'+timer);
                done = true;
            } catch (e) {
                timer += 1;
                setTimeout(query, timer);
            }
        }
        // if missing er requery dom until forever
        setTimeout(query, timer);
        // init
        query();


        function shim() {
            //console.log('SHIM called:', methodName, 'event', key);
            store.push({
                name: methodName,
                date: Date.now(),
                trace: getErrorObject()
            });
            if (oldCursor) {
                oldCursor.apply(this, Array.prototype.slice.call(arguments));
            }
        };

        return key;
    })(opt);
}