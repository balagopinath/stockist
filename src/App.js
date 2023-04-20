
import './App.css';
import ToolBar from './toolbar/toolbar';
import { Tool } from './toolbar/Tool';
import Environment from './Environment';
import '@aws-amplify/ui-react/styles.css';
import { withAuthenticator } from '@aws-amplify/ui-react';
import profile from './Images/profile.png'
import { MenuContainer } from './menu/menuContainer';
import MenuItem from './menu/menuItem';
import UserProfile from './forms/profile/userProfile';
import React, { useState } from 'react';
import Dialog from './dialog';


function App({signOut, user}) {
  const [dialogs, setItems] = useState([]);
  Environment.setAuthenticatedUser(user);

  function hideDialog() {
    setItems(dialogs.slice(0, dialogs.length - 1));
  }
  function showDialog(dialog) {
      setItems([...dialogs, dialog])
  }
  function showProfile() {
    Environment.showDialog(UserProfile)
  }
  function logOut(e) {
    signOut();
    Environment.setAuthenticatedUser(null);
  }
  return (
      <div className="App">
        <ToolBar name="Hello">
          <Tool name="Tool 1" align="Left" />
          <Tool name="User" align="Right" icon={profile} >
            <MenuContainer>
              <MenuItem name="Profile" onClick={showProfile} />
              <MenuItem name="Sign out" onClick={logOut} />
            </MenuContainer>
          </Tool>
        </ToolBar>
      </div>
  );
} 
 
export default Dialog(withAuthenticator(App));
