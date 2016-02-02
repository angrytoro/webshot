var ScreenshotManager = require('./screenshotManager'),
    os = require('os'),
    express = require('express'),
    bodyParser = require('body-parser'),
    exphbs = require('express-handlebars'),
    log4j = require('./log');

var app = express();

//查看http://wiki.jikexueyuan.com/project/express-mongodb-setup-blog/handlebars.html
app.engine('hbs', exphbs({
    extname: '.hbs'
}));
// app.engine('hbs', exphbs({defaultLayout: 'main', extname: '.hbs'}));
app.set('view engine', 'hbs');

app.use(require('morgan')('combined'));
app.use(log4j.logMiddle());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use('/tmp', express.static(__dirname + '/tmp'));

app.get('/', function(req, res) {
    if (req.query.type === 'base64') {
        res.render('base64.hbs');
    } else {
        res.render('home');
    }
});

var getSetting = function(query) {
    var result = {
        viewportSize: {},
        shotConfig: {}
    };
    if (query.width) {
        result.viewportSize.width = query.width;
    }
    if (query.height) {
        result.viewportSize.height = query.height;
    }
    if (query.format) {
        result.shotConfig.format = query.format;
    }
    if (query.quality) {
        result.shotConfig.quality = query.quality;
    }
    if (query.zoomFactor) {
        result.zoomFactor = query.zoomFactor;
    }
    return result;
};

app.get('/capture', function(req, res) {
    var query = req.query,
        setting = getSetting(query);
    screenshotManager.getScreenshot().capture(null, query.url, setting).then(function(filepath) {
        if(os.platform() === 'win32') {
            res.redirect('/tmp/' + filepath.split('\\').pop());
        } else {
            res.redirect('/tmp/' + filepath.split('/').pop());
        }
    }).catch(function(e) {
        res.send(e);
    });
});
app.get('/capture/base64', function(req, res) {
    var query = req.query,
        setting = getSetting(query);
    screenshotManager.getScreenshot().capture('base64', query.url, setting).then(function(data) {
        res.render('capture', {
            format: req.query.format,
            content: data
        });
    }).catch(function(e) {
        res.send(e);
    });
});

var screenshotManager = new ScreenshotManager(3).on('inited', function() {
    app.listen(3000).on('connect', function() {
        log4j.getLogger().info('启动');
    });
});