var pool = require(__dirname + '/dbConnectionPool.js');

function EventData() {}

EventData.prototype.readAll = function() {
    return pool.query('SELECT * FROM eventdata');
};

EventData.prototype.read = function(txHash) {
    return pool.query('SELECT * FROM eventdata WHERE txHash = $1', [txHash]);
};

EventData.prototype.create = function(entity) {
    return pool.query('INSERT INTO eventdata '
    	+ '(contractEventId, transactionHash, event, data, blocknumber, blockhash, address, createTimestamp) '
    	+ ' SELECT $1, $2, $3, $4, $5, $6, $7, now() '
		+ ' WHERE NOT EXISTS ( '
		+ ' SELECT 1 FROM eventdata WHERE contractEventId = $8 AND transactionHash = $9 AND event = $10 '
		+ ' AND data = $11 AND blocknumber = $12 AND blockhash = $13 AND address = $14 '
		+ ')',
    	[entity.contractEventId, entity.transactionHash, entity.event, 
    	entity.data, entity.blockNumber, entity.blockHash, entity.address,
    	entity.contractEventId, entity.transactionHash, entity.event, 
    	entity.data, entity.blockNumber, entity.blockHash, entity.address]);
};

EventData.prototype.update = function() {

};

EventData.prototype.delete = function() {

};

exports = module.exports = new EventData();
