'use client'

import { useState, useMemo, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
  Calendar,
  User,
  Trash,
  Tag,
  Briefcase,
  Book,
} from 'lucide-react'

// Hooks
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/hooks/use-tasks'
import { useUsers } from '@/lib/hooks/use-users'
import { useProjects } from '@/lib/hooks/use-projects'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useAuth } from '@/lib/hooks/use-auth'

// Types
import type { TaskTable, CreateTaskTableRequest } from '@/lib/types/task-table'

const TASK_COLUMNS = [
  { id: 'todo', title: 'To Do', borderClass: 'border-t-slate-500', badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  { id: 'in_progress', title: 'In Progress', borderClass: 'border-t-cyan-500', badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  { id: 'review', title: 'Review', borderClass: 'border-t-amber-500', badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  { id: 'done', title: 'Done', borderClass: 'border-t-emerald-500', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { id: 'cancelled', title: 'Cancelled', borderClass: 'border-t-rose-500', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
]

export default function TasksPage() {
  const { data: users = [] } = useUsers()
  const currentUser = users[0] || null
  const { data: projects = [] } = useProjects()
  const { data: customers = [] } = useCustomers()
  const { data: notebooks = [] } = useNotebooks()

  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [myTasksOnly, setMyTasksOnly] = useState(false)

  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskTable | null>(null)

  // Form Fields State
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState('todo')
  const [formPriority, setFormPriority] = useState('medium')
  const [formDueDate, setFormDueDate] = useState('')
  const [formAssignedTo, setFormAssignedTo] = useState('none')
  const [formProjectId, setFormProjectId] = useState('none')
  const [formCustomerId, setFormCustomerId] = useState('none')
  const [formNotebookId, setFormNotebookId] = useState('none')
  const [formTagsStr, setFormTagsStr] = useState('')

  // Query and Mutations
  const { data: tasks = [], isLoading, refetch } = useTasks()
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()

  useEffect(() => {
    document.title = 'Tasks Board | Tetrel'
  }, [])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      )
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter)
    }

    if (myTasksOnly && currentUser) {
      result = result.filter(
        (t) => t.assigned_to === currentUser.id || t.assigned_to === `user:${currentUser.username}`
      )
    }

    return result
  }, [tasks, searchQuery, priorityFilter, myTasksOnly, currentUser])

  // Group tasks by column
  const boardData = useMemo(() => {
    const groups: Record<string, TaskTable[]> = Object.fromEntries(
      TASK_COLUMNS.map((col) => [col.id, []])
    )
    filteredTasks.forEach((t) => {
      const colId = t.status || 'todo'
      if (groups[colId]) {
        groups[colId].push(t)
      } else {
        groups['todo'].push(t)
      }
    })
    return groups
  }, [filteredTasks])

  // Calculate task statistics
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const mine = currentUser
      ? tasks.filter((t) => t.assigned_to === currentUser.id || t.assigned_to === `user:${currentUser.username}`).length
      : 0
    const critical = tasks.filter((t) => t.priority === 'critical' && t.status !== 'done').length

    return { total, done, mine, critical }
  }, [tasks, currentUser])

  // Drag and drop handler
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const destColId = destination.droppableId

    try {
      await updateTaskMutation.mutateAsync({
        id: draggableId,
        data: { status: destColId },
      })
      toast.success('Task status updated')
    } catch {
      toast.error('Failed to update task status')
    }
  }

  // Open task for editing
  const handleOpenEdit = (task: TaskTable) => {
    setEditingTask(task)
    setFormTitle(task.title)
    setFormDescription(task.description || '')
    setFormStatus(task.status)
    setFormPriority(task.priority || 'medium')
    setFormDueDate(task.due_date || '')
    setFormAssignedTo(task.assigned_to || 'none')
    setFormProjectId(task.project_id || 'none')
    setFormCustomerId(task.customer_id || 'none')
    setFormNotebookId(task.notebook_id || 'none')
    setFormTagsStr(task.tags ? task.tags.join(', ') : '')
    setCreateDialogOpen(true)
  }

  // Open modal for new task
  const handleOpenCreate = (statusId: string = 'todo') => {
    setEditingTask(null)
    setFormTitle('')
    setFormDescription('')
    setFormStatus(statusId)
    setFormPriority('medium')
    setFormDueDate('')
    setFormAssignedTo('none')
    setFormProjectId('none')
    setFormCustomerId('none')
    setFormNotebookId('none')
    setFormTagsStr('')
    setCreateDialogOpen(true)
  }

  // Form submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast.error('Task title is required')
      return
    }

    const payload: CreateTaskTableRequest = {
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      status: formStatus,
      priority: formPriority,
      due_date: formDueDate || undefined,
      assigned_to: formAssignedTo === 'none' ? undefined : formAssignedTo,
      project_id: formProjectId === 'none' ? undefined : formProjectId,
      customer_id: formCustomerId === 'none' ? undefined : formCustomerId,
      notebook_id: formNotebookId === 'none' ? undefined : formNotebookId,
      tags: formTagsStr ? formTagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }

    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({
          id: editingTask.id,
          data: payload,
        })
      } else {
        await createTaskMutation.mutateAsync(payload)
      }
      setCreateDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Error saving task')
    }
  }

  // Delete task
  const handleDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTaskMutation.mutateAsync(taskId)
        setCreateDialogOpen(false)
      } catch {
        toast.error('Failed to delete task')
      }
    }
  }

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      case 'high':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'medium':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
      case 'low':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.replace('user:', '').split(':')
    const userPart = parts[parts.length - 1]
    return userPart.slice(0, 2).toUpperCase()
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background/95">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Task Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Collaborative, relational task management. Connect tasks to projects, customers, or notebooks.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-9 border-sidebar-border hover:bg-sidebar-accent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => handleOpenCreate('todo')}
                className="h-9 px-4 flex items-center gap-1.5 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Tasks', value: stats.total, color: 'text-slate-400', icon: Clock },
              { label: 'My Tasks', value: stats.mine, color: 'text-cyan-500', icon: User },
              { label: 'Completed Tasks', value: stats.done, color: 'text-emerald-500', icon: CheckCircle },
              { label: 'Unresolved Critical', value: stats.critical, color: 'text-rose-500', icon: AlertTriangle },
            ].map((s, idx) => {
              const Icon = s.icon
              return (
                <Card key={idx} className="bg-background/40 backdrop-blur-md border-sidebar-border/40 shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={cn('rounded-lg p-2 bg-sidebar-accent/50', s.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className={cn('text-xl font-bold font-mono', s.color)}>{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-background/20 backdrop-blur-sm border border-sidebar-border/50 rounded-xl p-4">
            <div className="flex flex-1 items-center gap-3 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/40 border-sidebar-border"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px] bg-background/40 border-sidebar-border">
                  <SelectValue placeholder="Priority Filter" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 border-sidebar-border">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <label className="flex items-center gap-2 text-sm text-foreground select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={myTasksOnly}
                  onChange={(e) => setMyTasksOnly(e.target.checked)}
                  className="rounded border-sidebar-border text-primary focus:ring-primary h-4 w-4 bg-background/40"
                />
                Assigned to me only
              </label>
            </div>
          </div>

          {/* Kanban Board Container */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto">
                <div
                  className="grid gap-4 items-start h-[calc(100vh-270px)] min-h-[500px]"
                  style={{
                    gridTemplateColumns: `repeat(${TASK_COLUMNS.length}, minmax(0, 1fr))`,
                    minWidth: `${TASK_COLUMNS.length * 240}px`,
                  }}
                >
                  {TASK_COLUMNS.map((col) => (
                    <div
                      key={col.id}
                      className="flex flex-col bg-background/30 border border-sidebar-border/50 rounded-xl p-3 h-full overflow-hidden shadow-sm backdrop-blur-sm relative"
                    >
                      {/* Ribbon */}
                      <div className={cn('absolute top-0 left-0 right-0 h-1 border-t-2', col.borderClass)} />

                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 mt-1.5 px-1 shrink-0 border-b border-sidebar-border/40">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <h3 className="font-semibold text-sm truncate text-foreground">{col.title}</h3>
                          <Badge variant="outline" className={cn('font-mono text-[10px] shrink-0', col.badgeClass)}>
                            {boardData[col.id]?.length || 0}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenCreate(col.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Drop area */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <ScrollArea
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              'flex-1 overflow-y-auto mt-3 rounded-lg pr-1.5 transition-colors duration-200',
                              snapshot.isDraggingOver ? 'bg-sidebar-accent/15' : ''
                            )}
                          >
                            <div className="space-y-3 pb-4 min-h-[150px]">
                              {boardData[col.id]?.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(providedSnapshot, dragSnapshot) => (
                                    <Card
                                      ref={providedSnapshot.innerRef}
                                      {...providedSnapshot.draggableProps}
                                      {...providedSnapshot.dragHandleProps}
                                      onClick={() => handleOpenEdit(task)}
                                      className={cn(
                                        'bg-background/80 border-sidebar-border/50 hover:border-primary/20 hover:shadow-md cursor-pointer transition-all duration-200 select-none group',
                                        dragSnapshot.isDragging ? 'shadow-xl scale-102 border-primary rotate-1' : ''
                                      )}
                                    >
                                      <CardContent className="p-3.5 space-y-3">
                                        <div className="flex items-start justify-between gap-1.5">
                                          <h4 className="font-semibold text-xs text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                                            {task.title}
                                          </h4>
                                          {task.priority && (
                                            <Badge
                                              variant="outline"
                                              className={cn('text-[9px] font-semibold py-0.5 px-1.5 uppercase font-mono tracking-wider shrink-0', getPriorityBadgeColor(task.priority))}
                                            >
                                              {task.priority}
                                            </Badge>
                                          )}
                                        </div>

                                        {task.description && (
                                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                            {task.description}
                                          </p>
                                        )}

                                        {/* Task relation links indicators */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {task.project_id && (
                                            <Badge variant="secondary" className="text-[9px] font-medium py-0 px-1 border border-border/10 flex items-center gap-0.5 max-w-[150px]">
                                              <Briefcase className="h-2.5 w-2.5 shrink-0" />
                                              <span className="truncate">
                                                {projects.find(p => p.id === task.project_id || str(p.id) === task.project_id)?.name || 'Project'}
                                              </span>
                                            </Badge>
                                          )}
                                          {task.notebook_id && (
                                            <Badge variant="secondary" className="text-[9px] font-medium py-0 px-1 border border-border/10 flex items-center gap-0.5 max-w-[150px]">
                                              <Book className="h-2.5 w-2.5 shrink-0" />
                                              <span className="truncate">
                                                {notebooks.find(n => n.id === task.notebook_id || str(n.id) === task.notebook_id)?.name || 'Workspace'}
                                              </span>
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Footer: Due Date and Assignee */}
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-2 border-t border-sidebar-border/10 shrink-0">
                                          {task.due_date ? (
                                            <span className="flex items-center gap-1 text-amber-500 font-medium">
                                              <Calendar className="h-3 w-3 shrink-0" />
                                              {task.due_date}
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3 opacity-30 shrink-0" />
                                              No due date
                                            </span>
                                          )}

                                          {task.assigned_to && (
                                            <div
                                              className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold uppercase shrink-0"
                                              title={`Assigned to ${task.assigned_to}`}
                                            >
                                              {getInitials(task.assigned_to)}
                                            </div>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}

                              {(!boardData[col.id] || boardData[col.id].length === 0) && (
                                <div className="flex flex-col items-center justify-center border border-dashed border-sidebar-border/30 rounded-xl p-6 text-center text-muted-foreground mt-4 h-32 shrink-0">
                                  <Clock className="h-6 w-6 mb-1 opacity-20" />
                                  <p className="text-[11px] font-semibold">No tasks in this stage</p>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => handleOpenCreate(col.id)}
                                    className="text-[10px] text-primary p-0 h-auto mt-1"
                                  >
                                    + Add Item
                                  </Button>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg bg-background border-sidebar-border">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task Detail' : 'Create First-class Task'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Write task title..."
                className="bg-background/40 border-sidebar-border"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Details of the task assignment..."
                className="bg-background/40 border-sidebar-border min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="task-status">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger id="task-status" className="bg-background/40 border-sidebar-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border">
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger id="task-priority" className="bg-background/40 border-sidebar-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="bg-background/40 border-sidebar-border"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="task-assignee">Assign To</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger id="task-assignee" className="bg-background/40 border-sidebar-border">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-sidebar-border/30 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Project Link</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger className="bg-background/40 border-sidebar-border text-xs h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border text-xs">
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Customer Link</Label>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger className="bg-background/40 border-sidebar-border text-xs h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border text-xs">
                    <SelectItem value="none">None</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Workspace (Deal)</Label>
                <Select value={formNotebookId} onValueChange={setFormNotebookId}>
                  <SelectTrigger className="bg-background/40 border-sidebar-border text-xs h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-sidebar-border text-xs">
                    <SelectItem value="none">None</SelectItem>
                    {notebooks.map((n) => (
                      <SelectItem key={n.id} value={n.id} className="text-xs">
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-tags">Tags (comma separated)</Label>
              <Input
                id="task-tags"
                value={formTagsStr}
                onChange={(e) => setFormTagsStr(e.target.value)}
                placeholder="e.g. security, audit, core"
                className="bg-background/40 border-sidebar-border"
              />
            </div>

            <DialogFooter className="flex items-center justify-between border-t border-sidebar-border/30 pt-3">
              {editingTask ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDelete(editingTask.id)}
                  className="mr-auto"
                >
                  <Trash className="h-4 w-4 mr-1.5" />
                  Delete Task
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

function str(v: any) {
  return String(v)
}
