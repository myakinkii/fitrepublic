sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"ru/fitrepublic/shared/model/scheduleDialog"
], function (Controller, AppMgr, JSONModel, ScheduleDlg) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Schedule", {
		
		onInit: function() {
			var mdl=new JSONModel({
				startDate:new Date(),
				hideSolo:true,
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
			var filterSolo=this.getView().getModel().getProperty("/hideSolo");
			var fm=AppMgr.getCalendarFormatters();
			var calendar={
				startDate:new Date(),
				appointments:[]
			};
			data.items.forEach(function(w){
				if (filterSolo && w.purchase.type=='S') return;
				var start=new Date(w.timestamp);
				var end=new Date(w.timestamp);
				if (w.durationFact) end.setMinutes(start.getMinutes()+Math.ceil(w.durationFact/60));
				else end.setHours(start.getHours()+w.durationHrs);
				calendar.appointments.push({
					"startDate": start,
					"endDate": end,
					"id": w.id,
					"text":fm.toTitle(w.status,w.purchase.type,w.description),
					"title":fm.toText(w.status, w.purchase.type, w.client && w.client.clientName, w.coach && w.coach.coachName, w.purchase.gym.gymName, w.purchase.pdescr),
					"type":fm.toType(w.status,w.purchase.type),
					"icon":fm.toIcon(w.status,w.purchase.type)
				});
			});
			return calendar.appointments;
		},
		
		showHideSolo:function(e){
			AppMgr.getLocalCalendar().then(function(data){
				this.getView().getModel().setProperty("/appointments",this.processCalendar(data));
			}.bind(this));
		},
		
		selectItem:function(e){
			var src=e.getParameter("appointment"); // can be empty cell
			if (src) {
				ScheduleDlg.showItemDialog(this.getView(), src.getBindingContext().getProperty("id")).then(function(re){
					return AppMgr.getCalendar(); // we changed something so we reload the whole stuff
				}).then(function(data){
					this.getView().getModel().setProperty("/appointments",this.processCalendar(data));
				}.bind(this)).catch(function(err){
					console.log(err); // we reject from the dialog on cancel or navTo
					if (err.id) this.getRouter().navTo("workout",{id:err.id});
				}.bind(this));
			}
		}

	});
});
