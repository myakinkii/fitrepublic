const { errors } = require('./constants');
const cds = require("@sap/cds");

function getNewWhereFrom(where){
	var search,fields=[];
	var refs={},refVal;
	function goWhere(parts){
		parts.forEach(function(part){
			if (part.ref) { 
				refVal=part.ref[0];
				refs[refVal]=null;
			}
			if (part.val && refVal){
				refs[refVal]=part.val;
				refVal=null;
			}
			if (typeof part==='string') return;
			if (part.xpr) goWhere(part.xpr);
			if (part.func && part.func=='contains') {
				part.args.forEach(function(arg){
					if (arg.func && arg.func=='toupper') {
						fields.push(arg.args[0].ref[0]);
					}
					if (arg.val){
						if (!search) search=arg.val.toLowerCase();
					}
				});
			}
		});
	}
	goWhere(where);

	var like="";
	if (fields && search) {
		var searchCapital=search[0].toUpperCase() + search.substring(1);		
		like= "( " +
			fields.map(f => f+" like '%"+search+"%'").join(" or ") +
		" or "+
			fields.map(f => f+" like '%"+searchCapital+"%'").join(" or ") +
		" )";
	}

	var filter=[];
	for (var f in refs) filter.push(typeof refs[f]=='string' ? f+"='"+refs[f]+"'" : f+"="+refs[f] );

	return { like:like, filter:filter.join(" and ")};
}

function getNewClientsSearch(where){
	var newQuery="SELECT from CoachClients { * }";
	var search=getNewWhereFrom(where);
	var where=[];
	if (search.filter || search.like) {
		where.push(" where");
		if (search.filter) where.push(search.filter);
		if (search.filter && search.like) where.push("and");
		if (search.like) where.push(search.like);
		newQuery+=where.join(" ");
	}
	return cds.parse.cql(newQuery);
}

function getNewWorkoutsSearch(where){
	var newQuery="SELECT from ClientWorkouts { * }";
	var search=getNewWhereFrom(where);
	var where=[];
	if (search.filter || search.like) {
		where.push(" where");
		if (search.filter) where.push(search.filter);
		if (search.filter && search.like) where.push("and");
		if (search.like) where.push(search.like);
		newQuery+=where.join(" ");
	}
	return cds.parse.cql(newQuery);
}

function getNewContentSearch(where,owner){

	var newQuery="SELECT from Content { category, author.name, title, subtitle, description }"+
		" where contentType = 'V' and description != '#deleted'";

	if (owner){
		newQuery+=" and ( author_id = "+"'"+owner+"' or author_id is null )" ;
	} else {
		newQuery+=" and author_id is not null";
	}

	var search=getNewWhereFrom(where);
	if (search.like) newQuery+=" and "+search.like;

	return cds.parse.cql(newQuery);
}

