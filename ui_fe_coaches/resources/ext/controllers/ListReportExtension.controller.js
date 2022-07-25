jQuery.sap.require("ru.fitrepublic.ui_fe_coaches.lib.qrcode");
jQuery.sap.require("sap.m.MessageBox");
sap.ui.controller("ru.fitrepublic.ui_fe_coaches.ext.controllers.ListReportExtension", {	
	
	onBeforeRebindTableExtension:function(e){
		var pars=e.getParameter("bindingParams").parameters;
		// pars.select+=',deviceId,authToken'; // I want those fields in getSelectedContexts, but not in ui
		pars.select="*"; // but '*' seem to be a little bit nicer hack
	},

	onFilerOnboarded:function(){ 
	},
	
	createPromo:function(){
		function navToExternal(promoId){
			var intent={ target:{ semanticObject: "promos", action: "manage"} , params: { id: promoId } };
			var crossAppNav = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");
			if (crossAppNav) crossAppNav.isNavigationSupported([intent]).done(function(res){
				if (res[0].supported) {
					// crossAppNav.toExternal(crossAppNav.hrefForExternal(intent));
					crossAppNav.toExternal({ target : { shellHash : crossAppNav.hrefForExternal(intent) }})
				}
			});
		}
		var coach = this.extensionAPI.getSelectedContexts()[0].getObject();
		var self=this;
		this.getOwnerComponent().getModel().callFunction('/createPromoForCoach',{
			urlParameters:{ coach_id:coach.id },
			success:function(re){
				sap.m.MessageBox.success( re.value, { 
					actions:["NAV",sap.m.MessageBox.Action.CLOSE],
					emphasizedAction: sap.m.MessageBox.Action.CLOSE,
					onClose:function (action){
						self.copyToClipboard(re.value);
						if (action=="NAV") navToExternal(re.value);
					}
				});
			},
			error:function(err){
				console.log(err);
				sap.m.MessageBox.error(JSON.stringify(err));
			}
		});
	},
	
	showQrCode:function(e){
		var btn=e.getSource();
		var ctx = this.extensionAPI.getSelectedContexts()[0];;
		if (!this._oPopover) {
			this._oPopover = sap.ui.xmlfragment("ru.fitrepublic.ui_fe_coaches.ext.fragments.qrPopover", this);
			this.getView().addDependent(this._oPopover);
		}
		this._oPopover.bindElement(ctx.getPath());
		this._oPopover.openBy(btn);
		this.genQrContent(ctx.getObject());
	},
	
	genQrContent:function(data){
		$('#qrcode')[0].innerHTML=''; // clear div
		new QRCode("qrcode", {
			text: JSON.stringify({name:data.name, deviceId:data.deviceId,authToken:data.authToken}),
			width: 250,
			height: 250,
			colorDark: "#000000",
			colorLight: "#ffffff",
			correctLevel: QRCode.CorrectLevel.H
		});
	},

	copyProfileSecret:function(e){
		var profile=e.getSource().getBindingContext().getObject();
		var jsonString=JSON.stringify({secret:profile.deviceId+"|"+profile.authToken});
		sap.m.MessageBox.success(jsonString,{
			onClose:function(){
				this.copyToClipboard(btoa(jsonString));
			}.bind(this)
		});
	},

	copyToClipboard:function(val){
		var dummy = document.createElement("textarea");
		document.body.appendChild(dummy);
		dummy.value = val;
		dummy.select();
		document.execCommand("copy");
		document.body.removeChild(dummy);
	}

});