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
			var options = {
				preferFrontCamera: false, // iOS and Android
				showFlipCameraButton: true, // iOS and Android
				showTorchButton: true, // iOS and Android
				torchOn: true, // Android, launch with the torch switched on (if available)
				prompt: this.geti18n('onboardQrScanPrompt'), // Android
				resultDisplayDuration: 500, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
				formats: "QR_CODE", // default: all but PDF_417 and RSS_EXPANDED
				orientation: "portrait", // Android only (portrait|landscape), default unset so it rotates with the device
				disableAnimations: true // iOS
			};
			return new Promise(function(resolve,reject){
				if (typeof cordova === "undefined" || !cordova.plugins.barcodeScanner) resolve({name:'dummy',authToken:'123'});
				cordova.plugins.barcodeScanner.scan(function(data){
					if (data.text.charCodeAt(0) === 0xFEFF) resolve(JSON.parse(data.text.slice(1))); // utf BOM
					else resolve(JSON.parse(data.text));
				}, reject, options);
			});
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