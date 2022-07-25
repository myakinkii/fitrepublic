using { managed, sap } from '@sap/cds/common';
namespace ru.fitrepublic.base;

entity Settings : managed {
  key l1 : String;
  key l2 : String;
  key prop : String;
  val : String;
}

aspect MobileAuth {
  deviceId : String(64);
  authToken : String(64);
}

type LinkType : String enum {
  coach = 'C';
  program = 'P';
  equipment = 'E';
}

entity ShortLinks : managed {
  key id : String(8);
  baseUrl: String(200);
  pars : String(200) not null;
  viewCount : Integer default 0;
  linkType : LinkType default null;
}

entity Equipment : Shareable, managed {
  key id : UUID;
  gym : Association to Gyms;
  content : Association to many EquipmentToContent on content.equipment = $self;
  description : String(50);
}

entity EquipmentToContent {
  key equipment : Association to Equipment;
  key content : Association to Content;
}

aspect Shareable {
  shared : Boolean default false;
  coverUrl : String(200) default null;
  linkId : String(8) default null;
}

entity Clients : managed, MobileAuth {
  key id : UUID;
  nickName : String(20);
  age : Integer default null;
  purchases : Association to many Purchases on purchases.owner = $self;
}

entity Coaches : managed, MobileAuth, Shareable {
  key id : UUID;
  nickName : String(20);
  name : String(100);
  bio : String(500);
  visible: Boolean default false;
  gyms : Association to many CoachesToGyms on gyms.coach = $self;
  templates : Association to many Templates on templates.coach = $self;  
  content : Association to many Content on content.author = $self;
  activities : Association to many CoachesToActivities on activities.coach = $self;
}

entity CoachesToActivities {
  key coach : Association to Coaches;
  key activity : ActivityTypes;
}

type ActivityTypes : String enum { yoga; body; iron; crossfit; weight; }

entity Content : managed {
  key id : UUID;
  author : Association to Coaches;
  contentType : ContentType default 'V';
  url : String(200) not null;
  title : String(100) not null;
  subtitle : String(100);
  description : String(500);
  category : String(50);
}

type ContentType : String enum {
  video = 'V';
  audio = 'A';
  picture = 'P';
}

type GymType : String enum {
  regular = 'R';
  online = 'O';
  gym = 'G';
}

entity Gyms : managed, Shareable {
  key id : UUID;
  name : String(100);
  type : GymType default 'R';
  address : Address;
  description : String(500);
  coaches : Association to many CoachesToGyms on coaches.gym = $self;
  equipment : Association to many Equipment on equipment.gym = $self;
}

type Address {
  countryCode : String(2);
  city : String(100);
  zipCode : String(6);
  addressLine : String(100);
  timezone : Integer;
}

entity CoachesToGyms {
  key coach : Association to Coaches;
  key gym : Association to Gyms;
}

type TemplateType : String enum {
  private = 'P';
  shared = 'S';
}

entity Templates : managed, Shareable {
  key id : UUID;
  coach : Association to Coaches;
  type : TemplateType default 'P';
  name : String(100) not null;
  description : String(500);
  category : String(50);
  workouts : Association to many WorkoutTemplates on workouts.template = $self;
  workoutsCount : Integer default 0;
  subscriptionsCount : Integer default 0;
}

entity WorkoutTemplates : managed {
  key id : UUID;
  description : String(50) not null;
  template : Association to Templates;
  excercises : Association to many ExcerciseTemplates on excercises.workout = $self;
}

entity ExcerciseTemplates : ExcerciseBase, managed {
  key id : UUID;
  workout : Association to WorkoutTemplates;
}

entity Excercises : ExcerciseBase, managed {
  key id : UUID;
  workout : Association to Workouts;
}

aspect ExcerciseBase {
  //key id : UUID;
  //workout : Association to Workouts;
  video : Association to Content;
  name : String(100) not null;
  exNum : Integer not null default 1;
  setNum : Integer;
  repeat : Integer;
  warmup : String(100);
  target : String(100);
  targetComment : String(100);
  result : String(100);
  resultComment : String(100);
}

entity Purchases : managed {
  key id : UUID;
  owner : Association to Clients;
  coach : Association to Coaches;
  gym : Association to Gyms;
  chatChannel : Association to Chats;
  workouts : Association to many Workouts on workouts.purchase = $self;
  payments : Association to many Payments on payments.purchase = $self;
  coachBilling : Association to many CoachBilling on coachBilling.purchase = $self;
  activePaymentId : UUID default null;
  templateId : UUID default null;
  templateName: String(100) default null;
  description: String(100);
  quantity : Integer;
  cost : Integer;
  purchaseDate : Timestamp not null;
  expirationDate : Timestamp default null;
  state : States default 'I';
  type : PurchaseTypes default 'R';
}

entity Payments : managed {
  key id : UUID;
  purchase : Association to Purchases;
  client : Association to Clients;
  paymentDate : Timestamp default null;
  state : PaymentStates default 'P';
  cost : Integer;
  quantity : Integer;
  remainder : Integer default 0;
}

entity Promos : managed {
  key id : String(8);
  description: String(20);
  purchaseType : PurchaseTypes default 'O';
  quantity : Integer default 1;
  cost : Integer default 0;
  expirationDate: Timestamp default null;
  redeemDate : Timestamp default null;
  coachId : UUID default null;
  gymId : UUID default null;
  clientId : UUID default null;
  purchaseId: UUID default null;
}

entity CoachBilling : managed {
  key id : UUID;
  purchase : Association to Purchases;
  coach : Association to Coaches;
  billingDate : Timestamp default null;
  state : PaymentStates default 'P';
  amount : Integer;
}

type PaymentStates : String enum {
  pending = 'P';
  done = 'D';
  canceled = 'C';
  refund = 'R';
}

type States : String enum {
  active = 'A';
  inactive = 'I';
  expired = 'E';
  suspended = 'S';
}

type PurchaseTypes : String enum {
  regular = 'R';
  online = 'O';
  gym = 'G';
  solo = 'S';
}

aspect Schedulable : {
  timestamp : Timestamp not null;
  durationHrs : Integer default 2;
  status : ScheduleStatuses default 'S';
}

type ScheduleStatuses : String enum {
  scheduled = 'S';
  executed = 'E';
  canceled = 'C';
  rescheduled = 'R';
  unavailable = 'U';
}

entity Workouts : Schedulable, managed {
  key id : UUID;
  coach : Association to Coaches;
  client : Association to Clients;
  purchase : Association to Purchases;
  content : Association to many WorkoutsToContent on content.workout = $self; // obsolete
  excercises : Association to many Excercises on excercises.workout = $self;
  description : String(50);
  durationFact: Integer default 0;
  plan : TextMessages; // obsolete
  report : TextMessages; // obsolete
  comment : TextMessages; // obsolete
  rating : Integer default 5;
}

entity WorkoutsToContent {
  key workout : Association to Workouts;
  key content : Association to Content;
  pos : Integer not null default 1;
}

entity ScheduleSlots : Schedulable, managed {
  key id : UUID;
  // owner : Association to Users;
  ownerId : UUID;
}

type TextMessages {
  // author : Association to Users;
  authorId : UUID;
  text : String(256);
  timestamp : Timestamp;
}

entity ChatMessages {
  key id : UUID;
  channel : Association to Chats;
  message : TextMessages;
}

entity Chats {
  key channelId : UUID;
  messages : Association to many ChatMessages on messages.channel=$self;
}

entity CoachNotes {
  key coach : Association to Coaches;
  key client : Association to Clients;
  text : String(1000);
}
