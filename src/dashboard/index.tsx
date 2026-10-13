import React from 'react'
import ReactDOM from 'react-dom/client'
import { Dashboard } from './Dashboard'
import { ProfileBoundary } from '../db/ProfileBoundary'
import '../index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProfileBoundary>
      <Dashboard />
    </ProfileBoundary>
  </React.StrictMode>,
)
