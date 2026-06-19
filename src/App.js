import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';

// Minimal clean-slate shell. Build your pages/routes on top of this.
function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1>Stockist</h1>
          <p>Signed in as {user?.signInDetails?.loginId ?? user?.username}</p>
          <button onClick={signOut}>Sign out</button>
        </main>
      )}
    </Authenticator>
  );
}

export default App;
