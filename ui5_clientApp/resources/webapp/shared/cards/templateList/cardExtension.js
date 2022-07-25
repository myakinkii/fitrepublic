sap.ui.define([ "sap/ui/integration/Extension", "ru/fitrepublic/shared/appMgr" ], function (Extension, AppMgr) {
	"use strict";
	
	var oExtension = new Extension({
		formatters:{
			toIcon: function (tType) {
				return 'sap-icon://'+(tType=='P'?'hide':'show');
			},
			toHighlight: function (tType) {
				return tType=='P'?'Success':'Warning';
			}			
		},
		actions:[{
			type: "Custom",
			enabled: function(){ return AppMgr.getOnlineMode(); },
			parameters :{ "dst":"refresh"},
			icon: "sap-icon://refresh",
			text: AppMgr.geti18n("genericRefresh")
		}]
	});

	return oExtension;
});