using { ru.fitrepublic.base as base } from '../db/base';
using { ru.fitrepublic.views as views } from '../db/views';

service AdminService @(path:'/admin') {

  entity Settings as projection on base.Settings;
  entity Clients as projection on base.Clients;
  entity Coaches as projection on base.Coaches;
  entity CoachesToGyms as projection on base.CoachesToGyms;
  entity Gyms as projection on base.Gyms;
  entity Equipment as projection on base.Equipment;
  entity EquipmentToContent as projection on base.EquipmentToContent;
  entity Content as projection on base.Content;
  
  entity Purchases as projection on base.Purchases;
  entity Payments as projection on base.Payments;
  entity CoachBilling as projection on base.CoachBilling;
  entity Workouts as projection on base.Workouts;
  entity Excercises as projection on base.Excercises;
  
  entity Promos as projection on base.Promos;
  function createPromoForCoach (coach_id: UUID ) returns String(8);
  
  entity Templates as projection on base.Templates;
  @readonly entity WorkoutTemplates as projection on base.WorkoutTemplates;
  @readonly entity ExcerciseTemplates as projection on base.ExcerciseTemplates;
  
  entity ShortLinks as projection on base.ShortLinks;
  function shareObject (target: String, id: String) returns String(8);
  
  @readonly entity SharedObjects as SELECT from views.SharedObjects {
    *, 
    key id
  };
}