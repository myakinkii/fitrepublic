const { errors } = require('./constants');
const { getSettings } = require('./settingsMgr');

const { v1: uuidv1 } = require('uuid');
const cds = require("@sap/cds");

function calcPurchaseOptions(purchaseType, profile, srv){
	var options={};
	if (purchaseType=='G') purchaseType='R'; // patch for new purchase type
	return getSettings(srv).then(function(settings){
		var p, pTypeRef, pSet;
		for (p in settings["purchase"]["types"]){
			pTypeRef=settings["purchase"]["types"][p];
			if (settings[pTypeRef]["atts"]["type"]==purchaseType) {
				pSet=settings[pTypeRef];
				break; // found proper ref
			}
		}
		var data={
			basePrice : parseInt(pSet["atts"]["basePrice"]),
			expirtionPeriod : parseInt(pSet["atts"]["expirtionPeriod"]),
			options : []
		};
		var o, opt;
		for (o in pSet["options"]){
			opt={
				q:parseInt(pSet["options"][o]),
				d:parseInt(pSet["discounts"][o]),
			}
			opt.p = opt.q * data.basePrice * (100-opt.d)/100;
			data.options.push(opt);
		}
		return Promise.resolve(data);
	});
}

function makePurchase(purchData, profile, srv, tx){

	const { Purchases, Payments, Chats } = srv.entities;
	// const tx = srv.transaction();
	var purchase={
		id: uuidv1(),
		owner_id : profile.id,
		coach_id : purchData.coach_id,
		gym_id: purchData.gym_id,
		chatChannel_channelId : null,
		quantity : 0,
		cost : 0,
		purchaseDate : new Date(),
		expirationDate : null,
		type : purchData.purchaseType
	};	
	const gymQuery=cds.parse.cql(
		"SELECT from V_CoachesToGyms { gym_id, coach_id, gym_type }"+
		"where coach_id='"+purchase.coach_id+"' and gym_id='"+purchase.gym_id+"' and gym_type='"+purchase.type+"'"
	);
	return tx.run(gymQuery).then(function(gyms){ // find us a proper gym
		if (!gyms[0]) return Promise.reject({errCode: errors.GYM_NOT_FOUND});
		return tx.create(Chats).entries({channelId:uuidv1()}); // create Chat entry
	}).then(function(chatEntry){
		purchase.chatChannel_channelId=chatEntry.channelId;				
		return tx.create(Purchases).entries(purchase); // create Purchase entry
	}).then(function(result){
		return tx.create(Payments).entries({ // create Payments entry
			id:uuidv1(),
			purchase_id: result.id,
			cost: purchData.cost,
			quantity: purchData.quantity,
			remainder :purchData.cost
		});
	}).then(function(payment){
		return tx.update(Purchases,{id:purchase.id}).with({ activePaymentId:payment.id }); // assign Payment to Purchase
	}).then(function(res){
		return Promise.resolve({id:purchase.id, activePaymentId:res.activePaymentId})
	});
}

function getId(srv,tx){
	const { Promos } = srv.entities;
	// const tx = srv.transaction();
	const id=Math.random().toString(26).slice(2,10).toUpperCase();
	return tx.read(Promos,{id:id}).then(function(promo){
		if (promo) return getId(srv);
		else return Promise.resolve(id);
	});
}

function createPromo(promoData,profile,srv,tx){
	const { Promos } = srv.entities;
	// const tx = srv.transaction();
	// var expDate=new Date(Date.now());
	// const expDateShift=1000*3600*24*30; // one month
	// expDate.setTime(expDate.getTime()+expDateShift);
	return getId(srv,tx).then(function(id){
		return tx.create(Promos).entries({
			id:id, 
			coachId:profile.id,
			purchaseType:promoData.promoType,
			description:promoData.description
			// expirationDate:expDate.toJSON()
		});
	}).then(function(promo){
		return Promise.resolve(promo.id);
	});
}

