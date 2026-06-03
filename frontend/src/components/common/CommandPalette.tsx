'use client'

import { useEffect, useState, useCallback, useMemo, useId } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useTheme } from '@/lib/stores/theme-store'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Book,
  Search,
  Mic,
  Bot,
  Shuffle,
  Settings,
  FileText,
  Wrench,
  MessageCircleQuestion,
  Plus,
  Sun,
  Moon,
  Monitor,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import apiClient from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { TFunction } from 'i18next'

const getNavigationItems = (t: TFunction) => [
  { name: t('navigation.sources'), href: '/sources', icon: FileText, keywords: ['files', 'documents', 'upload'] },
  { name: t('navigation.notebooks'), href: '/notebooks', icon: Book, keywords: ['notes', 'research', 'projects'] },
  { name: t('navigation.askAndSearch'), href: '/search', icon: Search, keywords: ['find', 'query'] },
  { name: t('navigation.podcasts'), href: '/podcasts', icon: Mic, keywords: ['audio', 'episodes', 'generate'] },
  { name: t('navigation.models'), href: '/settings/api-keys', icon: Bot, keywords: ['ai', 'llm', 'providers', 'openai', 'anthropic'] },
  { name: t('navigation.transformations'), href: '/transformations', icon: Shuffle, keywords: ['prompts', 'templates', 'actions'] },
  { name: t('navigation.settings'), href: '/settings', icon: Settings, keywords: ['preferences', 'config', 'options'] },
  { name: t('navigation.advanced'), href: '/advanced', icon: Wrench, keywords: ['debug', 'system', 'tools'] },
]

const getCreateItems = (t: TFunction) => [
  { name: t('common.newSource'), action: 'source', icon: FileText },
  { name: t('common.newNotebook'), action: 'notebook', icon: Book },
  { name: t('common.newPodcast'), action: 'podcast', icon: Mic },
]

const getThemeItems = (t: TFunction) => [
  { name: t('common.light'), value: 'light' as const, icon: Sun, keywords: ['bright', 'day'] },
  { name: t('common.dark'), value: 'dark' as const, icon: Moon, keywords: ['night'] },
  { name: t('common.system'), value: 'system' as const, icon: Monitor, keywords: ['auto', 'default'] },
]

