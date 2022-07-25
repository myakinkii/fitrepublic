sap.ui.define([
	"sap/ui/model/json/JSONModel", "sap/ui/model/odata/v2/ODataModel", "sap/ui/Device",
	"sap/ui/integration/Host", "sap/ui/integration/widgets/Card", "sap/f/GridContainerItemLayoutData",
	"sap/base/util/UriParameters"
], function(JSONModel, ODataModel, Device, Host, Card, GridContainerItemLayoutData, UriParameters) {
	"use strict";
	
	var odataUrl, restUrl;
	var deviceId, authToken;
	var ownerComponent, i18nBndl;
	
	var knownCards={
		calendar:true,
		chatMessages:true,
		clientList:true,
		clientWorkouts:true,
		coachBilling:true,
		coachClients:true,
		coachPrograms:true,
		coachPromo:true,
		profile:true,
		profileCoach:true,
		purchaseList:true,
		searchAndPromo:true,
		templateList:true
	};
	
	var routeStack=[{name:"main"}];

	return {
		
		pushRoute:function(r){
			routeStack.push(r);
		},
		
		popRoute:function(){
			var back=routeStack.pop(); // pop current
			// console.log(routeStack);
			return routeStack.pop(); // get previous
		},
		
		setModeOnline:function(onlineFlag){
			this.online=onlineFlag;
		},
		
		getOnlineMode:function(){
			return this.online;
		},
		
		setOwner:function(owner){
			ownerComponent=owner;
			i18nBndl=ownerComponent.getModel("i18n").getResourceBundle();
		},
		
		geti18n:function(prop, arr){
			return i18nBndl&&i18nBndl.getText(prop, arr);
		},
		
		getShareUrl:function(linkId){
			var baseUrl='https://f-r.online';
			var url = [baseUrl];
			var backend=this.getBackendSystem();
			if (backend) url.push(backend);
			url.push(linkId);
			return url.join("/");
		},
		
		resolveUrls:function(mainSvc){
			var url=mainSvc.uri.split("odata");
			var backend=this.getBackendSystem();
			var base=url[0]+(backend?backend+"/":"");
			odataUrl = base+"odata"+url[1];
			restUrl = base+"rest"+url[1];
		},
		
		getBackendSystem:function(){
			return window.localStorage.getItem('backend')||'';
		},
		
		setBackendSystem:function(system){
			window.localStorage.removeItem('backend');
			if (system) window.localStorage.setItem('backend',system);
		},
		
		getCompletePaymentUrl:function(purchaseId){
			return restUrl+"/completePayment?device="+deviceId+"&token="+authToken+"&purchase="+purchaseId;
		},
		
		promisedGetJSON:function(url){
			return new Promise(function(resolve,reject){
				$.getJSON(url).done(resolve).fail(function(xhr,status,error){
					reject(xhr.responseJSON);
				});
			});
		},		
		
		onboard:function(device){
			return this.promisedGetJSON(restUrl+"/onboard?device="+device);
		},
		
		onboardCoach:function(device,token){
			return this.promisedGetJSON(restUrl+"/onboard?device="+device+"&token="+token);
		},
		
		queryBackend:function(endpoint,args){
			var pars= "device="+deviceId+"&token="+authToken;
			for (var a in args) pars+= "&"+a+"="+args[a];
			var url=restUrl+endpoint+"?"+pars;
			return this.promisedGetJSON(url);
		},
		
		getOdataModel:function(){
			var odataMdl=ownerComponent.getModel("odata");
			if (!odataMdl){ // offline mode
				odataMdl={
					read:function(){ return Promise.reject(); },
					create:function(){ return Promise.reject(); },
					update:function(){ return Promise.reject(); },
					remove:function(){ return Promise.reject(); },
					submitChanges:function(){ return Promise.reject(); },
					callFunction:function(){ return Promise.reject(); }
				};
			}
			return odataMdl;
		},
		
		promisedOdataAction:function(fn,path,payload,urlPars){
			var odataMdl=this.getOdataModel();
			var args=[path];
			if (payload) args.push(payload);
			var pars={};
			if (urlPars) pars.urlParameters=urlPars;
			args.push(pars);
			return new Promise(function(resolve,reject){
				pars.success=function(data){ resolve(data); };
				pars.error=function(err){ 
					try {
						var sapErr=JSON.parse(err.responseText);
						var errObj=JSON.parse(sapErr.error.message.value);
						reject(errObj);
					} catch (e){
						reject(err);
					}
				};
				fn.apply(odataMdl,args);
			});
		},
		
		promisedRead:function(path,urlPars){
			return this.promisedOdataAction(this.getOdataModel().read, path, null, urlPars);
		},

		promisedCreate:function(path,payload,urlPars){
			return this.promisedOdataAction(this.getOdataModel().create, path, payload, urlPars);
		},
		
		promisedUpdate:function(path,payload,urlPars){
			return this.promisedOdataAction(this.getOdataModel().update, path, payload, urlPars);
		},
		
		promisedDelete:function(path,urlPars){
			return this.promisedOdataAction(this.getOdataModel().remove, path, null, urlPars);
		},
		
		promisedCallFunction:function(fn,urlPars){
			return this.promisedOdataAction(this.getOdataModel().callFunction, fn, null, urlPars);
		},
		
		promisedSubmitChanges:function(){
			var odataMdl=this.getOdataModel();
			return new Promise(function(resolve,reject){
				odataMdl.setUseBatch(true);
				odataMdl.submitChanges({ 
					success:function(re){
						odataMdl.setUseBatch(false);
						if (re["__batchResponses"]) resolve(re["__batchResponses"][0]["__changeResponses"][0].data);
						else resolve(null);
					},
					error:function(err){
						odataMdl.setUseBatch(false);
						reject(err);
					}
				});
			});
		},
			
		getInitData:function(){
			return this.queryBackend("/init");
		},
		
		getSearchResults:function(query){
			return this.queryBackend("/search",{q:query});
		},
		
		getPurchaseOptions:function(purchaseType){
			return this.queryBackend("/getPurchaseOptions",{type:purchaseType});
		},
		
		getPromoData:function(){
			return this.queryBackend("/getPromoData");
		},
		
		getChatChannels:function(){
			return this.promisedOdataRead("/MyChatChannels");
		},
		
		getCalendarFormatters:function(){
		/*
			'Type01' yellow
			'Type02' orange
			'Type03' red
			'Type04' deep red/brown
			'Type05' pink
			'Type06' green
			'Type07' deep blue
			'Type08' light blue
			'Type09' light green
			'Type10' purple
		*/	
			var itemTypes={
				// U:{ dayType:'Type03', icon:'appear-offline', title:this.geti18n('calendarItemU'), legend:'calendar' }, // red
				R:{ dayType:'Type08', icon:'appointment', title:this.geti18n('calendarItemR'),  legend:'appointment'}, // light blue
				O:{ dayType:'Type09', icon:'appointment', title:this.geti18n('calendarItemO'),  legend:'appointment'}, // light green
				S:{ dayType:'Type05', icon:'appointment', title:this.geti18n('calendarItemS'),  legend:'appointment'}, // pink
				G:{ dayType:'Type01', icon:'appointment', title:this.geti18n('calendarItemG'),  legend:'appointment'}, // orange
				F:{ dayType:'Type03', icon:'appointment', title:this.geti18n('calendarItemF'),  legend:'appointment'} // red
			};
			return {
				toTitle:function(itemStatus, purchaseType, description){
					if (itemStatus=='U') return itemTypes[itemStatus].title;
					if (purchaseType=='F') return description ||' ';
					return description || itemTypes[purchaseType].title;
				},
				toText:function(itemStatus, purchaseType, client, coach, gym, pdescr){
					if (itemStatus=='U') return '';
					if (purchaseType=='F') return itemTypes[purchaseType].title;
					return (client||coach)+' @'+(pdescr||gym);
				},
				toType:function(itemStatus, purchaseType){
					if (itemStatus=='U') return itemTypes[itemStatus].dayType;
					return itemTypes[purchaseType].dayType;
				},
				toIcon: function (itemStatus,purchaseType) {
					if (itemStatus=='U') return 'sap-icon://'+itemTypes[itemStatus].icon;
					return 'sap-icon://'+itemTypes[purchaseType].icon;
				},
				toViz:function(itemStatus){
					if (itemStatus=='U') return 'blocker';
					return 'appointment';
				}
			};
		},
		
		getCalendar:function(){
			if (this.online) return this.refreshCalendar();
			else return this.getLocalCalendar();
		},
		
		refreshCalendar:function(){
			return this.queryBackend("/getCalendar").then(function(data){
				this.setLocalCalendar({items:data});
				return this.getLocalCalendar();
			}.bind(this));
		},
		
		setLocalCalendar:function(calendar){
			window.localStorage.setItem('calendar',JSON.stringify(calendar));
		},
		
		getLocalCalendar:function(){
			return Promise.resolve(JSON.parse(window.localStorage.getItem('calendar')));
		},
		
		getAuthPars:function(){
			return {deviceId:deviceId, authToken:authToken};
		},
		
		pingBackend:function(){
			var self=this;
			return new Promise(function(resolve,reject){
				self.promisedGetJSON(restUrl).then(function(res){
					resolve(res);
				}).catch(function(err){
					resolve({alive:false});
				});
			});
		},
		
		performInitChecks:function(owner){
			
			var self=this;
			var onlineMode=true; // current online state
			var onlineOnly=typeof Connection == "undefined"; // testing in web ide
			if (!onlineOnly){
				document.addEventListener("online", function(){ self.setModeOnline(true); }, false);
				document.addEventListener("offline", function(){ self.setModeOnline(false); }, false);
				onlineMode = navigator.connection && navigator.connection.type!==Connection.NONE;
			}
			
			var initProps={online:onlineMode, beAlive:null, version:null, onboarded:null, localProfile:null};
			
			return this.getProfile().then(function(profile){
				initProps.localProfile = profile;
				deviceId=profile.deviceId;
				authToken=profile.authToken;
				initProps.onboarded = profile.authToken?true:false;
				return Promise.resolve();
			}).then(function(){
				if (onlineOnly) return Promise.resolve();
				else return cordova.getAppVersion.getVersionNumber();
			}).then(function(versionInfo){
				initProps.version={app:versionInfo};
				if (initProps.online) return self.pingBackend();
				else return Promise.resolve({alive:true});
			}).then(function(be){
				initProps.beAlive=be.alive;
				initProps.version.be=be.version;
				return Promise.resolve(initProps);
			});
		},
		
		init:function(){
			return this.getInitData().then(function(data){
				this.setProfile(data.profile);
				this.setLocalCards(data.cards);
				ownerComponent.setModel(this.createProfileModel(data.profile), "profile");
				ownerComponent.setModel(this.createOdataModel({url:odataUrl, deviceId:deviceId, authToken:authToken}), "odata");
				ownerComponent.setModel(this.createDeviceModel(), "device");
				return Promise.resolve(data);
			}.bind(this));
		},
		
		initOffline:function(){
			ownerComponent.setModel(this.createProfileModel(this.getProfile()), "profile");
			ownerComponent.setModel(this.createOdataModel(), "odata");
			ownerComponent.setModel(this.createDeviceModel(), "device");
			return Promise.resolve();
		},		
		
		resetProfile:function(){
			window.localStorage.removeItem('profile');
			window.location.reload();
		},
		
		getProfile:function(){
			var localProfile=JSON.parse(window.localStorage.getItem('profile')) || {};
			if (!localProfile.authToken){
				localProfile.authToken = '';
				localProfile.deviceId = Math.random().toString(26).slice(2);
				if (typeof device !== "undefined") localProfile.deviceId=device.uuid.toLowerCase();
			}
			return Promise.resolve(localProfile);			
		},
		
		setProfile:function(profile){
			deviceId=profile.deviceId;
			authToken=profile.authToken;
			window.localStorage.setItem('profile',JSON.stringify(profile));
		},
		
		restoreProfile:function(data){
			this.setProfile({deviceId:data[0],authToken:data[1]});
			window.location.reload();
		},
		
		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		
		createProfileModel:function(profile){
			profile.isCoach = profile.name?true:false;
			profile.isClient = !profile.isCoach;
			return new JSONModel(profile);
		},
		
		createOdataModel:function(pars){
			if (!pars) return null;
			return new ODataModel({
				defaultBindingMode: "TwoWay",
				defaultCountMode: "Inline",
				defaultUpdateMethod: "PATCH",
				refreshAfterChange: false,
				useBatch:false,
				serviceUrl:pars.url,
				serviceUrlParams:{device:pars.deviceId,token:pars.authToken}
			});
		},
		
		setLocalCards:function(cards){
			window.localStorage.setItem('cards',JSON.stringify(cards));
		},
		
		getLocalCards:function(){
			return JSON.parse(window.localStorage.getItem('cards'));
		},
		
		setHiddenCards:function(cards){
			window.localStorage.setItem('hiddenCards',JSON.stringify(cards));
		},		
		
		getHiddenCards:function(){
			return JSON.parse(window.localStorage.getItem('hiddenCards')) || {};
		},
		
		cardsDstResolver:function(dst){
			if (dst=='odata_srv') return odataUrl;
			if (dst=='rest_api') return restUrl;
		},
		
		getExternalNav:function(){
			var intent=null;
			var url=window.localStorage.getItem('url');
			if (url){
				window.localStorage.removeItem('url');
				var pars=UriParameters.fromURL(url);
				intent={target:pars.get("target"), id:pars.get("id")};
			}
			return intent;
		},
		
		renderCards: function(cntrl,cardContainer) {
			var self=this;
			var hiddenCards=self.getHiddenCards();
			cardContainer.destroyItems();
			self.getLocalCards().forEach(function(c){
				if (!knownCards[c.name]) return; // cant render this card yet
				if (hiddenCards[c.name]) return; // user decided to hide it
				if (c.hidden) return; // hidden from backend
				var card=new Card({
					id:c.name+"Card",
					manifest:"shared/cards/"+c.name+"/manifest.json",
					action:[function(e){
						var pars=e.getParameter("parameters");
						if (pars.dst=='refresh') {
							e.getParameter("card").refresh();
						} else if(self.getOnlineMode()) {
							if (this[c.name+"ActionHandler"]) this[c.name+"ActionHandler"](pars,e);
							else this.getRouter().navTo(pars.dst,pars.vars);
						} else this.showToast(this.geti18n('warningOfflineMode'));
					},cntrl]
				});
				card.setLayoutData(new GridContainerItemLayoutData({ minRows:c.rows||4, columns:c.cols||4 }));
				card.setParameters(self.getAuthPars());
				
				var actions=[];
				for (var a in c.actions){
					actions.push({
						text: self.geti18n('hostAction_'+a),
						icon: self.cardActionIcons[a],
						parameters:c.actions[a],
						type: 'Custom',
						enabled: function(){ return self.getOnlineMode(); },
						visible: true
					});
				}
				card.setHost(new Host({ actions:actions, resolveDestination: self.cardsDstResolver }));
				
				cardContainer.addItem(card);
			});
		},
		
		cardActionIcons:{
			schedule:'sap-icon://appointment',
			nextWorkout:'sap-icon://create-entry-time',
			addWorkout:'sap-icon://add-activity',
			searchSplitWorkout:'sap-icon://group',
			addPromo:'sap-icon://add',
			addTemplate:'sap-icon://add',
			redeemPromo:'sap-icon://touch'
		},
		
		getDarkTheme:function(){
			return window.localStorage.getItem('darkTheme')?true:false;
		},
		
		setDarkTheme:function(flag){
			window.localStorage.removeItem('darkTheme');
			if (flag) window.localStorage.setItem('darkTheme','X');
		},
		
		getSystemBrowser:function(){
			return window.localStorage.getItem('systemBrowser')?true:false;
		},
		
		setSystemBrowser:function(flag){
			window.localStorage.removeItem('systemBrowser');
			if (flag) window.localStorage.setItem('systemBrowser','X');
		},
		
		getWorkoutLayout:function(){
			return window.localStorage.getItem('oldWorkoutLayout')?true:false;
		},
		
		setWorkoutLayout:function(flag){
			window.localStorage.removeItem('oldWorkoutLayout');
			if (flag) window.localStorage.setItem('oldWorkoutLayout','X');
		},
		
		getTutorialWatched:function(){
			return window.localStorage.getItem('tutorialWatched')?true:false;
		},
		
		setTutorialWatched:function(flag){
			window.localStorage.removeItem('tutorialWatched');
			if (flag) window.localStorage.setItem('tutorialWatched','X');
		},
		
	};

});