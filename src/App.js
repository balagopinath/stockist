import './App.css';
import ToolBar from './toolbar/toolbar';
import Tool from './toolbar/Tool';
import Environment from './Environment';
import '@aws-amplify/ui-react/styles.css';
import withInjector from './withInjector';


function App({logOutOp, logInUser, profileServ}) {
  Environment.setAuthenticatedUser(logInUser);

  
  function logOut(e) {
    logOutOp();
    Environment.setAuthenticatedUser(null);
  }
  function profile() {
    
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
 
export default withInjector(App);
