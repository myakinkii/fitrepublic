sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr" ], function (Controller, AppMgr) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Chat", {
		onInit: function() {
			this.getRouter().getRoute("chat").attachMatched(this.onRouteMatched, this);
		},
		onRouteMatched:function(e){
			// var id=e.getParameter("arguments").id;
			// console.log(id);
		}
	});
});