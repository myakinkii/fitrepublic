sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"ru/fitrepublic/shared/model/coachNotesDialog",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/GroupHeaderListItem"
], function (Controller, AppMgr, NotesDlg, JSONModel, Filter, GroupHeaderListItem) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.MyClients", {
		
		onInit: function() {
			this.getRouter().getRoute("clients").attachMatched(this.onRouteMatched, this);
			this.filterFields=["clientNickName"];
			this.listName="clientList";
			this.getView().setModel(new JSONModel({
				filters:[{
					key:'purch_R', title:this.geti18n('myclientsPurchase_R'),
					values:[
						{ key:1, text:this.geti18n('genericYes') },
						{ key:0, text:this.geti18n('genericNo') }
					]
				},{
					key:'purch_O', title:this.geti18n('myclientsPurchase_O'),
					values:[
						{ key:1, text:this.geti18n('genericYes') },
						{ key:0, text:this.geti18n('genericNo') }
					]
				},{
					key:'purch_G', title:this.geti18n('myclientsPurchase_G'),
					values:[
						{ key:1, text:this.geti18n('genericYes') },
						{ key:0, text:this.geti18n('genericNo') }
					]
				},{
					key:'purch_S', title:this.geti18n('myclientsPurchase_S'),
					values:[
						{ key:1, text:this.geti18n('genericYes') },
						{ key:0, text:this.geti18n('genericNo') }
					]
				}]
			}));
		},
		
		onRouteMatched:function(e){
			this.getItemsBindingFor(this.listName).refresh(true);
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
			this.getItemsBindingFor(this.listName).filter(filters);
		},
		
		goToClient:function(e){
			var clientId=e.getSource().getBindingContext("odata").getProperty("clientId");
			this.getRouter().navTo('client',{id:clientId});
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