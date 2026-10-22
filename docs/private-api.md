# Private API contract

Next App Router JSON endpoints at `${basePath}/api/...`; preview basePath `/private`, dedicated production basePath empty. Same origin only. Errors `{error: string}` with 400, 401, 403, 409, 429 or 503. Requests JSON. No CORS. All responses no-store. Never persist credentials in browser storage.

- GET `/api/status`: `{configured:boolean}`. No auth.
- POST `/api/auth/options` body `{purpose?: "login"|"reauth"}` -> SimpleWebAuthn Authentication options JSON directly.
- POST `/api/auth/verify` body `{response: AuthenticationResponseJSON}` -> `{ok:true}`; rotates login session; reauth refreshes confirmation.
- POST `/api/invite/options` body `{token:string}` -> Registration options JSON. Token only in POST body. Invitation links use fragment `#token=...`; UI immediately clears fragment and holds token in memory.
- POST `/api/invite/verify` body `{response:RegistrationResponseJSON,name:string}` -> `{ok:true}`.
- POST `/api/logout` body `{}` -> `{ok:true}`.
- GET `/api/account`: `{user:{id,name,role},passkeys:[{id,name,created_at}],sessions:[{id,created_at,expires_at,current}]}`
- POST `/api/passkeys/options` body `{}` -> Registration options (fresh passkey reauth required).
- POST `/api/passkeys/verify` body `{response:RegistrationResponseJSON,name:string}` -> `{ok:true}`.
- PATCH `/api/passkeys/:id` body `{name:string}` -> `{ok:true}` (reauth required).
- DELETE `/api/passkeys/:id` -> `{ok:true}` (reauth; last key prohibited).
- DELETE `/api/sessions/:id` -> `{ok:true}` (reauth; current session allowed).
- GET `/api/tools`: `{tools:[{id,name,provider,description,url,access_type,instructions}],vaultConfigured:false}`. Only authorized tools.
- GET `/api/admin`: `{users:[{id,name,role,blocked}],groups:[{id,name}],memberships:[{user_id,group_id}],tools:[tool],grants:[{id,tool_id,user_id,group_id}],invitations:[{id,name,expires_at,used_at}]}` (admin).
- POST `/api/admin/invitations` `{name:string}` -> `{url:string}` (admin + reauth; single-use 1 hour invitation URL shown once).
- DELETE `/api/admin/invitations/:id` -> `{ok:true}` (revokes).
- PATCH `/api/admin/users/:id` `{blocked:boolean}` -> `{ok:true}` (cannot block self; revokes sessions when blocking).
- POST `/api/admin/groups` `{name:string}` -> `{ok:true}`.
- DELETE `/api/admin/groups/:id` -> `{ok:true}`.
- POST `/api/admin/memberships` `{userId:string,groupId:string}` -> `{ok:true}`.
- DELETE `/api/admin/memberships` same JSON -> `{ok:true}`.
- POST `/api/admin/tools` `{name,provider,description,url,access_type,instructions}` -> `{ok:true}`.
- PATCH `/api/admin/tools/:id` same full object -> `{ok:true}`.
- DELETE `/api/admin/tools/:id` -> `{ok:true}`.
- POST `/api/admin/grants` `{toolId:string,userId?:string,groupId?:string}` (exactly one target) -> `{ok:true}`.
- DELETE `/api/admin/grants/:id` -> `{ok:true}`.

All admin mutations require reauth within 5 minutes; UI provides “Mit Passkey bestätigen” and then retries manually. URL allows HTTPS only, no credentials. access_type: `own_account`, `team_seat`, `permitted_shared`. No passwords, provider keys or secrets. Tools initially empty. Browser call SimpleWebAuthn `startAuthentication({optionsJSON})` / `startRegistration({optionsJSON})`. Cancel/unsupported errors must be understandable German text. No fallback login.