function redeemPromo(promoId, profile, srv, tx){
	const { Purchases, Promos, Chats } = srv.entities;
	// const tx = srv.transaction();
	var purchase={
		id: uuidv1(),
		owner_id : profile.id,
		coach_id : null,
		gym_id: null,
		chatChannel_channelId : null,
		quantity : 0,
		cost : 0,
		purchaseDate : new Date(),
		expirationDate : null,
		type : null,
		state:'A'
	};
	return tx.read(Promos).where({id:promoId}).then(function(promos){// look for our promo
		var promo=promos&&promos[0];
		if (!promo || promo.redeemDate) return Promise.reject({errCode: errors.PROMOCODE_NOT_ELIGIBLE});
		purchase.quantity=promo.quantity;
		purchase.type=promo.purchaseType;
		purchase.description=promo.description;
		var expDate = new Date(purchase.purchaseDate);
		var expDateShift;
		if (purchase.type=='R') expDateShift=1000*3600*24*30; // one month
		else expDateShift=1000*3600*24*30*purchase.quantity; // number of months in purchase
		expDate.setTime(expDate.getTime()+expDateShift);
		purchase.expirationDate=expDate.toJSON();
		var gymQuery;
		if (purchase.type=='G' && promo.coachId) { // for Gym promo with a coach specified
			purchase.coach_id=promo.coachId;
			gymQuery=cds.parse.cql(
				"SELECT from Gyms { id as gym_id, type }"+
				"where type='"+purchase.type+"'"
			);
		}
		if (purchase.type=='O' && promo.coachId) { // for Online promo with a coach specified
			purchase.coach_id=promo.coachId;
			gymQuery=cds.parse.cql(
				"SELECT from V_CoachesToGyms { gym_id, coach_id, gym_type }"+
				"where coach_id='"+promo.coachId+"' and gym_type='"+purchase.type+"'"
			);
		}
		if (purchase.type=='R' && promo.coachId && promo.gymId) { // for Regular promo with complete set of parameters
			purchase.coach_id=promo.coachId;
			gymQuery=cds.parse.cql(
				"SELECT from V_CoachesToGyms { gym_id, coach_id, gym_type }"+
				"where coach_id='"+promo.coachId.toLowerCase()+"' and gym_type='"+purchase.type+"' and gym_id='"+promo.gymId.toLowerCase()+"'"
			);
		}
		if (!gymQuery) return Promise.reject({errCode: errors.UNSUPPORTED});
		return tx.run(gymQuery); // find us a proper gym
	}).then(function(gyms){
		if (!gyms[0]) return Promise.reject({errCode: errors.GYM_NOT_FOUND});
		purchase.gym_id=gyms[0].gym_id;
		return tx.read(Purchases).where({ // check if already have promo of this type and this coach
			owner_id:purchase.owner_id, 
			coach_id:purchase.coach_id, 
			gym_id:purchase.gym_id,
			type:purchase.type
		}); 
	}).then(function(exists){ 
		if (exists[0]) return Promise.reject({errCode: errors.PROMO_TYPE_ALREADY_ACTIVE});
		return tx.create(Chats).entries({channelId:uuidv1()}); // create Chat entry
	}).then(function(chatEntry){
		purchase.chatChannel_channelId=chatEntry.channelId;				
		return tx.create(Purchases).entries(purchase); // create Purchase entry
	}).then(function(purch){
		return tx.update(Promos,{id:promoId}).with({
			clientId : purch.owner_id,
			purchaseId : purch.id,
			redeemDate : purch.purchaseDate
		});
	});
}

function addPayment(purchData,srv,tx){
	const { Purchases, Payments } = srv.entities;
	// const tx = srv.transaction();
	return tx.create(Payments).entries({ // create Payments entry
		id:uuidv1(),
		purchase_id:purchData.purchase_id,
		cost:purchData.cost,
		quantity:purchData.quantity,
		remainder:purchData.cost
	}).then(function(payment){
		return tx.update(Purchases,{id:purchData.purchase_id}).with({ activePaymentId:payment.id }); // assign Payment to Purchase
	}).then(function(purchase){
		return Promise.resolve(purchase.activePaymentId); // if all goes well return new activePaymentId
	});
}

function completePaymentClient(purchaseId, profile, srv, tx){
	const filter={ id:purchaseId, owner_id:profile.id };
	return completePayment(filter, srv, tx);
}

function completePaymentCoach(purchaseId, profile, srv, tx){
	const filter={ id:purchaseId, coach_id:profile.id };
	return completePayment(filter, srv, tx);
}