// Static memoized compliance framework index — all 66 CSET frameworks
const COMPLIANCE_FRAMEWORKS = [
  { id: 'ACSC_ESSENTIAL_8', name: 'ACSC Essential Eight', keywords: ['australia', 'maturity'] },
  { id: 'ANSSI_BP_006', name: 'ANSSI BP-006 (ICS Security)', keywords: ['france', 'industrial'] },
  { id: 'API_1164', name: 'API 1164 (Pipeline SCADA)', keywords: ['pipeline', 'oil', 'gas', 'scada'] },
  { id: 'AWWA_G430', name: 'AWWA G430 (Water Security)', keywords: ['water', 'utility'] },
  { id: 'AWWA_M19', name: 'AWWA M19 (Emergency Planning)', keywords: ['water', 'emergency'] },
  { id: 'BSI_IT_GRUNDSCHUTZ', name: 'BSI IT-Grundschutz', keywords: ['germany', 'baseline'] },
  { id: 'CFATS_RBPS', name: 'CFATS RBPS (Chemical Security)', keywords: ['chemical', 'facility'] },
  { id: 'CISA_CPG', name: 'CISA CPG (Cross-Sector Goals)', keywords: ['cisa', 'critical', 'infrastructure'] },
  { id: 'CIS_CONTROLS', name: 'CIS Controls v8', keywords: ['cis', 'benchmarks', 'hardening'] },
  { id: 'CMMC_L1', name: 'CMMC Level 1', keywords: ['dod', 'defense', 'contractor'] },
  { id: 'CMMC_L2', name: 'CMMC Level 2', keywords: ['dod', 'defense', 'contractor'] },
  { id: 'CMMC_L3', name: 'CMMC Level 3', keywords: ['dod', 'defense', 'contractor'] },
  { id: 'CNSSI_1253', name: 'CNSSI 1253 (National Security)', keywords: ['national', 'security', 'classified'] },
  { id: 'COBIT_2019', name: 'COBIT 2019 (IT Governance)', keywords: ['governance', 'isaca'] },
  { id: 'CRA', name: 'Cyber Resilience Act (EU)', keywords: ['eu', 'europe', 'resilience'] },
  { id: 'CRI_PROFILE', name: 'CRI Profile (Financial)', keywords: ['financial', 'banking', 'resilience'] },
  { id: 'CSA_CCM', name: 'CSA CCM (Cloud Controls)', keywords: ['cloud', 'saas'] },
  { id: 'DHS_CATALOG', name: 'DHS Cybersecurity Catalog', keywords: ['dhs', 'homeland'] },
  { id: 'DO_326A', name: 'DO-326A (Airborne Security)', keywords: ['aviation', 'airborne'] },
  { id: 'ENISA_IOT', name: 'ENISA IoT Security', keywords: ['iot', 'europe', 'devices'] },
  { id: 'EPA_WATER', name: 'EPA Water Sector Security', keywords: ['water', 'epa'] },
  { id: 'FAA_AIRPORT', name: 'FAA Airport Cybersecurity', keywords: ['faa', 'airport', 'aviation'] },
  { id: 'FERC_889', name: 'FERC Order 889 (Energy)', keywords: ['ferc', 'energy', 'grid'] },
  { id: 'HIPAA_SECURITY', name: 'HIPAA Security Rule', keywords: ['health', 'medical', 'phi'] },
  { id: 'IAEA_NSS_17', name: 'IAEA NSS-17 (Nuclear)', keywords: ['nuclear', 'iaea'] },
  { id: 'IEC_62443_2_1', name: 'IEC 62443-2-1 (IACS Policy)', keywords: ['iec', 'industrial', 'policy'] },
  { id: 'IEC_62443_2_4', name: 'IEC 62443-2-4 (Service Provider)', keywords: ['iec', 'integrator'] },
  { id: 'IEC_62443_3_3', name: 'IEC 62443-3-3 (System Security)', keywords: ['iec', 'system', 'zones'] },
  { id: 'IEC_62443_4_1', name: 'IEC 62443-4-1 (Secure Dev)', keywords: ['iec', 'sdlc', 'development'] },
  { id: 'IEC_62443_4_2', name: 'IEC 62443-4-2 (Component)', keywords: ['iec', 'component', 'device'] },
  { id: 'IEEE_1686', name: 'IEEE 1686 (Substation IED)', keywords: ['ieee', 'substation', 'ied'] },
  { id: 'INGAA_GUIDE', name: 'INGAA Control Systems Guide', keywords: ['pipeline', 'natural', 'gas'] },
  { id: 'ISA_99_LEGACY', name: 'ISA-99 Legacy (IACS)', keywords: ['isa', 'legacy', 'iacs'] },
  { id: 'ISO_27001', name: 'ISO 27001 (ISMS)', keywords: ['iso', 'management', 'certification'] },
  { id: 'ISO_27019', name: 'ISO 27019 (Energy Utilities)', keywords: ['iso', 'energy', 'utility'] },
  { id: 'KATRI_SCADA', name: 'KATRI SCADA Security', keywords: ['korea', 'scada'] },
  { id: 'NERC_CIP_002', name: 'NERC CIP-002 (BES Identification)', keywords: ['nerc', 'bulk', 'electric'] },
  { id: 'NERC_CIP_003', name: 'NERC CIP-003 (Security Management)', keywords: ['nerc', 'policy'] },
  { id: 'NERC_CIP_004', name: 'NERC CIP-004 (Personnel & Training)', keywords: ['nerc', 'training'] },
  { id: 'NERC_CIP_005', name: 'NERC CIP-005 (Electronic Perimeter)', keywords: ['nerc', 'perimeter'] },
  { id: 'NERC_CIP_006', name: 'NERC CIP-006 (Physical Security)', keywords: ['nerc', 'physical'] },
  { id: 'NERC_CIP_007', name: 'NERC CIP-007 (Systems Security)', keywords: ['nerc', 'patching'] },
  { id: 'NERC_CIP_008', name: 'NERC CIP-008 (Incident Response)', keywords: ['nerc', 'incident'] },
  { id: 'NERC_CIP_009', name: 'NERC CIP-009 (Recovery Plans)', keywords: ['nerc', 'recovery', 'disaster'] },
  { id: 'NERC_CIP_010', name: 'NERC CIP-010 (Config & Vuln)', keywords: ['nerc', 'vulnerability'] },
  { id: 'NERC_CIP_011', name: 'NERC CIP-011 (Info Protection)', keywords: ['nerc', 'data', 'protection'] },
  { id: 'NERC_CIP_013', name: 'NERC CIP-013 (Supply Chain)', keywords: ['nerc', 'supply', 'chain'] },
  { id: 'NERC_CIP_014', name: 'NERC CIP-014 (Physical Security)', keywords: ['nerc', 'physical', 'threat'] },
  { id: 'NIS2', name: 'NIS2 Directive (EU)', keywords: ['eu', 'europe', 'directive'] },
  { id: 'NISTIR_7628', name: 'NISTIR 7628 (Smart Grid)', keywords: ['smart', 'grid', 'nist'] },
  { id: 'NIST_800_37', name: 'NIST SP 800-37 (Risk Management)', keywords: ['rmf', 'risk', 'nist'] },
  { id: 'NIST_800_53', name: 'NIST SP 800-53 (Security Controls)', keywords: ['controls', 'federal', 'nist'] },
  { id: 'NIST_800_82', name: 'NIST SP 800-82 (ICS Security)', keywords: ['ics', 'scada', 'nist'] },
  { id: 'NIST_800_161', name: 'NIST SP 800-161 (Supply Chain)', keywords: ['scrm', 'supply', 'nist'] },
  { id: 'NIST_800_171', name: 'NIST SP 800-171 (CUI)', keywords: ['cui', 'controlled', 'nist'] },
  { id: 'NIST_800_172', name: 'NIST SP 800-172 (Enhanced CUI)', keywords: ['cui', 'enhanced', 'nist'] },
  { id: 'NIST_CSF', name: 'NIST Cybersecurity Framework', keywords: ['csf', 'framework', 'nist'] },
  { id: 'NNSA_NAP_24', name: 'NNSA NAP-24 (Nuclear Security)', keywords: ['nnsa', 'nuclear', 'weapons'] },
  { id: 'NRC_RG_5_71', name: 'NRC RG 5.71 (Nuclear Cyber)', keywords: ['nrc', 'nuclear', 'reactor'] },
  { id: 'PCI_DSS', name: 'PCI DSS v4.0 (Payment)', keywords: ['pci', 'payment', 'card'] },
  { id: 'SOCI_ACT', name: 'SOCI Act (Australia)', keywords: ['australia', 'critical', 'infrastructure'] },
  { id: 'SOC_2', name: 'SOC 2 Type II (Trust Services)', keywords: ['soc', 'audit', 'trust'] },
  { id: 'SWIFT_CSCF', name: 'SWIFT CSCF (Financial Messaging)', keywords: ['swift', 'banking', 'messaging'] },
  { id: 'TSA_PIPELINE', name: 'TSA Pipeline Security', keywords: ['tsa', 'pipeline', 'transport'] },
  { id: 'TSA_RAIL', name: 'TSA Rail Cybersecurity', keywords: ['tsa', 'rail', 'transit'] },
  { id: 'USCG_MARITIME', name: 'USCG Maritime Cybersecurity', keywords: ['uscg', 'maritime', 'port'] },
] as const

