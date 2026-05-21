# Security Specification - SafeWalker

## Data Invariants
1. **User Identity Isolation**: A user can only write to their own profile in `/users/{userId}`.
2. **Role Immortality**: Users cannot set or modify their own `role` field.
3. **Hazard Authenticity**: Hazards must have a `reporterId` that matches the authenticated user's UID.
4. **CreatedAt Integrity**: Timestamps must be server-generated.
5. **Admin Supremacy**: Users in the `/admins` collection can delete or modify any hazard.
6. **Public Safety**: All authenticated users can read hazards and other user's public info (excluding PII if we had any).

## The Dirty Dozen Payloads (Rejection Targets)

1. **Identity Spoofing**: User A trying to update User B's profile.
2. **Privilege Escalation**: User trying to set `{ "role": "admin" }` on their own profile.
3. **Shadow Field Injection**: Adding an unrequested `isAdmin: true` field to a hazard report.
4. **Reporter Impersonation**: Submitting a hazard with a `reporterId` belonging to another user.
5. **Timestamp Backdating**: Submitting a hazard with a manual `createdAt` string instead of `serverTimestamp()`.
6. **Malicious ID injection**: Trying to create a hazard with a 1MB string as the document ID.
7. **Resource Poisoning**: Submitting a hazard description that is 1MB in size.
8. **Admin Collection Probing**: Non-admins trying to write to the `/admins` collection.
9. **Hazard Hijacking**: User A trying to delete a hazard reported by User B.
10. **State Corruption**: Updating a hazard type to an invalid value like "EverythingIsFine".
11. **Orphaned Writes**: Creating a hazard that refers to a non-existent reporterId (though we usually check auth.uid).
12. **Blanket Read scraping**: Unauthenticated user trying to list all hazards.
