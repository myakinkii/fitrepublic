sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"ru/fitrepublic/shared/model/addWorkoutDialog",
	"ru/fitrepublic/shared/model/scheduleDialog"
], function (Controller, AppMgr, JSONModel, WorkoutDlg, ScheduleDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Schedule", {
		
		onInit: function() {
			var mdl=new JSONModel({
				startDate:new Date(),
				appointments:[]
			});
			mdl.setSizeLimit(5000);
			this.getView().setModel(mdl);
			this.getRouter().getRoute("schedule").attachMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched:function(e){
			var mdl=this.getView().getModel();
			var sched=this.getView().byId("schedule");
			var date=e.getParameter("arguments").date;
			if (date){
				mdl.setProperty("/startDate",new Date(date));
				sched.setSelectedView(sched.getViewByKey("DayView"));
			}
			AppMgr.getCalendar().then(function(data){
				mdl.setProperty("/appointments",this.processCalendar(data));
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},	
		
		processCalendar:function(data){
			var fm=AppMgr.getCalendarFormatters();
			var calendar={
				// startDate:new Date(),
				appointments:data.items.map(function(w){
					var start=new Date(w.timestamp);
					var end=new Date(w.timestamp);
					if (w.durationFact) end.setMinutes(start.getMinutes()+Math.ceil(w.durationFact/60));
					else end.setHours(start.getHours()+w.durationHrs);
					return {
						"startDate": start,
						"endDate": end,
						"id": w.id,
						"text":fm.toTitle(w.status,w.purchase.type,w.description),
						"title":fm.toText(w.status, w.purchase.type, w.client && w.client.clientName, w.coach && w.coach.coachName, w.purchase.gym.gymName, w.purchase.pdescr),
						"type":fm.toType(w.status,w.purchase.type),
						"icon":fm.toIcon(w.status,w.purchase.type)
					};
				})
			};
			return calendar.appointments;
		},
		
		addWorkout:function(){
			WorkoutDlg.createWorkoutParams(this.getView()).then(function(workoutPars){
				return AppMgr.promisedCallFunction("/createWorkout",workoutPars);
			}).then(function(){
				return AppMgr.getCalendar();
			}).then(function(data){
				this.getView().getModel().setProperty("/appointments",this.processCalendar(data));
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		selectItem:function(e){
			var src=e.getParameter("appointment"); // can be empty cell
			if (src) {
				ScheduleDlg.showItemDialog(this.getView(), src.getBindingContext().getProperty("id")).then(function(re){
					return AppMgr.getCalendar();
				}).then(function(data){
					this.getView().getModel().setProperty("/appointments",this.processCalendar(data));
				}.bind(this)).catch(function(err){
					console.log(err);
					if (err.id) this.getRouter().navTo("workout",{id:err.id});
				}.bind(this));
			}
		}

	});
});
