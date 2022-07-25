sap.ui.define([ "ru/fitrepublic/shared/controller/BaseController", "ru/fitrepublic/shared/appMgr",
	"ru/fitrepublic/shared/model/coachPromosDialog",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/GroupHeaderListItem"
], function (Controller, AppMgr, PromoDlg, JSONModel, Filter, GroupHeaderListItem) {
	"use strict";

	return Controller.extend("ru.fitrepublic.ui5_coachApp.controller.MyPromos", {
		
		onInit: function() {
			this.getRouter().getRoute("promos").attachMatched(this.onRouteMatched, this);
			this.filterFields=["id","description","clientName","gymName"];
			this.listName="promoList";
			this.getView().setModel(new JSONModel({
				filters:[{
					key:'purchaseType', title:this.geti18n('promoType'),
					values:[
						{ key:'O', text:this.geti18n('promoType_O') },
						{ key:'G', text:this.geti18n('promoType_G') }
					]
				},{
					key:'redeemed', title:this.geti18n('promoRedeemed'),
					values:[
						{ key:'0', text:this.geti18n('promoRedeemed_0') },
						{ key:'1', text:this.geti18n('promoRedeemed_1') }
					]
				}]
			}));
		},
		
		onRouteMatched:function(e){
			this.getItemsBindingFor(this.listName).refresh(true);
		},
		
		formatType:function(typeCode){
			return this.geti18n('promoType_'+typeCode);
		},
		
		formatActivated:function(activated){
			return this.geti18n('promoRedeemed_'+activated);
			// return this.geti18n('promoRedeemed')+': '+this.geti18n('promoRedeemed_'+activated);
		},
		
		formatState:function(typeCode){
			if (typeCode=='O') return 'Success';
			if (typeCode=='G') return 'Warning';
			return 'Error';
		},
		
		confirmFilters:function(e){
			var filters=[];
			var lists = e.getSource().getLists().filter(function(l) { return l.getSelectedItems().length; });
			if (lists.length) {
				filters = new Filter(lists.map(function(l) {
					return new Filter(l.getSelectedItems().map(function(i) {
						return new Filter(l.getKey(), "EQ", i.getKey());
					}), false);
				}), true);
			}
			this.getItemsBindingFor(this.listName).filter(filters);
		},
		
		resetFilters:function(e){
			e.getSource().getLists().forEach(function(l){ l.setSelectedKeys(); });
			this.getItemsBindingFor(this.listName).filter([]);
		},

		handleSearch:function(e){
			var filters=[];
			var val=e.getParameter("query");
			if (val) {
				filters.push( new Filter(this.filterFields.map(function(f) {
					return new Filter({ path:f,  operator:"Contains",  value1:val, caseSensitive:false });
					}), false));
			}
			this.getItemsBindingFor(this.listName).filter(filters);
		},
		
		displayPromo:function(e){
			var promo=e.getSource().getBindingContext("odata").getObject();
			if (promo.redeemed) this.getRouter().navTo("client",{id:promo.clientId});
			else PromoDlg.open(this.getView(), promo.id).then(function(newData){
				// console.log(newData);
			}).catch(function(err){
				// console.log(err);
			});
		},
		
		addPromo:function(pars,e){
			var items=this.getItemsBindingFor(this.listName);
			PromoDlg.open(this.getView()).then(function(promoCode){
				items.refresh(true);
			}).catch(function(err){
				// console.log(err);
			});
		}
		
	});
});