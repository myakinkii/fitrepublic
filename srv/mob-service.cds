using { ru.fitrepublic.base as base } from '../db/base';
using { ru.fitrepublic.views as views } from '../db/views';

service PublicService @(path:'/public') {

  entity ShortLinks as projection on base.ShortLinks;
  @readonly entity Settings as projection on base.Settings;
  @readonly entity EquipmentVideos as SELECT from views.EquipmentVideos {
    *, 
    key id,
    key linkId,
  } order by linkId;
}

service CoachService @(path:'/coach') {

  @readonly entity Settings as projection on base.Settings;
  
  @readonly entity Content as projection on base.Content;
  //@readonly entity Purchases as projection on base.Purchases { *, owner : redirected to Clients }; // tmp
  //@readonly entity CoachBilling as projection on base.CoachBilling { *, purchase : redirected to Purchases }; // tmp
  @readonly entity Gyms as projection on base.Gyms;
  @cds.redirection.target: true
  @readonly entity Clients as projection on base.Clients;

  @readonly entity V_Calendar as projection on views.V_Calendar;
  
  @readonly entity ClientWorkouts as SELECT from views.ClientWorkouts {
    *, 
    key clientId, 
    key workoutId
  } where workoutId is not null;
  
  @readonly entity CoachClients as SELECT from ClientWorkouts { 
    key clientId,
    clientNickName,
    coachId,
    max(workoutDate) as recentWorkout:Timestamp,
    max(case when purchaseType = 'R' then 1 else 0 end) as purch_R:Integer,
    max(case when purchaseType = 'O' then 1 else 0 end) as purch_O:Integer,
    max(case when purchaseType = 'G' then 1 else 0 end) as purch_G:Integer,
    max(case when purchaseType = 'S' then 1 else 0 end) as purch_S:Integer,
    count(workoutId) as workouts:Integer
  } group by clientId, clientNickName, coachId;
  
  @readonly entity CoachClientsPurchase as SELECT from ClientWorkouts AS W 
  left join views.ClientPurchases AS R on R.coachId=W.coachId and R.clientId=W.clientId and R.purchaseType='R'
  left join views.ClientPurchases AS O on O.coachId=W.coachId and O.clientId=W.clientId and O.purchaseType='O'
  left join views.ClientPurchases AS G on G.coachId=W.coachId and G.clientId=W.clientId and G.purchaseType='G'
  left join views.ClientPurchases AS S on S.coachId=W.coachId and S.clientId=W.clientId and S.purchaseType='S'
  distinct {
    key W.clientId,
    W.clientNickName,
    W.coachId,
    R.purchaseId as RPid,
    R.purchaseDescr as RPdescr,
    R.purchaseQty as RPqty,
    R.purchaseExpDate as RPexp,
    O.purchaseId as OPid,
    O.purchaseDescr as OPdescr,
    O.purchaseQty as OPqty,
    O.purchaseExpDate as OPexp,
    G.purchaseId as GPid,
    G.purchaseDescr as GPdescr,
    G.purchaseQty as GPqty,
    G.purchaseExpDate as GPexp,
    S.purchaseId as SPid,
    S.purchaseDescr as SPdescr,
    S.purchaseQty as SPqty,
    S.purchaseExpDate as SPexp
  };
  
  @readonly entity CoachClientsTotal as SELECT from CoachClients {
    key coachId,
    count(clientId) as clients:Integer,
    sum(workouts) as total:Integer,
  } group by coachId;
  
  @readonly entity CoachPublishedPrograms as SELECT from Templates {
    key coach.id as coachId,
    count(id) as programs:Integer,
    sum(subscriptionsCount) as subscribers:Integer
  } where type='S' group by coach.id;
  
  entity CoachesToGyms as projection on base.CoachesToGyms;
  
  entity CoachNotes as projection on base.CoachNotes { *, client : redirected to Clients };
  
  entity Promos as projection on base.Promos;
  function createPromo (promoType: String, description: String) returns String(8);

  @cds.redirection.target: true
  entity Workouts as projection on base.Workouts { *, purchase : redirected to Purchases, client : redirected to Clients };
  entity WorkoutsToContent as projection on base.WorkoutsToContent;
  entity Excercises as projection on base.Excercises;
  
  entity Templates as projection on base.Templates;
  entity WorkoutTemplates as projection on base.WorkoutTemplates;
  entity ExcerciseTemplates as projection on base.ExcerciseTemplates;
  
  @readonly entity Chats as projection on base.Chats;
  entity ChatMessages as projection on base.ChatMessages;
  
  function cloneWorkout (template_id: UUID, workout_id: UUID ) returns UUID;
  function createChatMessage (channelId : UUID, text:String) returns UUID;
  function createWorkout (purchase_id: UUID, template_id: UUID, timestamp:Timestamp ) returns UUID;
  
  function addPayment (purchase_id:UUID, quantity: Integer, cost:Integer) returns UUID; // tmp
  entity Purchases as projection on base.Purchases { *, owner : redirected to Clients }; // tmp
  entity Payments as projection on base.Payments { *, purchase : redirected to Purchases }; // tmp
  entity CoachBilling as projection on base.CoachBilling { *, purchase : redirected to Purchases }; // tmp

  entity Profiles as SELECT from base.Coaches {
    *
  } excluding { createdBy, modifiedBy };
 
  view MyMoney as select from CoachBilling {
    key coach.id, sum(amount) as money:Integer, 0 as target:Integer
  } where state='P' group by coach.id;
  
  view MyPromos as SELECT from views.V_Promos {
    *,
    key id
  } order by createdAt desc;
  
  view MyPromosCount as select from MyPromos {
    key coachId, 
    sum (redeemed) as activated:Integer,
    count(id) as total:Integer
  } group by coachId;

  // even though this is a view with different cardinality, we still need "redirected to Purchases" clause in Workouts
  view MyClients as select from Purchases { 
    key owner.id as clientId, 
    owner.nickName as nickName, 
    coach.id as coachId, 
    count(id) as purchases:Integer, 
    sum(cost) as money:Integer
  } where state='A' 
	group by owner.id,owner.nickName,coach.id 
	// group by owner.id,owner.nickName
	order by coachId, money desc;
	
  view MyChatChannels as select from Purchases {
    id, type, chatChannel.channelId, coach.id as coach_id, owner.id as owner_id,
    case when description is null then gym.name else description end as gymName:String,
    owner.nickName as ownerNick, coach.nickName as coachNick,
    owner.nickName as displayName
  } order by type, displayName, gymName;

  view MyActivePurchases as select from Purchases { 
    id, state, type, purchaseDate, quantity, owner.id as owner_id, coach.id as coach_id, 
    case when description is null then gym.name else description end as gymName:String,
    owner.nickName as displayName, templateId, templateName
  };
  
  view MyWorkoutTemplates as select from WorkoutTemplates { 
    id, template.category, template.name, template.coach.id as coach_id, description
  } where template.type='P';  
  
  // view ActivePurchases (myId:UUID, state:String) as SELECT from base.Purchases {
  //   id, quantity, state, type, owner.id as owner_id, coach.id as coach_id, owner.nickName, coach.name
  // } where owner.id=:myId and state=:state;

}

