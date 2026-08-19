# Security Specification

## 1. Data Invariants
- `employees`: Stores staff members. Can be read by any verified user. Can only be created/updated by admins.
- `books`: Stores books. Can be read by any verified user. Can only be created/updated by admins.
- `loans`: Stores book loans. Can be read by any verified user. Can only be created/updated by admins.
- `suggestions`: Stores book suggestions. Can be read by any verified user. Can be created by any verified user. Votes can be updated by any verified user. Admins can update status to 'purchased'.
- `admins`: Stores admin users by UID.

## 2. Dirty Dozen Payloads
(Assuming Google Auth is used for all users)
1. Unauthenticated read to `employees` -> DENY
2. Non-admin write to `employees` -> DENY
3. Unauthenticated read to `books` -> DENY
4. Non-admin write to `books` -> DENY
5. Unauthenticated read to `loans` -> DENY
6. Non-admin write to `loans` -> DENY
7. Unauthenticated read to `suggestions` -> DENY
8. Unauthenticated write to `suggestions` -> DENY
9. Non-admin updating suggestion status -> DENY
10. Valid user creating a suggestion -> ALLOW
11. Valid user updating suggestion voters -> ALLOW
12. Admin updating suggestion status -> ALLOW

## 3. Test Runner
Will be implemented in `firestore.rules.test.ts`
