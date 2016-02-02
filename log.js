var log4js = require('log4js'),
    path = require('path');

log4js.configure(path.join(__dirname, 'log4js.json'), {
    reloadSecs: 300
});

module.exports = {
    logger: function(name) {
        var log = log4js.getLogger(name || 'cheese');
        log.setLevel('log4js.levels.INFO');
        return log;
    },

    logMiddle: function() {
        return log4js.connectLogger(log4js.getLogger("access"), {
            level: log4js.levels.INFO
        });
    }
};
