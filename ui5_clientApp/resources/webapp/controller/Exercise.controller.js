sap.ui.define([ "ru/fitrepublic/shared/controller/ExerciseController", "ru/fitrepublic/shared/appMgr"
], function (Controller, AppMgr) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Exercise", {
		
		onInit: function() {
			this.getRouter().getRoute("exercise").attachMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched:function(e){
			var args=e.getParameter("arguments");
			this.getView().bindElement({ path:"/ex/"+args.num, model: "ex"});
		},
		
		formatShowStopWatch:function(isCoach,ptype,status){
			if (status=='E') return false; // do not show for executed workouts
			if (ptype=='T') return false; // do not show for templates
			if (ptype=='R' && !isCoach) return false; // do not show for Regular
			if (ptype=='G' && !isCoach) return false; // do not show for Gym
			return true;
		},
		
		formatTargetVisible:function(isCoach,ptype,status){
			// if (ptype=='F') return false;
			return true;
		},
		
		formatTargetEnabled:function(isCoach,ptype,status){
			if (status=='E') return false; // cannot edit executed stuff
			if (isCoach) return true; // coach can edit target
			if (ptype=='T') return false; // client cannot edit template
			if (ptype=='F') return true; // client can edit freestyle
			return false; // otherwise return false
		},
		
		formatResultVisible:function(isCoach,ptype,status){
			if (ptype=='T') return false; // do not show for templates
			return true;
		},
		
		formatResultEnabled:function(isCoach,ptype,status){
			if (status=='E') return false; // cannot edit executed stuff
			if (isCoach && ptype=='O') return false; // coach cannot edit online result
			if (!isCoach && ptype=='G') return false; // client cannot edit gym result
			if (!isCoach && ptype=='R') return false; // client cannot edit regular result
			return true;
		}
		
	});
});