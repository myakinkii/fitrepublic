module.exports.errors={
	UNKNOWN_BACKEND_ERROR:'UNKNOWN_BACKEND_ERROR', // something went wrong
	NOT_ALLOWED:'NOT_ALLOWED', // not authorized to some action
	PROFILE_NOT_FOUND:'PROFILE_NOT_FOUND', // could not retrieve profile for auth data
	NOT_ENOUGH_ONBOARD_DATA:'NOT_ENOUGH_ONBOARD_DATA', // could not onboard
	ONBOARD_PROFILE_NOT_FOUND:'ONBOARD_PROFILE_NOT_FOUND', // coach onboarding profile not found
	GYM_NOT_FOUND:'GYM_NOT_FOUND', // could not find proper gym for a purchase
	TEMPLATE_NOT_FOUND:'TEMPLATE_NOT_FOUND', // could not find template
	TEMPLATE_ALREADY_SUBSCRIBED:'TEMPLATE_ALREADY_SUBSCRIBED', // forbid multiple subscriptions
	NOT_ENOUGH_FUNDS:'NOT_ENOUGH_FUNDS', // insufficient funds to do something		
	PROMOCODE_NOT_ELIGIBLE:'PROMOCODE_NOT_ELIGIBLE', // promo code is either incorrect or already redeemed
	PROMO_TYPE_ALREADY_ACTIVE:'PROMO_TYPE_ALREADY_ACTIVE', // promo code of that type already activated for that coach
	UNSUPPORTED:'UNSUPPORTED' // feature not yet supported
};