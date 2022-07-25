sap.ui.define(["ru/fitrepublic/shared/appMgr", "sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"
], function(AppMgr, JSONModel, MessageBox) {
	"use strict";
	
	var extResolve, extReject;

	return {
		
		showDialog:function(view){
			if (!this.dlg) {
				this.dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.StopWatchDialog", this);
				this.dlg.setModel(new JSONModel({ running:false, duration:0 }));
				view.addDependent(this.dlg);
			}
			var self=this;
			return new Promise(function(resolve,reject){
				extResolve=resolve;
				extReject=reject;
				self.dlg.open();
			});
		},
		
		stoprun:function(e){
			if (e.getParameter("pressed")) this.run();
			else this.stop();
		},
		
		run:function(){
			var mdl=this.dlg.getModel();
			mdl.setProperty("/running",true);
			var duration=mdl.getProperty("/duration");
			this.timer=window.setInterval(function(){ mdl.setProperty('/duration',duration++); },1000);
		},
		
		stop:function(){
			var mdl=this.dlg.getModel();
			mdl.setProperty("/running",false);
			window.clearInterval(this.timer);
		},
		
		reset:function(){
			var mdl=this.dlg.getModel();
			if (this.timer) this.stop();
			mdl.setProperty('/duration',0);
		},
		
		apply:function(){
			var mdl=this.dlg.getModel();
			var duration=mdl.getProperty("/duration");
			MessageBox.confirm(AppMgr.geti18n('stopWatchConfirmApply'), function(action) {
				if (action != MessageBox.Action.OK) return;
				// this.reset();
				// this.dlg.close();
				extResolve(duration);
			}.bind(this));
		},
		
		closeDlg:function(e){
			this.dlg.close();
			extReject(null);
		},
		
		toText:function(running){
			return AppMgr.geti18n(running?"stopWatchStop":"stopWatchRun");
		},
		
		toIcon:function(running){
			return "sap-icon://"+(running?"media-pause":"media-play");
		},
		
		addZero:function(digit){
			return (digit<10?'0':'')+digit;
		},
		
		toHours:function(duration){
			return this.addZero(Math.floor(duration/60/60));
		},
		
		toMinutes:function(duration){
			return this.addZero(Math.floor(duration/60));
		},
		
		toSeconds:function(duration){
			return this.addZero(duration%60);
		}
	};
});