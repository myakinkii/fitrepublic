sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/GroupHeaderListItem"
], function (Controller, AppMgr, JSONModel, Filter, GroupHeaderListItem) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.MyTemplates", {
		
		onInit: function() {
			this.getRouter().getRoute("templates").attachMatched(this.onRouteMatched, this);
			this.getView().setModel(new JSONModel({
				filters:[{
					key:'type', title:this.geti18n('templateType'),
					values:[
						{ key:'P', text:this.geti18n('templateType_P') },
						{ key:'S', text:this.geti18n('templateType_S') }
					]
				}]
			}));
		},
		
		onRouteMatched:function(e){
			this.getItemsBindingFor('templateList').refresh(true);
		},

		formatType:function(typeCode){
			return this.geti18n('templateType')+': '+this.geti18n('templateType_'+typeCode);
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
			this.getItemsBindingFor('templateList').filter(filters);
		},
		
		resetFilters:function(e){
			e.getSource().getLists().forEach(function(l){ l.setSelectedKeys(); });
			this.getItemsBindingFor('templateList').filter([]);
		},
		
		getGroupHeader:function(oGroup){
			return new GroupHeaderListItem({
				title: oGroup.key,
				type:'Inactive',
				upperCase: false
			});
		},
		
		goToTemplate:function(e){
			var ctx=e.getSource().getBindingContext("odata").getObject();
			this.getRouter().navTo('template',{id:ctx.id});
		},
		
		createTemplate:function(e){
			this.getRouter().navTo('template',{id:"new"});
		}		
		
	});
});