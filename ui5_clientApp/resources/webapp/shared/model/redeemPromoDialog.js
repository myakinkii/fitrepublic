sap.ui.define([ "ru/fitrepublic/shared/appMgr",
	"sap/m/Dialog", "sap/m/Button", "sap/m/Input", "sap/m/Text"
], function (AppMgr, Dialog, Button, Input, Text) {
	"use strict";

	return {

		enterPromoCode: function () {
			return new Promise(function(resolve,reject){
				var value='';
				var begin=new Button({
					type: "Accept",
					text: AppMgr.geti18n("genericOK"),
					enabled: false,
					press: function () { dlg.close(); resolve(value); }
				});
				var input=new Input({
					width: "100%",
					value:value,
					liveChange: function (e) { 
						value=e.getParameter("value");
						begin.setEnabled(value.length == 8);
					}
				});
				var text=new Text({ text: AppMgr.geti18n("redeemPromoText") });
				var end=new Button({
					text: AppMgr.geti18n("genericCancel"),
					press: function () { dlg.close(); reject(); }
				});
				var dlg = new Dialog({
					type: "Message",
					title: AppMgr.geti18n("redeemPromoTitle"),
					content: [ text, input ],
					beginButton: begin,
					endButton: end
				});
				dlg.attachAfterClose(function(){ dlg.destroy(); });
				dlg.open();
			});
		}

	};
});