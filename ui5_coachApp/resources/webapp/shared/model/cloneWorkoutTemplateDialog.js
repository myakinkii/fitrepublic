sap.ui.define(["ru/fitrepublic/shared/appMgr", "sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter", "sap/ui/model/FilterOperator"
], function(AppMgr, JSONModel, Filter, FilterOperator) {
	"use strict";
	
	var extResolve, extReject;

	return {
		
		showTemplateDialog:function(view){
			if (!this.dlg) {
				this.dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.WorkoutTemplateSelectDialog", this);
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
		
		handleSearchTemplate: function (e) {
			var val = e.getParameter("value");
			var filters=[];
			var fields=['name','category','description'];
			if (val) filters=new Filter(fields.map(function(f) {
					return new Filter({ path:f,  operator:FilterOperator.Contains,  value1:val, caseSensitive:false });
				}), false);
			e.getSource().getBinding("items").filter(filters);
		},
		
		handleAddTemplate:function(e){
			e.getSource().getBinding("items").filter([]);
			var ctxs = e.getParameter("selectedContexts");
			if (ctxs && ctxs.length) extResolve(ctxs[0].getProperty("id"));
			else extReject(null);
		}
	};
});