function completePayment(filter, srv, tx){
	const { Purchases, Payments, CoachBilling } = srv.entities;
	// const tx = srv.transaction();
	var purch;
	return tx.read(Purchases).where(filter).then(function(purchases){
		purch=purchases&&purchases[0];
		if (!purch) return Promise.reject({errCode: errors.NOT_ALLOWED});	
		return tx.update(Payments,{id:purch.activePaymentId}).with({
			state:'D',
			paymentDate:(new Date()).toJSON()
		});
	}).then(function(){
		return tx.get(Payments,{id:purch.activePaymentId});
	}).then(function(payment){
		var actions=[];
		var expDate = new Date( purch.expirationDate||Date.now() ); // can be first or additional payments
		var expDateShift;
		if (purch.type=='R') expDateShift=1000*3600*24*30; // one month
		else expDateShift=1000*3600*24*30*payment.quantity; // number of months in purchase
		expDate.setTime(expDate.getTime()+expDateShift);
		actions.push(tx.update(Purchases,{id:payment.purchase_id}).with({
			state:'A',
			expirationDate:expDate.toJSON(),
			cost: purch.cost+payment.cost,
			quantity: purch.quantity+payment.quantity
		}));
		if (purch.type=='O') actions.push(tx.create(CoachBilling).entries({
			id:uuidv1(),
			purchase_id:purch.id,
			coach_id:purch.coach_id,
			billingDate:payment.paymentDate,
			amount:payment.cost
		}));
		return Promise.all(actions);
	});
}

function subscribeToProgram(templateId, profile, srv, tx){
	const { Purchases, Templates, Gyms, Chats } = srv.entities;
	// const tx = srv.transaction();
	var purchase={
		id: uuidv1(),
		owner_id : profile.id,
		gym_id: null,
		coach_id : null,
		templateId: templateId,
		templateName: null,
		description: null,
		chatChannel_channelId : null,
		type: 'S',
		state: 'A',
		quantity : 1,
		cost : 0,
		purchaseDate : new Date(),
		expirationDate : null
	};
	return tx.read(Purchases).where({owner_id:profile.id, templateId:purchase.templateId}).then(function(exists){ // check if already subsrcibed
		if (exists[0]) return Promise.reject({errCode: errors.TEMPLATE_ALREADY_SUBSCRIBED});				
		return tx.read(Templates).where({id:purchase.templateId});// check if template exists
	}).then(function(templates){
		var tmpl=templates[0];
		if (!tmpl) return Promise.reject({errCode: errors.TEMPLATE_NOT_FOUND});
		purchase.coach_id=tmpl.coach_id;
		purchase.description=tmpl.name;
		purchase.templateName=tmpl.name;
		return tx.update(Templates,{id:tmpl.id}).with({ subscriptionsCount:tmpl.subscriptionsCount+1 }); // increment subs
	}).then(function(){
		return tx.read(Gyms).where({type:"O"});// find us an online gym	
	}).then(function(gyms){
		if (!gyms[0]) return Promise.reject({errCode: errors.GYM_NOT_FOUND});
		purchase.gym_id=gyms[0].id;
		return tx.create(Chats).entries({channelId:uuidv1()}); // create Chat entry
	}).then(function(chatEntry){
		purchase.chatChannel_channelId=chatEntry.channelId;				
		return tx.create(Purchases).entries(purchase); // create Purchase entry
	});
}

function createChatMessageClient(msgData, profile, srv, tx){
	const { ChatMessages } = srv.entities;
	// const tx = srv.transaction();
	const q=cds.parse.cql( 
		"SELECT from Purchases { id, owner_id } "+
		"where chatChannel_channelId='"+msgData.channelId+"' and owner_id='"+profile.id+"'"
	);
	return tx.run(q).then(function(purchases){
		if (!purchases[0])  return Promise.reject({errCode: errors.NOT_ALLOWED});
		return tx.create(ChatMessages).entries({
			id:uuidv1(),
			channel_channelId:msgData.channelId,
			message_text:msgData.text,
			message_authorId:purchases[0].owner_id,
			message_timestamp:new Date()
		});
	});
}

function createChatMessageCoach(msgData, profile, srv, tx){
	const { ChatMessages } = srv.entities;
	// const tx = srv.transaction();
	const q=cds.parse.cql( 
		"SELECT from Purchases { id, coach_id } "+
		"where chatChannel_channelId='"+msgData.channelId+"' and coach_id='"+profile.id+"'"
	);
	return tx.run(q).then(function(purchases){
		if (!purchases[0])  return Promise.reject({errCode: errors.NOT_ALLOWED});
		return tx.create(ChatMessages).entries({
			id:uuidv1(),
			channel_channelId:msgData.channelId,
			message_text:msgData.text,
			message_authorId:purchases[0].coach_id,
			message_timestamp:new Date()
		});
	});
}

module.exports={
	calcPurchaseOptions:calcPurchaseOptions,
	makePurchase:makePurchase,
	addPayment:addPayment,
	completePaymentClient:completePaymentClient,
	completePaymentCoach,completePaymentCoach,
	createPromo:createPromo,
	redeemPromo:redeemPromo,
	subscribeToProgram:subscribeToProgram,
	createChatMessageClient:createChatMessageClient,
	createChatMessageCoach:createChatMessageCoach
};