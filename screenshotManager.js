var Screenshot = require('./screenshot'),
	EventEmitter = require('events').EventEmitter,
	util = require('util'),
	_ = require('lodash');

var index = 0;

var ScreenshotManager = function(amount) {
	EventEmitter.call(this);
	this.amount = amount || 3;
	this.curruntAmout = 0;
	this.cache = {length: this.amount};
	this.init();
};

util.inherits(ScreenshotManager, EventEmitter);

_.merge(ScreenshotManager.prototype, {

	init: function() {
		for(var i = 0; i < this.amount; i++) {
			this.createScreenshot();
		}
	},

	createScreenshot: function(index) {
		var self = this;
		var screenshot = new Screenshot();
		screenshot.on('create', function() {
			var item = {pid: this.pid, screenshot: this, crash: false};
			if(index) {
				self.cache[index] = item
			} else {
				self.cache[self.curruntAmout++] = item;
				if(self.curruntAmout === self.amount) {
					self.emit('inited');
				}
			}
		});
		screenshot.on('crash', function() {
			self.createScreenshot(self.getIndex(this.pid));
		});
	},

	getScreenshot: function() {
		while(true) {
			var item = this.cache[index%this.amount];
			index = ++index%this.amount;
			if(!item.crash) {
				return item.screenshot;
			}
		}
	},

	getIndex: function(pid) {
		for(var i = 0; i < this.amount; i++) {
			var item = this.cache[i];
			if(item.pid === pid) {
				return i;
			}
		}
		return -1; 
	}
});

module.exports = ScreenshotManager;