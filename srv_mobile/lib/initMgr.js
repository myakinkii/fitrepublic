const { errors } = require('./constants');
const { getSettings } = require('./settingsMgr');

const { v1: uuidv1 } = require('uuid');
const crypto = require("crypto");

const cardActions={
	"cardsClient":{
		purchaseList:function(){
			var actions={ 'redeemPromo': { dst: 'redeemPromo' } };
			return Promise.resolve({ card:'purchaseList', actions:actions });
		},
		clientWorkouts:function(){
			var actions={ 'redeemPromo': { dst: 'redeemPromo' }, 'addWorkout':{ dst:'addWorkout'} };
			return Promise.resolve({ card:'clientWorkouts', actions:actions });
		},
		calendar:function(profile,srv,tx){
			var actions={  'addWorkout':{ dst:'addWorkout'}  };
			const { Workouts } = srv.entities;
			// const tx = srv.transaction();
			const nextWorkoutQuery=SELECT.one(Workouts).columns('id','status','timestamp').where({
				client_id:profile.id,
				status:'S',
				timestamp:{ ">": (new Date()).toJSON() }
			}).orderBy({timestamp:'asc'});
			return tx.run(nextWorkoutQuery).then(function(next){
				if (next) actions['nextWorkout']={ dst: 'workout', vars: { id: next.id } };
				return Promise.resolve({ card:'calendar', actions:actions });
			});
		}
	},
	"cardsCoach":{
		calendar:function(profile,srv,tx){
			var actions={};
			const { Workouts } = srv.entities;
			// const tx = srv.transaction();
			const nextWorkoutQuery=SELECT.one(Workouts).columns('id','status','timestamp').where({
				coach_id:profile.id,
				status:'S',
				timestamp:{ ">": (new Date()).toJSON() }
			}).orderBy({timestamp:'asc'});
			return tx.run(nextWorkoutQuery).then(function(next){
				if (next) actions['nextWorkout']={ dst: 'workout', vars: { id: next.id } };
				return Promise.resolve({ card:'calendar', actions:actions });
			});
		},
		coachPromo:function(profile,srv){
			var actions={ 'addPromo':{ dst:'addPromo'}  };
			return Promise.resolve({ card:'coachPromo', actions:actions });
		},
		templateList:function(profile,srv){
			var actions={ 'addTemplate':{ dst:'addTemplate'}  };
			return Promise.resolve({ card:'templateList', actions:actions });
		}
	}
}

function createFreestylePurchase(profile,srv,tx){
	const { Purchases } = srv.entities;
	// const tx = srv.transaction();
	var purchase={
		id: uuidv1(),
		owner_id : profile.id,
		coach_id : null,
		gym_id: null,
		chatChannel_channelId : null,
		quantity : 1,
		cost : 0,
		purchaseDate : new Date(),
		expirationDate : null,
		type : 'F',
		state:'A',
		description:'Freestyle'
	};
	const gymQuery=cds.parse.cql("SELECT from V_CoachesToGyms { gym_id, coach_id, gym_type } where gym_type='F'");
	return tx.run(gymQuery).then(function(gyms){
		if (gyms[0]){
			purchase.gym_id=gyms[0].gym_id;
			purchase.coach_id=gyms[0].coach_id;
			return tx.create(Purchases).entries(purchase);
		} else return Promise.resolve();
	});
}

function checkCreateFreestylePurchase(profile,srv,tx){
	const { Purchases } = srv.entities;
	// const tx = srv.transaction();
	return tx.read(Purchases).where({ owner_id: profile.id, and: { type: 'F'} }).then(function(purch){
		if (purch[0]) return Promise.resolve();
		else return createFreestylePurchase(profile,srv,tx);
	});
}

function initClientApp(profile,srv,tx){
	return getSettings(srv).then(function(settings){
		var checkFreestylePurchaseExists=settings["general"]["purchases"]["checkFreestyle"];
		if (checkFreestylePurchaseExists) return checkCreateFreestylePurchase(profile,srv,tx);
		else return Promise.resolve();
	}).then(function(actions){
		return getCards("cardsClient",profile,srv,tx);
	});
}

function initCoachApp(profile,srv,tx){
	return getCards("cardsCoach",profile,srv,tx);
}

function getCards(space,profile,srv,tx){
	var cards={};
	return getSettings(srv).then(function(settings){
		var promises=[], cardName, cardSett, card;
		var addHiddenCards=settings["general"]["cards"]["addHidden"];
		for (cardName in settings[space]["cards"]){
			card={ name:cardName, order:parseInt(settings[space]["cards"][cardName]) };
			if (settings[space][cardName]) {
				cardSett=settings[space][cardName];
				if (cardSett["hidden"]) {
					if (addHiddenCards) card.hidden=true;
					else continue;
				}
				if (cardSett["rows"]) card.rows=parseInt(cardSett["rows"]);
				if (cardSett["cols"]) card.rows=parseInt(cardSett["cols"]);
			}
			if (cardActions[space][cardName]) promises.push(cardActions[space][cardName](profile,srv,tx));
			cards[cardName]=card;
		}
		if (promises.length) return Promise.all(promises)
		else return Promise.resolve([]);
	}).then(function(actions){
		if (actions.length) {
			actions.forEach(function(a){ cards[a.card].actions=a.actions; })
		}
		var cardsArr=[];
		for (var c in cards) cardsArr.push(cards[c]);
		return Promise.resolve({profile:profile, cards:cardsArr.sort(function(c1,c2){ return c1.order-c2.order; }) });
	});
}

function createClientProfile(deviceId,srv,tx){
	const { Profiles } = srv.entities;
	// const tx = srv.transaction();
	const id=uuidv1();
	const entry={
		id: id,
		nickName: '',
		age:null,
		deviceId:deviceId,
		authToken:crypto.createHash('md5').update(id+deviceId).digest('hex')
	};
	return tx.create(Profiles).entries(entry);
}

function onboardClient(deviceId, srv, tx){
	const { Profiles } = srv.entities;
	// const tx = srv.transaction();
	var onboard;
	return tx.read(Profiles).where({ deviceId: deviceId }).then(function(profiles){
		if (profiles[0]) return Promise.resolve(profiles[0]); // consider re-onboarding hijack brute-force attack
		else return createClientProfile(deviceId,srv,tx);
	}).then(function(profile){
		onboard=profile;
		return checkCreateFreestylePurchase(profile,srv,tx);
	}).then(function(){
		return Promise.resolve(onboard);
	});
}

function onboardCoach(deviceId,authToken,srv,tx){
	const { Profiles } = srv.entities;
	// const tx = srv.transaction();
	return tx.read(Profiles).where({ authToken:authToken, deviceId:null }).then(function(profiles){
		if (profiles[0]){
			const id=profiles[0].id;
			return tx.update(Profiles,{id:id}).with({
				deviceId:deviceId,
				authToken:crypto.createHash('md5').update(id+deviceId).digest('hex')
			});
		} else return Promise.reject({errCode: errors.ONBOARD_PROFILE_NOT_FOUND});
	});
}

module.exports={
	initClientApp:initClientApp,
	initCoachApp:initCoachApp,
	onboardClient:onboardClient,
	onboardCoach:onboardCoach
};