# Private API Auth

## Supported kinds of authentication

- Username & Password
- LDAP
- SAML
- OAuth2
- GitLab
- GitHub
- Facebook
- Twitter
- Dropbox
- Google

## How the authentication works

The backend is called either directly from the frontend or via an OAuth provider. The different routes that handle different kinds of authentication perform any kind of verification needed and then create a JWT. This JWT is than provided via the [authorization header's bearer scheme](https://datatracker.ietf.org/doc/html/rfc6750#section-2.1) with each subsequent call to the private api by the frontend (until it expires or the user logs out). The JwtAuthGuard, which is added to each other controller method of the private api, checks if the provided JWT is still valid and provides the controller method with the correct user.
