sap.ui.define(["ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel","sap/ui/core/message/Message",
	"sap/m/SelectDialog","sap/m/StandardListItem", "sap/ui/model/Sorter"
], function(AppMgr, JSONModel, Message, SelectDialog, StandardListItem, Sorter) {
	"use strict";
	
	var extResolve, extReject, promiseAll;

	return {
		
		formatStepVisible:function(ptype,isCoach){
			return isCoach && (ptype=='R' || ptype=='G');
		},
		
		formatExNameEnabled:function(ptype,isCoach){
			return isCoach && (ptype=='R' || ptype=='G');
		},
		
		formatTargetVisible:function(ptype,isCoach){
			return !(ptype=='R'||ptype=='G');
		},
		
		formatResultEnabled:function(ptype,isCoach){
			return !isCoach || (ptype=='R'||ptype=='G');
		},
		
		createExcerciseTemplate:function(view,exIndex,obj){
			// return this.addObjects(view,exIndex,obj, "ru.fitrepublic.shared.fragments.ExcercisePlanForm","/ExcerciseTemplates");
			return this.addObjects(view,exIndex,obj, "ru.fitrepublic.shared.fragments.ExcerciseForm","/ExcerciseTemplates");
		},
		
		createExcercisePlan:function(view,exIndex,obj){
			// return this.addObjects(view,exIndex,obj, "ru.fitrepublic.shared.fragments.ExcercisePlanForm", "/Excercises");
			return this.addObjects(view,exIndex,obj, "ru.fitrepublic.shared.fragments.ExcerciseForm", "/Excercises");
		},
		
		createExcerciseReport:function(view,exIndex,obj){
			// return this.addObjects(view,exIndex,obj, "ru.fitrepublic.shared.fragments.ExcerciseReportForm", "/Excercises");
			return this.addObjects(view,exIndex,obj, "ru.fitrepublic.shared.fragments.ExcerciseForm", "/Excercises");
		},
		
		editExcercisePlan:function(view,obj){
			// return this.addObjects(view,-1,obj, "ru.fitrepublic.shared.fragments.ExcercisePlanForm", "/Excercises");
			return this.addObjects(view,-1,obj, "ru.fitrepublic.shared.fragments.ExcerciseForm", "/Excercises");
		},
		
		editExcerciseTemplate:function(view,obj){
			// return this.addObjects(view,-1,obj, "ru.fitrepublic.shared.fragments.ExcercisePlanForm", "/Excercises");
			return this.addObjects(view,-1,obj, "ru.fitrepublic.shared.fragments.ExcerciseForm", "/ExcerciseTemplates");
		},
		
		bindExForm:function(form,entity,ex,exIndex,i){
			if (exIndex<0){
				var path=AppMgr.getOdataModel().createKey(entity,{id:ex.id});
				form.bindElement({ path:path, model: "odata"});
				return Promise.resolve();
			} else {
				ex.exNum=i+exIndex+1;
				ex.setNum=0;
				ex.repeat=3;
				return new Promise(function(resolve,reject){
					var ctx=AppMgr.getOdataModel().createEntry(entity,{ properties:ex, success:resolve, error:reject});
					form.setBindingContext(ctx,"odata");
				});				
			}
		},
		
		addObjects:function(view, exIndex, obj, fragm, entity){
			var odataMdl=AppMgr.getOdataModel();
			var dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.ExcercisesCreateDialog", this);
			view.addDependent(dlg);
			dlg.setModel(odataMdl,"odata");
			dlg.attachAfterClose(function(){ dlg.destroy(); });
			this.dlg=dlg;
			var self=this;
			var car=sap.ui.getCore().byId("carousel");
			promiseAll=[];
			obj.forEach(function(ex,i){
				var form = sap.ui.xmlfragment(fragm, self);
				promiseAll.push(self.bindExForm(form,entity,ex,exIndex,i));
				car.addPage(form);
			});
			return new Promise(function(resolve,reject){
				extResolve=resolve;
				extReject=reject;
				dlg.open();
			});
		},
		
		closeDlg:function(e){
			this.dlg.close();
			AppMgr.getOdataModel().resetChanges();
			extReject(false);
		},
		
		saveExcercises:function(e){
			if (!this.validateForm()) return;
			AppMgr.promisedSubmitChanges().then(function(firstData){
				this.dlg.close();
				extResolve();
			}.bind(this)).catch(extReject);
		},
		
		_saveExcercises:function(e){
			if (!this.validateForm()) return;
			AppMgr.getOdataModel().submitChanges();
			this.dlg.close();
			Promise.all(promiseAll).then(extResolve).catch(extReject);
		},

		editTemplateDialog:function(view,path){
			return this.showEditDialog(view,path,"ru.fitrepublic.shared.fragments.ExcercisePlanDialog",{});
		},
		
		editPlanDialog:function(view,path){
			return this.showEditDialog(view,path,"ru.fitrepublic.shared.fragments.ExcercisePlanDialog",{});
		},
		
		editReportDialog:function(view,path){
			return this.showEditDialog(view,path,"ru.fitrepublic.shared.fragments.ExcerciseReportDialog", {expand: "workout,workout/purchase"});
		},
		
		showEditDialog:function(view,path,fragment, expandPars){
			var odataMdl=AppMgr.getOdataModel();
			var dlg = sap.ui.xmlfragment(fragment, this);
			view.addDependent(dlg);
			dlg.setModel(odataMdl,"odata");
			dlg.attachAfterClose(function(){ dlg.destroy(); });
			dlg.bindElement({ path:path, model: "odata", parameters: expandPars });
			this.dlg=dlg;
			return new Promise(function(resolve,reject){
				extResolve=resolve;
				extReject=reject;
				dlg.open();
			});
		},
		
		showFastRepliesDlg:function(){
			var ctx=this.dlg.getBindingContext("odata");
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
					AppMgr.getOdataModel().setProperty("result",value,ctx);
					self.validateForm();
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
			return this.dlg.getControlsByFieldGroupId("required").reduce(function(flag, control){
			// return sap.ui.getCore().byFieldGroupId("required").reduce(function(flag, control){
				if (!control.setValueState) return flag; // inputs that have suggests or value help propagate fieldgroupId to those controls
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
		
		submitChanges:function(){
			if (!this.validateForm()) return;
			this.dlg.close();
			var odataMdl=AppMgr.getOdataModel();
			odataMdl.setUseBatch(true); // otherwise submitChanges callback is not called
			odataMdl.submitChanges({
				success:function(re){
					odataMdl.setUseBatch(false);
					extResolve(re);
				},
				error:function(err){
					odataMdl.setUseBatch(false);
					extReject(err);
				}
			});
		}
		
	};
});