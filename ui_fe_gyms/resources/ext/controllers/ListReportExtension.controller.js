jQuery.sap.require("sap.m.MessageBox");
jQuery.sap.require("sap.ui.model.Filter");
sap.ui.controller("ru.fitrepublic.ui_fe_gyms.ext.controllers.ListReportExtension", {	
	
	onSearch: function (e) {
		var filters=[];
		var value=e.getParameter("value");
		var fields=['name','nickName'];
		if (value) {
			filters.push( new sap.ui.model.Filter(fields.map(function(f) {
				return new sap.ui.model.Filter({ path:f,  operator:"Contains",  value1:value, caseSensitive:false });
			}), false));
		}
		e.getParameter("itemsBinding").filter(filters);
	},

	onDialogClose: function (e) {
		e.getSource().getBinding("items").filter([]);
		var gym = this.extensionAPI.getSelectedContexts()[0].getObject();
		var ctx = e.getParameter("selectedContexts");
		if (ctx && ctx.length){
			this.saveCoach(gym.id,ctx[0].getProperty("id"));
		}
	},

	addCoach:function(){
		this.coachDlg = sap.ui.xmlfragment("ru.fitrepublic.ui_fe_gyms.ext.fragments.CoachesDialog", this);
		this.getView().addDependent(this.coachDlg);
		this.coachDlg.open();
	},
	
	saveCoach:function(gym_id,coach_id){
		var i18n=this.getOwnerComponent().getModel("@i18n").getResourceBundle();
		var odataMdl=this.getOwnerComponent().getModel();
		var data={gym_id:gym_id,coach_id:coach_id};
		// var key=odataMdl.createKey("/CoachesToGyms",data);
		// console.log(key);
		odataMdl.create('/CoachesToGyms',data,{
			success:function(re){
				// console.log(re);
				sap.m.MessageBox.success(i18n.getText("coachAdded"));
			},
			error:function(err){
				console.log(err);
				sap.m.MessageBox.error(i18n.getText("coachNotAdded"));
			}
		});
	}
});