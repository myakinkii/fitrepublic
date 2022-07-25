const refreshInterval=1000*60*3;

var settings=null;

function getSettings(srv){
	if (settings) return Promise.resolve(settings);
	else return refreshSettings(srv);
}

function refreshSettings(srv){
	const { Settings } = srv.entities;
	const tx = srv.tx();
	return tx.read(Settings).orderBy('l1','l2','prop').then(function(settingsData){
		tx.commit();
		settings=settingsData.reduce(function(prev,cur){
			if (!prev[cur["l1"]]) prev[cur["l1"]]={};
			if (!prev[cur["l1"]][cur["l2"]]) prev[cur["l1"]][cur["l2"]]={};
			prev[cur["l1"]][cur["l2"]][cur["prop"]]=cur["val"];
			return prev;
		},{});
		setTimeout(function(){ refreshSettings(srv); },refreshInterval);
		return Promise.resolve(settings);
	}).catch(function(){ 
		tx.rollback();
		return Promise.reject({});
	});
}

module.exports.getSettings=getSettings;