import { Routes, Route, Navigate } from 'react-router'
import { Layout } from '@/components/Layout'
import { TournamentListPage } from '@/pages/TournamentListPage'
import { TournamentDetailPage } from '@/pages/TournamentDetailPage'
import { TeamDetailPage } from '@/pages/TeamDetailPage'
import { ChatPage } from '@/pages/ChatPage'
import { MyTeamsPage } from '@/pages/MyTeamsPage'
import { LoginPage } from '@/pages/LoginPage'
import { AccountPage } from '@/pages/AccountPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TournamentListPage />} />
        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="/teams/:id" element={<TeamDetailPage />} />
        <Route path="/teams/:id/chat" element={<ChatPage />} />
        <Route path="/my-teams" element={<MyTeamsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
