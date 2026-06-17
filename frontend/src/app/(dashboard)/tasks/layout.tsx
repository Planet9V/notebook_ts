import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Task Management | Tetrel',
  description: 'First-class collaborative task tracking and workflow coordination.',
}

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
