"use strict";

process.env.XS_APP_LOG_LEVEL = "warning";
const port = process.env.PORT || 4044;

const express = require("express");
const app = express();

const proxy = require("@sap/cds-odata-v2-adapter-proxy");
app.use(proxy({ path: "odata", port: port, returnPrimitivePlain:false, returnPrimitiveNested:false }));

const cds = require("@sap/cds");
const conn = cds.connect("db");

const { errors } = require('./lib/constants');
const { createLink, resolveLink, renderPageTemplate } = require('./lib/shortLinkMgr');
const { getSettings } = require('./lib/settingsMgr');
const { 
	onboardClient, onboardCoach, initClientApp, initCoachApp, 
	getClientData, dropClientData, renderDropNotFoundPage, renderDropPage 
} = require('./lib/initMgr');
const { searchStuff, getPromoData, getNewContentSearch, getNewWorkoutsSearch, getNewClientsSearch } = require('./lib/searchAndPromoMgr');
const { 
	calcPurchaseOptions, makePurchase, addPayment, completePaymentClient, completePaymentCoach,
	createPromo, redeemPromo, subscribeToProgram, createChatMessageClient, createChatMessageCoach
} = require('./lib/purchaseMgr');
const { 
	getClientCalendar, getCoachCalendar, createWorkoutClient, createWorkoutCoach, cloneWorkoutCoach, cloneWorkoutClient,
	workoutBeforeUpdateClient, workoutBeforeUpdateCoach, workoutAfterUpdateClient, workoutAfterUpdateCoach
} = require('./lib/workoutMgr');
const { 
	isOdataReq, protectService, genericAuthCheck, forbidProfileCreation, basicChecks,
	getRestCatcher, getCatcher, getFilterer, filterMe, getFilterChain
} = require('./lib/genericFuncs');

