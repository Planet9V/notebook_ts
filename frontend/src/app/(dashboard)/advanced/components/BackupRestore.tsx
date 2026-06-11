'use client'

import { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useRestoreBackup,
  useUploadRestoreBackup,
  useBackupSchedules,
  useCreateBackupSchedule,
  useUpdateBackupSchedule,
  useDeleteBackupSchedule,
} from '@/lib/hooks/use-backup'
import { backupApi } from '@/lib/api/backup'
import { useTranslation } from '@/lib/hooks/use-translation'
import {
  Download,
  Trash2,
  UploadCloud,
  RotateCcw,
  Calendar,
  Clock,
  Plus,
  Database,
  Loader2,
  AlertTriangle,
  FileArchive,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'

export function BackupRestore() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data fetching
  const { data: backups = [], isLoading: isLoadingBackups } = useBackups()
  const { data: schedules = [], isLoading: isLoadingSchedules } = useBackupSchedules()

  // Mutations
  const createBackupMutation = useCreateBackup()
  const deleteBackupMutation = useDeleteBackup()
  const restoreBackupMutation = useRestoreBackup()
  const uploadRestoreMutation = useUploadRestoreBackup()
  const createScheduleMutation = useCreateBackupSchedule()
  const updateScheduleMutation = useUpdateBackupSchedule()
  const deleteScheduleMutation = useDeleteBackupSchedule()

  // States
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null)
  const [selectedBackupName, setSelectedBackupName] = useState<string | null>(null)
  const [isRestoreOpen, setIsRestoreOpen] = useState(false)
  const [isUploadRestoreOpen, setIsUploadRestoreOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  // Schedule form states
  const [scheduleName, setScheduleName] = useState('')
  const [cronExpr, setCronExpr] = useState('0 0 * * 0') // Default weekly
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false)

  // Format bytes to MB/KB
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // File Upload Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith('.zip')) {
        setUploadedFile(file)
        setIsUploadRestoreOpen(true)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith('.zip')) {
        setUploadedFile(file)
        setIsUploadRestoreOpen(true)
      }
    }
  }

  // Restore operations
  const handleRestoreClick = (id: string, name: string) => {
    setSelectedBackupId(id)
    setSelectedBackupName(name)
    setIsRestoreOpen(true)
  }

  const confirmRestore = async () => {
    if (selectedBackupId) {
      await restoreBackupMutation.mutateAsync(selectedBackupId)
      setIsRestoreOpen(false)
      setSelectedBackupId(null)
      setSelectedBackupName(null)
    }
  }

  const confirmUploadRestore = async () => {
    if (uploadedFile) {
      await uploadRestoreMutation.mutateAsync(uploadedFile)
      setIsUploadRestoreOpen(false)
      setUploadedFile(null)
    }
  }

  // Schedule operations
  const handleCreateScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleName.trim() || !cronExpr.trim()) return

    await createScheduleMutation.mutateAsync({
      name: scheduleName,
      cron_expression: cronExpr,
      enabled: true,
    })

    setScheduleName('')
    setCronExpr('0 0 * * 0')
    setIsScheduleFormOpen(false)
  }

  const handleToggleSchedule = async (id: string, currentStatus: boolean) => {
    await updateScheduleMutation.mutateAsync({
      id,
      data: { enabled: !currentStatus },
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Card with Actions */}
      <Card className="border border-violet-500/20 shadow-xl overflow-hidden relative bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-black">
        {/* Glowing background shapes for premium look */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-32 -mb-32"></div>

        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
            <Database className="h-6 w-6 text-violet-400" />
            Backup & Restore Manager
          </CardTitle>
          <CardDescription className="text-slate-400">
            Export a full database snapshot (SurrealDB records) and source upload directory to a secure ZIP file. Schedules can trigger automatically in the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 relative z-10">
          {/* Create Backup trigger */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col justify-between hover:border-violet-500/30 transition-all group">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">Instant Snapshot</h3>
              <p className="text-sm text-slate-400">
                Trigger a manual export of your database schema, documents, and LangGraph checkpoints immediately.
              </p>
            </div>
            <div className="pt-6">
              <Button
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-violet-950/50 relative overflow-hidden transition-all duration-300"
              >
                {createBackupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                    Backing Up System...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4 text-violet-200" />
                    Create Backup Now
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Restore trigger */}
          <div
            className={`p-6 rounded-2xl border transition-all flex flex-col justify-center items-center text-center cursor-pointer relative overflow-hidden group min-h-[180px] ${
              isDragActive
                ? 'border-violet-500 bg-violet-950/20'
                : 'border-slate-800 bg-slate-900/50 hover:border-indigo-500/30'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".zip"
              className="hidden"
            />
            <div className="space-y-2 pointer-events-none flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700/80 transition-all border border-slate-700">
                <UploadCloud className="h-6 w-6 text-indigo-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">Upload & Restore</h3>
              <p className="text-xs text-slate-400 max-w-[280px]">
                Drag and drop a previously downloaded backup ZIP file here, or click to browse.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Backup History Table */}
      <Card className="border border-slate-800 bg-slate-900/30 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-indigo-400" />
            Backup History
          </CardTitle>
          <CardDescription>
            List of manually created and scheduled system backups. Size excludes similarity vector embeddings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBackups ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <span className="text-sm text-slate-400">Loading backups list...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-800 rounded-xl">
              <FileArchive className="h-10 w-10 text-slate-600 mb-2" />
              <span className="text-sm font-medium text-slate-400">No backups found</span>
              <p className="text-xs text-slate-500 mt-1">
                Run a manual backup or configure schedules to create your first archive.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase text-xs tracking-wider">
                    <th className="p-4">Filename</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Created At</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {backups.map((bk) => (
                    <tr key={bk.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-white max-w-[200px] truncate" title={bk.filename}>
                        {bk.filename}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          bk.backup_type === 'manual'
                            ? 'bg-violet-950/40 text-violet-300 border-violet-800/40'
                            : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40'
                        }`}>
                          {bk.backup_type === 'manual' ? 'Manual' : 'Scheduled'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        {formatBytes(bk.size)}
                      </td>
                      <td className="p-4 text-slate-400 text-xs">
                        {bk.created_at ? new Date(bk.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => backupApi.download(bk.filename)}
                          title="Download Backup"
                          className="h-8 w-8 hover:text-indigo-400 hover:border-indigo-500/30 border-slate-800 bg-slate-900/40"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRestoreClick(bk.id, bk.filename)}
                          title="Restore Backup"
                          className="h-8 w-8 hover:text-yellow-400 hover:border-yellow-500/30 border-slate-800 bg-slate-900/40"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteBackupMutation.mutate(bk.id)}
                          disabled={deleteBackupMutation.isPending}
                          title="Delete Backup"
                          className="h-8 w-8 hover:text-red-400 hover:border-red-500/30 border-slate-800 bg-slate-900/40"
                        >
                          {deleteBackupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Schedules Control */}
      <Card className="border border-slate-800 bg-slate-900/30 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-400" />
              Automated Schedules
            </CardTitle>
            <CardDescription>
              Configure background jobs that automatically backup database snapshots using standard cron format.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScheduleFormOpen(!isScheduleFormOpen)}
            className="border-slate-800 hover:border-violet-500/30 bg-slate-900/40 text-xs font-semibold gap-1"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schedule Form */}
          {isScheduleFormOpen && (
            <form onSubmit={handleCreateScheduleSubmit} className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sched-name" className="text-xs font-semibold text-slate-300">Schedule Name</Label>
                  <Input
                    id="sched-name"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder="e.g. Daily Midnight Backup"
                    required
                    className="bg-slate-950 border-slate-800 focus:border-violet-500 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sched-cron" className="text-xs font-semibold text-slate-300">Cron Expression</Label>
                  <Input
                    id="sched-cron"
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    placeholder="e.g. 0 0 * * *"
                    required
                    className="bg-slate-950 border-slate-800 focus:border-violet-500 text-sm"
                  />
                </div>
              </div>

              {/* Preset selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium mr-2">Presets:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCronExpr('*/10 * * * *')}
                  className="text-xs border-slate-800 hover:bg-slate-800"
                >
                  Every 10 min
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCronExpr('0 * * * *')}
                  className="text-xs border-slate-800 hover:bg-slate-800"
                >
                  Hourly
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCronExpr('0 0 * * *')}
                  className="text-xs border-slate-800 hover:bg-slate-800"
                >
                  Daily
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCronExpr('0 0 * * 0')}
                  className="text-xs border-slate-800 hover:bg-slate-800"
                >
                  Weekly
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCronExpr('0 0 1 * *')}
                  className="text-xs border-slate-800 hover:bg-slate-800"
                >
                  Monthly
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScheduleFormOpen(false)}
                  className="border-slate-800 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createScheduleMutation.isPending}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                >
                  {createScheduleMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Save Schedule
                </Button>
              </div>
            </form>
          )}

          {/* List of Schedules */}
          {isLoadingSchedules ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded-xl">
              No schedules active. Trigger creation with "Add Schedule".
            </p>
          ) : (
            <div className="space-y-3">
              {schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between group hover:border-slate-700/60 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{sc.name}</span>
                      <code className="text-xs text-violet-400 bg-violet-950/30 px-1.5 py-0.5 rounded border border-violet-900/30">
                        {sc.cron_expression}
                      </code>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last run: {sc.last_run_at ? new Date(sc.last_run_at).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Beautiful Custom Switch for Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleSchedule(sc.id, sc.enabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        sc.enabled ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          sc.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteScheduleMutation.mutate(sc.id)}
                      disabled={deleteScheduleMutation.isPending}
                      className="h-8 w-8 border-slate-800 hover:text-red-400 hover:border-red-500/30 bg-slate-900/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Restore Warning Dialog */}
      <Dialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <DialogContent className="border border-slate-800 bg-slate-950 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500 font-bold text-lg">
              <AlertTriangle className="h-5 w-5" />
              Destructive System Operation
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              You are about to restore the system to a previous state.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Alert variant="destructive" className="border-red-900/50 bg-red-950/20 text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-semibold">Warning</AlertTitle>
              <AlertDescription className="text-xs">
                Restoring backup <strong className="font-mono text-white">{selectedBackupName}</strong> will completely drop your current SurrealDB database tables and replace them. All uploaded file sources will be replaced with files from the archive.
              </AlertDescription>
            </Alert>
            <p className="text-xs text-slate-400">
              This action cannot be undone. Please ensure you have backed up any critical current work before executing the restore.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRestoreOpen(false)}
              className="border-slate-800 hover:bg-slate-850"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRestore}
              disabled={restoreBackupMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-500 text-white font-medium gap-1.5"
            >
              {restoreBackupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring System...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Confirm Restore
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Upload & Restore Warning Dialog */}
      <Dialog open={isUploadRestoreOpen} onOpenChange={setIsUploadRestoreOpen}>
        <DialogContent className="border border-slate-800 bg-slate-950 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500 font-bold text-lg">
              <AlertTriangle className="h-5 w-5" />
              Confirm Database Overwrite
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Restore the system using uploaded file archive.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Alert variant="destructive" className="border-red-900/50 bg-red-950/20 text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-semibold">Destructive Action</AlertTitle>
              <AlertDescription className="text-xs">
                Restoring from <strong className="font-mono text-white">{uploadedFile?.name}</strong> will overwrite all existing database data, documents, and system state with the contents of the zip file.
              </AlertDescription>
            </Alert>
            <p className="text-xs text-slate-400">
              Please double check that the file you uploaded is a valid backup ZIP archive previously exported from this application.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadRestoreOpen(false)
                setUploadedFile(null)
              }}
              className="border-slate-800 hover:bg-slate-850"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUploadRestore}
              disabled={uploadRestoreMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white font-medium gap-1.5"
            >
              {uploadRestoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring Uploaded Archive...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Overwrite & Restore
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
