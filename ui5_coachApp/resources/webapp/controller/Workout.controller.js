sap.ui.define([ "ru/fitrepublic/shared/controller/WorkoutController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel"
], function (Controller, AppMgr, JSONModel) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Workout", {
		
		onInit: function() {
			this.getOwnerComponent().setModel(new JSONModel({
				visible:true,
				editable:false,
				selectedCtx:null,
				exLength:0,
				ex:{}
			}),"ex");
			this.getRouter().getRoute("workout").attachMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched:function(e){
			var id=e.getParameter("arguments").id;
			var path="/Workouts(guid'"+id+"')";
			this.getView().bindElement({ path:path, model: "odata", parameters: { expand: "purchase,purchase/gym,coach,client" } });
			
			var useNewWorkoutLayout=true;
			var exMdl=this.getView().getModel("ex");
			exMdl.setProperty("/visible",useNewWorkoutLayout);
			if (useNewWorkoutLayout) {
				this.prepareExModel(id);
				exMdl.setProperty("/id",id);
			}
			this.clearSelection();
			
			// this.prepareChatStuff(path);
		}
		
	});
});