
import './App.css';
import ToolBar from './toolbar/toolbar';
import { Tool } from './toolbar/Tool';
import Environment from './Environment';
import '@aws-amplify/ui-react/styles.css';
import { withAuthenticator } from '@aws-amplify/ui-react';
import profile from './Images/profile.png'
import Settings  from './Images/settings.png';
import { MenuContainer } from './menu/menuContainer';
import MenuItem from './menu/menuItem';
import UserProfile from './forms/profile/userProfile';
import Dialog, { withDialog } from './dialog';
import React from 'react';
import PageRoute from './pageRoute';
import { useNavigate } from 'react-router-dom';



function App({signOut, user}) {
  const navigate = useNavigate();

  Environment.setAuthenticatedUser(user);

  function showDashboard() {
    navigate("/")
  }
  function showPortfolio() {
    navigate("/stock")
  }
  function showProfile() {
    Dialog.showDialog(UserProfile, Environment.getUserProfile())
  }
  function showSettings() {
    navigate("/settings")
  }
  function logOut(e) {
    signOut();
    Environment.setAuthenticatedUser(null);
  }
  return (
      <div className="App">
        <ToolBar name="Hello">
          <Tool name="Dashboard" align="Left" onClick={showDashboard} />
          <Tool name="Portfolio" align="Left" onClick={showPortfolio} />
          <Tool name="Settings" align="Right" onClick={showSettings} icon={Settings} />
          <Tool name="User" align="Right" icon={profile} >
            <MenuContainer>
              <MenuItem name="Profile" onClick={showProfile} />
              <MenuItem name="Sign out" onClick={logOut} />
            </MenuContainer>
          </Tool>
        </ToolBar>
        <PageRoute />
      </div>
  );
} 
 
export default withAuthenticator(withDialog(App));
