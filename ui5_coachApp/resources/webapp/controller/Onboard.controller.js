sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/m/MessageBox"
], function (Controller, AppMgr, MessageBox) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Onboard", {
		
		onInit: function() {
			this.getRouter().getRoute("onboard").attachMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched:function(e){
			this.deviceId=e.getParameter("arguments").id;
			this.getOwnerComponent().initPromise.then(function(data){
				if (data&&data.profile) this.getRouter().navTo("main");
			}.bind(this));
		},
		
		scanQRCode:function(){
			if (window.startScan) return window.startScan()
			return Promise.resolve({name:'dummy',authToken:'123'});
		},
		
		confirmName:function(qrData){
			var confirmMsg=this.geti18n('onboardConfirmName',[qrData.name]);
			return new Promise(function(resolve,reject){
				MessageBox.confirm(confirmMsg, function(action) {
					if (action == MessageBox.Action.OK) resolve(qrData.authToken);
					else reject();
				});
			});
		},
		
		onboardQR:function(){
			var self=this;
			var component=this.getOwnerComponent();
			this.checkShowTutorialMessage().then(function(showTutorial){
				if (showTutorial) return self.showTutorial();
				else return Promise.resolve();
			}).then(function(){
				return self.scanQRCode();
			}).then(function(qrData){
				return self.confirmName(qrData);
			}).then(function(authToken){
				return AppMgr.onboardCoach(self.deviceId,authToken);
			}).then(function(fullProfile){
				AppMgr.setProfile(fullProfile);
				component.initPromise=AppMgr.init();
				return component.initPromise;
			}).then(function(initData){
				self.getRouter().navTo("profile");
			}).catch(function(err){
				console.log(err);
				self.showToast(self.geti18n('onboardFailed'));
			});
		}
	});
});