service ClientService @(path:'/client') {
  
  @readonly entity Settings as projection on base.Settings;
  
  @readonly entity Content as projection on base.Content;
  //@readonly entity Coaches as projection on base.Coaches;
  //@readonly entity Coaches as select from base.Coaches {*} excluding { deviceId, authToken } where visible = true;
  @readonly entity V_Calendar as projection on views.V_Calendar;
  @readonly entity V_CoachesToGyms as projection on views.V_CoachesToGyms;
  @cds.redirection.target: true
  @readonly entity Coaches as select from base.Coaches {*} excluding { deviceId, authToken };
  @readonly entity CoachesToGyms as projection on base.CoachesToGyms;
  @cds.redirection.target: true
  @readonly entity Gyms as projection on base.Gyms;
  
  @readonly entity ClientWorkouts as SELECT from views.ClientWorkouts {
    *, 
    key clientId, 
    key workoutId
  } where workoutId is not null;
  
  @readonly entity ClientWorkoutsTotal as SELECT from views.ClientWorkouts {
    key clientId,
    count(workoutId) as total:Integer
  } group by clientId;
  
  @readonly entity ClientCoaches as SELECT from ClientWorkouts {
    key coachId,
    coachName,
    clientId,
    max(case when purchaseType = 'R' then 1 else 0 end) as purch_R:Integer,
    max(case when purchaseType = 'O' then 1 else 0 end) as purch_O:Integer,
    max(case when purchaseType = 'G' then 1 else 0 end) as purch_G:Integer,
    max(case when purchaseType = 'S' then 1 else 0 end) as purch_S:Integer,
    count(workoutId) as workouts:Integer
  } group by coachId, coachName, clientId;
  
  @readonly entity ClientPurchases as SELECT from views.ClientPurchases {
    *,
    key coachId,
    key purchaseType
  };
  
  entity Purchases as projection on base.Purchases { *, owner : redirected to Profiles };
  entity Payments as projection on base.Payments { *, purchase : redirected to Purchases };
  entity CoachBilling as projection on base.CoachBilling { *, purchase : redirected to Purchases };

  @cds.redirection.target: true
  entity Workouts as projection on base.Workouts { *, purchase : redirected to Purchases, client : redirected to Profiles };
  @readonly entity WorkoutsToContent as projection on base.WorkoutsToContent;
  entity Excercises as projection on base.Excercises;
  
  entity Promos as projection on base.Promos;
  
  entity ShortLinks as projection on base.ShortLinks;
  function shareObject (target: String, id: String) returns String(8);
  
  entity Templates as projection on base.Templates;
  @readonly entity WorkoutTemplates as projection on base.WorkoutTemplates;
  @readonly entity ExcerciseTemplates as projection on base.ExcerciseTemplates;
  
  entity Chats as projection on base.Chats
  entity ChatMessages as projection on base.ChatMessages;
  
  function redeemPromo (promo_id: String(8) ) returns UUID;
  function makeSubscription (template_id: UUID ) returns UUID;
  function makePurchase (coach_id : UUID, gym_id: UUID, purchaseType:String, quantity: Integer, cost:Integer) returns UUID;
  function addPayment (purchase_id:UUID, quantity: Integer, cost:Integer) returns UUID;
  function createWorkout (purchase_id: UUID, template_id: UUID, timestamp:Timestamp ) returns UUID;
  function cloneWorkout (template_id: UUID, workout_id: UUID ) returns UUID;
  function createChatMessage (channelId : UUID, text:String) returns UUID;
 
  view MyChatChannels as select from Purchases {
    id, type, chatChannel.channelId, coach.id as coach_id, owner.id as owner_id,
    case when description is null then gym.name else description end as gymName:String,
    owner.nickName as ownerNick, coach.nickName as coachNick,
    coach.name as displayName
  } order by type, displayName, gymName;
  
  view MyActivePurchases as select from Purchases { 
    id, state, type, purchaseDate, quantity, owner.id as owner_id, coach.id as coach_id, 
    // gym.name as gymName, 
    case when description is null then gym.name else description end as gymName:String,
    coach.name as displayName, templateId, templateName
  };  
  
  view MyWorkoutTemplates as select from views.PurchaseTemplate AS T left join views.TemplateWorkouts AS W on T.templateId=W.templateId {
    key T.clientId,
    key W.workoutId,
    W.workoutId as id, // for clone template
    T.purchaseId,
    T.templateName,
    T.templateName as name, // for clone template
    T.templateCat as category, // for clone template
    T.templateDescr,
    W.coachId,
    W.coachName,
    W.workoutDescr,
    W.workoutDescr as description // for clone template
  }; 

  @cds.redirection.target: true
  entity Profiles as SELECT from base.Clients {
    *,
    purchases : redirected to Purchases
  } excluding { createdBy, modifiedBy };

}