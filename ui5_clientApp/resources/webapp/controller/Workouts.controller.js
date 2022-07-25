sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"ru/fitrepublic/shared/model/coachNotesDialog",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/GroupHeaderListItem"
], function (Controller, AppMgr, NotesDlg, JSONModel, Filter, GroupHeaderListItem) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.Workouts", {
		
		onInit: function() {
			this.getRouter().getRoute("workouts").attachMatched(this.onRouteMatched, this);
			this.filterFields=["coachName","coachNickName","purchaseDescr","workoutDescr"];
			this.listName="workouts";
			var mdl=new JSONModel();
			this.getView().setModel(mdl);
			var filters=[{
				key:'purchaseType', title:this.geti18n('workoutsType'),
				values:[
					{ key:'F', text:this.geti18n('purchaseType_F') },
					{ key:'S', text:this.geti18n('purchaseType_S') },
					{ key:'O', text:this.geti18n('purchaseType_O') },
					{ key:'G', text:this.geti18n('purchaseType_G') },
					{ key:'R', text:this.geti18n('purchaseType_R') }
				]
			}];
			AppMgr.promisedRead("/ClientCoaches").then(function(data){
				var coaches=data.results.map(function(c){
					return {key:c.coachId, text:c.coachName };
				});
				filters.push({ key:'coachId', title:AppMgr.geti18n('workoutsCoach'), values:coaches });
				mdl.setData({filters:filters});
			}).catch(function(err){
				console.log(err);
			});
		},
		
		onRouteMatched:function(e){
			this.getItemsBindingFor(this.listName).refresh(true);
		},
		
		formatWorkoutPurchase:function(ptype,pdescr){
			var text=this.geti18n('purchaseType')+': '+this.geti18n('purchaseType_'+ptype);
			if (ptype=='F') return text;
			return text + (pdescr?' @'+pdescr:'');
		},
		
		formatWorkoutStatus:function(statusCode){
			return this.geti18n('workoutStatus_'+statusCode);
		},
		
		formatWorkoutIntro:function(ptype,coachName,coachNickname){
			if (ptype=='F') return '';
			return coachName+" ("+coachNickname+")";
		},
		
		formatWorkoutTimestamp:function(timestamp){
			if (!timestamp) return '';
			var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour:'numeric', minute:'2-digit' };
			var locale=sap.ui.getCore().getConfiguration().getLocale().toString();
			return timestamp.toLocaleDateString(locale, options);
		},
		
		confirmFilters:function(e){
			var filters=[];
			var lists = e.getSource().getLists().filter(function(l) { return l.getSelectedItems().length; });
			if (lists.length) {
				filters = new Filter(lists.map(function(l) {
					return new Filter(l.getSelectedItems().map(function(i) {
						return new Filter(l.getKey(), "EQ", i.getKey());
					}), false);
				}), true);
			}
			this.getItemsBindingFor(this.listName).filter(filters);
		},
		
		resetFilters:function(e){
			e.getSource().getLists().forEach(function(l){ l.setSelectedKeys(); });
			this.getItemsBindingFor(this.listName).filter([]);
		},

		handleSearch:function(e){
			var filters=[];
			var val=e.getParameter("query");
			if (val) {
				filters.push( new Filter(this.filterFields.map(function(f) {
					return new Filter({ path:f,  operator:"Contains",  value1:val, caseSensitive:false });
					}), false));
			}
			this.getItemsBindingFor(this.listName).filter(filters,"Application");
		},
		
		goToWorkout:function(e){
			var id=e.getSource().getBindingContext("odata").getProperty("workoutId");
			this.getRouter().navTo('workout',{id:id});
		},
		
		displayNotes:function(e){
			var clientId=e.getSource().getBindingContext("odata").getProperty("clientId");
			NotesDlg.displayNotes(this.getView(), clientId).then(function(newData){
				// console.log(newData);
			}).catch(function(err){
				// console.log(err);
			});
		}
		
	});
});