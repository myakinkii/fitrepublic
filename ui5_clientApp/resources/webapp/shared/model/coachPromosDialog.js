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
		
		open:function(view,promoCode){
			if (!this.dlg) {
				this.dlg = sap.ui.xmlfragment("ru.fitrepublic.shared.fragments.CoachPromosDialog", this);
				this.dlg.setModel(new JSONModel({}));
				view.addDependent(this.dlg);
			}
			
			var codePromise=Promise.resolve({});
			if (promoCode) {
				var path="/"+AppMgr.getOdataModel().createKey('Promos',{id:promoCode});
				codePromise=AppMgr.promisedRead(path);
			}
			var self=this;
			return codePromise.then(function(data){
				self.dlg.getModel().setData(self.prepareData(data));
				return new Promise(function(resolve,reject){
					extResolve=resolve;
					extReject=reject;
					self.dlg.open();
				});
			});
		},
		
		createPromo:function(){
			var data=this.dlg.getModel().getData();
			var promoData={
				promoType:data.promoType,
				description:data.promoDescription
			};
			var self=this;
			AppMgr.promisedCallFunction('/createPromo',promoData).then(function(data){
				return AppMgr.promisedRead("/"+AppMgr.getOdataModel().createKey('Promos',{id:data.value}));
			}).then(function(data){
				self.dlg.getModel().setData(self.prepareData(data));
			});
		},
		
		prepareData:function(data){
			var promoType='O';
			var promo={
				promoCode:data.id,
				promoType:data.type||promoType,
				promoDescription:data.description||AppMgr.geti18n("promoType_"+promoType)
			};
			return promo;
		},
		
		selectType:function(e){
			var promoType=e.getSource().data("promoType");
			var dlgModel=this.dlg.getModel();
			dlgModel.setProperty("/promoType",promoType);
			dlgModel.setProperty("/promoDescription",AppMgr.geti18n("promoType_"+promoType));
		},
		
		copyCode:function(){
			copyToClipboard(this.dlg.getModel().getProperty('/promoCode'));
			MessageToast.show(AppMgr.geti18n("promoCopied"));
		},
		
		closeDlg:function(e){
			this.dlg.close();
			extResolve(this.dlg.getModel().getProperty("/promoCode"));
		}		
	};
});