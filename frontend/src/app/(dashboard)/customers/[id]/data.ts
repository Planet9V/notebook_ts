// Customer dossier shared constants and types
// Extracted from customers/[id]/page.tsx

export interface Customer {
  id: string
  name: string
  website: string
  description: string
  industry: string
  primary_sector?: string
  sectors?: string[]
  assigned_frameworks?: string[]
  contacts: { name: string; title: string; email: string }[]
}

export interface Notebook {
  id: string
  name: string
  description: string
  stage: string
  estimated_value: number
  customer_id: string
  updated: string
  note_count: number
  source_count: number
}

export const CISA_SECTORS = [
  'Chemical',
  'Commercial Facilities',
  'Communications',
  'Critical Manufacturing',
  'Dams',
  'Defense Industrial Base',
  'Emergency Services',
  'Energy',
  'Financial Services',
  'Food and Agriculture',
  'Government Facilities',
  'Healthcare and Public Health',
  'Information Technology',
  'Nuclear Reactors, Materials, and Waste',
  'Transportation Systems',
  'Water and Wastewater Systems',
  'Cross-Sector'
]

export const COMPLIANCE_FRAMEWORKS = [
  { id: 'IEC_62443_3_3', name: 'IEC 62443-3-3' },
  { id: 'IEC_62443_4_2', name: 'IEC 62443-4-2' },
  { id: 'NIST_800_82', name: 'NIST SP 800-82 r3' },
  { id: 'NIST_800_53', name: 'NIST SP 800-53 r5' },
  { id: 'NIST_CSF', name: 'NIST CSF v2.0' },
  { id: 'CISA_CPG', name: 'CISA Cross-Sector CPGs' },
  { id: 'CIS_CONTROLS', name: 'CIS Controls v8' },
  { id: 'NERC_CIP_002', name: 'NERC CIP-002' },
  { id: 'NERC_CIP_003', name: 'NERC CIP-003' },
  { id: 'NERC_CIP_004', name: 'NERC CIP-004' },
  { id: 'NERC_CIP_005', name: 'NERC CIP-005' },
  { id: 'NERC_CIP_006', name: 'NERC CIP-006' },
  { id: 'NERC_CIP_007', name: 'NERC CIP-007' },
  { id: 'NERC_CIP_008', name: 'NERC CIP-008' },
  { id: 'NERC_CIP_009', name: 'NERC CIP-009' },
  { id: 'NERC_CIP_010', name: 'NERC CIP-010' },
  { id: 'NERC_CIP_011', name: 'NERC CIP-011' },
  { id: 'NERC_CIP_013', name: 'NERC CIP-013' },
  { id: 'NERC_CIP_014', name: 'NERC CIP-014' },
  { id: 'ISO_27019', name: 'ISO 27019' },
  { id: 'NISTIR_7628', name: 'NISTIR 7628' },
  { id: 'INGAA_GUIDE', name: 'INGAA Guidelines' },
  { id: 'API_1164', name: 'API Standard 1164' },
  { id: 'IEEE_1686', name: 'IEEE 1686' },
  { id: 'NRC_RG_5_71', name: 'NRC Reg Guide 5.71' },
  { id: 'IAEA_NSS_17', name: 'IAEA NSS-17' },
  { id: 'AWWA_G430', name: 'AWWA G430' },
  { id: 'EPA_WATER', name: 'EPA Baseline' },
  { id: 'AWWA_M19', name: 'AWWA M19' },
  { id: 'NIST_800_171', name: 'NIST SP 800-171' },
  { id: 'NIST_800_172', name: 'NIST SP 800-172' },
  { id: 'CMMC_L1', name: 'CMMC Level 1' },
  { id: 'CMMC_L2', name: 'CMMC Level 2' },
  { id: 'CMMC_L3', name: 'CMMC Level 3' },
  { id: 'CNSSI_1253', name: 'CNSSI 1253' },
  { id: 'NNSA_NAP_24', name: 'NNSA NAP-24A' },
  { id: 'TSA_PIPELINE', name: 'TSA Pipeline' },
  { id: 'TSA_RAIL', name: 'TSA Rail' },
  { id: 'FAA_AIRPORT', name: 'FAA Airport' },
  { id: 'USCG_MARITIME', name: 'USCG Maritime' },
  { id: 'DO_326A', name: 'DO-326A' },
  { id: 'CFATS_RBPS', name: 'CFATS RBPS' },
  { id: 'ANSSI_BP_006', name: 'ANSSI BP-006' },
  { id: 'BSI_IT_GRUNDSCHUTZ', name: 'BSI IT-Grundschutz' },
  { id: 'DHS_CATALOG', name: 'DHS Catalog' },
  { id: 'ISA_99_LEGACY', name: 'ISA-99' },
  { id: 'ISO_27001', name: 'ISO 27001' },
  { id: 'COBIT_2019', name: 'COBIT 2019' },
  { id: 'HIPAA_SECURITY', name: 'HIPAA Security' },
  { id: 'SOC_2', name: 'SOC 2 Type II' },
  { id: 'PCI_DSS', name: 'PCI-DSS' },
  { id: 'CSA_CCM', name: 'CSA CCM' },
  { id: 'ACSC_ESSENTIAL_8', name: 'ACSC Essential 8' },
  { id: 'SWIFT_CSCF', name: 'SWIFT CSCF' },
  { id: 'CRI_PROFILE', name: 'CRI Profile' },
  { id: 'KATRI_SCADA', name: 'KATRI SCADA' },
  { id: 'NIST_800_37', name: 'NIST SP 800-37' },
  { id: 'NIST_800_161', name: 'NIST SP 800-161' },
  { id: 'ENISA_IOT', name: 'ENISA IoT Guidelines' },
  { id: 'NIS2', name: 'EU NIS2 Directive' },
  { id: 'CRA', name: 'EU Cyber Resilience Act' },
  { id: 'SOCI_ACT', name: 'Australian SOCI Act' }
]

