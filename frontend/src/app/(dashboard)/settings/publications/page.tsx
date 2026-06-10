'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { publicationsApi } from '@/lib/api/publications'
import { EmailSettings } from '@/lib/types/publications'
import { SettingsTabs } from '../components/SettingsTabs'
import { Mail, Server, Key, ShieldCheck, RefreshCw, Loader2, Link2, Globe, FileText, FileSpreadsheet, Layout, CheckCircle2, AlertCircle } from 'lucide-react'
import { credentialsApi } from '@/lib/api/credentials'

export default function PublicationsSettingsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  // Form Fields
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [useTls, setUseTls] = useState(true)
  const [oauthProvider, setOauthProvider] = useState<string>('none')
  const [oauthTokenRef, setOauthTokenRef] = useState('')

  // Google Workspace Exporters Form Fields
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleRedirectUri, setGoogleRedirectUri] = useState('http://localhost:5055/api/credentials/oauth/callback')
  const [googleScopes, setGoogleScopes] = useState<string[]>([
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive.file'
  ])
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [googleSaving, setGoogleSaving] = useState(false)

  // Loading States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  // Load Settings
  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await publicationsApi.getSettings()
      setSmtpHost(data.smtp_host || '')
      setSmtpPort(data.smtp_port !== null ? String(data.smtp_port) : '')
      setSmtpUsername(data.smtp_username || '')
      setSmtpPassword(data.smtp_password || '')
      setUseTls(data.use_tls)
      setOauthProvider(data.oauth_provider || 'none')
      setOauthTokenRef(data.oauth_token_ref || '')

      // Also load Google Workspace credentials
      try {
        setGoogleLoading(true)
        const googleCred = await credentialsApi.get("credential:google_docs")
        setGoogleClientId(googleCred.client_id || '')
        setGoogleClientSecret(googleCred.has_client_secret ? '••••••••••••' : '')
        setGoogleRedirectUri(googleCred.redirect_uri || 'http://localhost:5055/api/credentials/oauth/callback')
        if (googleCred.scopes && googleCred.scopes.length > 0) {
          setGoogleScopes(googleCred.scopes)
        }
        setIsGoogleConnected(!!googleCred.has_refresh_token)
      } catch (gerr) {
        console.error("Failed to load Google credentials:", gerr)
      } finally {
        setGoogleLoading(false)
      }
    } catch (err: any) {
      toast({
        title: 'Error Loading Settings',
        description: err.response?.data?.detail || err.message || 'Error occurred connecting to API',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Publications & Email Settings | Tetrel'
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const payload: EmailSettings = {
        smtp_host: smtpHost || null,
        smtp_port: smtpPort ? Number(smtpPort) : null,
        smtp_username: smtpUsername || null,
        smtp_password: smtpPassword || null,
        use_tls: useTls,
        oauth_provider: oauthProvider !== 'none' ? oauthProvider : null,
        oauth_token_ref: oauthTokenRef || null,
      }
      await publicationsApi.updateSettings(payload)
      toast({
        title: 'Settings Saved',
        description: 'Email & Publications configuration saved successfully.',
      })
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.response?.data?.detail || err.message || 'Error occurred saving settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      const payload: EmailSettings = {
        smtp_host: smtpHost || null,
        smtp_port: smtpPort ? Number(smtpPort) : null,
        smtp_username: smtpUsername || null,
        smtp_password: smtpPassword || null,
        use_tls: useTls,
        oauth_provider: oauthProvider !== 'none' ? oauthProvider : null,
        oauth_token_ref: oauthTokenRef || null,
      }
      const res = await publicationsApi.testSettings(payload)
      toast({
        title: 'Connection Test Successful',
        description: res.message || 'SMTP Server connection passed.',
      })
    } catch (err: any) {
      toast({
        title: 'Connection Test Failed',
        description: err.response?.data?.detail || err.message || 'SMTP Connection failure',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveGoogleConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setGoogleSaving(true)
      await credentialsApi.update("credential:google_docs", {
        client_id: googleClientId || undefined,
        client_secret: googleClientSecret !== '••••••••••••' ? googleClientSecret : undefined,
        redirect_uri: googleRedirectUri || undefined,
        scopes: googleScopes,
      })
      toast({
        title: 'Google Config Saved',
        description: 'Google Workspace OAuth configuration saved successfully.',
      })
      // Reload settings to update the linked states and masked values
      await loadSettings()
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.response?.data?.detail || err.message || 'Error occurred saving Google configuration',
        variant: 'destructive',
      })
    } finally {
      setGoogleSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 mb-2">
              <h1 className="text-2xl font-semibold tracking-tight">{t('navigation.settings')}</h1>
              <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading}>
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Sub Navigation Tabs */}
            <SettingsTabs />

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {/* SMTP Email Settings Card */}
                <Card className="tetrel-glass border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Mail className="h-5 w-5 text-primary" />
                      SMTP Outbound Server Config
                    </CardTitle>
                    <CardDescription>
                      Configure your company SMTP relay to deliver automated newsletters and security digests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* SMTP Host */}
                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="smtpHost" className="flex items-center gap-1.5">
                            <Server className="h-3.5 w-3.5 text-muted-foreground" />
                            SMTP Host / Server Address
                          </Label>
                          <Input
                            id="smtpHost"
                            placeholder="e.g., smtp.gmail.com"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                          />
                        </div>

                        {/* SMTP Port */}
                        <div className="space-y-1.5">
                          <Label htmlFor="smtpPort">Port</Label>
                          <Input
                            id="smtpPort"
                            type="number"
                            placeholder="e.g., 587"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SMTP Username */}
                        <div className="space-y-1.5">
                          <Label htmlFor="smtpUsername">Username / Outbound Address</Label>
                          <Input
                            id="smtpUsername"
                            placeholder="e.g., security@company.com"
                            value={smtpUsername}
                            onChange={(e) => setSmtpUsername(e.target.value)}
                          />
                        </div>

                        {/* SMTP Password */}
                        <div className="space-y-1.5">
                          <Label htmlFor="smtpPassword" className="flex items-center gap-1.5">
                            <Key className="h-3.5 w-3.5 text-muted-foreground" />
                            SMTP Password
                          </Label>
                          <Input
                            id="smtpPassword"
                            type="password"
                            placeholder="••••••••••••"
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* TLS Checkbox */}
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="useTls"
                          checked={useTls}
                          onCheckedChange={(checked) => setUseTls(!!checked)}
                        />
                        <Label htmlFor="useTls" className="flex items-center gap-1.5 cursor-pointer font-normal">
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          Secure using Transport Layer Security (TLS) / STARTTLS
                        </Label>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/30 pt-4 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={testing || saving}
                          className="flex items-center gap-1.5"
                        >
                          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Test Connection
                        </Button>

                        <Button type="submit" disabled={saving || testing}>
                          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                          Save SMTP Settings
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* OAuth Provider Integration Card */}
                <Card className="tetrel-glass border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Link2 className="h-5 w-5 text-primary" />
                      Social Media OAuth Integrations
                    </CardTitle>
                    <CardDescription>
                      Link your corporate LinkedIn and Twitter profiles to publish reports and marketing digests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="oauthProvider">Active Identity Provider</Label>
                      <Select value={oauthProvider} onValueChange={(val) => setOauthProvider(val)}>
                        <SelectTrigger id="oauthProvider">
                          <SelectValue placeholder="No OAuth configuration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Use SMTP credentials only)</SelectItem>
                          <SelectItem value="google">Google API OAuth Engine</SelectItem>
                          <SelectItem value="microsoft">Microsoft 365 OAuth Engine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OAuth Tokens</p>
                        <p className="text-sm font-medium text-foreground">
                          {oauthProvider !== 'none'
                            ? `Authorized via ${oauthProvider === 'google' ? 'Google API Client' : 'Microsoft Azure App'}`
                            : 'No provider selected'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {oauthProvider !== 'none'
                            ? 'Sandbox environment active. External requests will mock successfully.'
                            : 'OAuth status inactive. Outbound publications default to SMTP.'}
                        </p>
                      </div>

                      {oauthProvider !== 'none' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({
                              title: 'Sandbox Redirect',
                              description: `Simulated authentication callback with ${oauthProvider}. Mock token generated successfully.`,
                            })
                            setOauthTokenRef(`token_${oauthProvider}_${Math.random().toString(36).slice(2, 8)}`)
                          }}
                          className="flex items-center gap-1.5 self-start md:self-auto"
                        >
                          <Link2 className="h-4 w-4" />
                          Link Account
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Google Workspace & Drive Exporters Config Card */}
                <Card className="tetrel-glass border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Globe className="h-5 w-5 text-primary" />
                      Google Workspace & Drive Exporters
                    </CardTitle>
                    <CardDescription>
                      Configure Google OAuth 2.0 app credentials to export notebooks and canvas layouts directly to Google Docs, Slides, and Sheets.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {googleLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <form onSubmit={handleSaveGoogleConfig} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Client ID */}
                          <div className="space-y-1.5">
                            <Label htmlFor="googleClientId">Google Client ID</Label>
                            <Input
                              id="googleClientId"
                              placeholder="e.g., 123456-abc.apps.googleusercontent.com"
                              value={googleClientId}
                              onChange={(e) => setGoogleClientId(e.target.value)}
                            />
                          </div>

                          {/* Client Secret */}
                          <div className="space-y-1.5">
                            <Label htmlFor="googleClientSecret">Google Client Secret</Label>
                            <Input
                              id="googleClientSecret"
                              type="password"
                              placeholder="••••••••••••"
                              value={googleClientSecret}
                              onChange={(e) => setGoogleClientSecret(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Redirect URI (Read-only) */}
                        <div className="space-y-1.5">
                          <Label htmlFor="googleRedirectUri">OAuth Redirect URI (Read-only)</Label>
                          <Input
                            id="googleRedirectUri"
                            readOnly
                            value={googleRedirectUri}
                            className="bg-muted/40 cursor-not-allowed text-muted-foreground"
                          />
                          <p className="text-xs text-muted-foreground">
                            Add this exact URL to your Google Cloud Console Authorized redirect URIs.
                          </p>
                        </div>

                        {/* Scopes Selection */}
                        <div className="space-y-3">
                          <Label>Required Scopes</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg border border-border/30 bg-muted/20">
                            {[
                              {
                                id: 'docs',
                                scope: 'https://www.googleapis.com/auth/documents',
                                label: 'Google Docs API',
                                description: 'Create and edit documents',
                                icon: FileText
                              },
                              {
                                id: 'sheets',
                                scope: 'https://www.googleapis.com/auth/spreadsheets',
                                label: 'Google Sheets API',
                                description: 'Create and edit spreadsheets',
                                icon: FileSpreadsheet
                              },
                              {
                                id: 'slides',
                                scope: 'https://www.googleapis.com/auth/presentations',
                                label: 'Google Slides API',
                                description: 'Create and edit presentations',
                                icon: Layout
                              },
                              {
                                id: 'drive',
                                scope: 'https://www.googleapis.com/auth/drive.file',
                                label: 'Google Drive File API',
                                description: 'Save exports to your Drive',
                                icon: Server
                              }
                            ].map((item) => {
                              const IconComponent = item.icon
                              const checked = googleScopes.includes(item.scope)
                              return (
                                <div key={item.id} className="flex items-start space-x-3 p-2 hover:bg-muted/10 rounded-md transition-colors">
                                  <Checkbox
                                    id={`scope-${item.id}`}
                                    checked={checked}
                                    onCheckedChange={(isChecked) => {
                                      if (isChecked) {
                                        setGoogleScopes(prev => [...prev, item.scope])
                                      } else {
                                        setGoogleScopes(prev => prev.filter(s => s !== item.scope))
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`scope-${item.id}`} className="grid gap-1 cursor-pointer font-normal">
                                    <span className="text-sm font-semibold flex items-center gap-1.5">
                                      <IconComponent className="h-3.5 w-3.5 text-primary" />
                                      {item.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{item.description}</span>
                                  </Label>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Google Connection Status */}
                        <div className={cn(
                          "p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2",
                          isGoogleConnected
                            ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/5 border-amber-500/15 text-amber-600 dark:text-amber-400"
                        )}>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider">Account Connection Status</p>
                            <div className="flex items-center gap-1.5">
                              {isGoogleConnected ? (
                                <>
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                                  <span className="text-sm font-medium text-foreground">Linked with Google Workspace</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
                                  <span className="text-sm font-medium text-foreground">Google Account Not Connected</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {isGoogleConnected
                                ? 'Your organization is connected. Exports will automatically sync directly to your corporate Google Drive.'
                                : 'No refresh token stored. Fill Client ID/Secret, save settings, and click "Link Google Account" below.'}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant={isGoogleConnected ? "outline" : "default"}
                            size="sm"
                            disabled={!googleClientId || !googleClientSecret}
                            onClick={() => {
                              const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${googleClientId}&redirect_uri=${encodeURIComponent(googleRedirectUri)}&scope=${encodeURIComponent(googleScopes.join(' '))}&access_type=offline&prompt=consent`
                              window.open(authUrl, '_blank', 'width=600,height=700,status=no,toolbar=no,menubar=no')
                            }}
                            className="flex items-center gap-1.5 self-start md:self-auto"
                          >
                            <Link2 className="h-4 w-4" />
                            {isGoogleConnected ? 'Relink Account' : 'Link Google Account'}
                          </Button>
                        </div>

                        <div className="flex items-center justify-end border-t border-border/30 pt-4 mt-6">
                          <Button type="submit" disabled={googleSaving}>
                            {googleSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                            Save Google Config
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
