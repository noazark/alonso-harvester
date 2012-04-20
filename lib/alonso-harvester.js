var Hook = require('hook.io').Hook
  , mongodb = require('mongodb')
  , util = require('util')
  , server, database, messages;

var Harvester = exports.Harvester = function(options) {
  var self = this;
  Hook.call(this, options);

  // TODO: throw no config error

  server = new mongodb.Server(self.mongodb.host, self.mongodb.port, {});
  database = new mongodb.Db(self.mongodb.database, server, {});

  self.on('hook::ready', function () {
    database.open(function (err, database) {
      if(err) throw err;
      messages = new mongodb.Collection(database, 'messages');

      self.on('follower::message::recieved', self._store);
      self.on('*::follower::message::recieved', self._store);
    });
  });
}

util.inherits(Harvester, Hook);

Harvester.prototype.type = "Harvester";

Harvester.prototype._store = function(data, callback, sender) {
  var self = this;

  // find or insert message
  messages.findOne({message: data.message}, function(err, doc) {
    if(err) throw err;
    if(!doc) {
      messages.insert(
        {
          message: data.message
        },
        function(err, docs) {
          if(err) throw err;
          self.emit('harvester::message::saved',
            {
              id: docs[0]._id,
              hostname: data.hostname,
              date: data.date
            }
          );
        }
      );
    } else {
      self.emit('harvester::message::saved',
        {
          id: doc._id,
          hostname: data.hostname,
          date: data.date
        }
      );
    }
  });
};
