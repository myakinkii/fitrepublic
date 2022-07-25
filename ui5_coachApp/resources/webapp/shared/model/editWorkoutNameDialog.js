sap.ui.define([ "ru/fitrepublic/shared/appMgr",
	"sap/m/Dialog", "sap/m/Button", "sap/m/Input"
], function (AppMgr, Dialog, Button, Input) {
	"use strict";

	return {

		getWorkoutName: function (initialValue) {
			return new Promise(function(resolve,reject){
				var value=initialValue||'';
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
						begin.setEnabled(value.length > 0);
					}
				});
				var end=new Button({
					text: AppMgr.geti18n("genericCancel"),
					press: function () { dlg.close(); reject(); }
				});
				var dlg = new Dialog({
					type: "Message",
					title: AppMgr.geti18n("templateGetWorkoutTitle"),
					content: [ input ],
					beginButton: begin,
					endButton: end
				});
				dlg.attachAfterClose(function(){ dlg.destroy(); });
				dlg.open();
			});
		}

	};
});