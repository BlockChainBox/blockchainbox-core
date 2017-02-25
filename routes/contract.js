var express = require('express');
var contract = require('../models/contract.js');
var contractFunction = require('../models/contractFunction.js');
var contractEvent = require('../models/contractEvent.js');
var contractController = require('../controllers/contractController.js');
var transactionData = require('../models/transactionData.js');
var eventData = require('../models/eventData.js');
var webhookData = require('../models/webhookData.js');
var sqsHelper = require('../helpers/aws/sqsHelper.js');
var request = require('request');
var router = express.Router();

/**
 * GET contract info
 */
router.get('/info', function (req, res, next) {
    var contractId = req.query.contractId;
    var contractInfo = null;
    var contractEventInfo = null;
    var contractFunctionInfo = null;
    var contractLoaded = new Promise(function(resolve, reject) {
        contract.read(contractId).then(function(contractResult) {
            contractInfo = contractResult.rows;
            contractEvent.readByContractId(contractId).then(function(contractEventResult){
                contractEventInfo = contractEventResult.rows; 
                contractFunction.readByContractId(contractId).then(function(contractFunctionResult){
                    contractFunctionInfo = contractFunctionResult.rows;
                    var info = {
                        contract: contractInfo,
                        contractEvent: contractEventInfo,
                        contractFunction: contractFunctionInfo
                    };
                    res.json({'data': info});
                })
            })
        })
    });
});

/**
 * GET load contract event
 */
router.get('/events', function(req, res, next) {
	if (req.query.contractEventId === undefined) {
		res.json({'error': {'code': 214, 'message': 'contractEventId is null'}});
	}
	var contractEventId = req.query.contractEventId;
	contractEvent.read(contractEventId).then(function(result) {
		if (result.rowCount > 0) {
			res.json({'data': result.rows});
		} else {
			res.json({'error': {'code': 212, 'message': 'empty data'}});
		}
	}).catch(function(err) {
		console.log(err.message, err.stack);
		res.json({'error': {'code': 213, 'message': 'error on load data'}});
	});
});

/**
 * GET load contract function
 */
router.get('/functions', function(req, res, next) {
	if (req.query.contractFunctionId === undefined) {
		res.json({'error': {'code': 215, 'message': 'contractFunctionId is null'}});
	}
	var contractFunctionId = req.query.contractFunctionId;
	contractFunction.read(contractFunctionId).then(function(result) {
		if (result.rowCount > 0) {
			res.json({'data': result.rows});
		} else {
			res.json({'error': {'code': 212, 'message': 'empty data'}});
		}
	}).catch(function(err) {
		console.log(err.message, err.stack);
		res.json({'error': {'code': 213, 'message': 'error on load data'}});
	});
});

/**
 * POST use contract function
 */
router.post('/tx', function(req, res, next) {
	if (req.body.contractId === undefined) {
		res.json({'error': {'code': 201, 'message': 'contractId is null'}});
	}
	if (req.body.contractFunctionId === undefined) {
		res.json({'error': {'code': 202, 'message': 'contractFunctionId is null'}});
	}
	if (req.body.data === undefined) {
		res.json({'error': {'code': 203, 'message': 'data is null'}});
	}
	var contractId = req.body.contractId;
	var contractFunctionId = req.body.contractFunctionId;
	var data = req.body.data;
	var entity = {
		"contractFunctionId": contractFunctionId, 
		"data": JSON.stringify(data)
	};
	transactionData.create(entity).then(function (txHash) {
		var message = {
			"txHash": txHash,
			"contractId": contractId,
			"contractFunctionId": contractFunctionId,
			"data": data
		};
		sqsHelper.send(JSON.stringify(message), 
					process.env.AWS_TRANSACTION_QUEUE_URL, 10, 
					'transaction');
		res.json({'data': {'txHash': txHash}});
	}).catch(function(err) {
		console.log(err.message, err.stack);
		res.json({'error': {'code': 204, 'message': 'error on send transaction'}});
	});
});

/**
 * GET function transaction status
 */
router.get('/tx', function(req, res, next){
	if (req.query.txHash === undefined) {
		res.json({'error': {'code': 211, 'message': 'txHash is null'}});
	}
	var txHash = req.query.txHash;
	transactionData.read(txHash).then(function(transactionDataResult) {
		if (transactionDataResult.rowCount > 0) {
			res.json({'data': transactionDataResult.rows[0]});
		} else {
			res.json({'error': {'code': 212, 'message': 'empty data'}});
		}
	}).catch(function(err) {
		console.log(err.message, err.stack);
		res.json({'error': {'code': 213, 'message': 'error on load data'}});
	});
});

/**
 * GET load event data 
 */
router.get('/event/data', function(req, res, next) {
	if (req.query.txHash === undefined) {
		res.json({'error': {'code': 211, 'message': 'txHash is null'}});
	}
	var txHash = req.query.txHash;
	eventData.readByTxHash(txHash).then(function(result) {
		if (result.rowCount > 0) {
			res.json({'data': result.rows});
		} else {
			res.json({'error': {'code': 212, 'message': 'empty data'}});
		}
	});
});

/**
 * POST set contract webhooks
 * Support contractId, contractFunctionId, contractEventId
 * @required contractId
 * @required url
 */
router.put('/webhooks', function(req, res, next) {
	if (req.body.contractId === undefined) {
		res.json({'error': {'code': 201, 'message': 'contractId is null'}});
	}
	if (req.body.hook === undefined) {
		res.json({'error': {'code': 215, 'message': 'empth webhook'}});
	}
	request.post(req.query.url, function (error, response, body) {
	  	if (response && response.statusCode == 200) {
	  		var contractFunctionId = (req.body.contractFunctionId === undefined) ? 
	  			null : req.body.contractFunctionId;
			var contractEventId = (req.body.contractEventId === undefined) ? 
				null : req.body.contractEventId;
			var entity = {
				'contractId': req.body.contractId,
				'contractFunctionId': contractFunctionId,
				'contractEventId': contractEventId,
				'url': req.body.hook
			}
			webhookData.create(entity).then(function(result) {
				var id = result.rows[0].id;
				res.json({'data': {'id' : id}});
			}).catch(function(err) {
				console.log(err.message, err.stack);
				res.json({'error': {'code': 204, 'message': 'error on put webhooks'}});
			});
	  	} else {
	  		res.json({'error': {'code': 220, 'message': 'webhook error, statusCode: ' + response.statusCode}});
	  	}
	});
});

module.exports = router;