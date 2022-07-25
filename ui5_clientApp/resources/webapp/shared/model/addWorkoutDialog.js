sap.ui.define(["ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter", "sap/ui/model/FilterOperator"
], function(AppMgr, JSONModel, Filter, FilterOperator) {
	"use strict";
	
	var extResolve, extReject;

	return {
		
		formatPurchaseText:function(pType,coachName,pDescr,pQty,pExpDate){
			return (pType=='F'?'':coachName+" - ")+AppMgr.geti18n('workoutAddDlgPtype_'+pType);
			var options = { year: "numeric", month: "numeric", day: "numeric" };  
			// var at = pDescr?" @"+pDescr:'';
			var at=' '+AppMgr.geti18n('workoutAddDlgPtype'+pType);
			if (pType=='S') return coachName + at;
			if (pType=='O') return coachName + at +' ('+ (pExpDate?pExpDate.toLocaleString(undefined,options):'')+')';
			if (pType=='G' || pType=='R' ) return coachName + at +' x'+ pQty;
			return AppMgr.geti18n('purchaseType_'+pType);
		},
		
		createWorkoutParams:function(view, purchase){
			if (!this.workoutDialog) {
				this.workoutDialog = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.AddWorkoutDialog", this);
				view.addDependent(this.workoutDialog);
			}
			sap.ui.getCore().byId("purchaseSelect").getBinding("items").refresh(true);
			sap.ui.getCore().byId("templateSelect").getBinding("items").refresh(true);
			var purchId=purchase&&purchase.id;
			var showTemplates=purchase?purchase.type=='S':false;
			this.workoutDialog.setModel(new JSONModel({
				timestamp:new Date(),
				time:"12:00",
				selectedPurchase:purchId,
				showPurchases:!purchId,
				showTemplates:showTemplates,
				selectedTemplate:null
			}));
			if (showTemplates){
				var filter=new Filter({
					path:"template_id", 
					operator:FilterOperator.EQ, 
					value1:purchase.templateId
				});
				sap.ui.getCore().byId("templateSelect").getBinding("items").filter([filter]);				
			}
			var self=this;
			return new Promise(function(resolve,reject){
				extResolve=resolve;
				extReject=reject;
				self.workoutDialog.open();
			});
		},
		
		changePurchase:function(e){
			var ctx=e.getParameter("selectedItem").getBindingContext("odata").getObject();
			var isSubscr = ctx.purchaseType=='S';
			this.workoutDialog.getModel().setProperty('/showTemplates',isSubscr);
			if (isSubscr) {
				var filter=new Filter({
					path:"coachId", 
					operator:FilterOperator.EQ, 
					value1:ctx.coachId
				});
				sap.ui.getCore().byId("templateSelect").getBinding("items").filter([filter]);
			} else {
				this.workoutDialog.getModel().setProperty('/selectedPurchase',ctx.purchaseId);
			}
			sap.ui.getCore().byId("purchaseSelect").setValueState("None");
		},
		
		changeTemplate:function(e){
			var ctx=e.getParameter("selectedItem").getBindingContext("odata").getObject();
			this.workoutDialog.getModel().setProperty('/selectedPurchase',ctx.purchaseId);
			sap.ui.getCore().byId("templateSelect").setValueState("None");
		},
		
		handleCalendarSelect:function(e){
			var date=e.getSource().getSelectedDates()[0].getStartDate();
			this.workoutDialog.getModel().setProperty('/timestamp',date);
		},
		
		confirmDate:function(e){
			var mdlData=this.workoutDialog.getModel().getData();
			if (!mdlData.selectedPurchase) {
				sap.ui.getCore().byId("purchaseSelect").setValueState("Error");
				return;
			}
			var date=mdlData.timestamp;
			var time=mdlData.time.split(":");
			date.setHours(time[0]);
			date.setMinutes(time[1]);
			date.setSeconds(0);
			if (mdlData.showTemplates && !mdlData.selectedTemplate) {
				sap.ui.getCore().byId("templateSelect").setValueState("Error");
				return;
			}
			this.workoutDialog.close();
			extResolve({purchase_id:mdlData.selectedPurchase, template_id:mdlData.selectedTemplate, timestamp:date });
		},
		
		closeDlg:function(e){
			this.workoutDialog.close();
			extReject(null);
		}		
	};
});