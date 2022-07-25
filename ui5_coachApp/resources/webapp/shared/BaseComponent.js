sap.ui.define([ "sap/ui/core/UIComponent", "ru/fitrepublic/shared/appMgr", "ru/fitrepublic/shared/constants",
	"sap/m/MessageBox"
], function (UIComponent, AppMgr, Constants, MessageBox) {
	"use strict";

	return UIComponent.extend("ru.fitrepublic.shared.model.BaseComponent", {

		init: function () {
			
			UIComponent.prototype.init.apply(this, arguments);
			
			AppMgr.setOwner(this);
			AppMgr.resolveUrls(this.getManifestEntry("/sap.app/dataSources/mainService"));
			
			var router=this.getRouter();
			this.initPromise = AppMgr.performInitChecks(this).then(function(initProps){
				var onboarding = !initProps.onboarded && initProps.online && initProps.beAlive;
				var initOnline = initProps.onboarded && initProps.online && initProps.beAlive;
				var initOffline = initProps.onboarded && (!initProps.online || !initProps.beAlive);
				var forceUpdate = initProps.version.app && initProps.version.be && initProps.version.app < initProps.version.be.minimal;
				if (forceUpdate) {
					MessageBox.warning(AppMgr.geti18n('errorUpdateRequired',[initProps.version.be.current]));
					AppMgr.setModeOnline(false);
					router.initialize(false);
					return AppMgr.initOffline();
				} else if (onboarding){
					AppMgr.setModeOnline(true);
					router.initialize(true); // to make skip it empty hash and navto to onboard without Main
					router.navTo("onboard",{id:initProps.localProfile.deviceId});
					return Promise.resolve();
				} else if (initOnline) {
					AppMgr.setModeOnline(true);
					var intent=AppMgr.getExternalNav();
                    var hash=window.location.href.split("#");
                    var curr=router.getRouteInfoByHash(hash[1]||'');
                    var sameHash = intent && intent.target==curr.name && intent.id==curr.arguments.id;
                    if (intent && !sameHash) {
                        router.initialize(true);
                        router.navTo(intent.target,{id:intent.id});
                    } else {
                        router.initialize(false);
                    }
					return AppMgr.init();
				} else if (initOffline){
					MessageBox.warning(AppMgr.geti18n(initProps.beAlive?'errorOfflineMode':'errorBackendIsDead'));
					AppMgr.setModeOnline(false);
					router.initialize(false);
					return AppMgr.initOffline();
				} else return Promise.reject({errCode:'INIT_ONBOARDING_OFFLINE',src:'FE'});
			}.bind(this)).catch(function(err){
				if (err.errCode==Constants.errors.INIT_ONBOARDING_OFFLINE) {
					MessageBox.error(AppMgr.geti18n('errorCannotOnboardOfflie'));
				} else if (err.errCode==Constants.errors.PROFILE_NOT_FOUND) {
					AppMgr.setModeOnline(false);
					var resetProfile=AppMgr.geti18n('profileReset');
					MessageBox.error(AppMgr.geti18n('errorCannotInitProfile',[resetProfile]), {
						actions: [resetProfile, MessageBox.Action.CLOSE],
						emphasizedAction: MessageBox.Action.CLOSE,
						onClose: function (action) {
							if (action==resetProfile) AppMgr.resetProfile();
						}
					});
				} else console.log(err);
			});
		}
	});
});