export function CommandPalette() {
  const { t } = useTranslation()
  const commandInputId = useId()
  const navigationItems = useMemo(() => getNavigationItems(t), [t])
  const createItems = useMemo(() => getCreateItems(t), [t])
  const themeItems = useMemo(() => getThemeItems(t), [t])
  
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { openSourceDialog, openNotebookDialog, openPodcastDialog } = useCreateDialogs()
  const { setTheme } = useTheme()
  const { data: notebooks, isLoading: notebooksLoading } = useNotebooks(false)

  // Fetch customers when palette opens
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([])
  useEffect(() => {
    if (open) {
      apiClient.get('/api/customers').then(res => {
        setCustomers((res.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }).catch(() => {})
    }
  }, [open])

  // Global keyboard listener for ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Skip if focus is inside editable elements
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }

      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        setOpen((open) => !open)
      }
    }

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', down, true)
    return () => document.removeEventListener('keydown', down, true)
  }, [])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false)
    setQuery('')
    // Use setTimeout to ensure dialog closes before action
    setTimeout(callback, 0)
  }, [])

  const handleNavigate = useCallback((href: string) => {
    handleSelect(() => router.push(href))
  }, [handleSelect, router])

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}&mode=search`))
  }, [handleSelect, router, query])

  const handleAsk = useCallback(() => {
    if (!query.trim()) return
    handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}&mode=ask`))
  }, [handleSelect, router, query])

  const handleCreate = useCallback((action: string) => {
    handleSelect(() => {
      if (action === 'source') openSourceDialog()
      else if (action === 'notebook') openNotebookDialog()
      else if (action === 'podcast') openPodcastDialog()
    })
  }, [handleSelect, openSourceDialog, openNotebookDialog, openPodcastDialog])

  const handleTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    handleSelect(() => setTheme(theme))
  }, [handleSelect, setTheme])

  // Check if query matches any command (navigation, create, theme, or notebook)
  const queryLower = query.toLowerCase().trim()
  const hasCommandMatch = useMemo(() => {
    if (!queryLower) return false
    return (
      navigationItems.some(item =>
        item.name.toLowerCase().includes(queryLower) ||
        item.keywords.some(k => k.includes(queryLower))
      ) ||
      createItems.some(item =>
        item.name.toLowerCase().includes(queryLower)
      ) ||
      themeItems.some(item =>
        item.name.toLowerCase().includes(queryLower) ||
        item.keywords.some(k => k.includes(queryLower))
      ) ||
      (notebooks?.some(nb =>
        nb.name.toLowerCase().includes(queryLower) ||
        (nb.description && nb.description.toLowerCase().includes(queryLower))
      ) ?? false) ||
      COMPLIANCE_FRAMEWORKS.some(fw =>
        fw.name.toLowerCase().includes(queryLower) ||
        fw.id.toLowerCase().includes(queryLower) ||
        fw.keywords.some(k => k.includes(queryLower))
      ) ||
      customers.some(c =>
        c.name.toLowerCase().includes(queryLower)
      )
    )
  }, [queryLower, notebooks, customers, navigationItems, createItems, themeItems])

  // Determine if we should show the Search/Ask section at the top
  const showSearchFirst = query.trim() && !hasCommandMatch

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('common.quickActions')}
      description={t('common.quickActionsDesc')}
      className="sm:max-w-lg"
    >
      <CommandInput
        id={commandInputId}
        name="command-search"
        placeholder={t('searchPage.enterSearchPlaceholder')}
        value={query}
        onValueChange={setQuery}
        aria-label={t('common.search')}
        autoComplete="off"
      />
      <CommandList>
        {/* Search/Ask - show FIRST when there's a query with no command match */}
        {showSearchFirst && (
          <CommandGroup heading={t('searchPage.searchAndAsk')} forceMount>
            <CommandItem
              value={`__search__ ${query}`}
              onSelect={handleSearch}
              forceMount
            >
              <Search className="h-4 w-4" />
              <span>{t('searchPage.searchResultsFor').replace('{query}', query)}</span>
            </CommandItem>
            <CommandItem
              value={`__ask__ ${query}`}
              onSelect={handleAsk}
              forceMount
            >
              <MessageCircleQuestion className="h-4 w-4" />
              <span>{t('searchPage.askAbout').replace('{query}', query)}</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading={t('navigation.nav')}>
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.name} ${item.keywords.join(' ')}`}
              onSelect={() => handleNavigate(item.href)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Notebooks */}
        <CommandGroup heading={t('notebooks.title')}>
          {notebooksLoading ? (
            <CommandItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('common.loading')}</span>
            </CommandItem>
          ) : notebooks && notebooks.length > 0 ? (
            notebooks.map((notebook) => (
              <CommandItem
                key={notebook.id}
                value={`notebook ${notebook.name} ${notebook.description || ''}`}
                onSelect={() => handleNavigate(`/notebooks/${notebook.id}`)}
              >
                <Book className="h-4 w-4" />
                <span>{notebook.name}</span>
              </CommandItem>
            ))
          ) : null}
        </CommandGroup>

        {/* Compliance Frameworks */}
        <CommandGroup heading="Compliance Frameworks">
          {COMPLIANCE_FRAMEWORKS.map((fw) => (
            <CommandItem
              key={fw.id}
              value={`compliance ${fw.name} ${fw.keywords.join(' ')}`}
              onSelect={() => handleNavigate(`/compliance?fw=${fw.id}`)}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{fw.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Customers */}
        {customers.length > 0 && (
          <CommandGroup heading="Customers">
            {customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer ${c.name}`}
                onSelect={() => handleNavigate(`/customers/${c.id}`)}
              >
                <Users className="h-4 w-4" />
                <span>{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Create */}
        <CommandGroup heading={t('navigation.create')}>
          {createItems.map((item) => (
            <CommandItem
              key={item.action}
              value={`create ${item.name}`}
              onSelect={() => handleCreate(item.action)}
            >
              <Plus className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Theme */}
        <CommandGroup heading={t('navigation.theme')}>
          {themeItems.map((item) => (
            <CommandItem
              key={item.value}
              value={`theme ${item.name} ${item.keywords.join(' ')}`}
              onSelect={() => handleTheme(item.value)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Search/Ask - show at bottom when there IS a command match */}
        {query.trim() && hasCommandMatch && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('searchPage.orSearchKb')} forceMount>
              <CommandItem
                value={`__search__ ${query}`}
                onSelect={handleSearch}
                forceMount
              >
                <Search className="h-4 w-4" />
                <span>{t('searchPage.searchResultsFor').replace('{query}', query)}</span>
              </CommandItem>
              <CommandItem
                value={`__ask__ ${query}`}
                onSelect={handleAsk}
                forceMount
              >
                <MessageCircleQuestion className="h-4 w-4" />
                <span>{t('searchPage.askAbout').replace('{query}', query)}</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
