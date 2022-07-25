sap.ui.define(["ru/fitrepublic/shared/appMgr", "sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter", "sap/ui/model/FilterOperator"
], function(AppMgr, JSONModel, Filter, FilterOperator) {
	"use strict";
	
	var extResolve, extReject;

	return {
		
		showContentDialog:function(view){
			if (!this.dlg) {
				this.dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.ContentSelectDialog", this);
				view.addDependent(this.dlg);
				this.dlg.setModel(AppMgr.getOdataModel(),"odata");
			}
			var self=this;
			return new Promise(function(resolve,reject){
				extResolve=resolve;
				extReject=reject;
				self.dlg.open();
			});
		},
		
		handleCancel:function(e){
			extReject(null);
		},
		
		handleSearchContent: function (e) {
			var val = e.getParameter("value");
			// var filter = new Filter({
			// 	path:"title", 
			// 	operator:FilterOperator.Contains, 
			// 	value1:val,
			// 	caseSensitive:false
			// });
			var filters=[];
			var fields=['category','title','subtitle'];
			if (val) filters=new Filter(fields.map(function(f) {
					return new Filter({ path:f,  operator:FilterOperator.Contains,  value1:val, caseSensitive:false });
				}), false);
			e.getSource().getBinding("items").filter(filters);
		},
		
		handleAddContent:function(e){
			e.getSource().getBinding("items").filter([]);
			var ctxs = e.getParameter("selectedContexts");
			if (ctxs && ctxs.length) {
				extResolve(ctxs.map(function(ctx){ 
					var c=ctx.getObject();
					var item={
						video_id:c.id,
						name:c.title+(c.subtitle?" "+c.subtitle.toLowerCase():'')
					};
					return item;
				}));
			} else if (this.dlg._sSearchFieldValue){ // tried searching
				extResolve([{name:this.dlg._sSearchFieldValue}]);
			} else{
				extReject(null);
			}
		}
	};
});