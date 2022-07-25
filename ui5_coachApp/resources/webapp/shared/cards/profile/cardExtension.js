sap.ui.define([ "sap/ui/integration/Extension", "ru/fitrepublic/shared/appMgr" ], function (Extension, AppMgr) {
	"use strict";
	
	var oExtension = new Extension({
		formatters:{
			toIconTextNickName: function (nickName) {
				return nickName.substring(0,2).toUpperCase() || '??';
			},			
			toIconTextName: function (name) {
				var split=name.split(" ");
				return (split[0][0]+split[1][0]).toUpperCase();
			}
		},
		// actions:[{
		// 	type: "Custom",
		// 	enabled: function(){ return AppMgr.getOnlineMode(); },
		// 	parameters :{ "dst":"refresh"},
		// 	icon: "sap-icon://refresh",
		// 	text: AppMgr.geti18n("genericRefresh")
		// }]
	});
	
	oExtension.getData = function () {
		return AppMgr.getProfile().then(function(profile){
			var data={ nickName:profile.nickName };
			var joined=new Date(profile.createdAt);
			var timeOnPlatform = Date.now()-joined.getTime();
			data.weeksOnPlatform = Math.ceil(timeOnPlatform / (1000*60*60*24*7) );
			return Promise.resolve(data);
		});
	};

	return oExtension;
});