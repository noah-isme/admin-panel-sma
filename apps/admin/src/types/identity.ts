/**
 * Shape returned by `authProvider.getIdentity`. Kept here so the attendance
 * pages agree on it instead of each declaring their own copy, and so
 * `useGetIdentity()` is never left inferring `{}` (which silently makes every
 * property access an error, or worse, an `any` after a cast).
 */
export type IdentityPayload = {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
  teacherId?: string;
  classId?: string;
};
