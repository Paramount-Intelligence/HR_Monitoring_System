# 08 Authentication and Session Flow

The system uses a secure JWT-based authentication mechanism designed to handle long-lived sessions while minimizing the risk of credential exposure.

## 1. Login Flow
1.  **Request**: User submits `email` and `password` to `POST /auth/login`.
2.  **Validation**: Backend hashes the input password and compares it with the stored `password_hash`.
3.  **Token Generation**:
    *   **Access Token**: Short-lived (e.g., 15 minutes). Contains user `id`, `role`, and permissions.
    *   **Refresh Token**: Longer-lived (e.g., 7 days). Stored in the database and linked to the user.
4.  **Response**: Both tokens are returned along with basic user profile data.
5.  **Frontend State**: The `AuthContext` stores the Access Token in memory and the Refresh Token in a secure, HTTP-only cookie (or secure local storage depending on environment configuration).

## 2. Token Refresh Flow
1.  **Trigger**: Access Token expires or is about to expire.
2.  **Request**: Frontend sends the Refresh Token to `POST /auth/refresh`.
3.  **Validation**: Backend verifies the Refresh Token is valid, hasn't expired, and exists in the DB.
4.  **Response**: A new Access Token (and optionally a rotated Refresh Token) is returned.
5.  **Failure**: If the Refresh Token is invalid or expired, the user is automatically logged out and redirected to the login page.

## 3. Account Invitation & Activation
1.  **Invite**: Admin/HR creates a user with `status=invited`. An invitation email is sent with a unique token.
2.  **Landing**: User clicks the link, leading to `/activate?token=...`.
3.  **Constraint**: The Activation page is public and **must not redirect** invited users to the login page before they have set their initial password.
4.  **Action**: User submits their password. Backend verifies the token, hashes the password, and sets `status=active`.
5.  **Completion**: User is redirected to login.

## 4. Password Reset
1.  **Request**: User enters email on Forgot Password page.
2.  **Token**: Backend generates a `PasswordResetToken` and sends an email.
3.  **Reset**: User provides a new password via the reset link. The token is invalidated after use.

## 5. Security States & Behavior
*   **Suspended Users**: If a user's status is `suspended` or `inactive`, all authentication attempts will fail, and existing sessions will be invalidated on the next token refresh.
*   **Role Protection**: Roles are baked into the JWT. Changing a user's role on the backend will not reflect in the frontend until the next token refresh or login.
*   **Logout**: `POST /auth/logout` invalidates the Refresh Token on the backend and clears all local storage/cookies on the frontend.

## 6. Frontend Auth Guard
The `AuthContext` provides a `hasPermission(perm)` helper and a `RoleGuard` component.
*   If an unauthenticated user tries to access a dashboard route, they are redirected to `/login`.
*   If an authenticated user tries to access a route restricted to a higher role, they are redirected to `/unauthorized`.

## 7. Debugging Auth Issues
*   **401 Unauthorized**: Check if the Access Token has expired.
*   **403 Forbidden**: Check if the user has the required Role/Permission for the specific resource.
*   **"Network Error" on Login**: Usually indicates a backend crash or CORS misconfiguration.
*   **Redirect Loop**: Often caused by the Activation page trying to enforce an Auth Guard before the user is actually active.
