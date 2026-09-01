import { createRemoteJWKSet, jwtVerify } from 'jose';

// Verifies Firebase Auth ID tokens without the Admin SDK / service account:
// Firebase ID tokens are standard JWTs signed with Google's rotating public
// keys, so we can validate them directly against Google's published JWKS.
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
const PROJECT_ID = 'mmg-quiz';
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export async function verifyIdToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  return payload;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Autenticazione richiesta' });

  verifyIdToken(token)
    .then((payload) => {
      req.uid = payload.sub;
      req.userEmail = payload.email;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: 'Sessione scaduta, effettua di nuovo il login' });
    });
}
