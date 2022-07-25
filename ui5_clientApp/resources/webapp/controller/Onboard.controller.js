sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr"], function (Controller, AppMgr) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Onboard", {
		
		onInit: function() {
			this.getRouter().getRoute("onboard").attachMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched:function(e){
			this.deviceId=e.getParameter("arguments").id;
			this.getOwnerComponent().initPromise.then(function(data){
				if (data&&data.profile) this.getRouter().navTo("main");
			}.bind(this));
		},
		
		onboardMain:function(){
			var self=this;
			var component=this.getOwnerComponent();
			this.checkShowTutorialMessage().then(function(showTutorial){
				if (showTutorial) return self.showTutorial();
				else return Promise.resolve();
			}).then(function(){
				return AppMgr.onboard(self.deviceId);
			}).then(function(fullProfile){
				AppMgr.setProfile(fullProfile);
				component.initPromise=AppMgr.init();
				return component.initPromise;
			}).then(function(initData){
				self.getRouter().navTo("profile");
			}).catch(function(err){
				console.log(err);
			});
		}
	});
});