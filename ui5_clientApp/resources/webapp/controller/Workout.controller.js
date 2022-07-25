sap.ui.define([ "ru/fitrepublic/shared/controller/WorkoutController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"ru/fitrepublic/shared/model/excerciseDialog"
], function (Controller, AppMgr, JSONModel, ExcerciseDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Workout", {
		
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
			
			// var useNewWorkoutLayout=!AppMgr.getWorkoutLayout();
			var useNewWorkoutLayout=true;
			var exMdl=this.getView().getModel("ex");
			exMdl.setProperty("/visible",useNewWorkoutLayout);
			if (useNewWorkoutLayout) {
				this.prepareExModel(id);
				exMdl.setProperty("/id",id);
			}
			this.clearSelection();
			
			// this.prepareChatStuff(path);
		},
		
		isEditable:function(){
			var path=this.getView().getBindingContext("odata").getPath();
			var purchType=this.getView().getModel("odata").getProperty(path+'/purchase/type',true);
			var status=this.getView().getModel("odata").getProperty(path+'/status');
			return purchType!='R' && status=='S';
		},
		
		editExReport:function(e){
			if (!this.isEditable()) return this.showToast(this.geti18n('workoutNotEditable'));
			var path=e.getSource().getBindingContext("odata").getPath();
			var items=this.getItemsBindingFor("excercisesListReport");
			ExcerciseDlg.editReportDialog(this.getView(),path).then(function(re){
				items.refresh(true);
			}).catch(function(err){
				console.log(err);
			});
		},
		
		deleteExcerciseReport:function(e){
			if (!this.isEditable()) return this.showToast(this.geti18n('workoutNotEditable'));
			var plan=this.getItemsBindingFor("excercisesListPlan");
			var report=this.getItemsBindingFor("excercisesListReport");
			var content=this.getItemsBindingFor("contentList")
			var path = e.getParameter("listItem").getBindingContext("odata").getPath();
			AppMgr.promisedDelete(path).then(function(){
				plan.refresh(true);
				report.refresh(true);
				content.refresh(true);
			});
		},
	});
});