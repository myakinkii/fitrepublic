jQuery.sap.require("sap.m.MessageBox");
jQuery.sap.require("sap.ui.model.Filter");
jQuery.sap.require("ru.fitrepublic.ui_fe_gyms.lib.qrcode");
sap.ui.controller("ru.fitrepublic.ui_fe_gyms.ext.controllers.DetailExtension", {	
	
	onSearch: function (e) {
		var filters=[];
		var value=e.getParameter("value");
		var fields=['title','subtitle','author/name'];
		if (value) {
			filters.push( new sap.ui.model.Filter(fields.map(function(f) {
				return new sap.ui.model.Filter({ path:f,  operator:"Contains",  value1:value, caseSensitive:false });
			}), false));
		}
		e.getParameter("itemsBinding").filter(filters);
	},

	onDialogClose: function (e) {
		e.getSource().getBinding("items").filter([]);
		var equipment = this.getView().getBindingContext().getObject();
		var ctx = e.getParameter("selectedContexts");
		if (ctx && ctx.length){
			this.saveContent(equipment.id,ctx[0].getProperty("id"));
		}
	},

	addContent:function(){
		this.coachDlg = sap.ui.xmlfragment("ru.fitrepublic.ui_fe_gyms.ext.fragments.ContentDialog", this);
		this.getView().addDependent(this.coachDlg);
		this.coachDlg.open();
	},
	
	saveContent:function(equipmentId,contentId){
		var i18n=this.getOwnerComponent().getModel("@i18n").getResourceBundle();
		var odataMdl=this.getOwnerComponent().getModel();
		this.addContentToEquipment(contentId,equipmentId,odataMdl).then(function(){
			sap.m.MessageBox.success(i18n.getText("contentAdded"));
		}).catch(function(){
			sap.m.MessageBox.error(i18n.getText("contentNotAdded"));
		});
	},
	
	addContentToEquipment:function(contentId,equipmentId,odataMdl){
		var data={ equipment_id:equipmentId, content_id:contentId };
		return new Promise(function(resolve,reject){
			odataMdl.create('/EquipmentToContent',data,{
				refreshAfterChange:true,
				success:resolve,
				error:reject
			});
		});
	},
	
	showQrCode:function(e){
		var btn=e.getSource();
		var data = this.getView().getBindingContext().getObject();
		var odataMdl=this.getOwnerComponent().getModel();
		var linkId=data.linkId;
		var linkPromise=Promise.resolve(linkId);
		if (!linkId){
			linkPromise=this.shareObject(data.id,odataMdl).then(function(link){
				return this.updateLinkId(data.id,link.value,odataMdl);
			}.bind(this));
		}
		if (!this._oPopover) {
			this._oPopover = sap.ui.xmlfragment("ru.fitrepublic.ui_fe_gyms.ext.fragments.qrPopover", this);
			this.getView().addDependent(this._oPopover);
		}
		linkPromise.then(function(linkId){
			var launchpadServices = sap.ushell && sap.ushell.services;
			var url=['https://f-r.online'];
			if (!launchpadServices) url.push('dev');
			url.push(linkId);
			this._oPopover.openBy(btn);
			this.genQrContent(url.join("/"));
		}.bind(this)).catch(function(err){ console.log(err); });
	},
	
	shareObject:function(id,odataMdl){
		var pars={id:id, target:'equipment'};
		return new Promise(function(resolve,reject){
			odataMdl.callFunction('/shareObject',{
				urlParameters:pars,
				success:resolve,
				error:reject
			});
		});
	},
	
	updateLinkId:function(id,linkId,odataMdl){
		var path=odataMdl.createKey('/Equipment',{id:id});
		return new Promise(function(resolve,reject){
			odataMdl.update(path,{linkId:linkId},{
				refreshAfterChange:true,
				success:function(re){
					resolve(re.linkId);
				},
				error:reject
			});
		});
	},
	
	genQrContent:function(url){
		$('#qrcode')[0].innerHTML=''; // clear div
		new QRCode("qrcode", {
			text: url,
			width: 250,
			height: 250,
			colorDark: "#000000",
			colorLight: "#ffffff",
			correctLevel: QRCode.CorrectLevel.H
		});
	}
	
});