conn.then(function(dbSrv){
	
	const server = app.listen(port);
	server.on("error", error => console.error(error.stack));
	app.get('/', (req, res) => res.send("ok\n"));
	
	cds.serve("PublicService").in(app).with(function(srv){

		app.get('/rest/client/drop/:device?/:token?/:dryrun?', function(req,res){
			const deviceId = req.params.device, authToken = req.params.token, dry = req.params.dryrun;
			const locale = req.headers["accept-language"] || "ru"
			const tx = dbSrv.tx();
			return getClientData(deviceId, authToken, dbSrv, tx).then(function(userData){ 
				if (!userData) return renderDropNotFoundPage(locale, res)
				if (dry) return renderDropPage(userData, locale, res)
				else return dropClientData(userData, res, dbSrv, tx)
			}).then(function(){ 
				tx.commit();
				res.end();
			}).catch(getRestCatcher(res,tx));
		});
		
		srv.before('READ', "Settings", req => {
			if (isOdataReq(req)) req.reject(403, {errCode: errors.NOT_ALLOWED}); // forbid "external" read of Settings
		});
		
		srv.before(['READ','CREATE','UPDATE','DELETE'], "ShortLinks", req => {
		// srv.before('READ', "ShortLinks", req => {
			if (isOdataReq(req)) req.reject(403, {errCode: errors.NOT_ALLOWED}); // forbid "external" read of ShortLinks
		});
		
		app.get('/url/', function(req,res){
			return getSettings(srv).then(function(settings){ 
				res.redirect(301,settings["general"]["links"]["redirect"])
			}).catch(getRestCatcher(res));
		});
		
		app.get('/url/:linkId', function(req,res){
			var linkId=req.params.linkId;
			var linksSettings;
			const tx=srv.tx();
			return getSettings(srv).then(function(settings){ 
				linksSettings=settings["general"]["links"];
				return resolveLink(linkId,srv,tx);
			}).then(function(linkData){
				if (!linkData) return res.redirect(301,linksSettings.redirect);
				return renderPageTemplate(linkData, linksSettings, res, srv, tx);
			}).then(function(){
				tx.commit();
				res.end();
			}).catch(getRestCatcher(res,tx));
		});
	});	

	cds.serve("ClientService").in(app).with(function(srv){
		
		protectService(srv,[{
			entity:"ClientWorkoutsTotal", 
			"READ":filterMe("clientId")
		},{
			entity:"ClientWorkouts", 
			"READ":filterMe("clientId")
		},{
			entity:"ClientPurchases",
			"READ":filterMe("clientId")
		},{
			entity:"ClientCoaches",
			"READ":filterMe("clientId")
		},{
			entity:"MyChatChannels", 
			"READ":filterMe("owner_id")
		},{
			entity:"MyWorkoutTemplates", 
			"READ":filterMe("clientId")
		},{ 
			entity:"MyActivePurchases", 
			"READ":function(profile){
				const state='A';
				return { "state":{'=':state}, "and": {"owner_id":{"=":profile.id }} };
			}
		},{ 
			entity:"Profiles",
			"READ":filterMe("id"),
			"CREATE":forbidProfileCreation
		}]);
		
		srv.before('READ', "CoachBilling", req => {
			req.reject(403,{errCode: errors.NOT_ALLOWED});
		});	
		
		srv.before('READ', "Templates", req => {
			const ttype='S'; // shared template
			if (req.query.where) req.query.where({ "type":{'=': ttype} }); // bloody cql query does not have where function
		});
		
		srv.before('READ', "Promos", req => {
			if (isOdataReq(req)) req.reject(403, {errCode: errors.NOT_ALLOWED}); // forbid "external" read of Promos
		});
		
		srv.before('READ', "Coaches", req => { // hide invisible coaches from exposed entityset
			if (isOdataReq(req)) req.query.where({ "visible":{'=': true} });
		});
		
		const baseUrl = '/rest/client';
		app.get(baseUrl, function(req, res){
			return getSettings(srv).then(function(settings){ 
				res.json({
					alive:settings["general"]["client"]["alive"]?true:false,
					version:settings["general"]["version"]
				});
			}).catch(getRestCatcher(res));
		});
		
		app.get(baseUrl + '/onboard', function(req, res){
			var deviceId = req.query.device;
			if (!deviceId) res.status(403).send({errCode: errors.NOT_ENOUGH_ONBOARD_DATA});
			const tx=srv.tx();
			return onboardClient(deviceId,srv,tx).then(function(profile){
				tx.commit();
				res.send(profile);
			}).catch(getRestCatcher(res,tx));
		});
		
		app.get(baseUrl + '/init', function(req, res){
			const tx=srv.tx();
			return basicChecks(srv,req).then(function(profile){
				return initClientApp(profile,srv,tx);
			}).then(function(initData){
				tx.commit();
				res.send(initData);
			}).catch(getRestCatcher(res,tx));
		});
		
		app.get(baseUrl + '/search', function(req, res){
			if (!req.query.q || req.query.q=='undefined') return res.send([]);
			const tx=dbSrv.tx();
			return basicChecks(srv,req).then(function(profile){
				return searchStuff(req.query.q, profile, dbSrv, tx);
			}).then(function(results){
				tx.commit();
				res.send(results);
			}).catch(getRestCatcher(res,tx));
		});
		
		app.get(baseUrl + '/getPromoData', function(req, res){
			const tx=srv.tx();
			return basicChecks(srv,req).then(function(profile){
				return getPromoData(profile,srv,tx);
			}).then(function(promoData){
				tx.commit();
				res.send(promoData);
			}).catch(getRestCatcher(res,tx));
		});		
		
		app.get(baseUrl + '/getPurchaseOptions', function(req, res){
			const purchaseType=req.query.type||'R';
			return basicChecks(srv,req).then(function(profile){
				return calcPurchaseOptions(purchaseType, profile, srv);
			}).then(function(priceOptions){
				res.send(priceOptions);
			}).catch(getRestCatcher(res));
		});
		
		app.get(baseUrl + '/completePayment', function(req, res){
			const purchaseId=req.query.purchase;
			const tx=srv.tx();
			return new Promise(function(resolve,reject){
				if (!purchaseId) return reject({errCode: errors.NOT_ALLOWED});
				return resolve();
			}).then(function(){
				return basicChecks(srv,req);
			}).then(function(profile){
				return completePaymentClient(purchaseId, profile, srv, tx);
			}).then(function(results){
				tx.commit();
				res.send(results);
			}).catch(getRestCatcher(res,tx));
		});
		
		app.get(baseUrl + '/getCalendar', function(req, res){
			const tx=srv.tx();
			return basicChecks(srv,req).then(function(profile){
				return getClientCalendar(profile, srv,tx);
			}).then(function(calendar){
				tx.commit();
				res.send(calendar);
			}).catch(getRestCatcher(res,tx));
		});

		srv.on ('makeSubscription', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return subscribeToProgram(req.data.template_id, profile, srv, tx);
			}).then(function(purchase){
				tx.commit();
				return req.reply(purchase.id);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('makePurchase', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return makePurchase(req.data, profile, srv, tx);
			}).then(function(purchase){
				tx.commit();
				return req.reply(purchase.id);
			}).catch(getCatcher(req,tx));
		});

		srv.on ('redeemPromo', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return redeemPromo(req.data.promo_id, profile, srv, tx);
			}).then(function(promo){
				tx.commit();
				return req.reply(promo.purchaseId);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('addPayment', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return addPayment(req.data, srv, tx);
			}).then(function(activePaymentId){
				tx.commit();
				return req.reply(activePaymentId);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('createWorkout', req => {
			// const tx=srv.tx();
			const tx=dbSrv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return createWorkoutClient(req.data, profile, srv,tx);
			}).then(function(workoutId){
				tx.commit();
				return req.reply(workoutId);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('cloneWorkout', req => {
			// const tx=srv.tx();
			const tx=dbSrv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return cloneWorkoutClient(req.data, profile, srv, tx);
			}).then(function(workout_id){
				tx.commit();
				return req.reply(workout_id);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('shareObject', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				var urlPars=[ "target="+req.data.target, "id="+req.data.id ];
				return createLink(urlPars.join("&"), srv, tx);
			}).then(function(linkId){
				tx.commit();
				return req.reply(linkId);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('createChatMessage', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return createChatMessageClient(req.data, profile, srv, tx);
			}).then(function(msg){
				tx.commit();
				return req.reply(msg.id);
			}).catch(getCatcher(req,tx));
		});
		
		srv.before('UPDATE', "Workouts", req => {
			const tx=srv.tx();
			if (!isOdataReq(req)) return Promise.resolve(); // we are cloning exercises from workout template
			return basicChecks(srv,req._.req).then(function(profile){
				return workoutBeforeUpdateClient(req.data, profile, srv, tx);
			}).then(function(){
				tx.commit();
			}).catch(getCatcher(req,tx));
		});
		
		srv.after('UPDATE', "Workouts", (workoutData,req) => {
			if (workoutData['status']!='E') return;
			const tx=srv.tx();
			workoutAfterUpdateClient(workoutData.id, srv, tx).then(function(){
				tx.commit();
			}).catch(getCatcher(req,tx));
		});

		// hack standard filter due to sqlite cyrillic uppercase issues
		srv.before('READ', "Content", (req) => {
			var where=req.query.SELECT.where;
			if (!where) return;
			var newQuery=getNewContentSearch(where);
			if (newQuery) req.query.SELECT.where=newQuery.SELECT.where;
		});	

		// override and hack standard filter due to sqlite cyrillic uppercase issues
		srv.on('READ', "ClientWorkouts", (req,next) => {
			if (!isOdataReq(req)) return next();

			var where=req.query.SELECT.where;
			if (!where) return next();

			var newQuery=getNewWorkoutsSearch(where);
			if (newQuery) req.query.SELECT.where=newQuery.SELECT.where;
			return next();
		});

		// override standard handler with direct db write due to strange sporadic tx locks
		srv.on(['CREATE'], 'Excercises', req => {
			const { Excercises } = dbSrv.entities;
			const tx=dbSrv.tx();
			return tx.create(Excercises).entries(req.data).then(function(res){
				tx.commit();
				return req.reply(req.data);
			}).catch(getCatcher(req,tx));
		});

		// override standard handler with direct db write due to strange sporadic tx locks
		srv.on(['UPDATE'], 'Excercises', req => {
			const { Excercises } = dbSrv.entities;
			const tx=dbSrv.tx();
			return tx.update(Excercises,{id:req.data.id}).with(req.data).then(function(res){
				tx.commit();
				return req.reply(req.data);
			}).catch(getCatcher(req,tx));
		});

	});

	cds.serve("CoachService").in(app).with(function(srv){
		
		protectService(srv,[{
			entity:"ClientWorkouts", 
			"READ" : filterMe("coachId")
		},{
			entity:"CoachClients",
			"READ":filterMe("coachId")
		},{
			entity:"CoachClientsPurchase", 
			"READ":filterMe("coachId")
		},{
			entity:"CoachClientsTotal", 
			"READ":filterMe("coachId")
		},{
			entity:"CoachPublishedPrograms", 
			"READ":filterMe("coachId")
		},{
			entity:"CoachNotes", 
			"READ" : filterMe("coach_id")
		},{
			entity:"Content", 
			"READ" : filterMe("author_id")
		},{ 
			entity:"Templates", 
			"READ":filterMe("coach_id")
		},{ 
			entity:"CoachBilling", 
			"READ":filterMe("coach_id") 
		},{ 
			entity:"MyWorkoutTemplates", 
			"READ":filterMe("coach_id") },
		{ 
			entity:"MyClients", 
			"READ":filterMe("coachId")
		},{ 
			entity:"Promos", 
			"READ":filterMe("coachId")
		},{ 
			entity:"MyPromos", 
			"READ":filterMe("coachId")
		},{ 
			entity:"MyPromosCount", 
			"READ":filterMe("coachId")
		},{ 
			entity:"MyMoney", 
			"READ":filterMe("id")
		},{ 
			entity:"MyChatChannels", 
			"READ":function(profile){ 
				const exceptType='';
				return { "type":{'!=': exceptType}, "and": {"coach_id":{"=":profile.id }} };
			}
		},{ 
			entity:"MyActivePurchases", 
			"READ":function(profile){
				const state='A';
				return { "state":{'=':state}, "and": {"coach_id":{"=":profile.id }} };
			}
			
		},{ 
			entity:"Profiles", 
			"CREATE":forbidProfileCreation
		}]);

		const baseUrl = '/rest/coach';
		app.get(baseUrl, function(req, res){
			return getSettings(srv).then(function(settings){ 
				res.json({
					alive:settings["general"]["coach"]["alive"]?true:false,
					version:settings["general"]["version"]
				});
			}).catch(getRestCatcher(res));
		});
		
		app.get(baseUrl + '/onboard', function(req, res){
			var deviceId = req.query.device, authToken = req.query.token;
			if (!(deviceId && authToken)) res.status(403).send({errCode: errors.NOT_ENOUGH_ONBOARD_DATA});
			const tx=srv.tx();
			return onboardCoach(deviceId,authToken,srv,tx).then(function(profile){
				tx.commit();
				res.send(profile);
			}).catch(getRestCatcher(res,tx));
		});
		
		app.get(baseUrl + '/init', function(req, res){
			const tx=srv.tx();
			return basicChecks(srv,req).then(function(profile){
				return initCoachApp(profile,srv,tx);
			}).then(function(initData){
				tx.commit();
				res.send(initData);
			}).catch(getRestCatcher(res,tx));
		});
		
		app.get(baseUrl + '/getCalendar', function(req, res){
			const tx=srv.tx();
			return basicChecks(srv,req).then(function(profile){
				return getCoachCalendar(profile,srv,tx);
			}).then(function(workouts){
				tx.commit();
				res.send(workouts);
			}).catch(getRestCatcher(res,tx));
		});
		
		app.get(baseUrl + '/getPurchaseOptions', function(req, res){
			const purchaseType=req.query.type||'R';
			return basicChecks(srv,req).then(function(profile){
				return calcPurchaseOptions(purchaseType, profile, srv);
			}).then(function(priceOptions){
				res.send(priceOptions);
			}).catch(getRestCatcher(res));
		});
		
		app.get(baseUrl + '/completePayment', function(req, res){
			const purchaseId=req.query.purchase;
			const tx=srv.tx();
			return new Promise(function(resolve,reject){
				if (!purchaseId) return reject({errCode: errors.NOT_ALLOWED});
				return resolve();
			}).then(function(){
				return basicChecks(srv,req);
			}).then(function(profile){
				return completePaymentCoach(purchaseId, profile, srv, tx);
			}).then(function(results){
				tx.commit();
				res.send(results);
			}).catch(getRestCatcher(res,tx));
		});	
		
		srv.on ('addPayment', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return addPayment(req.data, srv, tx);
			}).then(function(activePaymentId){
				tx.commit();
				return req.reply(activePaymentId);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('createPromo', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return createPromo(req.data, profile, srv, tx);
			}).then(function(promoCode){
				tx.commit();
				return req.reply(promoCode);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('createChatMessage', req => {
			const tx=srv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return createChatMessageCoach(req.data, profile, srv, tx);
			}).then(function(msg){
				tx.commit();
				return req.reply(msg.id);
			}).catch(getCatcher(req,tx));
		});	
		
		srv.on ('createWorkout', req => {
			// const tx=srv.tx();
			const tx=dbSrv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return createWorkoutCoach(req.data, profile, srv, tx);
			}).then(function(workoutId){
				tx.commit();
				return req.reply(workoutId);
			}).catch(getCatcher(req,tx));
		});
		
		srv.on ('cloneWorkout', req => {
			// const tx=srv.tx();
			const tx=dbSrv.tx();
			return basicChecks(srv,req._.req).then(function(profile){
				return cloneWorkoutCoach(req.data, profile, srv, tx);
			}).then(function(workout_id){
				tx.commit();
				return req.reply(workout_id);
			}).catch(getCatcher(req,tx));
		});
		
		srv.before(['CREATE','DELETE'], "CoachesToGyms", req => {
			return basicChecks(srv,req._.req).then(function(profile){
				if (profile.id!=req.data.coach_id) return Promise.reject({errCode: errors.NOT_ALLOWED});
			}).catch(getCatcher(req));
		});

		srv.before('UPDATE', "Profiles", req => {
			if (!isOdataReq(req)) return Promise.resolve(); // in process of onboarding the coach
			return basicChecks(srv,req._.req).then(function(profile){
				if (profile.id!=req.data.id) return Promise.reject(400,{errCode: errors.NOT_ALLOWED});
			}).catch(getCatcher(req));
		});
		
		srv.after('READ', "MyMoney", each => {
			function getWeeklyTarget(coachId){
				return getSettings(srv).then(function(settings){ // this shit only works if settings are already read from db. rtfm
					const weeklyTarget=parseInt(settings["billing"]["target"]["weekly"]);
					return Promise.resolve(weeklyTarget);
				});
			}
			return getWeeklyTarget(each.id).then(function(target){
				each.target=target;
			});
		});

		srv.before('UPDATE', "Workouts", req => {
			const tx=srv.tx();
			if (!isOdataReq(req)) return Promise.resolve(); // we are cloning exercises from workout template
			return basicChecks(srv,req._.req).then(function(profile){
				return workoutBeforeUpdateCoach(req.data, profile, srv, tx);
			}).then(function(){
				tx.commit();
			}).catch(getCatcher(req,tx));
		});
		
		srv.after('UPDATE', "Workouts", (workoutData,req) => {
			if (workoutData['status']!='E') return;
			const tx=srv.tx();
			workoutAfterUpdateCoach(workoutData.id, srv, tx).then(function(){
				tx.commit();
			}).catch(getCatcher(req,tx));
		});
		
		// override and hack standard filter due to sqlite cyrillic uppercase issues
		srv.on('READ', "Content", (req,next) => {
			if (!isOdataReq(req)) return next();

			var where=req.query.SELECT.where;
			if (!where) return next();

			var owner=where[where.length-1].val;
			var newQuery=getNewContentSearch(where,owner);
			if (newQuery) req.query.SELECT.where=newQuery.SELECT.where;
			return next();
		});

		// override and hack standard filter due to sqlite cyrillic uppercase issues
		srv.on('READ', "ClientWorkouts", (req,next) => {
			if (!isOdataReq(req)) return next();

			var where=req.query.SELECT.where;
			if (!where) return next();

			var newQuery=getNewWorkoutsSearch(where);
			if (newQuery) req.query.SELECT.where=newQuery.SELECT.where;
			return next();
		});

		// override and hack standard filter due to sqlite cyrillic uppercase issues
		srv.on('READ', "CoachClients", (req,next) => {
			if (!isOdataReq(req)) return next();

			var where=req.query.SELECT.where;
			if (!where) return next();

			var newQuery=getNewClientsSearch(where);
			if (newQuery) req.query.SELECT.where=newQuery.SELECT.where;
			return next();
		});
		
		// override standard handler with direct db write due to strange sporadic tx locks
		srv.on(['CREATE'], 'Excercises', req => {
			const { Excercises } = dbSrv.entities;
			const tx=dbSrv.tx();
			return tx.create(Excercises).entries(req.data).then(function(res){
				tx.commit();
				return req.reply(req.data);
			}).catch(getCatcher(req,tx));
		});

		// override standard handler with direct db write due to strange sporadic tx locks
		srv.on(['UPDATE'], 'Excercises', req => {
			const { Excercises } = dbSrv.entities;
			const tx=dbSrv.tx();
			return tx.update(Excercises,{id:req.data.id}).with(req.data).then(function(res){
				tx.commit();
				return req.reply(req.data);
			}).catch(getCatcher(req,tx));
		});

	});

});