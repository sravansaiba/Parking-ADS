// Route constants for user-related API calls.
// These are used as keys/identifiers for caching, logging, or
// any route-based middleware you have in place.

export const USER_ROUTES = {
  CREATE_STAFF: "users/create-staff",
  LIST_STAFF: "users/list-staff",
  DELETE_STAFF: "users/delete-staff",
  CHANGE_PASSWORD: "users/change-password",
} as const;