sap.ui.define([ "sap/ui/integration/Extension", "ru/fitrepublic/shared/appMgr",
	"sap/f/PlanningCalendarInCardRow","sap/m/Button"
], function (Extension, AppMgr, PlanningCalendarInCardRow, Button) {
	"use strict";
	
	PlanningCalendarInCardRow.prototype._calculateVisibleAppointments=function(selectedDates,sortedApts){
		var maxVisibleAptsCount = this.getVisibleAppointmentsCount(); // probably taken from "maxItems" property in card's manifest
		var allAptsCount = sortedApts.length;
		var allAptsFit = maxVisibleAptsCount>=allAptsCount;
		this._getMoreButton().setVisible(!allAptsFit);
		return { iStart:0, iEnd: allAptsFit ? allAptsCount : maxVisibleAptsCount };
	};
	
	PlanningCalendarInCardRow.prototype._getMoreButton = function () {
		if (!this._oMoreAppsButton) this._oMoreAppsButton = new Button({ text: AppMgr.geti18n("genericMore") });
		return this._oMoreAppsButton;
	};

	var oExtension = new Extension({
		formatters:AppMgr.getCalendarFormatters(),
		actions:[{
			type: "Custom",
			enabled: function(){ return AppMgr.getOnlineMode(); },
			parameters :{ "dst":"refresh"},
			icon: "sap-icon://refresh",
			text: AppMgr.geti18n("genericRefresh")
		}]
	});
	
	oExtension.getData = function () {
		// var self=this;
		var isCoach=false;
		return AppMgr.getProfile().then(function(profile){
			if (profile.name) isCoach=true;
			return AppMgr.getCalendar(isCoach); // later we will properly request data from backend
		}).then(function(calendar){
			calendar.currDate=new Date();
			calendar.selectedDate=new Date();
			calendar.legendItems=[];
			
			calendar.specialDates=[];
			var specialDates={};
			var specialDateTypes=['Type04','Type01','Type01','Type02','Type02']; // [5+, 1-2, 3-4] workouts colors
			
			var items=[];
			calendar.items.forEach(function(w){
				if (isCoach && w.purchase.type=='S') return; // but for now filter Solo workouts from coach calendar
				var start=new Date(w.timestamp);
				var end=new Date(w.timestamp);
				if (w.durationFact) end.setMinutes(start.getMinutes()+Math.ceil(w.durationFact/60));
				else end.setHours(start.getHours()+w.durationHrs);
				
				var specStart=start.toISOString().split("T")[0]; // the whole day in yyyy-mm-dd format
				var specEnd=end.toISOString().split("T")[0];  // the whole day in yyyy-mm-dd format
				if (!specialDates[specStart]) specialDates[specStart]={num:0,start:specStart,end:specEnd};
				specialDates[specStart].num++;
				if (specEnd!=specStart){ // for some reason event ends tomorrow
					if (!specialDates[specEnd]) specialDates[specEnd]={num:0,start:specEnd,end:specEnd};
					specialDates[specEnd].num++;
				}
				items.push({
					"start": start.toJSON(),
					"end": end.toJSON(),
					"id": w.id,
					"client":w.client && w.client.clientName,
					"coach": w.coach && w.coach.coachName,
					"itemStatus": w.status,
					"purchaseType":w.purchase.type,
					"pdescr":w.purchase.pdescr,
					"description":w.description,
					"gym": w.purchase.gym.gymName,
					"visualization": w.status=='U' ? "blocker": "appointment" // card expects this to be explicitly set before rendering
				});
			});
			
			var s,spec;
			for (s in specialDates){
				spec=specialDates[s];
				calendar.specialDates.push({
					"start": spec.start,
					"end": spec.end,
					"type": specialDateTypes[spec.num]||specialDateTypes[0] // get color mark
				});
			}
			
			calendar.items=items;
			return Promise.resolve(calendar);
		}).then(function(data){ // add some dirty hacks to fire navigation actions to workouts and set properties to calendar
			var card=sap.ui.getCore().byId("calendarCard"); // unfortunatelly Extension.getCard() returns CardFacade instead of "real" Card
			card.getModel().setSizeLimit(5000); // tmp fix for workouts
			var magicTable=card.mAggregations._content.mAggregations._content.mAggregations.table; // this is some "container" for all our stuff
			var calendarDates=magicTable.getInfoToolbar().getContent()[1]; // descendant of sap.ui.unified.calendar.Month
			calendarDates.setShowWeekNumbers(false); // and this stuff works fine
			// calendarDates.setFirstDayOfWeek(1); // but this is officially ".. not supported in sap.ui.unified.calendar.DatesRow control"
			calendarDates.attachSelect(function(e){
				var selectedDate=calendarDates.getSelectedDates()[0].getStartDate();
				card.getModel().setProperty("/selectedDate",selectedDate);
			});
			magicTable.getItems()[0].getCells()[1].attachSelect(function(e){
				var calRow=e.getSource() // source is descendant of sap.ui.unified.CalendarRow
				var domRefId=e.getParameter("domRefId"); // maybe there's a better way to identity an appointment
				var ctx=calRow.getAppointments().reduce(function(prev,cur){ 
					if (cur.getId()==domRefId) prev=cur.getBindingContext().getObject(); // but we just compare the dom ref ids
					return prev;
				},null);
				card.fireAction({ parameters:{ dst:'workout', vars:{id:ctx.id} } }); // fire the action with proper dst
			});
			return Promise.resolve(data);
		});
	};

	return oExtension;
});