// Dynamic mapping: CISA Sector → recommended compliance frameworks
export const SECTOR_FRAMEWORK_MAP: Record<string, string[]> = {
  'Chemical': ['CFATS_RBPS', 'IEC_62443_3_3', 'IEC_62443_4_2', 'NIST_800_82', 'NIST_CSF', 'CISA_CPG'],
  'Commercial Facilities': ['NIST_CSF', 'CIS_CONTROLS', 'CISA_CPG', 'ISO_27001', 'SOC_2'],
  'Communications': ['NIST_CSF', 'NIST_800_53', 'CIS_CONTROLS', 'CISA_CPG', 'NIS2'],
  'Critical Manufacturing': ['IEC_62443_3_3', 'IEC_62443_4_2', 'NIST_800_82', 'NIST_CSF', 'CISA_CPG', 'NIST_800_161'],
  'Dams': ['NIST_800_82', 'NIST_CSF', 'CISA_CPG', 'IEC_62443_3_3'],
  'Defense Industrial Base': ['NIST_800_171', 'NIST_800_172', 'CMMC_L1', 'CMMC_L2', 'CMMC_L3', 'CNSSI_1253', 'NNSA_NAP_24', 'NIST_800_53'],
  'Emergency Services': ['NIST_CSF', 'NIST_800_53', 'CIS_CONTROLS', 'CISA_CPG'],
  'Energy': ['NERC_CIP_002', 'NERC_CIP_003', 'NERC_CIP_004', 'NERC_CIP_005', 'NERC_CIP_006', 'NERC_CIP_007', 'NERC_CIP_008', 'NERC_CIP_009', 'NERC_CIP_010', 'NERC_CIP_011', 'NERC_CIP_013', 'NERC_CIP_014', 'IEC_62443_3_3', 'NIST_800_82', 'ISO_27019', 'NISTIR_7628', 'INGAA_GUIDE', 'API_1164', 'IEEE_1686'],
  'Financial Services': ['NIST_CSF', 'NIST_800_53', 'PCI_DSS', 'SOC_2', 'SWIFT_CSCF', 'CRI_PROFILE', 'ISO_27001', 'COBIT_2019'],
  'Food and Agriculture': ['NIST_CSF', 'NIST_800_82', 'CISA_CPG', 'IEC_62443_3_3'],
  'Government Facilities': ['NIST_800_53', 'NIST_CSF', 'CIS_CONTROLS', 'NIST_800_37', 'COBIT_2019', 'CISA_CPG'],
  'Healthcare and Public Health': ['HIPAA_SECURITY', 'NIST_CSF', 'NIST_800_53', 'CIS_CONTROLS', 'ISO_27001'],
  'Information Technology': ['NIST_CSF', 'NIST_800_53', 'CIS_CONTROLS', 'ISO_27001', 'SOC_2', 'CSA_CCM', 'CISA_CPG', 'NIST_800_161'],
  'Nuclear Reactors, Materials, and Waste': ['NRC_RG_5_71', 'IAEA_NSS_17', 'NIST_800_82', 'IEC_62443_3_3', 'NIST_800_53'],
  'Transportation Systems': ['TSA_PIPELINE', 'TSA_RAIL', 'FAA_AIRPORT', 'USCG_MARITIME', 'DO_326A', 'NIST_800_82', 'IEC_62443_3_3', 'CISA_CPG'],
  'Water and Wastewater Systems': ['AWWA_G430', 'EPA_WATER', 'AWWA_M19', 'NIST_800_82', 'IEC_62443_3_3', 'CISA_CPG'],
  'Cross-Sector': ['CISA_CPG', 'NIST_CSF', 'CIS_CONTROLS', 'ISO_27001']
}

