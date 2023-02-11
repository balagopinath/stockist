import './App.css';
import { withAuthenticator } from '@aws-amplify/ui-react';
import ToolBar from './toolbar/toolbar';
import Tool from './toolbar/Tool';
import Environment from './Environment';
import '@aws-amplify/ui-react/styles.css';


function App({signOut, user}) {
  Environment.setAuthenticatedUser(user);

  
  function logOut(e) {
    signOut();
    Environment.setAuthenticatedUser(null);
  }
  return (
    <div className="App">
      <ToolBar name="Hello">
        <Tool name="Tool 1" align="Left" />
        <Tool name="Sign Out" align="Right" onClick={logOut}/>
      </ToolBar>
    </div>
  );
} 
 
export default withAuthenticator(App);
