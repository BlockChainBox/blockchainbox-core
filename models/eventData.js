var pool = require(__dirname + '/dbConnectionPool.js');

function EventData() {}

var CONFIRMED = 'CONFIRMED';

EventData.prototype.readAll = function() {
    return pool.query('SELECT * FROM eventdata');
};

EventData.prototype.readByTxHash = function(txHash) {
	return pool.query('SELECT * FROM eventData WHERE transactionHash = ('
		+ ' SELECT transactionHash FROM transactionData '
		+ ' WHERE txHash = $1 ' 
		+ ' AND status = $2)', 
		[txHash, CONFIRMED]);
}

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
SELECT * FROM eventData WHERE transactionHash = (
SELECT transactionHash FROM transactionData 
WHERE txHash = '6590fa52fa76f967656340b874bc9ca09733c2fddea9886210ebcbbceee04b35' 
AND status = 'CONFIRMED');