// Color palette for sector badges
export const SECTOR_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  'Chemical': { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', glow: 'from-amber-500/20' },
  'Commercial Facilities': { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', glow: 'from-blue-500/20' },
  'Communications': { border: 'border-violet-500/30', bg: 'bg-violet-500/5', text: 'text-violet-400', glow: 'from-violet-500/20' },
  'Critical Manufacturing': { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400', glow: 'from-orange-500/20' },
  'Dams': { border: 'border-teal-500/30', bg: 'bg-teal-500/5', text: 'text-teal-400', glow: 'from-teal-500/20' },
  'Defense Industrial Base': { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', glow: 'from-red-500/20' },
  'Emergency Services': { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', glow: 'from-rose-500/20' },
  'Energy': { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', text: 'text-yellow-400', glow: 'from-yellow-500/20' },
  'Financial Services': { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', glow: 'from-emerald-500/20' },
  'Food and Agriculture': { border: 'border-lime-500/30', bg: 'bg-lime-500/5', text: 'text-lime-400', glow: 'from-lime-500/20' },
  'Government Facilities': { border: 'border-sky-500/30', bg: 'bg-sky-500/5', text: 'text-sky-400', glow: 'from-sky-500/20' },
  'Healthcare and Public Health': { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400', glow: 'from-pink-500/20' },
  'Information Technology': { border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', text: 'text-indigo-400', glow: 'from-indigo-500/20' },
  'Nuclear Reactors, Materials, and Waste': { border: 'border-red-600/30', bg: 'bg-red-600/5', text: 'text-red-300', glow: 'from-red-600/20' },
  'Transportation Systems': { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', glow: 'from-cyan-500/20' },
  'Water and Wastewater Systems': { border: 'border-blue-400/30', bg: 'bg-blue-400/5', text: 'text-blue-300', glow: 'from-blue-400/20' },
  'Cross-Sector': { border: 'border-slate-400/30', bg: 'bg-slate-400/5', text: 'text-slate-300', glow: 'from-slate-400/20' },
}

export interface Check {
  code: string
  title: string
  text: string
}

export interface SectorGuideline {
  sector: string
  title: string
  description: string
  checks: Check[]
}

export const SECTOR_GUIDELINES: Record<string, SectorGuideline> = {
  'Energy': {
    sector: 'Energy',
    title: 'NERC CIP & CISA Bulk Power Grid Mitigation Standard',
    description: 'Mandatory critical infrastructure protection requirements for entities operating electric substation and power networks.',
    checks: [
      { code: 'CIP-005-7 R1', title: 'Electronic Security Perimeter (ESP)', text: 'Enforce firewall boundary isolation around all Cyber Assets that control grid frequency, load management, or switchgear operations.' },
      { code: 'CIP-007-6 R2', title: 'OT Port and Service Lockdown', text: 'Configure operational switches to strictly block unused interfaces and disable unsafe legacy remote control protocols.' },
      { code: 'CIP-009-6 R1', title: 'Substation Disaster Recovery Strategy', text: 'Verify system backups of critical RTU firmware configurations are stored offline in tamper-proof environments.' }
    ]
  },
  'Water and Wastewater Systems': {
    sector: 'Water and Wastewater Systems',
    title: 'AWWA G430 & CISA Water Segment Cybersecurity Guidelines',
    description: 'CISA recommended cybersecurity baseline mitigations for water treatment and wastewater networks.',
    checks: [
      { code: 'AWWA Sec 4.1', title: 'Operational Technology Separation', text: 'Enforce absolute air-gapped isolation or secure hardware diode boundaries between industrial water processing PLCs and administrative billing LANs.' },
      { code: 'CISA Water 2.3', title: 'Remote Access Terminal Mediation', text: 'All third-party engineering support access terminals must terminate inside a secure Operations DMZ with multi-factor gating.' },
      { code: 'EPA Risk 5.9', title: 'Physical Field Port Lockdown', text: 'Unused Ethernet ports on field switches located at remote pumping stations must be disabled and physical enclosures locked.' }
    ]
  },
  'Chemical': {
    sector: 'Chemical',
    title: 'CISA Chemical Facility Anti-Terrorism Standards (CFATS RBPS)',
    description: 'Cybersecurity requirements for chemical manufacturing, storage, and distribution facilities to protect hazardous chemical processes.',
    checks: [
      { code: 'CFATS RBPS 8', title: 'Process Control Network Isolation', text: 'Enforce strict segment isolation between corporate business systems and hazardous chemical batch reactor controllers.' },
      { code: 'CFATS RBPS 12', title: 'Secure Emergency Shutdown Systems', text: 'Verify emergency process shutdown controls are physically segregated from external communication paths and fail securely.' },
      { code: 'CFATS RBPS 15', title: 'Recipe Integrity Verification', text: 'Implement cryptographic checksum validation on all chemical batch mixing recipes to prevent unauthorized modification.' }
    ]
  },
  'Critical Manufacturing': {
    sector: 'Critical Manufacturing',
    title: 'CISA Critical Manufacturing Cybersecurity Performance Guidelines',
    description: 'Best practice security frameworks tailored for high-tech machining, metal fabrication, machinery, and electrical equipment manufacturers.',
    checks: [
      { code: 'CISA MFG 1.1', title: 'Purdue Zone Segment Validation', text: 'Enforce VLAN boundaries between industrial robotics control networks and corporate enterprise resource planning (ERP) logistics systems.' },
      { code: 'CISA MFG 2.4', title: 'Industrial Controller Firmware Signing', text: 'Validate digital signatures on PLC, CNC, and HMI firmware packages prior to applying updates on live production lines.' },
      { code: 'CISA MFG 3.7', title: 'Supply Chain SBOM Validation', text: 'Request and audit Software Bill of Materials (SBOMs) for all third-party industrial control hardware and automation libraries.' }
    ]
  },
  'Dams': {
    sector: 'Dams',
    title: 'FEMA & CISA Dam Safety Cybersecurity Guidelines',
    description: 'Security recommendations for safeguarding water retention control gates, hydroelectric turbines, and monitoring telemetry.',
    checks: [
      { code: 'FEMA DAM 2.1', title: 'Spillway Gate Control Segregation', text: 'Isolate remote telemetry control loops governing physical spillway gates from public network pathways and restrict administrative access.' },
      { code: 'FEMA DAM 4.5', title: 'Hydroelectric Turbine Telemetry Cryptography', text: 'Encrypt all wide-area telemetry communications governing water levels, turbine speeds, and electric current generation.' },
      { code: 'FEMA DAM 5.3', title: 'Physical Boundary Monitoring', text: 'Deploy unified CCTV surveillance and door alarms linked directly to the Operations Control Center for physical remote telemetry enclosures.' }
    ]
  },
  'Defense Industrial Base': {
    sector: 'Defense Industrial Base',
    title: 'NIST SP 800-171 & CMMC Level 2 Requirements',
    description: 'Authoritative cybersecurity requirements for safeguarding Controlled Unclassified Information (CUI) within defense supply chains.',
    checks: [
      { code: 'CMMC AC.L2-3.1.3', title: 'CUI Enclave Microsegmentation', text: 'Isolate servers containing physical product blueprints, drawings, and export-controlled data within a logically segregated security zone.' },
      { code: 'CMMC SC.L2-3.13.11', title: 'FIPS 140-2 Validated Encryption', text: 'Enforce standard FIPS-validated cryptographic modules for all wide-area and local wireless transmission of defense data.' },
      { code: 'CMMC SI.L2-3.14.1', title: 'Supply Chain Component Traceability', text: 'Audit supply chain logistics logs and implement verified chain-of-custody tracking for all computing hardware components.' }
    ]
  },
  'Emergency Services': {
    sector: 'Emergency Services',
    title: 'CISA First Responder Communications Security Protocol',
    description: 'Cybersecurity recommendations for land mobile radio networks, public safety answering points (PSAPs), and dispatch systems.',
    checks: [
      { code: 'CISA EMS 3.2', title: 'Project 25 Radio Encryption', text: 'Enforce 256-bit AES cryptographic encryption on all Land Mobile Radio voice traffic and administrative command channels.' },
      { code: 'CISA EMS 4.4', title: 'PSAP Call Routing Segregation', text: 'Isolate incoming 911 dispatch networks from other municipal office business networks to maintain absolute emergency access.' },
      { code: 'CISA EMS 5.1', title: 'Uninterruptible Power Telemetry', text: 'Implement secure operational telemetry networks to monitor auxiliary generator fuel levels, state of health, and power transfer configurations.' }
    ]
  },
  'Financial Services': {
    sector: 'Financial Services',
    title: 'FFIEC IT Examination & NIST Cybersecurity Profile',
    description: 'Federal regulations and guidelines tailored for commercial banking infrastructure, transaction processing, and clearing houses.',
    checks: [
      { code: 'FFIEC SEC 1.2', title: 'Centralized HSM Key Management', text: 'Store and cycle master transaction cryptographic signing keys inside FIPS 140-3 Level 4 hardware security modules.' },
      { code: 'FFIEC SEC 3.4', title: 'Real-time Transaction Auditing', text: 'Deploy automated behavioral analysis systems to audit all high-value outbound wire transfers and liquidity events.' },
      { code: 'FFIEC SEC 5.8', title: 'Vault Backup Encryption', text: 'Encrypt database backups of customer balances and account records with offline storage and multi-party retrieval gating.' }
    ]
  },
  'Food and Agriculture': {
    sector: 'Food and Agriculture',
    title: 'USDA & FDA Baseline Food Defense Cybersecurity Measures',
    description: 'Operational technology protections for grain elevator complexes, large processing plants, and smart irrigation setups.',
    checks: [
      { code: 'FDA AG 2.2', title: 'Harvest Automation Telemetry Segregation', text: 'Enforce security zones between automated harvesting telemetry streams and public cellular routing gateways.' },
      { code: 'FDA AG 4.6', title: 'Storage Temperature Logger Protections', text: 'Configure read-only secure access profiles on automated temperature loggers governing cold storage meat and dairy vaults.' },
      { code: 'FDA AG 5.9', title: 'Packaging Line PLC Protections', text: 'Audit food processing and bottling line programmable logic controllers to prevent rogue override of ingredient ratios.' }
    ]
  },
  'Government Facilities': {
    sector: 'Government Facilities',
    title: 'NIST SP 800-53 Federal Facilities Security Guidance',
    description: 'Mandatory security baseline controls governing administrative offices, federal courthouses, and municipal utility buildings.',
    checks: [
      { code: 'NIST IA-2', title: 'Multi-factor Physical Access Control', text: 'Deploy verified multi-factor smart cards (PIV) or cryptographic credentials to regulate access to administrative work areas.' },
      { code: 'NIST PE-3', title: 'Facility Visitor Access Management', text: 'Enforce verified escort policies, physical sign-in logs, and secure air-gapped monitoring paths for physical facility guests.' },
      { code: 'NIST SC-7', title: 'Boundary Gating Security', text: 'Regulate municipal office wide-area connections with centralized federal web application firewalls and threat detection points.' }
    ]
  },
  'Healthcare and Public Health': {
    sector: 'Healthcare and Public Health',
    title: 'HIPAA Security Rule & HHS HICP Guidelines',
    description: 'Federal cybersecurity standards for safeguarding Electronic Protected Health Information (ePHI) and medical hardware.',
    checks: [
      { code: 'HIPAA 164.312(a)', title: 'PHI Database Enclave Encryption', text: 'Encrypt all database tables containing patient record metadata, diagnostics, and pharmaceutical histories at rest.' },
      { code: 'HICP MED 2.4', title: 'Medical Device Boundary Isolation', text: 'Route medical diagnostics, imaging systems, and patient telemetry monitors onto an isolated, firewalled hospital VLAN.' },
      { code: 'HIPAA 164.312(d)', title: 'Automatic Clinical Session Timeout', text: 'Configure hospital terminals to automatically terminate patient-dossier view sessions after 3 minutes of operator inactivity.' }
    ]
  },
  'Information Technology': {
    sector: 'Information Technology',
    title: 'NIST CSF & CISA IT Infrastructure Protections',
    description: 'Cybersecurity recommendations for securing software development environments, clouds, and directory services.',
    checks: [
      { code: 'NIST CSF PR.AC', title: 'Directory Service GPO Hardening', text: 'Enforce strict Group Policy Objects to disable unsafe legacy authentication protocols and restrict local administrator privileges.' },
      { code: 'NIST CSF PR.DS', title: 'Perimeter WAF Enforcement', text: 'Filter all inbound web application traffic through a geographically redundant web application firewall with dynamic threat analysis.' },
      { code: 'NIST CSF DE.CM', title: 'Secure Automated DevSecOps Build', text: 'Inject container safety scans, code signing, and SBOM audits into automated release pipeline deployments.' }
    ]
  },
  'Nuclear Reactors, Materials, and Waste': {
    sector: 'Nuclear Reactors, Materials, and Waste',
    title: 'NRC Regulatory Guide 5.71 & IAEA NSS-17 Guidelines',
    description: 'Mandatory, rigorous cybersecurity baseline controls governing safety and control instrumentation systems in nuclear facilities.',
    checks: [
      { code: 'NRC RG 5.71 C.3', title: 'Safety SIS Air-gapped Isolation', text: 'Maintain an absolute physical air-gap isolation around Safety Instrumentation Systems governing coolant valves and reactor safety loops.' },
      { code: 'NRC RG 5.71 C.9', title: 'Reactor Trip Telemetry Integrity', text: 'Enforce analog hardwired validation signals in reactor trip verification pathways, prohibiting digital logic adjustments.' },
      { code: 'IAEA NSS-17 3.5', title: 'Spent Fuel Storage Telemetry', text: 'Enforce hardware-enforced unidirectional data diodes on spend fuel pool water temp and radiation level telemetry transmitters.' }
    ]
  },
  'Transportation Systems': {
    sector: 'Transportation Systems',
    title: 'TSA Security Directives for Rail & Aviation',
    description: 'Cybersecurity standards govern locomotive control networks, airport baggage systems, and port telemetry.',
    checks: [
      { code: 'TSA RAIL-2022-01', title: 'Locomotive OT Segmenting', text: 'Separate on-train positive train control (PTC) computer units from public passenger Wi-Fi routing hardware.' },
      { code: 'TSA AV-2023-03', title: 'Airport Secure Area Access MFA', text: 'Deploy multi-factor validation gates regulating administrative access to baggage conveyor control interfaces.' },
      { code: 'TSA PORT-4.2', title: 'Maritime Crane Telemetry Isolation', text: 'Isolate remote telemetry control systems governing automated shipping container cranes from general port administration WANs.' }
    ]
  },
  'Commercial Facilities': {
    sector: 'Commercial Facilities',
    title: 'CISA Commercial Facilities Cybersecurity Guide',
    description: 'Operational guidelines for major shopping malls, stadium complexes, theme parks, and corporate campuses.',
    checks: [
      { code: 'CISA COM 1.3', title: 'Building Automation Network Isolation', text: 'Isolate smart HVAC controls, elevator telemetry systems, and fire alarms onto a separate building operations VLAN.' },
      { code: 'CISA COM 2.5', title: 'Unified CCTV Storage Security', text: 'Encrypt and lock surveillance feed recording archives, applying strict access authorization logs for playback.' }
    ]
  },
  'Communications': {
    sector: 'Communications',
    title: 'CISA Communications Sector Cyber Framework',
    description: 'Cybersecurity recommendations governing fiber optic routing nodes, wireless base stations, and satellite links.',
    checks: [
      { code: 'CISA COMMS 2.2', title: 'Base Station Control Segregation', text: 'Isolate microwave and fiber base station administration control interfaces from general subscriber voice and data routing.' },
      { code: 'CISA COMMS 4.5', title: 'DNSSEC Cryptographic Enforcement', text: 'Configure and enforce DNSSEC validation across all corporate carrier domain name resolution servers.' }
    ]
  },
  'Cross-Sector': {
    sector: 'Cross-Sector',
    title: 'CISA Cross-Sector Cybersecurity Performance Goals (CPGs)',
    description: 'The standard security control goals recommended by CISA for all critical infrastructure asset operators.',
    checks: [
      { code: 'CPG 1.A', title: 'Multi-Factor Authentication (MFA)', text: 'Enforce multi-factor authentication for all remote access pathways into both industrial and corporate corporate networks.' },
      { code: 'CPG 2.B', title: 'Asset Inventory Discovery', text: 'Maintain a real-time, comprehensive network asset inventory of all hardware devices, virtual nodes, and active system software.' },
      { code: 'CPG 4.C', title: 'Timely Software Vulnerability Patching', text: 'Deploy security patches for active CVEs within 15 days of release, prioritising boundary-exposed network interfaces.' }
    ]
  }
}
