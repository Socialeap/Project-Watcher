// Global types for Google APIs
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Fallback constant - valid if hardcoded, ignored if passed dynamically
export const HARDCODED_CLIENT_ID = '562552051436-h4gscbba3gu45b5sq1g7obb98cugh3gt.apps.googleusercontent.com'; 

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleClient = async (clientId: string, updateSigninStatus: (signedIn: boolean) => void) => {
  const sanitizedClientId = clientId.trim();
  console.log("Initializing Google Client...", { origin: window.location.origin });

  return new Promise<void>((resolve, reject) => {
    const gapiLoadPromise = new Promise<void>((resolveGapi) => {
      if (!window.gapi) {
        console.error("GAPI not found");
        return;
      }
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;
          resolveGapi();
        } catch (err) {
            console.error("GAPI Init Error", err);
            resolveGapi(); 
        }
      });
    });

    const gisLoadPromise = new Promise<void>((resolveGis) => {
      if (!window.google) {
        console.error("Google GIS not found");
        return;
      }
      try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: sanitizedClientId,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error !== undefined) {
              console.warn("Auth Error or Silent Auth Failed", resp);
              return; // Do not throw, allows graceful failure for silent auth
            }
            
            // Save token to localStorage for persistence
            const expiresIn = resp.expires_in; // seconds
            // Set expiry time (subtract 60s for buffer)
            const expiresAt = Date.now() + (expiresIn * 1000) - 60000; 
            const tokenWithExpiry = { ...resp, expires_at: expiresAt };
            localStorage.setItem('google_access_token', JSON.stringify(tokenWithExpiry));

            // CRITICAL: Pass the token to gapi.client to authorize requests
            if (window.gapi && window.gapi.client) {
                window.gapi.client.setToken(resp);
            }
            updateSigninStatus(true);
          },
        });
        gisInited = true;
        resolveGis();
      } catch (err) {
        console.error("GIS Init Error", err);
        resolveGis(); 
      }
    });

    Promise.all([gapiLoadPromise, gisLoadPromise]).then(() => {
      // 1. Try to restore from localStorage first (Instant)
      const stored = localStorage.getItem('google_access_token');
      let restored = false;

      if (stored) {
        try {
            const tokenObj = JSON.parse(stored);
            if (Date.now() < tokenObj.expires_at) {
                if (window.gapi && window.gapi.client) {
                    window.gapi.client.setToken(tokenObj);
                    updateSigninStatus(true);
                    restored = true;
                    console.log("Session restored from storage");
                }
            } else {
                localStorage.removeItem('google_access_token'); // Expired
            }
        } catch (e) {
            console.error("Failed to parse stored token", e);
            localStorage.removeItem('google_access_token');
        }
      }

      // 2. If not restored, try silent auth via Google (Async)
      if (!restored && tokenClient) {
          try {
             // prompt: 'none' attempts to get a token without user interaction
             tokenClient.requestAccessToken({ prompt: 'none' });
          } catch(e) {
             console.log("Silent auth request failed", e);
          }
      }

      resolve();
    });
  });
};

export const handleAuthClick = () => {
  if (tokenClient) {
    // Request access token with default prompt (allows account chooser/consent if needed)
    tokenClient.requestAccessToken({ prompt: '' });
  } else {
    console.error("Token Client not initialized");
    alert("Authentication service not initialized.");
  }
};

export const handleSignOut = () => {
  const token = window.gapi?.client?.getToken();
  if (token !== null) {
    try {
        window.google?.accounts?.oauth2?.revoke(token.access_token);
    } catch(e) { console.warn("Revoke failed", e); }
    
    window.gapi?.client?.setToken('');
    localStorage.removeItem('google_access_token');
  }
};