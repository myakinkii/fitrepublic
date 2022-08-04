const { errors } = require('./constants');

const { v1: uuidv1 } = require('uuid');
const cds = require("@sap/cds");

function getClientCalendar(profile,srv,tx){
	// const tx = srv.transaction();
	// const workoutQuery=cds.parse.cql(
	// 	"SELECT from Workouts { "+
	// 		"id, status, timestamp, durationHrs, durationFact, description, purchase.description as pdescr, purchase.type, purchase.gym.name as gymName, "+
	// 		"coach.name as coachName "+
	// 	"} where client.id='"+profile.id+"'"
	// );
	const workoutQuery=cds.parse.cql( "SELECT from V_Calendar { * } where clientId='"+profile.id+"'");
	return tx.run(workoutQuery).then(function(res){
		const calendar=res.map(function(item){
			return {
				id:item.id, 
				status:item.status, 
				timestamp:item.timestamp, 
				durationHrs:item.durationHrs, 
				durationFact:item.durationFact, 
				description:item.description,
				purchase : { type:item.type, pdescr:item.pdescr, gym: { gymName: item.gymName } },
				coach: { coachName : item.coachName }
			};
		});
		return Promise.resolve(calendar);
	});
}

function getCoachCalendar(profile,srv,tx){
	// const tx = srv.transaction();
	// const workoutQuery=cds.parse.cql(
	// 	"SELECT from Workouts { "+
	// 		"id, status, timestamp, durationHrs, durationFact, description, purchase.description as pdescr, purchase.type, purchase.gym.name as gymName, "+
	// 		"client.nickName as clientName "+
	// 	"} where coach.id='"+profile.id+"'"
	// );
	const workoutQuery=cds.parse.cql( "SELECT from V_Calendar { * } where coachId='"+profile.id+"'");
	return tx.run(workoutQuery).then(function(res){
		const calendar=res.map(function(item){
			return {
				id:item.id, 
				status:item.status, 
				timestamp:item.timestamp, 
				durationHrs:item.durationHrs, 
				durationFact:item.durationFact, 
				description:item.description,
				purchase : { type:item.type, pdescr:item.pdescr, gym: { gymName: item.gymName } },
				client: { clientName : item.clientName }
			};
		});
		return Promise.resolve(calendar);
	});
}

function createWorkoutCoach(workoutData, profile, srv, tx){
	var purch={id:workoutData.purchase_id,coach_id:profile.id}
	return createWorkout(workoutData,purch,srv,tx);
}

function createWorkoutClient(workoutData, profile, srv, tx){
	var purch={id:workoutData.purchase_id,owner_id:profile.id}
	return createWorkout(workoutData,purch,srv,tx);
}

function createWorkout(workoutData, purchFilter, srv, tx){
	const { Purchases, Workouts } = srv.entities;
	// const tx = srv.transaction();	
	const workout_id=uuidv1(); // this is done because dbSrv tx.create returns complex result instead of an entry
	return tx.read(Purchases).where(purchFilter).then(function(purchases){
		const purch=purchases&&purchases[0];
		if (!purch) return Promise.reject({errCode: errors.NOT_ALLOWED});
		return tx.create(Workouts).entries({
			id:workout_id,
			coach_id:purch.coach_id,
			client_id:purch.owner_id,
			purchase_id:workoutData.purchase_id,
			timestamp:workoutData.timestamp
		});
	}).then(function(workout){
		if (workoutData.template_id) return cloneWorkoutTemplate(workoutData.template_id, workout_id, srv, tx);
		else return Promise.resolve(workout_id);
	});
}

function decreaseQuantity(purchase,srv,tx){
	const { Purchases} = srv.entities;
	// const tx = srv.transaction();
	return tx.update(Purchases,{id:purchase.id}).with({ quantity:purchase.quantity-1 });
}

function payCoach(purchase,srv,tx){
	const { Purchases, Payments, CoachBilling} = srv.entities;
	// const tx = srv.transaction();
	return decreaseQuantity(purchase,srv,tx).then(function(purch){
		return tx.read(Payments,{id:purchase.activePaymentId}); // whats each workout would worth
	}).then(function(payment){
		const price=payment.cost/payment.quantity;
		const date=new Date(Date.now());
		var actions=[
			tx.update(Payments,{id:payment.id}).with({ remainder:payment.remainder-price }),
			tx.create(CoachBilling).entries({
				id:uuidv1(),
				purchase_id:purchase.id,
				coach_id:purchase.coach_id,
				billingDate:date.toJSON(),
				amount:price
			})
		];
		return Promise.all(actions);
	});
}

function incrementWorkoutCount(purchase,srv,tx){
	const {Templates} = srv.entities;
	// const tx = srv.transaction();
	return tx.read(Templates,{id:purchase.templateId}).then(function(tmpl){
		return tx.update(Templates,{id:purchase.templateId}).with({ workoutsCount:tmpl.workoutsCount+1 });
	});
}

function cloneWorkoutCoach(workoutData, profile, srv, tx){
	// const tx = srv.transaction();
	const q=cds.parse.cql(
		"SELECT from Workouts { id } "+
		"where id='"+workoutData.workout_id+"' and status='S' and coach.id='"+profile.id+"'"
	);
	return tx.run(q).then(function(workouts){
		if (!workouts[0]) return Promise.reject({errCode: errors.NOT_ALLOWED});	
		return cloneWorkoutTemplate(workoutData.template_id, workoutData.workout_id, srv, tx);
	});
}

