sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"ru/fitrepublic/shared/model/purchaseDialog",
	"ru/fitrepublic/shared/model/coachNotesDialog",
	"ru/fitrepublic/shared/model/addWorkoutDialog"
], function (Controller, AppMgr, JSONModel, Filter, PurchaseDlg, NotesDlg, WorkoutDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Client", {
		
		onInit: function() {
			this.getRouter().getRoute("client").attachMatched(this.onRouteMatched, this);
			this.filterFields=["purchaseDescr","workoutDescr"];
			this.listName="workouts";
		},
		
		handleSearch:function(e){
			var filters=[];
			var val=e.getParameter("query");
			if (val) {
				filters.push( new Filter(this.filterFields.map(function(f) {
					return new Filter({ path:f,  operator:"Contains",  value1:val, caseSensitive:false });
					}), false));
			}
			this.getItemsBindingFor(this.listName).filter(filters,"Application");
		},
		
		onRouteMatched:function(e){
			var id=e.getParameter("arguments").id;
			
			var path="/CoachClientsPurchase(guid'"+id+"')";
			this.getView().bindElement({ path:path, model: "odata" });
			
			var workouts = this.getView().byId("workouts").getBinding("items");
			workouts.filter(new Filter({
				path: 'clientId',
				operator: 'EQ',
				value1: id
			}));
		},
		
		formatWorkoutPurchase:function(ptype,pdescr){
			var text=this.geti18n('purchaseType')+': '+this.geti18n('purchaseType_'+ptype);
			if (ptype=='F') return text;
			return text + (pdescr?' @'+pdescr:'');
		},
		
		formatWorkoutStatus:function(statusCode){
			return this.geti18n('workoutStatus_'+statusCode);
		},
		
		formatWorkoutTimestamp:function(timestamp){
			if (!timestamp) return '';
			var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour:'numeric', minute:'2-digit' };
			var locale=sap.ui.getCore().getConfiguration().getLocale().toString();
			return timestamp.toLocaleDateString(locale, options);
		},
		
		addPayment_R:function(){
			var id=this.getView().getBindingContext("odata").getProperty("RPid");
			this.addPayment('R',id);
		},
		
		addPayment_O:function(){
			var id=this.getView().getBindingContext("odata").getProperty("OPid");
			this.addPayment('O',id);
		},
		
		addPayment_G:function(){
			var id=this.getView().getBindingContext("odata").getProperty("GPid");
			this.addPayment('G',id);
		},
		
		addPayment:function(pType,pId){
			
			var self=this;
			PurchaseDlg.displayPurchaseOptions(this.getView(),pType).then(function(option){
				return AppMgr.promisedCallFunction("/addPayment",{
					purchase_id: pId,
					quantity : option.quantity,
					cost : option.price
				});
			}).then(function(data){
				return PurchaseDlg.displayPaymentPage(pId);
			}).then(function(result){
				self.refreshMyElementBinding();
				self.showToast(self.geti18n('genericSuccess'));
			}).catch(function(err){
				console.log(err);
			});
		},
		
		addWorkout:function(){
			var self=this;
			var id=this.getView().getBindingContext("odata").getProperty("GPid");
			var purch={id:id,type:'G'};
			WorkoutDlg.createWorkoutParams(this.getView(),purch).then(function(workoutPars){
				return AppMgr.promisedCallFunction("/createWorkout",workoutPars);
			}).then(function(data){
				self.getRouter().navTo("workout",{id:data.value});
			}).catch(function(err){
				console.log(err);
			});				
		},
		
		goToWorkout:function(e){
			var id=e.getSource().getBindingContext("odata").getProperty("workoutId");
			this.getRouter().navTo("workout",{id:id});
		},
		
		displayNotes:function(){
			var clientId=this.getView().getBindingContext("odata").getProperty("clientId");
			NotesDlg.displayNotes(this.getView(), clientId).then(function(newData){
				// console.log(newData);
			}).catch(function(err){
				// console.log(err);
			});
		}		
		
	});
});