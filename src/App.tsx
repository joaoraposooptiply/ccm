import React from 'react';
import { useApp as useAppCtx } from './state/AppContext.js';
import { Dashboard } from './screens/Dashboard.js';
import { ProfileEditor } from './screens/ProfileEditor.js';
import { ProfileDetail } from './screens/ProfileDetail.js';
import { Settings } from './screens/Settings.js';

export function App() {
  const { screen } = useAppCtx();

  switch (screen.name) {
    case 'dashboard':
      return <Dashboard />;
    case 'profile-editor':
      return <ProfileEditor />;
    case 'profile-detail':
      return <ProfileDetail />;
    case 'settings':
      return <Settings />;
    case 'login':
      return <Dashboard />;
  }
}
