sap.ui.define(["ru/fitrepublic/shared/appMgr"
], function(AppMgr) {
	"use strict";
	
	var extResolve, extReject;

	return {
		
		displayNotes:function(view, clientId){
			if (!this.dlg) {
				this.dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.CoachNotesDialog", this);
				view.addDependent(this.dlg);
			}
			var self=this;
			return AppMgr.getProfile().then(function(profile){
				var coachId=profile.id;
				return self.prepareDialogContext(coachId,clientId);
			}).then(function(path){
				self.dlg.bindElement({path:path, model:"odata", parameters:{expand:"client"}});
				return new Promise(function(resolve,reject){
					extResolve=resolve;
					extReject=reject;
					self.dlg.open();
				});
			});
		},
		
		prepareDialogContext:function(coachId,clientId){
			var odataMdl=AppMgr.getOdataModel();
			var entity="/CoachNotes";
			var key={ coach_id: coachId, client_id: clientId };
			var path = odataMdl.createKey(entity, key);
			return new Promise(function(resolve,reject){
				odataMdl.create( entity, key, {
					success:function(){ resolve(path); },
					error:function(){ resolve(path); }
				});
			});
		},
		
		saveChanges:function(){
			var newValue=this.dlg.getBindingContext("odata").getProperty("text");
			var odataMdl=AppMgr.getOdataModel();
			if (odataMdl.hasPendingChanges()) odataMdl.submitChanges();
			this.dlg.close();
			extResolve(newValue);
		},
		
		closeDlg:function(e){
			this.dlg.close();
			extReject(null);
		}		
	};
});