function searchStuff(query,profile,srv,tx){
	const like='%'+(query||'').toLowerCase()+'%';
	// const tx = srv.transaction();
	const ns=srv.services["db"].namespace;
	// srv is db, but does not have a namespace for some reason
	// const ns=srv.namespace; // undefined;
	const searches=[{
		q:function(profile){ return cds.parse.cql(
			"SELECT from "+ns+".Coaches { id, name, nickName }"+
			"where visible = true and ( lower(name) like '"+like+"' or lower(nickName) like '"+like+"' )"
		)},
		f:function(i){ return {
			objectType:'coach', id:i.id, 
			title:i.name, intro:i.nickName
		}}
	// },{
		// q:function(profile){ return cds.parse.cql(
		// 	"SELECT from Gyms { id, name, address_addressLine as addr }"+
		// 	"where lower(name) like '"+like+"' or lower(address_addressLine) like '"+like+"'"
		// )},
		// f:function(i){ return {
		// 	objectType:'gym', id:i.id, 
		// 	title:i.name, intro:i.addr
		// }}
	// },{
		// q:function(profile){ return cds.parse.cql(
		// 	"SELECT from Purchases { id, state, type, quantity, templateName, coach.name as coach_name, gym.name as gym_name }"+
		// 	"where owner.id='"+profile.id+"' and ( lower(coach.name) like '"+like+"' or lower(gym.name) like '"+like+"' or lower(templateName) like '"+like+"' )"
		// )},
		// f:function(i){
		// 	if (i.type=='S') return {
		// 		objectType:'subscription', id:i.id, typeAttribute:i.type,
		// 		title: i.templateName, intro:i.coach.coach_name+' @ '+i.gym.gym_name
		// 	};
		// 	return {
		// 		objectType:'purchase', id:i.id, typeAttribute:i.type,
		// 		title:i.quantity, intro:i.coach.coach_name+' @ '+i.gym.gym_name
		// 	};
		// }
	},{
		q:function(profile){ return cds.parse.cql(
			"SELECT from "+ns+".Workouts as W "+
			"left join "+ns+".Clients as Cl on W.client_id=Cl.id"+
			" left join "+ns+".Coaches as Ch on W.coach_id=Ch.id "+
			"{ W.id, W.description, Ch.name as coachName, W.timestamp }"+
			"where Cl.id='"+profile.id+"' and ( lower(W.description) like '"+like+"' or lower(Ch.name) like '"+like+"' )"
		)},		
		// q:function(profile){ return cds.parse.cql(
		// 	"SELECT from Workouts { id, description, purchase.coach.name, timestamp }"+
		// 	"where purchase.owner.id='"+profile.id+"' and ( lower(description) like '"+like+"' or lower(purchase.coach.name) like '"+like+"' )"
		// )},		
		f:function(i){ return {
			objectType:'workout', id:i.id, typeAttribute:i.description||'',
			title:i.timestamp, intro:i.coachName
		}}
	},{
		q:function(profile){ return cds.parse.cql(
			"SELECT from "+ns+".Templates as T "+
			"left join "+ns+".Coaches as Ch on T.coach_id=Ch.id "+
			"{ T.id, T.type, T.name, T.category, Ch.name as coachName}"+
			"where T.type='S' and ( lower(T.name) like '"+like+"' or lower(T.category) like '"+like+"' )"
		)},
		// q:function(profile){ return cds.parse.cql(
		// 	"SELECT from Templates { id, type, name, category, coach.name as coach_name}"+
		// 	"where type='S' and ( lower(name) like '"+like+"' or lower(category) like '"+like+"' )"
		// )},
		f:function(i){ return {
			objectType:'template', id:i.id,
			title:[i.category, i.name].join(", "), intro:i.coachName
		}}
	},{
		q:function(profile){ return cds.parse.cql(
			"SELECT from "+ns+".Content as C "+
			"left join "+ns+".Coaches as Ch on C.author_id=Ch.id"+
			"{ C.id, C.title, C.subtitle, C.description, C.category, C.contentType, C.url, Ch.id as authorId, Ch.name as authorName }"+
			"where Ch.visible = true and "+
			"( lower(C.title) like '"+like+"' "+
			"or lower(C.subtitle) like '"+like+"' "+
			// "or lower(C.description) like '"+like+"' "+
			"or lower(C.category) like '"+like+"' )"
		)},
		// q:function(profile){ return cds.parse.cql(
		// 	"SELECT from Content { id, title, subtitle, description, category, contentType, url, author_id as authorId, author.name }"+
		// 	"where author.visible = true and "+
		// 	"( lower(title) like '"+like+"' "+
		// 	"or lower(subtitle) like '"+like+"' "+
		// 	// "or lower(description) like '"+like+"' "+
		// 	"or lower(category) like '"+like+"' )"
		// )},
		f:function(i){ return {
			objectType:'content', id:i.id, typeAttribute:i.contentType, authorId:i.authorId,
			title:[i.category, i.title, i.subtitle].join(", "), intro:i.authorName, url:i.url
		}}
	}];
	return Promise.all(searches.map(function(obj){
		return tx.run(obj.q(profile)); 
	})).then(function(results){
		var data={ results:[] };
		searches.forEach(function(obj,i){ 
			results[i].reduce(function(prev,cur){
				var item=obj.f(cur);
				if (!data[item.objectType]) data[item.objectType]=0;
				prev[item.objectType]++;
				prev.results.push(item);
				return prev;
			},data);
		});
		return Promise.resolve(data);
	});
}

function getPromoData(profile,srv,tx){
	
	const { Coaches, Gyms } = srv.entities;
	// const tx = srv.transaction();
	
	const latestCoach=SELECT.one(Coaches).columns('id','name','nickName','createdAt').where({
		createdAt:{ "<": (new Date()).toJSON() }, and:{ visible:true}
	}).orderBy({createdAt:'desc'});
	
	// const latestGym=SELECT.one(Gyms).columns('id','name', 'address_addressLine as addr','createdAt').where({
	// 	createdAt:{ "<": (new Date()).toJSON() }
	// }).orderBy({createdAt:'desc'});
	
	return Promise.all([ tx.run(latestCoach)/*, tx.run(latestGym) */]).then(function(res){
		const coach=res[0], gym=res[1];
		var options=[];
		if (coach){
			options.push({
				createdAt:coach.createdAt,
				text: coach.name+(coach.nickName?" ("+coach.nickName+")":""),
				image:'shared/images/promo2.jpg',
				parameters:{ dst:"promo", vars:{type:'coach', id:coach.id} }
			});
		}
		if (gym){
			options.push({
				createdAt: gym.createdAt,
				text: gym.name+" ("+gym.addr+")",
				image:'shared/images/promo2.jpg',
				parameters:{ dst:"promo", vars:{type:'gym', id:gym.id} }
			});
		}
		return Promise.resolve({options:options});
	});
}

module.exports={
	getPromoData:getPromoData,
	searchStuff:searchStuff,
	getNewContentSearch:getNewContentSearch,
	getNewWorkoutsSearch:getNewWorkoutsSearch,
	getNewClientsSearch:getNewClientsSearch
};