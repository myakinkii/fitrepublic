sap.ui.define(["ru/fitrepublic/shared/appMgr", "sap/ui/model/json/JSONModel" ], function(AppMgr, JSONModel) {
	"use strict";
	
	var extResolve, extReject;

	return {
		
		showItemDialog:function(view, id, hideHeader){
			var odataMdl=AppMgr.getOdataModel();
			var dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.DisplayEditWorkoutDialog", this);
			if (hideHeader) dlg.getCustomHeader().destroy();
			view.addDependent(dlg);
			dlg.setModel(odataMdl,"odata");
			var path="/Workouts(guid'"+id+"')";
			dlg.bindElement({path:path,model:"odata",parameters: { expand: "purchase,purchase/gym,coach,client" } });
			dlg.attachAfterClose(function(){ dlg.destroy(); });
			this.dlg=dlg;
			return new Promise(function(resolve,reject){
				extResolve=resolve;
				extReject=reject;
				dlg.open();
			});
		},
		
		closeDlg:function(e){
			this.dlg.close();
			AppMgr.getOdataModel().resetChanges();
			extReject({});
		},
		
		navToWorkout:function(e){
			var ctx=e.getSource().getBindingContext("odata").getObject();
			this.dlg.close();
			AppMgr.getOdataModel().resetChanges();
			extReject(ctx);
		},
		
		validateForm:function(e){
			return sap.ui.getCore().byFieldGroupId("required").reduce(function(flag, control){
				var state="None";
				var emptyVal = control.getValue && !control.getValue();
				var changeInvalid = e && !e.getParameter("valid");
				var leftInErrorState = !e && control.getValueState && control.getValueState()=='Error';
				if( emptyVal || changeInvalid || leftInErrorState) {
					state="Error";
					flag=false;
				}
				control.setValueState&&control.setValueState(state);
				return flag;
			},true);
		},
		
		submitChanges:function(){
			if (!this.validateForm()) return;
			AppMgr.promisedSubmitChanges().then(function(firstData){
				this.dlg.close();
				extResolve();
			}.bind(this)).catch(extReject);
		}
	};
});