sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"ru/fitrepublic/shared/model/addWorkoutDialog",
	"ru/fitrepublic/shared/model/redeemPromoDialog"
], function (Controller, AppMgr, WorkoutDlg, PromoDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Main", {
		
		onInit: function() {
			this.getRouter().attachBeforeRouteMatched(function(e){
				var pars=e.getParameters();
				AppMgr.pushRoute({name:pars.name,args:pars.arguments});
			});
			this.getRouter().getRoute("main").attachMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function() {
			this.getOwnerComponent().initPromise.then(function(){
				AppMgr.renderCards(this, this.getView().byId("cardContainer"));
			}.bind(this));
		},
		
		searchAndPromoActionHandler:function(pars){
			if (pars.dst=='search') {
				this.getRouter().navTo(pars.dst,pars.vars);
			} else if (pars.dst=='promo'){
				if (pars.vars.type=='coach' || pars.vars.type=='gym') this.getRouter().navTo(pars.vars.type,{id:pars.vars.id});
			} else if (pars.dst=='split') {
				this.showToast(JSON.stringify(pars.vars));
			} else this.showToast(JSON.stringify([pars.dst,pars.vars]));
		},
		
		calendarActionHandler:function(pars,e){
			if (this[pars.dst]) this[pars.dst](pars); // in-place actions
			else if (pars.dst=="schedule" && pars.more){
				var addz=function(n){ return (n<10?'0':'')+n; };
				var date=e.getSource().getModel().getProperty("/selectedDate");
				var dateStr=[  // we need LOCAL date, so do NOT use toISOString
					date.getFullYear(),
					addz(date.getMonth()+1),
					addz(date.getDate())
				].join("-");
				this.getRouter().navTo("schedule",{date:dateStr});
			} else return this.getRouter().navTo(pars.dst,pars.vars);
		},
		
		addWorkout:function(pars){
			var self=this;
			WorkoutDlg.createWorkoutParams(this.getView()).then(function(workoutPars){
				return AppMgr.promisedCallFunction("/createWorkout",workoutPars);
			}).then(function(data){
				self.getRouter().navTo("workout",{id:data.value});
			}).catch(function(err){
				if (!err) return;
				console.log(err);
			});			
		},
		
		purchaseListActionHandler:function(pars){
			if (this[pars.dst]) this[pars.dst](pars); // in-place actions
			else return this.getRouter().navTo(pars.dst,pars.vars);
		},
		
		clientWorkoutsActionHandler:function(pars){
			if (this[pars.dst]) this[pars.dst](pars); // in-place actions
			else return this.getRouter().navTo(pars.dst,pars.vars);
		},
		
		redeemPromo:function(pars){
			var self=this;
			PromoDlg.enterPromoCode().then(function(promoId){
				return AppMgr.promisedCallFunction("/redeemPromo",{promo_id:promoId.toUpperCase()});
			}).then(function(data){
				// self.getRouter().navTo("purchase",{id:data.value});
				self.showToast(self.geti18n('redeemPromoSuccess'));
			}).catch(function(err){
				if (!err) return;
				console.log(err);
				var errText=AppMgr.geti18n('error_'+err.errCode)||AppMgr.geti18n('redeemPromoError');
				self.showToast(errText);
			});
		}
		
	});
});