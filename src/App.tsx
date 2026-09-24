import { useState, useEffect, useCallback, useRef } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ShieldAlert,
  Crown,
  User,
  Eye,
  Plus,
  RefreshCw,
  Trophy,
  Users,
  UserPlus,
  LogOut,
  Trash2,
  Edit,
  ArrowRightLeft,
  Check,
  X,
  Radio,
  Play,
  Lock,
  Flag,
  Swords,
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  Ban,
} from "lucide-react"

interface ApiUser {
  id: string
  username: string
  email: string
  global_role: "admin" | "player" | "visitor"
}

interface Tournament {
  id: string
  name: string
  game: string
  status: string
  created_at: string
}

interface TeamMember {
  id: string
  user_id: string
  username?: string
  game_role?: string
  joined_at: string
}

interface Team {
  id: string
  tournament_id: string
  name: string
  captain_id: string
  is_eliminated: boolean
  members_count: number
  members?: TeamMember[]
}

interface JoinRequest {
  id: string
  team_id: string
  user_id: string
  username?: string
  tournament_id: string
  game_role?: string
  status: string
  created_at: string
}

interface MatchItem {
  id: string
  tournament_id: string
  round: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  team1?: { id: string; name: string } | null
  team2?: { id: string; name: string } | null
  winner_id: string | null
  team1_score: number
  team2_score: number
  status: "pending" | "in_progress" | "completed" | "forfeit"
  next_match_id: string | null
  next_match_slot: number | null
}

interface ChatMessage {
  id: string
  team_id: string
  author_id: string | null
  author_username: string | null
  content: string
  created_at: string
}

interface ChatFrame {
  type?: string
  event?: string
  reason?: string
  detail?: string
  room?: string
  data?: ChatMessage
}

interface WsLogEntry {
  timestamp: string
  kind: "info" | "system" | "message" | "error"
  text: string
}

type WsStatus = "disconnected" | "connecting" | "connected" | "revoked" | "error"

interface ApiResponseLog {
  timestamp: string
  method: string
  endpoint: string
  status: number
  ok: boolean
  data: unknown
}

const VISITOR_USER: ApiUser = {
  id: "visitor",
  username: "anonyme",
  email: "visiteur@public.local",
  global_role: "visitor",
}

