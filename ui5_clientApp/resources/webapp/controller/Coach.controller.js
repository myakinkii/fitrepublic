sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"ru/fitrepublic/shared/model/purchaseDialog",
	"ru/fitrepublic/shared/model/shareObjectDialog",
	"sap/m/GroupHeaderListItem"
], function (Controller, AppMgr, PurchaseDlg, ShareDialog, GroupHeaderListItem) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Coach", {
		
		onInit: function() {
			this.getRouter().getRoute("coach").attachMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched:function(e){
			var id=e.getParameter("arguments").id;
			var path="/Coaches(guid'"+id+"')";
			this.getOwnerComponent().initPromise.then(function(){
				this.getView().bindElement({ path:path, model: "odata", parameters: { expand: "gyms,gyms/gym" } });
				this.refreshMyElementBinding();
			}.bind(this));
		},
		
		getGroupHeader:function(oGroup){
			return new GroupHeaderListItem({
				title: this.geti18n('gymType_'+oGroup.key),
				type:'Inactive',
				upperCase: false
			});
		},
		
		selectGym:function(e){
			var ctxs=e.getSource().getSelectedContexts();
			if (ctxs[0]) this.gym={ gym_id:ctxs[0].getProperty("gym_id"),gym_type:ctxs[0].getProperty("gym/type") };
		},
		
		makePurchase:function(){
			if (!this.gym) return this.showToast(this.geti18n('purchaseGymNotSelected'));
			var coach_id=this.getView().getBindingContext("odata").getProperty("id");
			var purchaseType=this.gym.gym_type;
			var gym_id=this.gym.gym_id;
			var self=this;
			PurchaseDlg.displayPurchaseOptions(this.getView(),purchaseType).then(function(option){
				return AppMgr.promisedCallFunction("/makePurchase",{
					coach_id : coach_id,
					gym_id: gym_id,
					purchaseType: purchaseType,
					quantity : option.quantity,
					cost : option.price
				});
			}).then(function(data){
				return PurchaseDlg.displayPaymentPage(data.value);
			}).then(function(result){
				self.getRouter().navTo("purchase",{id:result.id});
			}).catch(function(err){
				console.log(err);
			});
		},
		
		goToGym:function(e){
			this.getRouter().navTo("gym",{id:e.getSource().getBindingContext("odata").getProperty("gym_id")});
		},
		
		goToTemplate:function(e){
			this.getRouter().navTo("template",{id:e.getSource().getBindingContext("odata").getProperty("id")});
		},		
		
		contentPress:function(e){
			this.displayContent(e.getSource().getBindingContext("odata").getProperty("url"));
		},
		
		coverPress:function(e){
			this.displayContent(e.getSource().getBindingContext("odata").getProperty("coverUrl"));
		},
		
		shareObject:function(){
			var ctx=this.getView().getBindingContext("odata");
			var target="coach";
			var id=ctx.getProperty("id");
			var linkId=ctx.getProperty("linkId");
			ShareDialog.share(target,id,linkId,this.getView()).then(function(url){
				console.log(url);
			}).catch(function(){
				console.log('wtf');
			});
		}
		
	});
});