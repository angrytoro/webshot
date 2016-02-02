var phantom = require('phantom'),
    Url = require('url'),
    os = require('os'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    Q = require('q'),
    _ = require('lodash'),
    log4j = require('./log').logger(),
    Lock = require('./lock');

var port = 8000; //默认端口，每创建一个ph，port自动加1

var Screenshot = function(pageAmount) {
    EventEmitter.call(this);
    this.ph = null; //phantomjs实例
    this.pid = null; //进程号
    this.lock = new Lock(pageAmount || 5);
    setTimeout(this.createPh.bind(this));
};

util.inherits(Screenshot, EventEmitter);
// Function.prototype.bind = function() {
// 	var args = Array.prototype.slice.call(arguments),
// 		method = this;
// 	return function() {
// 		var args_ = Array.proto.type.slice.call(arguments);
// 		method.bind(args.shift(), args.join(args_));
// 	}
// };
_.merge(Screenshot.prototype, {

    createPh: function() {
        var self = this;
        var config = {
            port: port++,
            onExit: function() {
                self.emit('crash', arguments);
                log4j.error('the phantom crash');
                //当phantom.exit()或者phantom process crash(phantom进程崩溃)的时候
            },
            parameters: {
                'web-security': false
            }
        };
        if (os.platform() === 'win32') {
            config.dnodeOpts = {
                weak: false
            }
        };
        phantom.create((function createPhantom(phantomjs) {
            this.ph = phantomjs;
            this.pid = phantomjs.process.pid;
            this.emit('create');
            log4j.info('create phantomjs the pid is:' + this.pid);
        }).bind(this), config);
    },

    capture: function(type, url, setting) {
        setting = _.merge({
            viewportSize: {
                width: 1366
            },
            // zoomFactor: 1,
            shotConfig: {
                format: 'jpeg',
                quality: 100
            },
            delay: 3000
        }, setting || {});
        var deferred = Q.defer();

        Q.fcall(this.getPage_.bind(this))
            .then((function(page) {
                this.initPageConfig_(page, setting);
                this.bindPageEvents_(page, url);
                return page;
            }).bind(this))
            .then(this.capture_.bind(this, type, url, setting))
            .then(function(data) {
                deferred.resolve(data);
            })
            .catch(function(e) {
                log4j.warn(e);
                deferred.reject(e);
            });
        return deferred.promise;
    },

    getPage_: function() {
        var deferred = Q.defer();
        var self = this;
        Q.fcall(this.lock.lock.bind(this.lock)).then(function() {
            self.ph.createPage(function(page) {
                deferred.resolve(page);
            });
        }).catch(function(e) {
            self.lock.unlock(); //如果获取page失败，则马上解锁
            deferred.reject(e);
        });
        return deferred.promise;
    },

    capture_: function(type, url, setting, page) {
        var deferred = Q.defer();
        var self = this;
        page.open(url, function(status) {
            if (status === 'success') {
                page.evaluate(function(setting) {
                    document.body.style.width = setting.viewportSize.width + 'px';
                }, function() {
                    setTimeout(function() {
                        if(type === 'base64') {
                            page.renderBase64(setting.shotConfig.format.toUpperCase(), function(data) {
                                deferred.resolve(data);
                            });
                        } else {
                            var fileName = self.generateFileName_(url, setting);
                            page.render(fileName, setting.shotConfig, function() {
                                deferred.resolve(fileName);
                            });
                        }
                    }, setting.delay);
                }, setting);
            } else {
                deferred.reject(new Error('net error the status is ' + status));
            }
        });
        return deferred.promise.finally(function() {
            page.close(); //无论打开页面失败或者成功，执行完相应的命令，就应该马上关闭页面
        });
    },

    generateFileName_: function(url, setting) {
        var pathname = Url.parse(url, true).pathname,
            name = pathname.lastIndexOf('/') === '/' ? '' : pathname.substr(pathname.lastIndexOf('/') + 1);
        fileName = name + new Date().getTime() + '.' + setting.shotConfig.format;
        return path.join(__dirname, 'tmp', fileName);
    },

    initPageConfig_: function(page, setting) {
        setting.zoomFactor ? page.set('zoomFactor', setting.zoomFactor) : '';
    },

    bindPageEvents_: function(page, url) {
        page.set('onError', function(msg, trace) {
            var msgStack = ['ERROR: ' + msg];

            if (trace && trace.length) {
                msgStack.push('TRACE:');
                trace.forEach(function(t) {
                    msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function+'")' : ''));
                });
            }
            log4j.warn('[' + url + '] ' + msgStack.join('\n'));
        });
        page.set('onLoadFinished', function(status) {
            log4j.info('[' + url + '] Loading finished,the page is ' + ((status == "success") ? "open." : "not open!"));
        });
        var self = this;
        page.set('onClosing', function(closingPage) {
            self.lock.unlock(); //page关闭后解锁
            log4j.info('[' + closingPage.url + '] closed');
        });
    }
});

module.exports = Screenshot;

// {
// 	viewportSize: {width: 1366: height: 10000},
// 	shotConfig: {format: 'jpeg', quality: 100}, //format: png, gif, jpeg, pdf. quality: 0~100
// 	zoomFactor: 1
// }
