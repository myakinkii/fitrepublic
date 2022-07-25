sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/m/GroupHeaderListItem", "sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"ru/fitrepublic/shared/model/editWorkoutNameDialog",
	"ru/fitrepublic/shared/model/stopWatch",
	"ru/fitrepublic/shared/model/scheduleDialog",
	"ru/fitrepublic/shared/model/addContentDialog",
	"ru/fitrepublic/shared/model/excerciseDialog",
	"ru/fitrepublic/shared/model/cloneWorkoutTemplateDialog"
], function (Controller, AppMgr, GroupHeaderListItem, MessageBox, JSONModel, 
			WorkoutNameDlg, StopWatch, ScheduleDlg, AddContentDlg, ExcerciseDlg, CloneTemplateDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.shared.model.WorkoutController", {
		
		formatWorkoutTitle:function(timestamp,gym,ptype,description){
			if (!timestamp) return '';
			var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour:'numeric', minute:'2-digit' };
			var locale=sap.ui.getCore().getConfiguration().getLocale().toString();
			var dateText=timestamp.toLocaleDateString(locale, options);
			if (ptype=='F') return dateText;
			return dateText +' @'+(description||gym);
		},

		formatWorkoutStatus:function(statusCode){
			return this.geti18n('workoutStatus_'+statusCode);
		},
		
		getExGroup:function(ctx){
			var obj=ctx.getObject();
			if (!obj) return '';
			return [obj.setNum, obj.setNum>0?0:obj.exNum, obj.repeat].join("_");
		},
		
		getExGroupHeader:function(oGroup){
			var vals=oGroup.key.split("_");
			var what = vals[0]>0 ? this.geti18n('workoutExCombo',[vals[0]]):this.geti18n('workoutExNum',[vals[1]]);
			var repeatWhat = this.geti18n('workoutExRepeat',[vals[2],what]);
			return new GroupHeaderListItem({
				title: repeatWhat,
				type:'Inactive',
				upperCase: false
			});
		},
		
		formatVideoIcon:function(id){
			return "sap-icon://"+(id?"video":"message-error");
		},
		
		goToPurchase:function(){
			var id=this.getView().getBindingContext("odata").getProperty("purchase_id");
			this.getRouter().navTo("purchase",{id:id});			
		},
		
		goToTemplate:function(){
			var id=this.getView().getBindingContext("odata").getProperty("purchase/templateId");
			this.getRouter().navTo("template",{id:id});
		},
		
		goToClient:function(){
			var id=this.getView().getBindingContext("odata").getProperty("client_id");
			this.getRouter().navTo("client",{id:id});			
		},
		
		goToEx:function(e){
			var id=this.getView().getBindingContext("odata").getProperty("id");
			var num=e.getSource().getBindingContext("ex").getProperty("num");
			this.getRouter().navTo("exercise",{id:id,num:num});		
		},
		
		refreshWorkout:function(){
			this.refreshMyElementBinding();
			var id=this.getView().getModel("ex").getProperty("/id");
			if (id) this.prepareExModel(id);
		},
		
		updateWorkout:function(field){
			var ctx=this.getView().getBindingContext("odata");
			var data={};
			data[field]=ctx.getProperty(field);
			var self=this;
			AppMgr.promisedUpdate(ctx.getPath(),data).then(function(re){
				self.showToast(self.geti18n('genericSuccess'));
			}.bind(this)).catch(function(err){
				self.handleError(err);
			});			
		},
		
		handleError:function(err){
			console.log(err);
		},
		
		submitPlan:function(e){
			this.updateWorkout('plan_text');
		},
		
		submitReport:function(e){
			this.updateWorkout('report_text');
		},
		
		changeRating:function(){
			this.updateWorkout('rating');
		},
		
		submitComment:function(e){
			this.updateWorkout('comment_text');
		},		

		contentPress:function(e){
			this.displayContent(e.getSource().getBindingContext("odata").getProperty("content/url"));
		},
		
		contentPressEx:function(e){
			var url=e.getSource().getBindingContext("odata").getProperty("video/url");
			if (url) this.displayContent(url);
		},
		
		finalizeWorkout:function(){
			var ctx=this.getView().getBindingContext("odata");
			var self=this;
			this.confirmFinalize().then(function(){
				return AppMgr.promisedUpdate(ctx.getPath(),{status:'E'});
			}).then(function(re){
				self.showToast(self.geti18n('genericSuccess'));
				self.refreshMyElementBinding();
			}.bind(this)).catch(function(err){
				self.handleError(err);
			});
		},
		
		confirmFinalize:function(){
			return new Promise(function(resolve,reject){
				MessageBox.confirm(AppMgr.geti18n('workoutFinalizeConfirmText'),{
					title: AppMgr.geti18n('workoutFinalizeConfirmTitle'),
					onClose: function (action) {
						if (action==MessageBox.Action.OK) resolve();
						else reject();
					}
				});
			});
		},
		
		editWorkoutDate:function(e){
			var ctx=this.getView().getBindingContext("odata");
			ScheduleDlg.showItemDialog(this.getView(), ctx.getProperty("id"), true).then(function(re){
				this.refreshMyElementBinding();
			}.bind(this)).catch(function(err){
				console.log(err);
			}.bind(this));
		},
		
		editWorkoutDescription:function(){
			var ctx=this.getView().getBindingContext("odata");
			var oldVal=ctx.getProperty("description");
			WorkoutNameDlg.getWorkoutName(oldVal).then(function(newVal){
				if (oldVal!=newVal) return AppMgr.promisedUpdate(ctx.getPath(),{description:newVal});
				else return Promise.reject();
			}).then(function(re){
				this.showToast(this.geti18n('genericSuccess'));
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		cloneWorkoutTemplate:function(){
			var workout_id=this.getView().getBindingContext("odata").getProperty("id");
			CloneTemplateDlg.showTemplateDialog(this.getView()).then(function(template_id){
				return AppMgr.promisedCallFunction("/cloneWorkout",{ template_id:template_id, workout_id:workout_id});
			}).then(function(data){
				this.prepareExModel(workout_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},

		selectExcercise:function(e){
			var ctx=e.getParameter("listItem"); // which context to use: odata> or ex>?
			this.getView().getModel("ex").setProperty("/editable",true);
			this.getView().getModel("ex").setProperty("/selectedCtx",ctx.getBindingContext("ex").getObject());
		},
		
		deleteExcercise:function(){
			var ctx=this.getView().getModel("ex").getProperty("/selectedCtx");
			var view=this.getView();
			var deleteProms=ctx.atts.map(function(ex){
				var path=AppMgr.getOdataModel().createKey("/Excercises",{id:ex.id});
				return AppMgr.promisedDelete(path);
			});
			Promise.all(deleteProms).then(function(){
				this.clearSelection();
				this.prepareExModel(ctx.workout_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});			
		},
		
		addExcercise:function(){
			var workout_id=this.getView().getBindingContext("odata").getProperty("id");
			var pType=this.getView().getBindingContext("odata").getProperty("purchase/type");
			// var items=this.getItemsBindingFor("excercisesListPlan");
			// var report=this.getItemsBindingFor("excercisesListReport");
			var exLength=this.getView().getModel("ex").getProperty("/exLength");
			var view=this.getView();
			AddContentDlg.showContentDialog(view).then(function(content){
				var noVideo=false;
				var allowNoVideo = pType!='O';
				var exercises=content.map(function(c){
					if (!c.video_id) noVideo=true;
					return { workout_id:workout_id, video_id:c.video_id, name:c.name };
				});
				if (noVideo && !allowNoVideo) return Promise.reject();
				else return Promise.resolve(exercises);
			}).then(function(exercises){
				return ExcerciseDlg.createExcercisePlan(view, exLength, exercises);
			}).then(function(all){
				this.prepareExModel(workout_id);
				// items.refresh(true);
				// report.refresh(true);
				// var id=this.getView().getModel("ex").getProperty("/id");
				// if (id) this.prepareExModel(id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});			
		},
		
		editExcercise:function(){
			var ctx=this.getView().getModel("ex").getProperty("/selectedCtx");
			var view=this.getView();
			ExcerciseDlg.editExcercisePlan(view,ctx.atts).then(function(){
				this.prepareExModel(ctx.workout_id);
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		clearSelection:function(){
			this.getView().byId('excercisesList').removeSelections();
			this.getView().getModel("ex").setProperty("/editable",false);
		},
		
		prepareExData:function(data,id,status,ptype){
			var index=0,prevSet=0;
			var exdata=data.results.sort(function(ex1,ex2){
				return ex1.exNum-ex2.exNum;
			}).reduce(function(prev,cur){
				if (!cur.setNum || cur.setNum!=prevSet) index++;
				if (!prev[index]) prev[index]={
					workout_id:id, status:status, ptype:ptype,
					completed:true, started:false, count:0,
					num:index, asSet:false, repeat:cur.repeat, 
					atts:[]
				};
				if (cur.setNum) {
					prevSet=cur.setNum;
					prev[index].asSet=true;
				} else prevSet=0;
				prev[index].count++;
				if (cur.result){
					prev[index].started=true;
				} else prev[index].completed=false; 
				if (cur.video&&cur.video.url) cur.videoUrl=cur.video.url;
				cur.ptype=ptype;
				cur.status=status;
				prev[index].atts.push(cur);
				return prev;
			},{});
			return exdata;
		},
		
		prepareExModel:function(id){
			var path="/Workouts(guid'"+id+"')";
			AppMgr.promisedRead(path,{ '$expand': "purchase,excercises,excercises/video" }).then(function(workout){
				var exMdl=this.getView().getModel("ex");
				exMdl.setProperty('/exLength',workout.excercises.results.length);
				exMdl.setProperty('/ex',this.prepareExData(workout.excercises,id,workout.status,workout.purchase.type));
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		formatExNum:function(num,asSet){
			return this.geti18n('workoutExRepeat',[num,asSet?this.geti18n('workoutExCombo'):'']);
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
		
		prepareChatStuff:function(path){
			this.getView().setModel(new JSONModel({
				// timestamp:new Date(),
				// time:"12:00",
				chatMessage:''
			}),'chat');
			AppMgr.promisedRead(path+'/purchase',{'$expand':'coach,owner'}).then(function(data){
				this.prepareMessageAuthors(data);
				this.getView().byId('chat').bindElement({
					path:"/Purchases(guid'"+data.id+"')", 
					model: "odata", 
					parameters: {
						expand: "chatChannel,chatChannel/messages"
					}
				});
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		sendMessage:function(){
			var msg=this.getView().getModel('chat').getProperty('/chatMessage');
			var chat=this.getView().byId('chat');
			var channelId=chat.getBindingContext("odata").getProperty("chatChannel_channelId");
			AppMgr.promisedCallFunction("/createChatMessage",{
				channelId:channelId, text:encodeURI(msg)
			}).then(function(data){
				this.getView().getModel('chat').setProperty('/chatMessage',"");
				chat.getElementBinding("odata").refresh(true);
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		decodeText:function(txt){
			return decodeURI(txt);
		},
		
		prepareMessageAuthors:function(data){
			this.messageAuthors={};
			this.messageAuthors[data.coach.id]=data.coach.nickName;
			this.messageAuthors[data.owner.id]=data.owner.nickName;
		},
				
		formatAuthor:function(id){
			return this.messageAuthors&&this.messageAuthors[id]||id;
		}
		
	});
});