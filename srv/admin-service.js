const crypto = require("crypto");
const cds = require('@sap/cds')
module.exports = function (srv) {
	
	const errors={
		UNKNOWN_BACKEND_ERROR:'UNKNOWN_BACKEND_ERROR', // something went wrong
	};
	
	const { Coaches, Promos } = srv.entities;
	
	srv.before(['CREATE'], Coaches, req => { 
		if (!req.data.authToken) req.data.authToken=crypto.createHash('md5').update(req.data.id).digest('hex');
	});
	
	srv.after('READ', Coaches, each => {
		// if(!each.deviceId) each.deviceId='NO';
		// else each.deviceId='YES';
	});
	
	srv.on ('shareObject', req => {
		const { ShortLinks } = srv.entities;
		// const tx = srv.transaction();
		const tx = srv.tx();
		const getId=function (){
			const linkId=Math.random().toString(26).slice(2,10).toLowerCase();
			return tx.read(ShortLinks,{id:linkId}).then(function(link){
				if (link) return getId();
				else return Promise.resolve(linkId);
			});
		}
		var urlPars=[ "target="+req.data.target, "id="+req.data.id ];
		return getId().then(function(linkId){
			return tx.create(ShortLinks).entries({
				id:linkId,
				baseUrl : '',
				pars : urlPars.join('&'),
				linkType : req.data.target=='equipment' ? 'E' : ''
			});
		}).then(function(link){
			tx.commit();
			return req.reply(link.id);
		}).catch(function(err){
			tx.rollback();
			if (!err.errCode) req.reject(400,{errCode: errors.UNKNOWN_BACKEND_ERROR, errObj:err});
			else req.reject(400,err);
		});
	});
	
	srv.on ('createPromoForCoach', req => {
		// const tx = srv.transaction();
		const tx = srv.tx();
		const id=Math.random().toString(26).slice(2,10).toUpperCase();
		var expDate=new Date(Date.now());
		const expDateShift=1000*3600*24*30; // one month
		expDate.setTime(expDate.getTime()+expDateShift);
		return tx.create(Promos).entries({
			id:id, 
			coachId:req.data.coach_id,
			expirationDate:expDate.toJSON()
		}).then(function(promo){
			tx.commit();
			return req.reply(promo.id);
		}).catch(function(err){
			tx.rollback();
			if (!err.errCode) req.reject(400,{errCode: errors.UNKNOWN_BACKEND_ERROR, errObj:err});
			else req.reject(400,err);
		});
	});
	
}