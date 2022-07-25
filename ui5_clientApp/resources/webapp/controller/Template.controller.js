sap.ui.define([ "ru/fitrepublic/shared/controller/WorkoutController", "ru/fitrepublic/shared/appMgr",
	"ru/fitrepublic/shared/model/shareObjectDialog",
	"sap/ui/model/json/JSONModel","sap/m/MessageBox"
], function (Controller, AppMgr, ShareDialog, JSONModel, MessageBox) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Template", {
		
		onInit: function() {
			this.getOwnerComponent().setModel(new JSONModel({
				visible:true,
				ex:{},
				workouts:[]
			}),"ex");
			this.getRouter().getRoute("template").attachMatched(this.onRouteMatched, this);
		},

		onRouteMatched:function(e){
			var template_id=e.getParameter("arguments").id;
			var path="/Templates(guid'"+template_id+"')";
			this.getOwnerComponent().initPromise.then(function(){
				this.getView().bindElement({ path:path, model: "odata" });
				
				var useNewWorkoutLayout=true;			
				var exMdl=this.getView().getModel("ex");
				exMdl.setProperty("/visible",useNewWorkoutLayout);
				exMdl.setProperty("/workouts",[]);
				if (useNewWorkoutLayout) {
					this.prepareExModel(template_id);
					exMdl.setProperty("/id",template_id);
				}
			}.bind(this));
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
						ex:this.prepareExData(workout.excercises,workout.id,'E','T')
					};
				}.bind(this)));
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		formatTemplateType:function(typeCode){
			return this.geti18n('templateType_'+typeCode);
		},
		
		navCoach:function(){
			this.getRouter().navTo("coach", {id:this.getView().getBindingContext("odata").getProperty("coach_id")});
		},
		
		makeSubscription:function(){
			var template_id=this.getView().getBindingContext("odata").getProperty("id");
			var self=this;
			MessageBox.confirm(this.geti18n('templateSubscribeText'),{
				title: this.geti18n('templateSubscribe'),
				onClose: function (action) {
					if (action!=MessageBox.Action.OK) return;
					AppMgr.promisedCallFunction("/makeSubscription",{ template_id : template_id }).then(function(data){
						// self.getRouter().navTo("purchase",{id:data.value});
						self.showToast(self.geti18n('templateSubscribed'));
					}).catch(function(err){
						self.showToast(self.geti18n('templateAlreadySubscribed'));
						console.log(err);
					});
				}
			});
		},
		
		goToEx:function(e){
			var template_id=this.getView().getModel("ex").getProperty("/id");
			var ctx=e.getSource().getBindingContext("ex").getObject();
			this.getView().getModel("ex").setProperty("/ex/"+ctx.num, ctx);
			this.getRouter().navTo("exercise",{id:template_id,num:ctx.num});		
		},
				
		coverPress:function(e){
			this.displayContent(e.getSource().getBindingContext("odata").getProperty("coverUrl"));
		},
		
		shareObject:function(){
			var ctx=this.getView().getBindingContext("odata");
			var target="template";
			var id=ctx.getProperty("id");
			var linkId=ctx.getProperty("linkId");
			ShareDialog.share(target,id,linkId,this.getView()).then(function(url){
				console.log(url);
			}).catch(function(){
				console.log('wtf');
			});
		}
		
	});
});