sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"ru/fitrepublic/shared/model/stopWatch",
	"sap/m/SelectDialog","sap/m/StandardListItem", "sap/ui/model/Sorter"
], function (Controller, AppMgr, JSONModel, StopWatch, SelectDialog, StandardListItem, Sorter) {
	"use strict";

	return Controller.extend("ru.fitrepublic.shared.model.ExerciseController", {
		
		goToWorkout:function(){
			var id=this.getView().getModel("ex").getProperty("/id");
			this.getRouter().navTo("workout",{id:id});	
		},
		
		goToTemplate:function(){
			var id=this.getView().getModel("ex").getProperty("/id");
			this.getRouter().navTo("template",{id:id});	
		},
		
		contentPress:function(e){
			var ctx=e.getSource().getBindingContext("ex").getObject();
			if (ctx.videoUrl) this.displayContent(ctx.videoUrl);
		},
		
		formatExNum:function(num,asSet){
			return this.geti18n('workoutExRepeat',[num,asSet?this.geti18n('workoutExCombo'):'']);
		},
		
		
		formatShowTargetInput:function(isCoach,ptype,status){
			return this.formatTargetVisible(isCoach,ptype,status) && this.formatTargetEnabled(isCoach,ptype,status);
		},
		
		formatShowTargetText:function(isCoach,ptype,status){
			return this.formatTargetVisible(isCoach,ptype,status) && !this.formatTargetEnabled(isCoach,ptype,status);
		},
		
		formatShowResultInput:function(isCoach,ptype,status){
			return this.formatResultVisible(isCoach,ptype,status) && this.formatResultEnabled(isCoach,ptype,status);
		},
		
		formatShowResultText:function(isCoach,ptype,status){
			return this.formatResultVisible(isCoach,ptype,status) && !this.formatResultEnabled(isCoach,ptype,status);
		},
		
		showStopWatch:function(){
			var ctx=this.getView().getBindingContext("odata");
			StopWatch.showDialog(this.getView()).then(function(duration){
				var data={durationFact:duration};
				return AppMgr.promisedUpdate(ctx.getPath(),data);
			}).catch(function(err){
				// console.log(err);
			});
		},
				
		showFastRepliesDlg:function(e){
			var mdl=this.getView().getModel("ex");
			var ctx=e.getSource().getBindingContext("ex");
			var self=this;
			var dlg=new SelectDialog({
				title:AppMgr.geti18n("workoutFastReplies"),
				items:{
					path:"/replies",
					sorter: [
						// new Sorter({path:'order'}), // does not work, disables grouping
						new Sorter({path:'cat', group:true, descending:false})
					],
					template: new StandardListItem({ title:"{text}"})
				},
				confirm:function(e){ 
					var value=e.getParameter("selectedItem").getBindingContext().getProperty("text");
					mdl.setProperty("result",value,ctx);
					self.saveForm();
				},
				cancel:function(){ dlg.destroy(); }
			});
			dlg.setModel(new JSONModel({
				replies:[
					{order:1, cat: AppMgr.geti18n("workoutFastRepliesCopy"), text:ctx.getProperty("target")},
					{order:2, cat: AppMgr.geti18n("workoutFastRepliesDefault"), text:AppMgr.geti18n("workoutFastRepliesEasy")},
					{order:2, cat: AppMgr.geti18n("workoutFastRepliesDefault"), text:AppMgr.geti18n("workoutFastRepliesOk")},
					{order:2, cat: AppMgr.geti18n("workoutFastRepliesDefault"), text:AppMgr.geti18n("workoutFastRepliesHard")}
				]
			}));
			dlg.getAggregation("_dialog").getAggregation("subHeader").setVisible(false);
			dlg.open();
		},
		
		validateForm:function(e){
			return this.getView().getControlsByFieldGroupId("required").reduce(function(flag, control){
			// return sap.ui.getCore().byFieldGroupId("required").reduce(function(flag, control){
				if (!control.getBindingContext("ex")) return flag;
				if (!control.setValueState) return flag;
				var state="None";
				try {
					control.getBinding("value").getType().validateValue(control.getValue());
				} catch(e){
					control.setValueStateText(e.message);
					state="Error";
					flag=false;
				}
				control.setValueState(state);
				return flag;
			},true);
		},
		
		saveForm:function(){
			if (!this.validateForm()) return;
			var mdl=this.getView().getModel("ex");
			var ctx=this.getView().getElementBinding("ex");
			var formData=mdl.getProperty(ctx.getPath());
			var entity = formData.ptype=='T' ? '/ExcerciseTemplates' : '/Excercises';
			var fields=['target','targetComment','warmup','result','resultComment'];
			var update=formData.atts.map(function(ex){
				var path=AppMgr.getOdataModel().createKey(entity,{id:ex.id});
				var payload=fields.reduce(function(prev,cur){
					prev[cur]=ex[cur];
					return prev;
				},{});
				return AppMgr.promisedUpdate(path,payload);
			});
			Promise.all(update).then(function(res){
				this.showToast(this.geti18n('excerciseSaved'));
			}.bind(this)).catch(function(err){
				console.log(err);
				this.showToast(this.geti18n('genericError'));
			}.bind(this));
		}
	});
});