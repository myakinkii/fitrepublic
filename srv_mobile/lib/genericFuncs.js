const { errors } = require('./constants');

const debug=true;

function isOdataReq(req){  return req && req._ && req._.req && req.query==req._.query ? true : false; }

function protectService(srv,config){
	const actions=['READ', 'CREATE', 'UPDATE', 'DELETE'];
	srv.before(actions,genericAuthCheck);
	config.forEach(function(rule){
		actions.forEach(function(act){
			if (!rule[act]) return;
			if (act=="READ") srv.before('READ', rule.entity, getFilterChain(srv, rule[act]) );
			else srv.before(act, rule.entity, rule[act]);
		});
	});
}	

function genericAuthCheck(req){
	if (!isOdataReq(req)) return Promise.resolve();
	const deviceId=req._.req.query.device;
	const authToken = req._.req.query.token;
	if (deviceId && authToken) return Promise.resolve();
	else req.reject(403, {errCode: errors.NOT_ALLOWED});
}

function forbidProfileCreation(req){
	if (isOdataReq(req)) req.reject(403, {errCode: errors.NOT_ALLOWED}); // forbid "external" creation of new Profiles
}

function basicChecks(srv, req){
	const deviceId=req.query.device;
	const authToken=req.query.token;
	const { Profiles } = srv.entities;
	const tx = srv.tx();
	return new Promise(function(resolve,reject){
		if (!(deviceId && authToken)) reject({errCode: errors.NOT_ALLOWED});
		else resolve();
	}).then(function(){
		return tx.read(Profiles).where({ deviceId: deviceId, authToken: authToken });
	}).then(function(profiles){
		tx.commit();
		if (profiles[0]) return Promise.resolve(profiles[0]);
		else return Promise.reject({errCode: errors.PROFILE_NOT_FOUND});
	});
}

function getRestCatcher(response,tx){
	var res=response;
	return function(err){
		if (tx) tx.rollback();
		if (debug) console.log(err);
		if (!err.errCode) res.status(400).send({errCode: errors.UNKNOWN_BACKEND_ERROR, errObj:err});
		else res.status(400).send(err);	
	}
}

function getCatcher(request,tx){
	var req=request;
	return function(err){
		if (tx) tx.rollback();
		if (debug) console.log(err);
		var errJson = err.errCode ? JSON.stringify(err) : JSON.stringify({errCode: errors.UNKNOWN_BACKEND_ERROR, errObj:err});
		req.reject(400,errJson);				
	}
}

function getFilterer(request,filterFn){
	var req=request;
	return function(profile){
		const filter=filterFn(profile);
		req.query.where(filter);
		return Promise.resolve(filter);
	}
}
		
function filterMe(authField){
	var field=authField;
	return function(profile){ 
		var filter={};
		filter[field]={"=":profile.id };
		return filter
	};
}

function getFilterChain(srv,filterFn){
	return function(req){
		if (!isOdataReq(req)) return Promise.resolve();
		return basicChecks(srv,req._.req).then(getFilterer(req,filterFn)).catch(getCatcher(req));
	}
}

module.exports={
	isOdataReq:isOdataReq,
	protectService:protectService,
	genericAuthCheck:genericAuthCheck,
	forbidProfileCreation:forbidProfileCreation,
	basicChecks:basicChecks,
	getRestCatcher:getRestCatcher,
	getCatcher:getCatcher,
	getFilterer:getFilterer,
	filterMe:filterMe,
	getFilterChain:getFilterChain
};
