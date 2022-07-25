sap.ui.define([ "ru/fitrepublic/shared/controller/WorkoutController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"ru/fitrepublic/shared/model/addContentDialog",
	"ru/fitrepublic/shared/model/excerciseDialog",
	"ru/fitrepublic/shared/model/editWorkoutNameDialog"
], function (Controller, AppMgr, JSONModel, AddContentDlg, ExcerciseDlg, WorkoutNameDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Template", {
		
		onInit: function() {
			this.getOwnerComponent().setModel(new JSONModel({
				visible:true,
				ex:{},
				workouts:[]
			}),"ex");
			this.getRouter().getRoute("template").attachMatched(this.onRouteMatched, this);
		},
		
		navBack:function(){
			var odataMdl=this.getView().getModel("odata");
			if (odataMdl.hasPendingChanges()) odataMdl.resetChanges(); 
			var prev=AppMgr.popRoute();
			if (prev) this.getRouter().navTo(prev.name,prev.args);
			else this.getRouter().navTo("main");
		},
		
		onRouteMatched:function(e){
			this.getView().unbindElement("odata");
			this.getView().setBindingContext(null,"odata");
			var template_id=e.getParameter("arguments").id;
			var useNewWorkoutLayout=false;
			if (template_id=='new') {
				var props={ coach_id:this.getView().getModel("profile").getProperty("/id") };
				var ctx=this.getView().getModel("odata").createEntry("/Templates",{ properties:props });
				this.getView().setBindingContext(ctx,"odata");
			} else {
				var path="/Templates(guid'"+template_id+"')";
				this.getView().bindElement({ path:path, model: "odata" });
				useNewWorkoutLayout=true;
			}
						
			var exMdl=this.getView().getModel("ex");
			exMdl.setProperty("/visible",useNewWorkoutLayout);
			exMdl.setProperty("/workouts",[]);
			
			if (useNewWorkoutLayout) {
				this.prepareExModel(template_id);
				exMdl.setProperty("/id",template_id);
			}
		},

		prepareExModel:function(id){
			var path="/Templates(guid'"+id+"')";
			var ptype,status;
			AppMgr.promisedRead(path,{ '$expand': "workouts,workouts/excercises,workouts/excercises/video" }).then(function(template){
				this.getView().getModel("ex").setProperty('/workouts',template.workouts.results.map(function(workout,i){
					return {
						template_id:id,
						workout_id:workout.id,
						number:i+1,
						editable:false,
						selectedCtx:null,
						description:workout.description,
						exLength:workout.excercises.results.length,
						ex:this.prepareExData(workout.excercises,workout.id,'S','T')
					};
				}.bind(this)));
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		formatTemplateType:function(typeCode){
			return this.geti18n('templateType_'+(typeCode?typeCode:'New'));
		},
		
		navTemplates:function(){
			this.getRouter().navTo("templates");
		},
		
		saveTemplate:function(){
			var ctx=this.getView().getBindingContext("odata").getObject();
			if (!ctx.name) {
				this.showToast(this.geti18n("templateSaveEmptyName"));
				return ;
			}
			var router=this.getRouter();
			AppMgr.promisedSubmitChanges().then(function(firstData){
				if (firstData) router.navTo("template",{id:firstData.id});
			});
		},
		
		deleteTemplate:function(){
			var router=this.getRouter();
			var path=this.getView().getBindingContext("odata").getPath();
			AppMgr.promisedDelete(path).then(function(){ router.navTo("templates"); }).catch(this.handleDeleteError.bind(this));
		},
		
		addWorkout:function(){
			var template_id=this.getView().getModel("ex").getProperty("/id");
			WorkoutNameDlg.getWorkoutName().then(function(name){
				var ctx=AppMgr.getOdataModel().createEntry("/WorkoutTemplates",{ properties:{ description:name, template_id:template_id } });
				return AppMgr.promisedSubmitChanges();
			}).then(function(){
				this.prepareExModel(template_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		deleteWorkout:function(e){
			var ctx=e.getSource().getBindingContext("ex").getObject();
			var template_id=ctx.template_id;
			var path=AppMgr.getOdataModel().createKey("/WorkoutTemplates",{id:ctx.workout_id});
			AppMgr.promisedDelete(path).then(function(){ 
				this.prepareExModel(template_id);
			}.bind(this)).catch(this.handleDeleteError.bind(this));
		},
		
		editWorkoutDescription:function(e){
			var ctx=e.getSource().getBindingContext("ex").getObject();
			var template_id=ctx.template_id;
			var oldVal=ctx.description;
			var path=this.getView().getModel("odata").createKey("/WorkoutTemplates",{ id:ctx.workout_id });
			WorkoutNameDlg.getWorkoutName(oldVal).then(function(newVal){
				if (oldVal!=newVal) return AppMgr.promisedUpdate(path,{description:newVal});
				else return Promise.reject();
			}).then(function(re){
				this.showToast(this.geti18n('genericSuccess'));
				this.prepareExModel(template_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		addExcercise:function(e){
			var ctx=e.getSource().getBindingContext("ex").getObject();
			var template_id=ctx.template_id;
			var view=this.getView();
			AddContentDlg.showContentDialog(view).then(function(content){
				var noVideo=false;
				var exercises=content.map(function(c){
					if (!c.video_id) noVideo=true;
					return { workout_id:ctx.workout_id, video_id:c.video_id, name:c.name };
				});
				if (noVideo) return Promise.reject();
				else return Promise.resolve(exercises);
			}).then(function(exercises){
				return ExcerciseDlg.createExcerciseTemplate(view, ctx.exLength, exercises);
			}).then(function(all){
				this.prepareExModel(template_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});			
		},
		
		editExcercise:function(e){
			var template_id=this.getView().getModel("ex").getProperty("/id");
			var ctx=e.getSource().getBindingContext("ex").getProperty("selectedCtx");
			ExcerciseDlg.editExcerciseTemplate(this.getView(),ctx.atts).then(function(){
				this.prepareExModel(template_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		selectExcercise:function(e){
			var itemCtx=e.getParameter("listItem").getBindingContext("ex").getObject();
			var ctx=e.getSource().getBindingContext("ex");
			this.getView().getModel("ex").setProperty("editable", true, ctx);
			this.getView().getModel("ex").setProperty("selectedCtx", itemCtx, ctx);
		},
		
		handleDeleteError:function(){
			this.showToast(this.geti18n('templateErrorDeleteNestedObjects'));
		},
		
		deleteExcercise:function(e){
			var template_id=this.getView().getModel("ex").getProperty("/id");
			var ctx=e.getSource().getBindingContext("ex").getProperty("selectedCtx");
			var deleteProms=ctx.atts.map(function(ex){
				var path=AppMgr.getOdataModel().createKey("/ExcerciseTemplates",{id:ex.id});
				return AppMgr.promisedDelete(path);
			});
			Promise.all(deleteProms).then(function(){
				this.prepareExModel(template_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});			
		},
		
		goToEx:function(e){
			var template_id=this.getView().getModel("ex").getProperty("/id");
			var ctx=e.getSource().getBindingContext("ex").getObject();
			this.getView().getModel("ex").setProperty("/ex/"+ctx.num, ctx);
			this.getRouter().navTo("exercise",{id:template_id,num:ctx.num});		
		}
		
	});
});