function cloneWorkoutClient(workoutData, profile, srv, tx){
	// const tx = srv.transaction();
	const q=cds.parse.cql(
		"SELECT from Workouts { id } "+
		"where id='"+workoutData.workout_id+"' and status='S' and client.id='"+profile.id+"'"
	);
	return tx.run(q).then(function(workouts){
		if (!workouts[0]) return Promise.reject({errCode: errors.NOT_ALLOWED});	
		return cloneWorkoutTemplate(workoutData.template_id, workoutData.workout_id, srv, tx);
	});
}

function cloneWorkoutTemplate(tid, wid, srv, tx){
	const { Workouts, WorkoutTemplates, Excercises, ExcerciseTemplates } = srv.entities;
	// const tx = srv.transaction();
	return tx.read(WorkoutTemplates).where({ id: tid}).then(function(templates){
		const template=templates&&templates[0];
		if (!template) return Promise.reject({errCode: errors.TEMPLATE_NOT_FOUND});
		return tx.update(Workouts,{id:wid}).with({
			description:template.description
		});
	}).then(function(workout){
		return tx.read(ExcerciseTemplates).where({ workout_id: tid});
	}).then(function(exTemplates){ // get exercise templates
		return Promise.all(exTemplates.map(function(ex){
			ex.id=uuidv1();
			ex.workout_id=wid;
			return tx.create(Excercises).entries(ex); // and create copies
		}));
	}).then(function(allDone){
		return Promise.resolve(wid);
	});
}

function workoutBeforeUpdateCoach(workoutData, profile, srv, tx){
	// const tx = srv.transaction();
	// const workoutQuery=cds.parse.cql(
	// 	"SELECT from Workouts { id, status, purchase.type, purchase.quantity } "+
	// 	" where id='"+workoutData.id+"' and coach.id='"+profile.id+"'"
	// );
	const workoutQuery=cds.parse.cql(
		"SELECT from V_Calendar { id, status, type, quantity } "+
		" where id='"+workoutData.id+"' and coachId='"+profile.id+"'"
	);
	return tx.run(workoutQuery).then(function(workouts){
		if (!workouts[0])  return Promise.reject({errCode: errors.NOT_ALLOWED});
		return Promise.resolve(workouts[0]);
	}).then(function(workout){
		if (workout.type=='R' && workout.quantity<1) return Promise.reject({errCode: errors.NOT_ENOUGH_FUNDS});
		if (workoutData['status']=='E' && workout.type=='R') return Promise.reject({errCode: errors.NOT_ALLOWED});
	});
}

function workoutAfterUpdateCoach(workoutId,srv,tx){
	const { Purchases, Workouts } = srv.entities;
	// const tx = srv.transaction();
	return tx.read(Workouts,{id:workoutId}).then(function(workout){
		return tx.read(Purchases,{id:workout.purchase_id});
	}).then(function(purchase){
		if (purchase.type=='G') return decreaseQuantity(purchase,srv,tx);
		else if (purchase.type=='S') return incrementWorkoutCount(purchase,srv,tx);
		else return Promise.resolve();
	});
}

function workoutBeforeUpdateClient(workoutData, profile, srv, tx){
	// const tx = srv.transaction();
	// const workoutQuery=cds.parse.cql(
	// 	"SELECT from Workouts { id, status, purchase.type, purchase.quantity } "+
	// 	" where id='"+workoutData.id+"' and client.id='"+profile.id+"'"
	// );
	const workoutQuery=cds.parse.cql(
		"SELECT from V_Calendar { id, status, type, quantity } "+
		" where id='"+workoutData.id+"' and clientId='"+profile.id+"'"
	);
	return tx.run(workoutQuery).then(function(workouts){
		if (!workouts[0])  return Promise.reject({errCode: errors.NOT_ALLOWED});
		return Promise.resolve(workouts[0]);
	}).then(function(workout){
		if (workoutData['status'] && workout.status!='S') return Promise.reject({errCode: errors.NOT_ALLOWED});
		if (workoutData['status']=='E' && workout.type=='O') return Promise.reject({errCode: errors.NOT_ALLOWED});
		if (workoutData['status']=='E' && workout.quantity<1) return Promise.reject({errCode: errors.NOT_ENOUGH_FUNDS});
	});
}

function workoutAfterUpdateClient(workoutId,srv,tx){
	const { Purchases, Workouts } = srv.entities;
	// const tx = srv.transaction();
	return tx.read(Workouts,{id:workoutId}).then(function(workout){
		return tx.read(Purchases,{id:workout.purchase_id});
	}).then(function(purchase){
		if (purchase.type=='R') return payCoach(purchase,srv,tx);
		else if (purchase.type=='S') return incrementWorkoutCount(purchase,srv,tx);
		else return Promise.resolve();
	});
}

module.exports={
	getClientCalendar:getClientCalendar,
	getCoachCalendar:getCoachCalendar,
	createWorkoutClient:createWorkoutClient,
	cloneWorkoutCoach:cloneWorkoutCoach,
	cloneWorkoutClient:cloneWorkoutClient,
	createWorkoutCoach:createWorkoutCoach,
	workoutBeforeUpdateClient:workoutBeforeUpdateClient,
	workoutBeforeUpdateCoach:workoutBeforeUpdateCoach,
	workoutAfterUpdateClient:workoutAfterUpdateClient,
	workoutAfterUpdateCoach:workoutAfterUpdateCoach
};