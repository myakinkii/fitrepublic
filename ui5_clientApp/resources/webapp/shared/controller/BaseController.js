sap.ui.define([
	"ru/fitrepublic/shared/appMgr",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/BusyDialog", "sap/m/MessageBox", "sap/m/MessageToast", "sap/ui/core/Popup"
], function(AppMgr, Controller, History, BusyDialog, MessageBox, MessageToast, Popup) {
	"use strict";

	return Controller.extend("ru.fitrepublic.shared.model.BaseController", {
		
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		navBack:function(){
			// var prev=this.getRouter().getRouteInfoByHash(History.getInstance().getPreviousHash());
			var prev=AppMgr.popRoute();
			if (prev) this.getRouter().navTo(prev.name,prev.args);
			else this.getRouter().navTo("main");
			// history.go(-1);
		},
		
		navHome:function(){
			this.getRouter().navTo("main");
		},
		
		geti18n: function(prop, arr) {
			if (!this._i18nbndl) this._i18nbndl = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			return this._i18nbndl.getText(prop, arr);
		},
		
		showToast: function(text, time) {
			MessageToast.show(text, {
				autoClose: true,
				width: '50%',
				duration: time || 1000,
				at: Popup.Dock.CenterCenter
			});
		},

		setBusy: function(msg) {
			if (!this._busyDialog) this._busyDialog = new BusyDialog({
				title: this.geti18n('genericBusyTitle')
			});
			this._busyDialog.setText(msg || this.geti18n('genericBusyText'));
			this._busyDialog.open();
		},

		clearBusy: function(msg, time) {
			if (this._busyDialog) this._busyDialog.close();
			if (msg) this.showToast(msg, time || 500);
		},
		
		displayContent:function(url){
			if ( typeof cordova !== "undefined" && cordova.InAppBrowser) {
				var systemBrowser=AppMgr.getSystemBrowser();
				var ref = cordova.InAppBrowser.open(url, systemBrowser?'_system':'_blank', 'location=yes');
				ref.addEventListener('exit', function(){ console.log(url); });
			} else window.open(url, '_blank', 'location=yes');
		},		

		refreshMyElementBinding:function(){
			this.getView().getElementBinding("odata").refresh(true);
		},
		
		getItemsBindingFor:function(id){
			return this.getView().byId(id).getBinding("items");
		},
		
		copyProfileSecret:function(){
			function copyToClipboard(val){
				var dummy = document.createElement("textarea");
				document.body.appendChild(dummy);
				dummy.value = val;
				dummy.select();
				document.execCommand("copy");
				document.body.removeChild(dummy);
			}
			var profile=this.getView().getModel().getProperty('/profile');
			var json={secret:profile.deviceId+"|"+profile.authToken};
			var backend=AppMgr.getBackendSystem();
			if (backend) json["backend"]=backend;
			copyToClipboard(btoa(JSON.stringify(json)));
			this.showToast(this.geti18n("profileSecretCopied"));
		},
		
		restoreProfile:function(){
			var secret=window.prompt();
			try {
				var json=JSON.parse(atob(secret));
				if (typeof json.backend == 'string') AppMgr.setBackendSystem(json.backend);
				if (json.secret) AppMgr.restoreProfile(json.secret.split("|"));
			} catch(e){
				this.showToast(this.geti18n("profileSecretNotValid"));
			}
		},
		
		checkShowTutorialMessage:function(){
			var tutorialWatched=AppMgr.getTutorialWatched();
			var watchPromise=Promise.resolve(false);
			if (!tutorialWatched) watchPromise=new Promise(function(resolve,reject){
				MessageBox.confirm(AppMgr.geti18n('onboardPleaseWatchTutorial'),{
					onClose:function(action){
						AppMgr.setTutorialWatched(true);
						if (action == MessageBox.Action.OK) resolve(true);
						else resolve(false)
					}
				})
			});
			return watchPromise;
		},
		
		showTutorial:function(){
			var self=this;
			var playlistUrl=this.getOwnerComponent().tutorialPlaylistUrl;
			return new Promise(function(resolve,reject){
				MessageBox.information(AppMgr.geti18n('onboardWillOpenTutorial'),{
					onClose:function(action){
						self.displayContent(playlistUrl);
						resolve();
					}
				})
			});
		}
		
	});
	
});