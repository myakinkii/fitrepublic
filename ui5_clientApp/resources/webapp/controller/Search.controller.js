sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	'sap/m/GroupHeaderListItem'
], function (Controller, AppMgr, JSONModel, GroupHeaderListItem) {
	"use strict";
	
	var searchIcons={
		content:'video',
		coach:'employee',
		gym:'building',
		purchase:'activities',
		subscription:'activities',
		template:'e-learning',
		workout:'appointment'
	};

	return Controller.extend("ru.fitrepublic.ui5_clientApp.controller.Search", {
		onInit: function() {
			this.getRouter().getRoute("search").attachMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched:function(e){
			var q=e.getParameter("arguments").q;
			var p=this.getView().getModel("profile").getData();
			AppMgr.getSearchResults(q,p.deviceId,p.authToken).then(function(data){
				data.query=q;
				this.getView().setModel(new JSONModel(data),"search");
			}.bind(this));
		},
		
		getGroupHeaderResults:function(oGroup){
			var mdlData=this.getView().getModel("search").getData();
			return new GroupHeaderListItem({
				title: this.geti18n('searchObject_'+oGroup.key),
				count:mdlData[oGroup.key],
				type:'Inactive',
				upperCase: false
			});
		},
		
		getGroupHeaderGyms:function(oGroup){
			return new GroupHeaderListItem({
				title: this.geti18n('gymType_'+oGroup.key),
				type:'Inactive',
				upperCase: false
			});
		},		
		
		formatTitle:function(title,objectType,attr){
			// if (objectType=='purchase') return this.geti18n('purchaseQuantity_'+attr)+": "+title;
			// if (objectType=='content') return this.geti18n('contentType_'+attr)+": '"+title+"'";
			if (objectType=='workout') return this.formatWorkoutTimestamp(title)+" "+attr;
			if (objectType=='content') return title;
			return title;
		},
		
		formatWorkoutTimestamp:function(dateStr){
			var timestamp=new Date(dateStr);
			if (!timestamp) return '';
			var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour:'numeric', minute:'2-digit' };
			var locale=sap.ui.getCore().getConfiguration().getLocale().toString();
			return timestamp.toLocaleDateString(locale, options);
		},
		
		formatLinkActive:function(objectType){
			if (objectType=='content') return true;
			return false;
		},
		
		formatIcon:function(objectType){
			return 'sap-icon://'+(searchIcons[objectType]||'question-mark');
		},
		
		contentPress:function(e){
			var ctx=e.getSource().getBindingContext("search").getObject();
			if (ctx.objectType=='content') this.displayContent(ctx.url);
		},
		
		goToResultObject:function(e){
			var ctx=e.getSource().getBindingContext("search").getObject();
			if (ctx.objectType=='content') this.getRouter().navTo("coach",{id:ctx.authorId});
			else if (ctx.objectType=='subscription') this.getRouter().navTo("purchase",{id:ctx.id});
			else this.getRouter().navTo(ctx.objectType,{id:ctx.id});
		},
		
		goToGym:function(e){
			var id=e.getSource().getBindingContext("odata").getProperty("id");
			this.getRouter().navTo("gym",{id:id});
		},
		
		goToCoach:function(e){
			var id=e.getSource().getBindingContext("odata").getProperty("id");
			this.getRouter().navTo("coach",{id:id});
		}		
		
	});
});