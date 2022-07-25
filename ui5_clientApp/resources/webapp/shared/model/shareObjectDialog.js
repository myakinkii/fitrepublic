sap.ui.define(["ru/fitrepublic/shared/appMgr",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function(AppMgr,JSONModel,MessageToast) {
	"use strict";
	
	var extResolve, extReject;
	
	function copyToClipboard(val){
		var dummy = document.createElement("textarea");
		document.body.appendChild(dummy);
		dummy.value = val;
		dummy.select();
		document.execCommand("copy");
		document.body.removeChild(dummy);
	}

	return {
		
		showLink:function(linkId,view){
			
			if (!this.dlg) {
				this.dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.ShareObjectDialog", this);
				this.dlg.setModel(new JSONModel({}));
				view.addDependent(this.dlg);
			}
			var self=this;
			
			this.dlg.getModel().setData({ link : AppMgr.getShareUrl(linkId) });
			
			return new Promise(function(resolve,reject){
				extResolve=resolve;
				extReject=reject;
				self.dlg.open();
			});
		},
		
		share:function(target,id,linkId,view){
			var share=Promise.resolve({value:linkId});
			if (!linkId) share=AppMgr.promisedCallFunction('/shareObject',{target:target,id:id});
			return share.then(function(re){
				return this.showLink(re.value,view);
			}.bind(this)).catch(function(err){
				console.log(err);
			});
		},
		
		copyLink:function(){
			copyToClipboard(this.dlg.getModel().getProperty('/link'));
			MessageToast.show(AppMgr.geti18n("promoCopied"));
		},
		
		closeDlg:function(e){
			this.dlg.close();
			extResolve(this.dlg.getModel().getProperty("/link"));
		}		
	};
});