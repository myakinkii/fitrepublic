sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"ru/fitrepublic/shared/model/coachNotesDialog",
	"ru/fitrepublic/shared/model/coachPromosDialog"
], function (Controller, AppMgr, NotesDlg, PromoDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Main", {

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
		
		templateListActionHandler:function(pars){
			if (pars.dst=="template"){
				this.getRouter().navTo(pars.dst,pars.vars);
			} else if (pars.dst=='addTemplate') {
				this.getRouter().navTo('template',{id:'new'});
			} else this.getRouter().navTo('templates');
		},
		
		displayNotes:function(pars){
			var clientId=pars.vars.id;
			NotesDlg.displayNotes(this.getView(), clientId).then(function(newData){
				// console.log(newData);
			}).catch(function(err){
				// console.log(err);
			});
		},
		
		addPromo:function(pars,e){
			var card=e.getParameter("card");
			PromoDlg.open(this.getView()).then(function(promoCode){
				if (promoCode) card.refresh();
			}).catch(function(err){
				// console.log(err);
			});
		},
		
		coachPromoActionHandler:function(pars,e){
			if (this[pars.dst]) this[pars.dst](pars,e); // in-place actions
			else return this.getRouter().navTo(pars.dst,pars.vars);
		},
		
		clientListActionHandler:function(pars){
			if (this[pars.dst]) this[pars.dst](pars); // in-place actions
			else return this.getRouter().navTo(pars.dst,pars.vars);
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
		}
	});
});