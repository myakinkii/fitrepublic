using { ru.fitrepublic.base as base } from '../db/base';
namespace ru.fitrepublic.views;

entity V_Calendar as SELECT from base.Workouts {
  id, status, timestamp, durationHrs, durationFact, description, 
  purchase.description as pdescr, purchase.type, purchase.quantity,
  purchase.gym.name as gymName,
  coach.name as coachName, coach.id as coachId,
  client.nickName as clientName, client.id as clientId
};

entity V_CoachesToGyms as SELECT from base.Coaches {
  id as coach_id,
  gyms.gym.id as gym_id,
  gyms.gym.type as gym_type
};

entity V_Promos as select from base.Promos as P
  left join base.Clients as C on C.id=P.clientId 
  left join base.Gyms as G on G.id=P.gymId {
  P.id,
  P.purchaseType,
  P.description,
  P.quantity,
  P.cost,
  P.coachId,
  P.clientId,
  P.createdAt,
  P.redeemDate,
  C.nickName as clientName,
  G.name as gymName,
  case when P.redeemDate is null then 0 else 1 end as redeemed:Integer
};

entity SharedObjects as SELECT from base.ShortLinks AS L
  left join base.Coaches AS C on C.linkId=L.id
  left join base.Templates AS T on T.linkId=L.id {
  L.id,
  L.viewCount,
  case when C.id is not null then 'coach' else 'template' end as type:String,
  case when C.id is not null then C.name else T.name || ' by ' || T.coach.name end as name:String
};

entity EquipmentVideos as SELECT from base.EquipmentToContent {
  content.id,
  content.url,
  content.title,
  content.subtitle,
  content.author.name as authorName,
  content.author.linkId as authorLink,
  equipment.description,
  equipment.gym.name as gymName,
  equipment.linkId
};

entity ClientWorkouts as SELECT from base.Clients {
  id as clientId,
  nickName as clientNickName,
  purchases.id as purchaseId,
  purchases.createdAt as purchaseDate,
  purchases.coach.id as coachId,
  purchases.coach.name as coachName,
  purchases.coach.nickName as coachNickName,
  purchases.type as purchaseType,
  purchases.description as purchaseDescr,
  purchases.workouts.id as workoutId,
  purchases.workouts.status as workoutStatus,
  purchases.workouts.description as workoutDescr,
  purchases.workouts.timestamp as workoutDate
};

entity SinglePurchases as SELECT from base.Purchases {
  owner.id as clientId,
  coach.id as coachId,
  type as purchaseType,
  min(createdAt) as timestamp
} group by owner.id, coach.id, type;

entity ClientAllPurchases as SELECT from base.Clients {
  id as clientId,
  nickName as clientNickName,
  purchases.id as purchaseId,
  purchases.createdAt as purchaseDate,
  purchases.coach.id as coachId,
  purchases.coach.name as coachName,
  purchases.coach.nickName as coachNickName,
  purchases.type as purchaseType,
  purchases.description as purchaseDescr,
  purchases.quantity as purchaseQty,
  purchases.expirationDate as purchaseExpDate,
};

entity ClientPurchases as SELECT from ClientAllPurchases AS AP 
  inner join SinglePurchases AS P on P.coachId=AP.coachId and P.clientId=AP.clientId and P.purchaseType=AP.purchaseType {
  AP.coachId,
  AP.clientId,
  AP.clientNickName,
  AP.coachName,
  AP.coachNickName,
  AP.purchaseId,
  AP.purchaseType,
  AP.purchaseDate,
  AP.purchaseDescr,
  AP.purchaseQty,
  AP.purchaseExpDate
} where AP.purchaseDate=P.timestamp;
//  group by AP.coachId, AP.purchaseType, AP.purchaseId, AP.purchaseDate, P.timestamp, AP.coachName, AP.clientId;

entity PurchaseTemplate as SELECT from base.Purchases AS P left join base.Templates AS T on P.templateId=T.id {
  P.id as purchaseId,
  T.id as templateId,
  P.owner.id as clientId,
  T.category as templateCat,
  T.name as templateName,
  T.description as templateDescr,
} where P.type='S';

entity TemplateWorkouts as Select from base.Templates {
	id as templateId,
	coach.id as coachId,
	coach.name as coachName,
	workouts.id as workoutId,
	workouts.description as workoutDescr
} where type='S';

// entity ClientTemplates as SELECT from base.WorkoutTemplate{
//   purchases : Association to base.Purchases on purchases.templateId = template.id
// };