export default function App() {
  // --- Gestion de l'utilisateur actif ---
  const [users, setUsers] = useState<ApiUser[]>([])
  const [currentUser, setCurrentUser] = useState<ApiUser>(VISITOR_USER)
  const [authToken, setAuthToken] = useState<string>("")

  // --- Logs API ---
  const [apiLogs, setApiLogs] = useState<ApiResponseLog[]>([])

  // --- Données Tournois ---
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [tournamentName, setTournamentName] = useState("Tournoi National LoL")
  const [tournamentGame, setTournamentGame] = useState("League of Legends")

  // --- Données Équipes ---
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState("Thunderbolts")
  const [captainRole, setCaptainRole] = useState("Mid")

  // --- Actions Équipe ---
  const [joinRole, setJoinRole] = useState("ADC")
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [renameValue, setRenameValue] = useState("")
  const [assignMemberId, setAssignMemberId] = useState("")
  const [assignRoleValue, setAssignRoleValue] = useState("Support")
  const [excludeMemberId, setExcludeMemberId] = useState("")
  const [transferNewCaptainId, setTransferNewCaptainId] = useState("")

  // --- Espace d'échange d'équipe (B-16, B-17, B-18) ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("Salut l'équipe !")
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected")
  const [wsLog, setWsLog] = useState<WsLogEntry[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // --- Matchs & Lancement ---
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [matchScores, setMatchScores] = useState<
    Record<string, { s1: number; s2: number }>
  >({})

  // --- Création Utilisateur ---
  const [newUsername, setNewUsername] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("Secret123!")
  const [newRole, setNewRole] = useState<"player" | "admin">("player")

  // Exécution d'appel API et journalisation
  const executeApi = useCallback(
    async (
      method: "GET" | "POST" | "PATCH" | "DELETE",
      endpoint: string,
      body?: unknown
    ) => {
      const headers: Record<string, string> = {}
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }
      const fetchOptions: RequestInit = {
        method,
        headers,
      }
      if (body && method !== "GET") {
        headers["Content-Type"] = "application/json"
        fetchOptions.body = JSON.stringify(body)
      }

      try {
        const res = await fetch(endpoint, fetchOptions)

        let data: unknown
        try {
          data = await res.json()
        } catch {
          data = null
        }

        const logEntry: ApiResponseLog = {
          timestamp: new Date().toLocaleTimeString(),
          method,
          endpoint,
          status: res.status,
          ok: res.ok,
          data,
        }
        setApiLogs((prev) => [logEntry, ...prev.slice(0, 19)])
        return { ok: res.ok, status: res.status, data }
      } catch (err) {
        const logEntry: ApiResponseLog = {
          timestamp: new Date().toLocaleTimeString(),
          method,
          endpoint,
          status: 0,
          ok: false,
          data: String(err),
        }
        setApiLogs((prev) => [logEntry, ...prev.slice(0, 19)])
        return { ok: false, status: 0, data: err }
      }
    },
    [authToken]
  )

  // Charger les utilisateurs au démarrage
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/users")
      if (res.ok) {
        const data: ApiUser[] = await res.json()
        setUsers(data)
      }
    } catch {
      // Ignorer si backend non joignable immédiatement
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Changer d'utilisateur en 1 clic
  const handleSelectUser = async (user: ApiUser) => {
    setCurrentUser(user)
    if (user.global_role === "visitor") {
      setAuthToken("")
      return
    }

    try {
      const res = await fetch(`/api/v1/auth/dev-token/${user.id}`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setAuthToken(data.access_token)
      } else {
        setAuthToken(`simulated_token_${user.username}`)
      }
    } catch {
      setAuthToken(`simulated_token_${user.username}`)
    }
  }

  // --- Fonctions Tournois ---
  const handleListTournaments = async () => {
    const res = await executeApi("GET", "/api/v1/tournaments")
    if (res.ok && Array.isArray(res.data)) {
      setTournaments(res.data)
      if (res.data.length > 0) {
        // Mettre à jour la sélection courante si besoin
        if (selectedTournament) {
          const updated = res.data.find((t) => t.id === selectedTournament.id)
          if (updated) setSelectedTournament(updated)
        } else {
          setSelectedTournament(res.data[0])
        }
      }
    }
  }

  const handleCreateTournament = async () => {
    const res = await executeApi("POST", "/api/v1/tournaments", {
      name: tournamentName,
      game: tournamentGame,
    })
    if (res.ok) {
      handleListTournaments()
    }
  }

  // --- Fonctions Équipes ---
  const handleListTeams = async (tId?: string) => {
    const id = tId || selectedTournament?.id
    if (!id) return
    const res = await executeApi("GET", `/api/v1/tournaments/${id}/teams`)
    if (res.ok && Array.isArray(res.data)) {
      setTeams(res.data)
      if (res.data.length > 0) {
        setSelectedTeam(res.data[0])
      }
    }
  }

  const handleCreateTeam = async () => {
    if (!selectedTournament) return
    const res = await executeApi(
      "POST",
      `/api/v1/tournaments/${selectedTournament.id}/teams`,
      {
        name: teamName,
        game_role: captainRole || undefined,
      }
    )
    if (res.ok) {
      handleListTeams(selectedTournament.id)
    }
  }

  const handleGetTeamDetails = async (teamId?: string) => {
    const id = teamId || selectedTeam?.id
    if (!id) return
    const res = await executeApi("GET", `/api/v1/teams/${id}`)
    if (res.ok) {
      setSelectedTeam(res.data as Team)
    }
  }

  // --- Actions sur l'équipe sélectionnée ---
  const handleJoinTeam = async () => {
    if (!selectedTeam) return
    await executeApi("POST", `/api/v1/teams/${selectedTeam.id}/join`, {
      game_role: joinRole || undefined,
    })
  }

  const handleListJoinRequests = async () => {
    if (!selectedTeam) return
    const res = await executeApi(
      "GET",
      `/api/v1/teams/${selectedTeam.id}/join-requests`
    )
    if (res.ok && Array.isArray(res.data)) {
      setJoinRequests(res.data)
    }
  }

  const handleRespondJoinRequest = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    if (!selectedTeam) return
    const res = await executeApi(
      "POST",
      `/api/v1/teams/${selectedTeam.id}/join-requests/${requestId}/${action}`
    )
    if (res.ok) {
      handleListJoinRequests()
      handleGetTeamDetails(selectedTeam.id)
    }
  }

  const handleLeaveTeam = async () => {
    if (!selectedTeam) return
    const res = await executeApi("POST", `/api/v1/teams/${selectedTeam.id}/leave`)
    if (res.ok) {
      handleGetTeamDetails(selectedTeam.id)
    }
  }

  const handleRenameTeam = async () => {
    if (!selectedTeam || !renameValue) return
    const res = await executeApi("PATCH", `/api/v1/teams/${selectedTeam.id}/name`, {
      name: renameValue,
    })
    if (res.ok) {
      handleGetTeamDetails(selectedTeam.id)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedTeam || !assignMemberId) return
    const res = await executeApi(
      "PATCH",
      `/api/v1/teams/${selectedTeam.id}/members/${assignMemberId}/role`,
      { game_role: assignRoleValue }
    )
    if (res.ok) {
      handleGetTeamDetails(selectedTeam.id)
    }
  }

  const handleExcludeMember = async () => {
    if (!selectedTeam || !excludeMemberId) return
    const res = await executeApi(
      "DELETE",
      `/api/v1/teams/${selectedTeam.id}/members/${excludeMemberId}`
    )
    if (res.ok) {
      handleGetTeamDetails(selectedTeam.id)
    }
  }

  const handleTransferCaptain = async () => {
    if (!selectedTeam || !transferNewCaptainId) return
    const res = await executeApi(
      "POST",
      `/api/v1/teams/${selectedTeam.id}/transfer-captain`,
      { new_captain_id: transferNewCaptainId }
    )
    if (res.ok) {
      handleGetTeamDetails(selectedTeam.id)
    }
  }

  // --- Espace d'échange (B-16 REST + WebSocket, B-17 exclusion, B-18 élimination) ---
  const pushWsLog = (kind: WsLogEntry["kind"], text: string) => {
    setWsLog((prev) => [
      { timestamp: new Date().toLocaleTimeString(), kind, text },
      ...prev.slice(0, 29),
    ])
  }

  const closeSocket = () => {
    wsRef.current?.close()
    wsRef.current = null
  }

  const handleLoadMessages = async () => {
    if (!selectedTeam) return
    const res = await executeApi("GET", `/api/v1/teams/${selectedTeam.id}/messages`)
    if (res.ok && Array.isArray(res.data)) {
      setChatMessages(res.data as ChatMessage[])
    }
  }

  const handleSendMessageRest = async () => {
    if (!selectedTeam || !chatInput.trim()) return
    const res = await executeApi("POST", `/api/v1/teams/${selectedTeam.id}/messages`, {
      content: chatInput,
    })
    if (res.ok) {
      setChatInput("")
      // Si le WebSocket est connecté, le nouveau message arrive par diffusion ;
      // sinon on retombe sur le REST (repli décrit dans docs/api-realtime.md).
      if (wsStatus !== "connected") handleLoadMessages()
    }
  }

  const handleConnectWs = () => {
    if (!selectedTeam || !authToken) return
    closeSocket()
    setWsStatus("connecting")
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const ws = new WebSocket(
      `${protocol}://${window.location.host}/api/v1/teams/${selectedTeam.id}/ws?token=${authToken}`
    )
    wsRef.current = ws

    ws.onerror = () => {
      setWsStatus("error")
      pushWsLog("error", "Erreur de connexion WebSocket")
    }
    ws.onclose = (ev) => {
      setWsStatus((prev) => (prev === "revoked" ? prev : "disconnected"))
      pushWsLog("info", `Socket fermé (code ${ev.code})`)
    }
    ws.onmessage = (ev) => {
      let frame: ChatFrame
      try {
        frame = JSON.parse(ev.data)
      } catch {
        pushWsLog("error", `Trame illisible : ${ev.data}`)
        return
      }
      if (frame.type === "system" && frame.event === "connected") {
        setWsStatus("connected")
        pushWsLog("system", `Connecté à la salle ${frame.room}`)
      } else if (frame.type === "system" && frame.event === "revoked") {
        setWsStatus("revoked")
        pushWsLog("system", `Accès révoqué (raison : ${frame.reason})`)
      } else if (frame.type === "message" && frame.data) {
        const msg = frame.data
        setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        pushWsLog("message", `${msg.author_username || "?"} : ${msg.content}`)
      } else if (frame.type === "error") {
        pushWsLog("error", frame.detail || "Erreur")
      }
    }
  }

  const handleDisconnectWs = () => {
    closeSocket()
    setWsStatus("disconnected")
  }

  const handleSendMessageWs = () => {
    if (!wsRef.current || wsStatus !== "connected" || !chatInput.trim()) return
    wsRef.current.send(JSON.stringify({ type: "message", content: chatInput }))
    setChatInput("")
  }

  // Changer d'équipe ou d'utilisateur invalide la session WebSocket active :
  // un jeton ou une salle différents nécessitent une reconnexion explicite.
  useEffect(() => {
    closeSocket()
    setWsStatus("disconnected")
    setChatMessages([])
    setWsLog([])
  }, [selectedTeam?.id, currentUser.id])

  // Coupe le socket si le composant est démonté (navigation, rechargement).
  useEffect(() => {
    return () => closeSocket()
  }, [])

  // --- Lancement & Gestion des Matchs / Scores ---
  const handleCloseRegistration = async () => {
    if (!selectedTournament) return
    const res = await executeApi(
      "POST",
      `/api/v1/tournaments/${selectedTournament.id}/close-registration`
    )
    if (res.ok) {
      handleListTournaments()
      handleListMatches(selectedTournament.id)
    }
  }

  const handleStartTournament = async () => {
    if (!selectedTournament) return
    const res = await executeApi(
      "POST",
      `/api/v1/tournaments/${selectedTournament.id}/start`
    )
    if (res.ok) {
      handleListTournaments()
      handleListMatches(selectedTournament.id)
    }
  }

  const handleListMatches = async (tournId?: string) => {
    const tId = tournId || selectedTournament?.id
    if (!tId) return
    const res = await executeApi("GET", `/api/v1/tournaments/${tId}/matches`)
    if (res.ok && Array.isArray(res.data)) {
      setMatches(res.data)
    }
  }

  const handleScoreChange = (
    matchId: string,
    team: "s1" | "s2",
    val: number
  ) => {
    setMatchScores((prev) => ({
      ...prev,
      [matchId]: {
        s1: team === "s1" ? val : prev[matchId]?.s1 || 0,
        s2: team === "s2" ? val : prev[matchId]?.s2 || 0,
      },
    }))
  }

  const handleEnterResult = async (matchId: string) => {
    if (!selectedTournament) return
    const current = matchScores[matchId] || { s1: 1, s2: 0 }
    const res = await executeApi(
      "POST",
      `/api/v1/tournaments/${selectedTournament.id}/matches/${matchId}/result`,
      {
        team1_score: current.s1,
        team2_score: current.s2,
      }
    )
    if (res.ok) {
      handleListMatches(selectedTournament.id)
      handleListTournaments()
    }
  }

  const handleForfeit = async (matchId: string, teamId: string) => {
    if (!selectedTournament) return
    const res = await executeApi(
      "POST",
      `/api/v1/tournaments/${selectedTournament.id}/matches/${matchId}/forfeit`,
      { forfeiting_team_id: teamId }
    )
    if (res.ok) {
      handleListMatches(selectedTournament.id)
      handleListTournaments()
    }
  }

  // --- Création Utilisateur ---
  const handleRegisterUser = async () => {
    if (!newUsername || !newEmail || !newPassword) return
    const res = await executeApi("POST", "/api/v1/auth/register", {
      username: newUsername,
      email: newEmail,
      password: newPassword,
      global_role: newRole,
    })
    if (res.ok) {
      setNewUsername("")
      setNewEmail("")
      loadUsers()
    }
  }

  const allAvailableUsers: ApiUser[] = [
    VISITOR_USER,
    ...users,
  ]

  // Regrouper les matchs par round
  const matchesByRound = matches.reduce((acc, m) => {
    acc[m.round] = acc[m.round] || []
    acc[m.round].push(m)
    return acc
  }, {} as Record<number, MatchItem[]>)

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        {/* Titre */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Testeur Complet d'API — Sujet B Tournois
            </h1>
            <p className="text-sm text-muted-foreground">
              Sélectionnez un utilisateur en 1 clic puis testez chaque route avec ses permissions réelles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recharger users
            </Button>
          </div>
        </div>

        {/* Barre des utilisateurs (1 bouton par user) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Choisir l'utilisateur actif (1 bouton = 1 session sans mot de passe)
                </CardTitle>
                <CardDescription>
                  Changer d'utilisateur génère et applique automatiquement son jeton JWT auprès de l'API.
                </CardDescription>
              </div>
              <Badge
                variant={
                  currentUser.global_role === "admin"
                    ? "destructive"
                    : currentUser.global_role === "visitor"
                    ? "secondary"
                    : "default"
                }
              >
                Actif : {currentUser.username} ({currentUser.global_role})
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allAvailableUsers.map((user) => {
                const isActive = currentUser.id === user.id
                return (
                  <Button
                    key={user.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center gap-2"
                  >
                    {user.global_role === "admin" ? (
                      <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                    ) : user.global_role === "visitor" ? (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    <span>{user.username}</span>
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="text-[10px] py-0 px-1 font-mono"
                    >
                      {user.global_role}
                    </Badge>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Onglets des Fonctionnalités de l'API */}
        <Tabs defaultValue="tournaments" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-auto p-1 gap-1">
            <TabsTrigger value="tournaments" className="flex items-center gap-2 py-2">
              <Trophy className="h-4 w-4" />
              1. Tournois
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2 py-2">
              <Users className="h-4 w-4" />
              2. Équipes Tournoi
            </TabsTrigger>
            <TabsTrigger value="team-actions" className="flex items-center gap-2 py-2">
              <Crown className="h-4 w-4" />
              3. Gestion Équipe
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2 py-2">
              <Swords className="h-4 w-4" />
              4. Matchs & Scores
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2 py-2">
              <MessageSquare className="h-4 w-4" />
              5. Chat Équipe
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 py-2">
              <UserPlus className="h-4 w-4" />
              6. Nouvel User
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: TOURNOIS */}
          <TabsContent value="tournaments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Création de tournoi */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Créer un tournoi (POST /api/v1/tournaments)</span>
                    <Badge variant="destructive" className="text-[10px]">
                      Admin requis
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Ouvre un nouveau tournoi aux inscriptions (succès 201 si Admin, erreur 403 sinon).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Nom du tournoi</Label>
                    <Input
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      placeholder="Ex: Tournoi Printemps"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Jeu supporté</Label>
                    <Input
                      value={tournamentGame}
                      onChange={(e) => setTournamentGame(e.target.value)}
                      placeholder="Ex: League of Legends, CS2"
                    />
                  </div>
                  <Button
                    onClick={handleCreateTournament}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Créer le tournoi
                  </Button>
                </CardContent>
              </Card>

              {/* Liste des tournois */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Liste des tournois (GET /api/v1/tournaments)
                      </CardTitle>
                      <CardDescription>Accessible à tous (Public)</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleListTournaments}
                      className="flex items-center gap-1 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Lister
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                  {tournaments.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      Aucun tournoi chargé. Cliquez sur "Lister" ou créez-en un.
                    </div>
                  ) : (
                    tournaments.map((t) => {
                      const isSelected = selectedTournament?.id === t.id
                      return (
                        <div
                          key={t.id}
                          className={`p-2.5 rounded-md border flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm">{t.name}</div>
                            <div className="text-muted-foreground flex gap-2">
                              <span>Jeu : {t.game}</span>
                              <span>• Statut : </span>
                              <span className="font-semibold text-foreground">
                                {t.status}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedTournament(t)
                              handleListTeams(t.id)
                              handleListMatches(t.id)
                            }}
                          >
                            {isSelected ? "Sélectionné" : "Choisir"}
                          </Button>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: ÉQUIPES */}
          <TabsContent value="teams" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Créer équipe */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Créer une équipe (POST .../teams)</span>
                    <Badge variant="default" className="text-[10px]">
                      Joueur requis
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    L'utilisateur actif crée l'équipe et en devient le Capitaine (B-05).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs p-2 rounded bg-muted/60">
                    <span className="font-semibold">Tournoi ciblé : </span>
                    {selectedTournament ? (
                      <span className="text-primary font-bold">
                        {selectedTournament.name} ({selectedTournament.status})
                      </span>
                    ) : (
                      <span className="text-destructive font-medium">
                        Aucun tournoi sélectionné (allez sur l'onglet 1)
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Nom de l'équipe</Label>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Ex: Fnatic Academy"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Rôle en jeu du capitaine (optionnel)</Label>
                    <Input
                      value={captainRole}
                      onChange={(e) => setCaptainRole(e.target.value)}
                      placeholder="Ex: Top, Mid, Jungler"
                    />
                  </div>
                  <Button
                    onClick={handleCreateTeam}
                    disabled={!selectedTournament}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Créer l'équipe
                  </Button>
                </CardContent>
              </Card>

              {/* Liste des équipes du tournoi */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Équipes du tournoi (GET .../teams)
                      </CardTitle>
                      <CardDescription>
                        {selectedTournament ? selectedTournament.name : "Sélectionnez un tournoi"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleListTeams()}
                      disabled={!selectedTournament}
                      className="text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Lister
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                  {teams.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      Aucune équipe trouvée dans ce tournoi.
                    </div>
                  ) : (
                    teams.map((team) => {
                      const isSelected = selectedTeam?.id === team.id
                      return (
                        <div
                          key={team.id}
                          className={`p-2.5 rounded-md border flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {team.name}
                              {team.is_eliminated && (
                                <Badge variant="destructive" className="text-[9px] py-0">
                                  Éliminée
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground">
                              {team.members_count} membre(s) • Capitaine : {team.captain_id.slice(0, 8)}...
                            </div>
                          </div>
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedTeam(team)
                              handleGetTeamDetails(team.id)
                            }}
                          >
                            {isSelected ? "Active" : "Gérer"}
                          </Button>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: ACTIONS SUR L'ÉQUIPE SÉLECTIONNÉE */}
          <TabsContent value="team-actions" className="space-y-4">
            {/* Header équipe sélectionnée */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    ÉQUIPE ACTIVE POUR LES ACTIONS CI-DESSOUS
                  </div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    {selectedTeam ? selectedTeam.name : "Aucune équipe sélectionnée"}
                    {selectedTeam && (
                      <Badge variant="outline" className="text-xs font-normal">
                        ID: {selectedTeam.id.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetTeamDetails()}
                    disabled={!selectedTeam}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Détails équipe
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleLeaveTeam}
                    disabled={!selectedTeam}
                    className="text-xs"
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    Quitter l'équipe
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Demande d'adhésion & Validation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" />
                    Adhésion & Recrutement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {/* Rejoindre */}
                  <div className="space-y-1.5">
                    <Label>Rôle souhaité</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={joinRole}
                        onChange={(e) => setJoinRole(e.target.value)}
                        placeholder="Ex: ADC, Support"
                      />
                      <Button
                        size="sm"
                        onClick={handleJoinTeam}
                        disabled={!selectedTeam}
                      >
                        Rejoindre
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Demandes reçues (Capitaine) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">Demandes reçues (Capitaine)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleListJoinRequests}
                        disabled={!selectedTeam}
                        className="h-6 px-1.5 text-[10px]"
                      >
                        Charger
                      </Button>
                    </div>

                    {joinRequests.length === 0 ? (
                      <div className="text-muted-foreground text-[11px]">
                        Aucune demande affichée.
                      </div>
                    ) : (
                      joinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-1.5 border rounded bg-background flex items-center justify-between gap-1"
                        >
                          <div>
                            <div className="font-semibold">
                              {req.username || req.user_id.slice(0, 8)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Rôle: {req.game_role || "non spécifié"} ({req.status})
                            </div>
                          </div>
                          {req.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0 text-emerald-600"
                                onClick={() =>
                                  handleRespondJoinRequest(req.id, "accept")
                                }
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0 text-destructive"
                                onClick={() =>
                                  handleRespondJoinRequest(req.id, "reject")
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Composition & Membres */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Membres actuels ({selectedTeam?.members?.length || 0}/5)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs max-h-72 overflow-y-auto">
                  {!selectedTeam?.members || selectedTeam.members.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">
                      Cliquez sur "Détails équipe" pour charger les membres.
                    </div>
                  ) : (
                    selectedTeam.members.map((m) => {
                      const isCaptain = selectedTeam.captain_id === m.user_id
                      return (
                        <div
                          key={m.id}
                          className="p-2 border rounded bg-card flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold flex items-center gap-1">
                              {m.username || `User ${m.user_id.slice(0, 6)}`}
                              {isCaptain && (
                                <Crown className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Role: {m.game_role || "Aucun"} • Membre ID: {m.id.slice(0, 8)}...
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => {
                              setAssignMemberId(m.id)
                              setExcludeMemberId(m.id)
                              setTransferNewCaptainId(m.user_id)
                            }}
                          >
                            Cibler
                          </Button>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* 3. Actions Capitaine (Renommer, Rôle, Exclure, Transférer) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Gestion Capitaine</span>
                    <Badge variant="warning" className="text-[10px]">
                      Capitaine
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {/* Renommer */}
                  <div className="space-y-1">
                    <Label>Renommer l'équipe (PATCH .../name)</Label>
                    <div className="flex gap-1">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="Nouveau nom"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRenameTeam}
                        disabled={!selectedTeam}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Assigner rôle */}
                  <div className="space-y-1">
                    <Label>Assigner rôle à membre (PATCH .../role)</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        value={assignMemberId}
                        onChange={(e) => setAssignMemberId(e.target.value)}
                        placeholder="ID Membre"
                      />
                      <Input
                        value={assignRoleValue}
                        onChange={(e) => setAssignRoleValue(e.target.value)}
                        placeholder="Rôle (ex: Jungler)"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-1"
                      onClick={handleAssignRole}
                      disabled={!selectedTeam}
                    >
                      Assigner rôle
                    </Button>
                  </div>

                  <Separator />

                  {/* Exclure / Transférer */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label>Exclure membre</Label>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full text-[11px]"
                        onClick={handleExcludeMember}
                        disabled={!selectedTeam || !excludeMemberId}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Exclure
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label>Transférer capitanat</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-[11px]"
                        onClick={handleTransferCaptain}
                        disabled={!selectedTeam || !transferNewCaptainId}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        Transférer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: MATCHS, LANCEMENT DE LA PARTIE & GESTION DES SCORES */}
          <TabsContent value="matches" className="space-y-4">
            {/* Contrôles du cycle de vie du tournoi (Admin) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Swords className="h-5 w-5 text-primary" />
                      Lancement de la partie & Cycle de vie
                    </CardTitle>
                    <CardDescription>
                      Tournoi :{" "}
                      <span className="font-bold text-foreground">
                        {selectedTournament ? selectedTournament.name : "Aucun tournoi sélectionné"}
                      </span>{" "}
                      • Statut actuel :{" "}
                      <Badge
                        variant={
                          selectedTournament?.status === "finished"
                            ? "success"
                            : selectedTournament?.status === "running"
                            ? "default"
                            : selectedTournament?.status === "registration_closed"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {selectedTournament?.status || "Inconnu"}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleListMatches()}
                      disabled={!selectedTournament}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Actualiser matchs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Étape 1 : Clôturer les inscriptions */}
                  <div className="p-3 border rounded-md bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-amber-500" />
                        1. Clôturer inscriptions (B-03 & B-12)
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        Admin
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Gèle les rosters et génère automatiquement l'arbre des matchs pour les équipes engagées.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCloseRegistration}
                      disabled={
                        !selectedTournament ||
                        selectedTournament.status !== "registration_open"
                      }
                      className="w-full text-xs"
                    >
                      Clôturer et générer l'arbre
                    </Button>
                  </div>

                  {/* Étape 2 : Lancer la partie */}
                  <div className="p-3 border rounded-md bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <Play className="h-4 w-4 text-emerald-500" />
                        2. Lancer la partie / Tournoi (B-04)
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        Admin
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Passe le statut à "running". Les équipes &lt; 5 joueurs déclarent forfait au Round 1.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleStartTournament}
                      disabled={
                        !selectedTournament ||
                        selectedTournament.status !== "registration_closed"
                      }
                      className="w-full text-xs"
                    >
                      Démarrer le tournoi
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Arbre des Matchs et Gestion des Scores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Arbre des Matchs & Gestion des Scores (B-13, B-14, B-15)</span>
                  <Badge variant="outline" className="text-xs">
                    {matches.length} match(s) généré(s)
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Saisissez les scores des matchs en cours ou déclarez des forfaits. Les vainqueurs avancent automatiquement vers la finale.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {matches.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground border rounded-md border-dashed">
                    Aucun match dans ce tournoi. Clôturez les inscriptions (Étape 1) pour générer l'arbre des matchs.
                  </div>
                ) : (
                  Object.keys(matchesByRound)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((roundStr) => {
                      const roundNum = Number(roundStr)
                      const roundMatches = matchesByRound[roundNum]
                      const isFinal = roundMatches.length === 1
                      return (
                        <div key={roundNum} className="space-y-2">
                          <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Trophy className="h-3.5 w-3.5" />
                            {isFinal ? `Finale (Round ${roundNum})` : `Tour / Round ${roundNum}`}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {roundMatches.map((m) => {
                              const scores = matchScores[m.id] || {
                                s1: m.team1_score,
                                s2: m.team2_score,
                              }
                              const team1Name =
                                m.team1?.name || (m.team1_id ? `Équipe ${m.team1_id.slice(0, 6)}` : "En attente...")
                              const team2Name =
                                m.team2?.name || (m.team2_id ? `Équipe ${m.team2_id.slice(0, 6)}` : "En attente...")
                              const isPlayable =
                                (m.status === "in_progress" || m.status === "pending") &&
                                m.team1_id &&
                                m.team2_id

                              return (
                                <div
                                  key={m.id}
                                  className={`p-3 rounded-lg border text-xs space-y-2.5 transition-all ${
                                    m.status === "completed"
                                      ? "bg-emerald-500/5 border-emerald-500/30"
                                      : m.status === "forfeit"
                                      ? "bg-destructive/5 border-destructive/30"
                                      : "bg-card border-border shadow-sm"
                                  }`}
                                >
                                  {/* Header du Match */}
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[11px] text-muted-foreground">
                                      Match #{m.match_number}
                                    </span>
                                    <Badge
                                      variant={
                                        m.status === "completed"
                                          ? "success"
                                          : m.status === "forfeit"
                                          ? "destructive"
                                          : m.status === "in_progress"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-[10px] py-0 px-1.5"
                                    >
                                      {m.status}
                                    </Badge>
                                  </div>

                                  {/* Équipes & Scores actuels */}
                                  <div className="space-y-1.5 bg-muted/40 p-2 rounded">
                                    <div
                                      className={`flex items-center justify-between ${
                                        m.winner_id && m.winner_id === m.team1_id
                                          ? "font-bold text-emerald-600 dark:text-emerald-400"
                                          : ""
                                      }`}
                                    >
                                      <span className="truncate max-w-[180px]">
                                        {team1Name}
                                      </span>
                                      <span className="font-mono text-sm px-1.5 py-0.5 bg-background border rounded">
                                        {m.team1_score}
                                      </span>
                                    </div>
                                    <div
                                      className={`flex items-center justify-between ${
                                        m.winner_id && m.winner_id === m.team2_id
                                          ? "font-bold text-emerald-600 dark:text-emerald-400"
                                          : ""
                                      }`}
                                    >
                                      <span className="truncate max-w-[180px]">
                                        {team2Name}
                                      </span>
                                      <span className="font-mono text-sm px-1.5 py-0.5 bg-background border rounded">
                                        {m.team2_score}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Affichage du vainqueur si terminé */}
                                  {m.winner_id && (
                                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Trophy className="h-3.5 w-3.5" />
                                      Vainqueur qualifié :{" "}
                                      {m.winner_id === m.team1_id
                                        ? team1Name
                                        : team2Name}
                                    </div>
                                  )}

                                  {/* Formulaire de Saisie de Score (Admin) */}
                                  {isPlayable && (
                                    <div className="pt-1.5 space-y-2 border-t border-dashed">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[10px]">Score T1</Label>
                                          <Input
                                            type="number"
                                            value={scores.s1}
                                            onChange={(e) =>
                                              handleScoreChange(
                                                m.id,
                                                "s1",
                                                Number(e.target.value)
                                              )
                                            }
                                            className="h-7 text-xs"
                                          />
                                        </div>
                                        <span className="font-bold text-muted-foreground mt-4">
                                          -
                                        </span>
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[10px]">Score T2</Label>
                                          <Input
                                            type="number"
                                            value={scores.s2}
                                            onChange={(e) =>
                                              handleScoreChange(
                                                m.id,
                                                "s2",
                                                Number(e.target.value)
                                              )
                                            }
                                            className="h-7 text-xs"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex gap-1.5">
                                        <Button
                                          size="sm"
                                          onClick={() => handleEnterResult(m.id)}
                                          className="flex-1 h-7 text-xs"
                                        >
                                          <Check className="h-3.5 w-3.5 mr-1" />
                                          Valider score
                                        </Button>
                                        {m.team1_id && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              handleForfeit(m.id, m.team1_id!)
                                            }
                                            className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                                            title="Déclarer Team 1 forfait"
                                          >
                                            <Flag className="h-3 w-3 mr-0.5" />
                                            Forfait T1
                                          </Button>
                                        )}
                                        {m.team2_id && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              handleForfeit(m.id, m.team2_id!)
                                            }
                                            className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                                            title="Déclarer Team 2 forfait"
                                          >
                                            <Flag className="h-3 w-3 mr-0.5" />
                                            Forfait T2
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: ESPACE D'ÉCHANGE D'ÉQUIPE (B-16, B-17, B-18) */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    ESPACE D'ÉCHANGE DE L'ÉQUIPE ACTIVE (B-16, B-17, B-18)
                  </div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    {selectedTeam ? selectedTeam.name : "Aucune équipe sélectionnée"}
                    {selectedTeam?.is_eliminated && (
                      <Badge variant="destructive" className="text-xs font-normal">
                        Éliminée — espace fermé (B-18)
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connecté en tant que {currentUser.username}. Choisissez une équipe (onglet 2) ;
                    excluez un membre depuis l'onglet 3 pour observer B-17 en direct ici.
                  </p>
                </div>
                <Badge
                  variant={
                    wsStatus === "connected"
                      ? "success"
                      : wsStatus === "connecting"
                      ? "warning"
                      : wsStatus === "revoked" || wsStatus === "error"
                      ? "destructive"
                      : "secondary"
                  }
                  className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                >
                  {wsStatus === "connected" ? (
                    <Wifi className="h-3 w-3" />
                  ) : wsStatus === "revoked" ? (
                    <Ban className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  {
                    {
                      disconnected: "Déconnecté",
                      connecting: "Connexion...",
                      connected: "Connecté",
                      revoked: "Accès révoqué",
                      error: "Erreur",
                    }[wsStatus]
                  }
                </Badge>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Messages */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        Messages (GET/POST .../messages, WS .../ws)
                      </CardTitle>
                      <CardDescription>
                        Lecture : membre courant ou admin. Écriture : membre courant, équipe non éliminée.
                      </CardDescription>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMessages}
                        disabled={!selectedTeam}
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Historique
                      </Button>
                      {wsStatus === "connected" || wsStatus === "connecting" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDisconnectWs}
                          className="text-xs"
                        >
                          <WifiOff className="h-3 w-3 mr-1" />
                          Déconnecter
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleConnectWs}
                          disabled={!selectedTeam || !authToken}
                          className="text-xs"
                        >
                          <Wifi className="h-3 w-3 mr-1" />
                          Connecter le WS
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 max-h-72 overflow-y-auto p-2 rounded-md border bg-muted/30">
                    {chatMessages.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-8">
                        Aucun message. Chargez l'historique ou connectez le WebSocket.
                      </div>
                    ) : (
                      chatMessages.map((m) => {
                        const isMine = m.author_id === currentUser.id
                        return (
                          <div
                            key={m.id}
                            className={`text-xs p-2 rounded-md max-w-[85%] ${
                              isMine
                                ? "ml-auto bg-primary text-primary-foreground"
                                : "bg-card border"
                            }`}
                          >
                            <div className="font-semibold flex items-center justify-between gap-2">
                              <span>{m.author_username || "Système"}</span>
                              <span
                                className={`text-[10px] font-normal ${
                                  isMine
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {new Date(m.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="mt-0.5 break-words">{m.content}</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Votre message..."
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return
                        if (wsStatus === "connected") handleSendMessageWs()
                        else handleSendMessageRest()
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendMessageRest}
                      disabled={!selectedTeam || !chatInput.trim()}
                      className="text-xs whitespace-nowrap"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      REST
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendMessageWs}
                      disabled={wsStatus !== "connected" || !chatInput.trim()}
                      className="text-xs whitespace-nowrap"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      WS
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Journal WebSocket */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Radio className="h-4 w-4" />
                    Journal WebSocket
                  </CardTitle>
                  <CardDescription>
                    Trames système (connexion, révocation B-17/B-18) et erreurs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5 max-h-96 overflow-y-auto text-xs font-mono">
                  {wsLog.length === 0 ? (
                    <div className="text-muted-foreground text-center py-6">
                      Aucun événement.
                    </div>
                  ) : (
                    wsLog.map((entry, i) => (
                      <div
                        key={i}
                        className={`p-1.5 rounded border ${
                          entry.kind === "error"
                            ? "border-destructive/40 bg-destructive/5 text-destructive"
                            : entry.kind === "system"
                            ? "border-amber-500/40 bg-amber-500/5"
                            : entry.kind === "message"
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[10px] opacity-70">{entry.timestamp}</span>{" "}
                        — {entry.text}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 6: CRÉER UTILISATEUR */}
          <TabsContent value="users" className="space-y-4">
            <Card className="max-w-md mx-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Créer un compte (POST /api/v1/auth/register)
                </CardTitle>
                <CardDescription>
                  Inscrire un nouvel utilisateur pour tester les interactions multi-comptes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Nom d'utilisateur</Label>
                  <Input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ex: player_charlie"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Adresse Email</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="charlie@tournament.local"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mot de passe</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Rôle global</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={newRole === "player" ? "default" : "outline"}
                      onClick={() => setNewRole("player")}
                      className="flex-1"
                    >
                      Joueur (player)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={newRole === "admin" ? "default" : "outline"}
                      onClick={() => setNewRole("admin")}
                      className="flex-1"
                    >
                      Admin (admin)
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleRegisterUser}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Enregistrer l'utilisateur
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Console / Log des réponses API en direct */}
        <Card className="border-border shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary animate-pulse" />
                Console d'exécution API en direct
              </CardTitle>
              <CardDescription>
                Affiche les requêtes envoyées, codes de retour HTTP (200, 201, 403, 409, 422...) et corps de réponse JSON.
              </CardDescription>
            </div>
            {apiLogs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setApiLogs([])}
                className="text-xs text-muted-foreground h-7"
              >
                Effacer l'historique
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {apiLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-md border-dashed font-mono">
                Aucune requête exécutée pour l'instant. Cliquez sur une action ci-dessus pour observer la réponse de l'API.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {apiLogs.map((log, index) => {
                  const isSuccess = log.status >= 200 && log.status < 300
                  return (
                    <div
                      key={index}
                      className="p-2.5 rounded-md border bg-card text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.method === "GET"
                                ? "secondary"
                                : log.method === "POST"
                                ? "default"
                                : log.method === "PATCH"
                                ? "warning"
                                : "destructive"
                            }
                            className="text-[10px] px-1.5 py-0 uppercase"
                          >
                            {log.method}
                          </Badge>
                          <span className="font-semibold text-foreground">
                            {log.endpoint}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isSuccess ? "success" : "destructive"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            HTTP {log.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {log.timestamp}
                          </span>
                        </div>
                      </div>

                      {log.data !== null && log.data !== undefined && (
                        <pre className="p-2 rounded bg-muted/70 text-[11px] overflow-x-auto text-muted-foreground">
                          {typeof log.data === "string"
                            ? log.data
                            : JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
