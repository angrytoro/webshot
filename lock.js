var Q = require('q');
var fs = require('fs');
var path = require('path');

var Lock = function(amount) {
	this.amount = amount;
	this.currentLock = 0;
	this.delayArray = [];
};

Lock.prototype.lock = function() {
	var deferred = Q.defer();
	if(this.currentLock >= this.amount) {
		this.delayArray.push(deferred);
	} else {
		fs.writeFile(path.join(__dirname, 'log', 'lock.log'), '[' + new Date().toString() + ']lock=' + this.currentLock + '\n', {flag: 'a'});
		this.currentLock++;
		deferred.resolve();
	}
	return deferred.promise;
};

Lock.prototype.unlock = function() {
	if(this.delayArray.length) {
		this.delayArray.shift().resolve();
	} else {
		fs.writeFile(path.join(__dirname, 'log', 'lock.log'), '[' + new Date().toString() + ']unlock=' + this.currentLock + '\n', {flag: 'a'});
		this.currentLock--;
	}
};

module.exports = Lock;