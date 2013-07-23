
var Memory = module.exports = function(config) {
	this.type = 'memory';
	this.data = {};
	this.tags = {};
};
Memory.prototype = {

	get: function(key, done) {
		done(null, getValue(this, key));

		return this;
	},

	set: function(key, value, tags, ttl, done) {
		this.data[key] = packageData(value, ttl);

		if(tags) setTags.call(this, key, tags);
		if(done) done(null, true);

		return this;
	},

	mget: function(keys, done) {
		var self = this,
			values = (keys||[]).map(function(key) {
				return getValue(self, key);
			});

		done(null, values);

		return this;
	},

	mset: function(hash, tagMap, ttl, done) {

		var self = this,
			keys = Object.keys(hash||{});

		keys.forEach(function(key) {
			self.data[key] = packageData(hash[key], ttl);
		});

		if(tagMap) {
			Object.keys(tagMap).forEach(function(key) {
				setTags.call(self, key, tagMap[key]);
			});
		}
		if(done) done(null, true);

		return this;
	},

	expire: function(key, ttl, done) {
		var expired = true,
			exists = key in this.data;

		// Adjust ttl or expire the key
		if(exists && ttl !== undefined) {
			this.data[key].expire = getExpiration(ttl);
		}else {
			expired = removeKey(this, key);
		}

		done(null, expired);

		return this;
	},

	getKeys: function(tags, done) {
		var self = this;
		done(null, Object.keys(
			Array.prototype.concat.apply(
				[],
				tags.map(function(tag) { return self.tags[tag] || []; })
			).reduce(function(map, key) { //to make it unique
				map[key] = true;
				return map;
			}, {})
		));
		return this;
	}

};

function setTags(key, tags, done) {

	var self = this;

	tags.forEach(function(tag) {
		if(!self.tags[tag]) self.tags[tag] = [];
		self.tags[tag].push(key);
	});
}

function getValue(cache, key) {
	var value = cache.data[key];

	if(isExpired(value)) {
		removeKey(cache, key);
		value = undefined;
	}

	return value && value.data && JSON.parse(value.data);
}

function removeKey(cache, key) {
	var exists = key in cache.data;
	if(exists) delete cache.data[key];
	return exists;
}

function packageData(value, ttl) {
	var expire = null;
	if(ttl !== undefined) {
		expire = getExpiration(ttl);
	}
	return {
		expire: expire,
		data: JSON.stringify(value)
	};
}

function getExpiration(ttl) {
	return Date.now() + ((ttl^0) * 1000);
}

function isExpired(value) {
	return (value && value.expire) ? value.expire < Date.now() : false;
}
