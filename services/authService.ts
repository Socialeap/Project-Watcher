
// Global types for Google APIs
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// ACTION REQUIRED: Replace with your Google Cloud Console Client ID
// AND ensure your hosting domain is added to "Authorized JavaScript origins" in console.cloud.google.com
export const HARDCODED_CLIENT_ID: string = '562552051436-h4gscbba3gu45b5sq1g7obb98cugh3gt.apps.googleusercontent.com'; 

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Function to validate a manually pasted token
export const validateManualToken = async (accessToken: string): Promise<boolean> => {
    try {
        // We use the tokeninfo endpoint to check if the token is valid and has not expired
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
        if (!response.ok) return false;
        
        const data = await response.json();
        // Check if scope covers spreadsheets
        if (!data.scope.includes('spreadsheets')) return false;
        
        // Manually set the token in gapi
        if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: accessToken });
        }
        
        // Save to local storage with a rough expiry (assuming 1 hour if fresh, but we can't know for sure)
        const expiresAt = Date.now() + (3500 * 1000); // ~58 mins
        const tokenObj = { access_token: accessToken, expires_at: expiresAt };
        localStorage.setItem('google_access_token', JSON.stringify(tokenObj));
        
        return true;
    } catch (e) {
        console.error("Token validation failed", e);
        return false;
    }
};

export const initGoogleClient = async (clientId: string, updateSigninStatus: (signedIn: boolean) => void) => {
  // Aggressive cleaning of the Client ID
  const sanitizedClientId = clientId.trim().replace(/["']/g, '');
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
              return; 
            }
            
            const expiresIn = resp.expires_in; 
            const expiresAt = Date.now() + (expiresIn * 1000) - 60000; 
            const tokenWithExpiry = { ...resp, expires_at: expiresAt };
            localStorage.setItem('google_access_token', JSON.stringify(tokenWithExpiry));

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

      // 2. If not restored, try silent auth via Google (Async) - Only if we have a client ID
      if (!restored && tokenClient && sanitizedClientId) {
          try {
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
    tokenClient.requestAccessToken({ prompt: '' });
  } else {
    console.error("Token Client not initialized");
    alert("Authentication service not initialized. Check console for Client ID errors.");
  }
};

export const handleSignOut = () => {
  const token = window.gapi?.client?.getToken();
  if (token !== null) {
    try {
        if (window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token.access_token);
        }
    } catch(e) { console.warn("Revoke failed", e); }
    
    window.gapi?.client?.setToken('');
    localStorage.removeItem('google_access_token');
  }
};
