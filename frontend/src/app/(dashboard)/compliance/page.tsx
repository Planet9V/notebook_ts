'use client'

import React, { useState, useMemo, useEffect } from 'react'
import apiClient from '@/lib/api/client'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ShieldCheck, 
  Search, 
  Layers, 
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Filter
} from 'lucide-react'

// CSET framework definition
interface CSETFramework {
  id: string
  name: string
  fullName: string
  description: string
  category: string
  sector: string
  sectors: string[]
  questionCount: number
  maturityLevels: string[]
}

// CSET evaluation question definition
interface CSETQuestion {
  id: string
  standardCode: string
  text: string
  description: string
  purdueLevel: number
  category: string
}

function enrichFramework(fw: CSETFramework): CSETFramework {
  let extraDesc = "";
  const id = fw.id;
  const sector = fw.sector;
  const category = fw.category;

  // Dynamically set questionCount based on individual catalog file if available
  let questionCount = fw.questionCount;
  try {
    const blueprintData = require(`@/lib/blueprints/${id}.json`);
    if (blueprintData && blueprintData.questions) {
      questionCount = blueprintData.questions.length;
    }
  } catch (e) {
    // fallback
  }

  if (id === 'NIST_800_82') {
    extraDesc = " This standard enforces the formal CISA OT Security Overlay, establishing highly tailored SCADA and Distributed Control System (DCS) zoning boundaries. It integrates strict Purdue Model network segmentation (Levels 0-5), ensuring field instrumentation remains completely protected from enterprise corporate LAN intrusions. Furthermore, it mandates localized emergency manual override capabilities and safety-instrumented systems (SIS) diagnostic separation.";
  } else if (id === 'NIST_800_53') {
    extraDesc = " Operating as the comprehensive catalog of Federal Information Security Controls, it establishes a multi-tiered risk management pipeline across 20 distinct control domains. It requires continuous diagnostic monitoring, supply chain integrity tracking, and strict system authorization boundaries to protect federal agencies and critical state databases from advanced persistent threat (APT) infiltration.";
  } else if (id === 'IEC_62443_3_3') {
    extraDesc = " It outlines crucial technical capabilities for system-level industrial communications (IACS). The standard establishes zone-and-conduit logical grouping rules, defining Security Levels (SL-1 to SL-4) to isolate operational process loops from cascading network disruptions and unauthorized engineering access.";
  } else if (id === 'IEC_62443_4_2') {
    extraDesc = " It specifies highly granular host, network, software application, and embedded device security configurations. It mandates secure boot sequences, cryptographic firmware integrity checks, active interface lockdowns, and local device auditing capabilities directly at the PLC and intelligent electronic device (IED) layers.";
  } else if (id.startsWith('NERC_CIP')) {
    extraDesc = " These mandatory, federally-enforced cybersecurity regulations protect the Bulk Power System (BPS) grid. They require electric utilities to identify and categorize Bulk Electric System (BES) cyber systems, construct logical Electronic Security Perimeters (ESP), secure physical substation control rooms, and test crisis incident response plans under strict penalty audits.";
  } else if (sector.includes('Water') || category === 'Water & Wastewater') {
    extraDesc = " It focuses heavily on protecting municipal drinking water utilities, establishing absolute logical or physical boundary air-gaps between billing LANs and active treatment facility operations. It mandates continuous tampering audits on chemical dosing PLCs, chlorine level sensors, and backup generator switchover systems to guarantee public health safety.";
  } else if (sector.includes('Defense') || category === 'Defense & Aerospace') {
    extraDesc = " Designed to protect Controlled Unclassified Information (CUI) and military logistics databases, it enforces advanced cybersecurity hygiene standards. It requires multi-factor authentication (MFA) engineering gates, automated vulnerability patch cycles, and rigorous software/hardware supply chain audits to safeguard defense industrial base assets.";
  } else if (sector.includes('Transport') || category === 'Transportation') {
    extraDesc = " It safeguards aviation control links, marine ship-to-shore terminals, and pipeline compressor stations. It requires physical and logical electronic boundary segmentation, secure serial-to-ethernet communications, and continuous diagnostic auditing to prevent kinetic disruption to transportation networks.";
  } else if (sector.includes('Chemical') || category === 'Chemical Operations') {
    extraDesc = " Grounded in Department of Homeland Security Risk-Based Performance Standards (RBPS), it secures hazardous chemical mixing systems and storage tanks. It mandates active video surveillance, localized emergency dump switches, and hardware-switched emergency isolation valves completely decoupled from digital telemetry.";
  } else if (sector.includes('Nuclear') || category === 'Nuclear Operations') {
    extraDesc = " Tailored to prevent radiological sabotage and unauthorized digital control of reactor systems, this framework enforces absolute physical air-gapping and zero-trust engineering gates. It mandates dual-signature validations for all code updates, rigorous firmware static analysis, and continuous monitoring of nuclear instrumentation loops.";
  } else if (sector.includes('Finance') || sector.includes('Finan') || category === 'Finance Operations') {
    extraDesc = " It enforces rigorous safeguards for financial transaction pathways, ATM terminals, and Cardholder Data Environments (CDE). It mandates strong AES-256 encryption at rest, TLS 1.3 in transit, continuous transaction velocity monitoring, and weekly automated external vulnerability scans.";
  } else if (category === 'Cloud Security' || category === 'Cloud Operations') {
    extraDesc = " It directs multi-tenant database isolation, secure API endpoint configurations, and automated continuous compliance auditing. It establishes strict access key controls and cloud identity gates to protect sensitive enterprise workloads from unauthorized tenant access.";
  } else {
    extraDesc = " By categorizing security measures into repeatable control domains, it provides organizations with a structured methodology to identify, protect, detect, respond to, and recover from security breaches, aligning IT and operational systems with global risk mitigation standards.";
  }

  return {
    ...fw,
    questionCount,
    description: fw.description + extraDesc
  };
}

const CSET_FRAMEWORKS_RAW: CSETFramework[] = [
  // 1-10: Cross-Sector Core Standards
  { id: 'IEC_62443_3_3', name: 'IEC 62443-3-3', fullName: 'Industrial Communication Networks - System Security Requirements', description: 'Defines security capabilities for industrial automation and control systems (IACS) including zone and conduit protection.', category: 'Industrial Control Systems', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems', 'Chemical', 'Transportation Systems', 'Dams', 'Nuclear Reactors, Materials, and Waste'], questionCount: 142, maturityLevels: ['SL-1', 'SL-2', 'SL-3', 'SL-4'] },
  { id: 'IEC_62443_4_2', name: 'IEC 62443-4-2', fullName: 'Technical Security Requirements for IACS Components', description: 'Sets concrete security capabilities and rules for host, network, software application, and embedded system devices.', category: 'Industrial Control Systems', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems', 'Chemical', 'Transportation Systems', 'Nuclear Reactors, Materials, and Waste'], questionCount: 118, maturityLevels: ['SL-1', 'SL-2', 'SL-3', 'SL-4'] },
  { id: 'IEC_62443_2_1', name: 'IEC 62443-2-1', fullName: 'Establishing an IACS Security Program', description: 'Requirements for establishing, implementing, maintaining, and improving a security program for asset owners.', category: 'Governance & Policy', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems', 'Chemical', 'Transportation Systems'], questionCount: 88, maturityLevels: ['Core Control'] },
  { id: 'IEC_62443_2_4', name: 'IEC 62443-2-4', fullName: 'Security Program Requirements for Service Providers', description: 'Specifies capabilities for IACS service providers, system integrators, and maintenance vendors.', category: 'Vendor Risk', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems', 'Chemical', 'Transportation Systems'], questionCount: 94, maturityLevels: ['Core Control'] },
  { id: 'IEC_62443_4_1', name: 'IEC 62443-4-1', fullName: 'Secure Product Development Lifecycle Requirements', description: 'Governs product developers on threat modeling, secure design, coding standards, and vulnerability handling.', category: 'Secure Development', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems', 'Chemical', 'Transportation Systems'], questionCount: 78, maturityLevels: ['Core Control'] },
  { id: 'NIST_800_82', name: 'NIST SP 800-82 r3', fullName: 'Guide to Industrial Control Systems (ICS) Security', description: 'Comprehensive guidance on securing SCADA, distributed control systems, and PLCs in critical infrastructures.', category: 'Industrial Control Systems', sector: 'Cross-Sector', sectors: ['Information Technology', 'Energy', 'Water and Wastewater Systems', 'Critical Manufacturing', 'Chemical', 'Dams', 'Nuclear Reactors, Materials, and Waste', 'Transportation Systems'], questionCount: 5, maturityLevels: ['Low', 'Moderate', 'High'] },
  { id: 'NIST_800_53', name: 'NIST SP 800-53 r5', fullName: 'Security and Privacy Controls for Federal Information Systems', description: 'Catalog of standard security controls designed for federal information systems, cataloged across 20 domains.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Government Facilities', 'Defense Industrial Base', 'Healthcare and Public Health', 'Financial Services'], questionCount: 298, maturityLevels: ['Low', 'Moderate', 'High'] },
  { id: 'NIST_CSF', name: 'NIST CSF v2.0', fullName: 'NIST Cybersecurity Framework', description: 'Framework designed to reduce cybersecurity risk through six core functions: Govern, Identify, Protect, Detect, Respond, Recover.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Financial Services', 'Energy', 'Healthcare and Public Health', 'Commercial Facilities', 'Government Facilities', 'Communications'], questionCount: 108, maturityLevels: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] },
  { id: 'CISA_CPG', name: 'CISA Cross-Sector CPGs', fullName: 'CISA Cross-Sector Cyber Performance Goals v1.0.1', description: 'Baseline goals derived from existing frameworks, prioritizing IT and OT actions to secure operations.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Energy', 'Water and Wastewater Systems', 'Healthcare and Public Health', 'Transportation Systems', 'Emergency Services'], questionCount: 38, maturityLevels: ['Baseline'] },
  { id: 'CIS_CONTROLS', name: 'CIS Controls v8', fullName: 'CIS Top 18 Critical Security Controls', description: 'Prioritized set of actions protecting enterprise IT and endpoint devices from modern cyber threats.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Commercial Facilities', 'Government Facilities', 'Financial Services'], questionCount: 153, maturityLevels: ['IG1', 'IG2', 'IG3'] },
  
  // 11-20: Energy & Electric Grid Sector
  { id: 'NERC_CIP_002', name: 'NERC CIP-002-5.1a', fullName: 'BES Cyber System Categorization', description: 'Mandatory standard to identify and categorize Bulk Electric System (BES) cyber systems into Impact levels.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 45, maturityLevels: ['Low Impact', 'Medium Impact', 'High Impact'] },
  { id: 'NERC_CIP_003', name: 'NERC CIP-003-8', fullName: 'Security Management Controls', description: 'Requires documented, approved cybersecurity policies and designated leadership for energy systems.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 50, maturityLevels: ['Management'] },
  { id: 'NERC_CIP_004', name: 'NERC CIP-004-6', fullName: 'Personnel & Training', description: 'Governs background checks, security awareness, and authorization requirements for personnel with system access.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 62, maturityLevels: ['Compliance'] },
  { id: 'NERC_CIP_005', name: 'NERC CIP-005-7', fullName: 'Electronic Security Perimeters', description: 'Requires strict Electronic Security Perimeters (ESP) surrounding energy cyber systems and mediates external links.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 78, maturityLevels: ['ESP Boundary'] },
  { id: 'NERC_CIP_006', name: 'NERC CIP-006-6', fullName: 'Physical Security of BES Cyber Assets', description: 'Requires physical security plans and access control gates surrounding critical electric substation facilities.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 80, maturityLevels: ['Physical Gate'] },
  { id: 'NERC_CIP_007', name: 'NERC CIP-007-6', fullName: 'System Security Management', description: 'Mandates technical controls spanning port lockdown, patch management, and security event logging.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 95, maturityLevels: ['Control'] },
  { id: 'NERC_CIP_008', name: 'NERC CIP-008-6', fullName: 'Incident Reporting and Response Planning', description: 'Establishes requirements to identify, classify, respond, and report critical grid cybersecurity incidents.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 55, maturityLevels: ['Response'] },
  { id: 'NERC_CIP_009', name: 'NERC CIP-009-6', fullName: 'Recovery Plans for BES Cyber Systems', description: 'Requires disaster recovery plans, backup strategies, and annual simulation tests for substation systems.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 58, maturityLevels: ['Recovery'] },
  { id: 'NERC_CIP_010', name: 'NERC CIP-010-4', fullName: 'Configuration Change Management & Vulnerability Assessments', description: 'Enforces baseline configuration tracking, change verification, and regular active vulnerability assessments.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 82, maturityLevels: ['Assessment'] },
  { id: 'NERC_CIP_011', name: 'NERC CIP-011-2', fullName: 'Information Protection', description: 'Requirements to protect and securely sanitize Bulk Electric System operational cyber information.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 48, maturityLevels: ['Sanitization'] },

  // 21-30: Additional Energy, Pipeline & Nuclear Standards
  { id: 'NERC_CIP_013', name: 'NERC CIP-013-1', fullName: 'Supply Chain Risk Management', description: 'Mandatory standard to assess and mitigate cybersecurity supply chain risks associated with grid hardware procurement.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy', 'Critical Manufacturing'], questionCount: 54, maturityLevels: ['Supply Chain'] },
  { id: 'NERC_CIP_014', name: 'NERC CIP-014-3', fullName: 'Physical Security for Transmission Substations', description: 'Requires transmission operators to perform threat risk assessments and secure critical physical assets.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 46, maturityLevels: ['Transmission'] },
  { id: 'ISO_27019', name: 'ISO/IEC 27019:2017', fullName: 'Information Security Controls for the Energy Utility Industry', description: 'Energy-sector specific ISO guidelines directing secure controls for electric, gas, and water networks.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 110, maturityLevels: ['Utility Level'] },
  { id: 'NISTIR_7628', name: 'NISTIR 7628 r1', fullName: 'Guidelines for Smart Grid Cyber Security', description: 'Three-volume technical guideline establishing robust security requirements for smart grid facilities.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 188, maturityLevels: ['High', 'Medium', 'Low'] },
  { id: 'INGAA_GUIDE', name: 'INGAA Guidelines', fullName: 'Control Systems Cyber Security Guidelines for Natural Gas Pipelines', description: 'Industry standards for securing interstate natural gas compressor stations and SCADA links.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy', 'Transportation Systems'], questionCount: 28, maturityLevels: ['Compressor'] },
  { id: 'API_1164', name: 'API Standard 1164', fullName: 'Pipeline SCADA Security Standard', description: 'American Petroleum Institute standard directing robust security for liquid and gas pipeline networks.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy', 'Transportation Systems'], questionCount: 124, maturityLevels: ['SCADA Level'] },
  { id: 'FERC_889', name: 'FERC Order 889', fullName: 'Open Access Same-Time Information System', description: 'Federal Energy Regulatory Commission guidelines on information sharing and electric transmission interfaces.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy'], questionCount: 65, maturityLevels: ['Standard'] },
  { id: 'IEEE_1686', name: 'IEEE 1686-2022', fullName: 'Standard for Intelligent Electronic Devices - IEDs Cyber Security', description: 'Specifies access control, auditing, and cryptographic features for electrical substation electronic devices.', category: 'Energy & Utilities', sector: 'Energy', sectors: ['Energy', 'Critical Manufacturing'], questionCount: 92, maturityLevels: ['IED Level'] },
  { id: 'NRC_RG_5_71', name: 'NRC Regulatory Guide 5.71', fullName: 'Cyber Security Programs for Nuclear Facilities', description: 'Strict nuclear regulatory commission framework to prevent radiological sabotage via digital systems.', category: 'Nuclear Operations', sector: 'Nuclear Reactors, Materials, and Waste', sectors: ['Nuclear Reactors, Materials, and Waste', 'Energy'], questionCount: 154, maturityLevels: ['Nuclear Standard'] },
  { id: 'IAEA_NSS_17', name: 'IAEA NSS-17-G', fullName: 'Technical Guidance for Computer Security at Nuclear Facilities', description: 'Global IAEA recommendations establishing computer security plans for nuclear material holding systems.', category: 'Nuclear Operations', sector: 'Nuclear Reactors, Materials, and Waste', sectors: ['Nuclear Reactors, Materials, and Waste', 'Energy'], questionCount: 112, maturityLevels: ['IAEA Standard'] },

  // 31-40: Water & Wastewater Sector
  { id: 'AWWA_G430', name: 'AWWA G430-22', fullName: 'Water and Wastewater Utility Security Practices', description: 'Security and preparedness standards specifically designed for water treatment plant infrastructure operations.', category: 'Water & Wastewater', sector: 'Water and Wastewater Systems', sectors: ['Water and Wastewater Systems', 'Healthcare and Public Health'], questionCount: 96, maturityLevels: ['Standard'] },
  { id: 'EPA_WATER', name: 'EPA Cybersecurity Baseline', fullName: 'Cybersecurity Baseline for Public Water Systems', description: 'EPA requirements protecting critical operations and PLCs in drinking water treatment facilities.', category: 'Water & Wastewater', sector: 'Water and Wastewater Systems', sectors: ['Water and Wastewater Systems', 'Healthcare and Public Health'], questionCount: 78, maturityLevels: ['Baseline'] },
  { id: 'AWWA_M19', name: 'AWWA M19 Emergency Planning', fullName: 'Emergency Planning for Water and Wastewater Utilities', description: 'Manual of water supply practices outlining physical and cybersecurity risk mitigation strategies.', category: 'Water & Wastewater', sector: 'Water and Wastewater Systems', sectors: ['Water and Wastewater Systems', 'Emergency Services'], questionCount: 52, maturityLevels: ['Resiliency'] },
  { id: 'NIST_800_171', name: 'NIST SP 800-171 r3', fullName: 'Protecting Controlled Unclassified Information in Nonfederal Systems', description: 'Cybersecurity requirements for protecting sensitive defense-related data stored on nonfederal information systems.', category: 'Defense & Aerospace', sector: 'Defense Industrial Base', sectors: ['Defense Industrial Base', 'Government Facilities', 'Critical Manufacturing'], questionCount: 110, maturityLevels: ['Basic', 'Derived'] },
  { id: 'NIST_800_172', name: 'NIST SP 800-172', fullName: 'Enhanced Security Requirements for Controlled Unclassified Information', description: 'Advanced security practices engineered to stop Advanced Persistent Threats (APTs) targeting high-value defense data.', category: 'Defense & Aerospace', sector: 'Defense Industrial Base', sectors: ['Defense Industrial Base', 'Government Facilities', 'Critical Manufacturing'], questionCount: 45, maturityLevels: ['Enhanced'] },
  { id: 'CMMC_L1', name: 'CMMC 2.0 Level 1', fullName: 'Cybersecurity Maturity Model Certification - Foundational', description: 'Basic cyber hygiene requirements protecting federal contract information across 17 distinct controls.', category: 'Defense & Aerospace', sector: 'Defense Industrial Base', sectors: ['Defense Industrial Base', 'Government Facilities'], questionCount: 17, maturityLevels: ['Level 1 (Foundational)'] },
  { id: 'CMMC_L2', name: 'CMMC 2.0 Level 2', fullName: 'Cybersecurity Maturity Model Certification - Advanced', description: 'Aligns fully with NIST SP 800-171, introducing 110 controls for companies handling CUI data.', category: 'Defense & Aerospace', sector: 'Defense Industrial Base', sectors: ['Defense Industrial Base', 'Government Facilities', 'Critical Manufacturing'], questionCount: 110, maturityLevels: ['Level 2 (Advanced)'] },
  { id: 'CMMC_L3', name: 'CMMC 2.0 Level 3', fullName: 'Cybersecurity Maturity Model Certification - Expert', description: 'Advanced security controls based on NIST 800-172, protecting high-value target assets from persistent threats.', category: 'Defense & Aerospace', sector: 'Defense Industrial Base', sectors: ['Defense Industrial Base', 'Government Facilities', 'Critical Manufacturing'], questionCount: 45, maturityLevels: ['Level 3 (Expert)'] },
  { id: 'CNSSI_1253', name: 'CNSSI 1253', fullName: 'Security Categorization for National Security Systems', description: 'Instructions on categorizing government national security databases and applying tailored overlays.', category: 'Defense & Aerospace', sector: 'Defense Industrial Base', sectors: ['Defense Industrial Base', 'Government Facilities'], questionCount: 220, maturityLevels: ['High Impact'] },
  { id: 'NNSA_NAP_24', name: 'NNSA NAP-24A', fullName: 'Weapons Program Information Security Requirements', description: 'U.S. National Nuclear Security Administration standards governing defense nuclear facilities.', category: 'Defense & Aerospace', sector: 'Nuclear Reactors, Materials, and Waste', sectors: ['Nuclear Reactors, Materials, and Waste', 'Defense Industrial Base', 'Government Facilities'], questionCount: 198, maturityLevels: ['Defense Nuclear'] },

  // 41-50: Transportation Sector (Pipeline, Rail, Aviation, Maritime)
  { id: 'TSA_PIPELINE', name: 'TSA Pipeline Directive 2C', fullName: 'TSA Pipeline Cybersecurity Directives', description: 'Mandatory directives focusing on security segmentation, access controls, and boundary mitigation for pipeline operators.', category: 'Transportation', sector: 'Transportation Systems', sectors: ['Transportation Systems', 'Energy'], questionCount: 78, maturityLevels: ['Section 1', 'Section 2'] },
  { id: 'TSA_RAIL', name: 'TSA Rail Directive 01', fullName: 'TSA Cybersecurity Directive for Passenger and Freight Rail', description: 'TSA cybersecurity regulations for passenger and freight rail systems to prevent system disruption.', category: 'Transportation', sector: 'Transportation Systems', sectors: ['Transportation Systems'], questionCount: 65, maturityLevels: ['Operational'] },
  { id: 'FAA_AIRPORT', name: 'FAA Airport Cyber Security', fullName: 'FAA Guidelines for Airport Operations and Traffic Systems', description: 'Cybersecurity standards designed to protect airport networks, ground control, and navigation radars.', category: 'Transportation', sector: 'Transportation Systems', sectors: ['Transportation Systems'], questionCount: 88, maturityLevels: ['Aviation'] },
  { id: 'USCG_MARITIME', name: 'USCG Maritime Cyber Security', fullName: 'US Coast Guard Cybersecurity Standards for Marine Facilities', description: 'Regulations mandating maritime facilities to document, mitigate, and report ship-to-shore network risks.', category: 'Transportation', sector: 'Transportation Systems', sectors: ['Transportation Systems'], questionCount: 92, maturityLevels: ['Maritime'] },
  { id: 'DO_326A', name: 'DO-326A', fullName: 'Airworthiness Security Process Specification', description: 'Aviation security specification designed to protect aircraft digital control buses and avionics links.', category: 'Transportation', sector: 'Transportation Systems', sectors: ['Transportation Systems', 'Critical Manufacturing'], questionCount: 78, maturityLevels: ['Avionics'] },
  { id: 'CFATS_RBPS', name: 'CFATS RBPS', fullName: 'Chemical Facility Anti-Terrorism Standards - Risk-Based Performance', description: 'Department of Homeland Security (DHS) risk-based performance goals protecting high-risk chemical facilities.', category: 'Chemical Operations', sector: 'Chemical', sectors: ['Chemical', 'Emergency Services'], questionCount: 88, maturityLevels: ['RBPS 1-18'] },
  { id: 'ANSSI_BP_006', name: 'ANSSI BP-006', fullName: 'French Security Guidelines for Industrial Control Systems', description: 'French national cybersecurity agency (ANSSI) guidelines establishing secure ICS network architectures.', category: 'Industrial Control Systems', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems', 'Chemical'], questionCount: 110, maturityLevels: ['Class 1', 'Class 2', 'Class 3'] },
  { id: 'BSI_IT_GRUNDSCHUTZ', name: 'BSI IT-Grundschutz', fullName: 'German IT Baseline Protection Methodology', description: 'German BSI framework mapping detailed, structural security controls protecting enterprise networks.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Commercial Facilities', 'Government Facilities'], questionCount: 240, maturityLevels: ['Baseline'] },
  { id: 'DHS_CATALOG', name: 'DHS Catalog of Controls', fullName: 'DHS Catalog of Control Systems Security Recommendation', description: 'DHS compilation of security guidelines designed to secure legacy programmable logic controllers (PLCs).', category: 'Industrial Control Systems', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems', 'Chemical'], questionCount: 210, maturityLevels: ['Core Control'] },
  { id: 'ISA_99_LEGACY', name: 'ISA-99', fullName: 'ISA-99 Standard', description: 'Legacy industrial network standard establishing basic zoning security concepts.', category: 'Industrial Control Systems', sector: 'Cross-Sector', sectors: ['Critical Manufacturing', 'Energy', 'Water and Wastewater Systems'], questionCount: 65, maturityLevels: ['Legacy Standard'] },

  // 51-66: IT/OT General, Cloud, and Financial Compliance
  { id: 'ISO_27001', name: 'ISO/IEC 27001:2022', fullName: 'Information Security Management System', description: 'International standard specifying the requirements for establishing, implementing, maintaining information security.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Financial Services', 'Healthcare and Public Health'], questionCount: 114, maturityLevels: ['Core Control'] },
  { id: 'COBIT_2019', name: 'COBIT 2019', fullName: 'Information and Technology Governance Framework', description: 'ISACA corporate governance and IT management framework aligning technical operations with corporate business strategies.', category: 'Governance & Policy', sector: 'Cross-Sector', sectors: ['Information Technology', 'Financial Services', 'Government Facilities'], questionCount: 140, maturityLevels: ['Maturity 1-5'] },
  { id: 'HIPAA_SECURITY', name: 'HIPAA Security Rule', fullName: 'Health Insurance Portability and Accountability Act Standards', description: 'U.S. national standards protecting electronic protected health information (ePHI) across technical controls.', category: 'Health & Medical', sector: 'Healthcare and Public Health', sectors: ['Healthcare and Public Health', 'Information Technology'], questionCount: 42, maturityLevels: ['Administrative', 'Physical', 'Technical'] },
  { id: 'SOC_2', name: 'SOC 2 Type II', fullName: 'Trust Services Criteria - Security, Confidentiality, Availability', description: 'AICPA criteria confirming corporate systems protect data assets from unauthorized intrusions and downtime.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Financial Services', 'Commercial Facilities'], questionCount: 105, maturityLevels: ['TSC Audited'] },
  { id: 'PCI_DSS', name: 'PCI-DSS v4.0', fullName: 'Payment Card Industry Data Security Standard', description: 'Global technical standard safeguarding payment gateway structures, processing links, and customer database logs.', category: 'Finance Operations', sector: 'Financial Services', sectors: ['Financial Services', 'Commercial Facilities'], questionCount: 254, maturityLevels: ['Level 1-4'] },
  { id: 'CSA_CCM', name: 'CSA Cloud Controls Matrix', fullName: 'Cloud Security Alliance Controls Framework', description: 'Specifies 197 cloud-specific security controls spanning 17 domains to evaluate cloud service providers.', category: 'Cloud Security', sector: 'Cross-Sector', sectors: ['Information Technology', 'Commercial Facilities', 'Government Facilities'], questionCount: 197, maturityLevels: ['Level 1-3'] },
  { id: 'ACSC_ESSENTIAL_8', name: 'ACSC Essential Eight', fullName: 'Australian Cyber Security Centre Mitigation Strategies', description: 'Prioritized mitigation strategies focused on preventing intrusions, limiting host impacts, and recovering data.', category: 'General IT/OT', sector: 'Cross-Sector', sectors: ['Information Technology', 'Government Facilities', 'Defense Industrial Base'], questionCount: 24, maturityLevels: ['Level 1', 'Level 2', 'Level 3'] },
  { id: 'SWIFT_CSCF', name: 'SWIFT CSCF v2024', fullName: 'SWIFT Customer Security Controls Framework', description: 'Mandatory security baseline validating transaction network terminals and link endpoints.', category: 'Finance Operations', sector: 'Financial Services', sectors: ['Financial Services'], questionCount: 32, maturityLevels: ['Mandatory', 'Advisory'] },
  { id: 'CRI_PROFILE', name: 'CRI Profile v2.0', fullName: 'Cyber Risk Institute Unified Profile for Financial Sector', description: 'Unified financial sector cybersecurity assessment scaling across asset management and banking.', category: 'Finance Operations', sector: 'Financial Services', sectors: ['Financial Services'], questionCount: 184, maturityLevels: ['Tier 1-4'] },
  { id: 'KATRI_SCADA', name: 'KATRI SCADA Framework', fullName: 'Korean Infrastructure SCADA Security Standard', description: 'Regulatory framework directing baseline protections for municipal SCADA networks and utility facilities.', category: 'Industrial Control Systems', sector: 'Cross-Sector', sectors: ['Energy', 'Water and Wastewater Systems', 'Transportation Systems'], questionCount: 95, maturityLevels: ['Standard'] },
  { id: 'NIST_800_37', name: 'NIST SP 800-37 r2', fullName: 'Risk Management Framework - RMF Process Guide', description: 'Directs the seven-step authorization and continuous monitoring pipeline for critical state database systems.', category: 'Risk Management', sector: 'Cross-Sector', sectors: ['Information Technology', 'Government Facilities'], questionCount: 65, maturityLevels: ['RMF Step 1-7'] },
  { id: 'NIST_800_161', name: 'NIST SP 800-161 r1', fullName: 'Cybersecurity Supply Chain Risk Management (C-SCRM)', description: 'Technical frameworks for monitoring, managing, and resolving vulnerabilities inside external supplier links.', category: 'Supply Chain Security', sector: 'Cross-Sector', sectors: ['Information Technology', 'Critical Manufacturing', 'Defense Industrial Base', 'Government Facilities'], questionCount: 115, maturityLevels: ['Basic', 'Enhanced'] },
  { id: 'ENISA_IOT', name: 'ENISA IoT Security', fullName: 'ENISA Guidelines for Securing Internet of Things', description: 'European IoT security guidelines outlining robust configuration profiles for telemetry transceivers.', category: 'Cloud Security', sector: 'Cross-Sector', sectors: ['Information Technology', 'Commercial Facilities'], questionCount: 88, maturityLevels: ['Baseline'] },
  { id: 'NIS2', name: 'EU NIS2 Directive', fullName: 'Directive (EU) 2022/2555 on Cybersecurity Risk Management measures', description: 'European Union\'s mandatory directive establishing high-level risk management, governance, and reporting obligations for essential sectors.', category: 'Governance & Policy', sector: 'Cross-Sector', sectors: ['Energy', 'Transportation Systems', 'Financial Services', 'Healthcare and Public Health', 'Water and Wastewater Systems', 'Information Technology', 'Chemical'], questionCount: 10, maturityLevels: ['Article 21(2)'] },
  { id: 'CRA', name: 'EU Cyber Resilience Act', fullName: 'Horizontal Cybersecurity Requirements for Products with Digital Elements', description: 'Mandatory EU framework prescribing secure-by-design product properties and active vulnerability handling lifecycle rules.', category: 'Product Security', sector: 'Cross-Sector', sectors: ['Information Technology', 'Critical Manufacturing', 'Commercial Facilities'], questionCount: 21, maturityLevels: ['Annex I'] },
  { id: 'SOCI_ACT', name: 'Australian SOCI Act', fullName: 'Security of Critical Infrastructure Act 2018 Risk Management Program', description: 'Australian legislative program mandating critical asset operators to identify and mitigate risks across 4 risk vectors.', category: 'Critical Infrastructure', sector: 'Cross-Sector', sectors: ['Energy', 'Transportation Systems', 'Water and Wastewater Systems', 'Financial Services', 'Healthcare and Public Health', 'Information Technology', 'Communications', 'Food and Agriculture'], questionCount: 16, maturityLevels: ['LIN 23/006'] }
]

const CSET_FRAMEWORKS = CSET_FRAMEWORKS_RAW.map(enrichFramework);

// Dynamic questions library mapping all details of standard codes
const BESPOKE_BLUEPRINTS: Record<string, [string, string, string, string, number, string][]> = {
  NERC_CIP_002: [
    ["R1.1", "BES Cyber Asset Identification", "Are all critical BES Cyber Assets identified and cataloged under {fw_name}?", "Cyber Asset Identification", 3, "Verify systematic identification of critical Bulk Electric System cyber systems to enforce {fw_name} baseline controls."],
    ["R1.2", "System Impact Level", "Are identified BES Cyber Systems categorized into High, Medium, or Low impact levels under {fw_name}?", "Cyber Asset Identification", 3, "Ensure proper categorization of assets into impact boundaries according to {fw_name} standards."],
    ["R1.3", "Asset Connectivity Vetting", "Are external routable connectivity paths identified for all BES assets under {fw_name}?", "Cyber Asset Identification", 3, "Audit routable connectivity pathways and dial-up links crossing electronic perimeters."],
    ["R2", "BES Cyber Asset Update Review", "Is the BES cyber asset list reviewed and updated at least once every 15 calendar months under {fw_name}?", "Asset Governance", 4, "Validate continuous compliance auditing and list updates within {fw_name} regulatory cycles."],
    ["R2.1", "Change Identification Procedures", "Are inventory changes tracked and flagged dynamically under {fw_name}?", "Asset Governance", 3, "Verify that configuration changes trigger re-evaluation of asset identification."],
    ["R2.2", "System Re-evaluations", "Are BES asset classifications re-evaluated upon network segment modifications under {fw_name}?", "Asset Governance", 4, "Ensure risk scores are adjusted to maintain alignment with {fw_name} criteria."],
    ["R3", "BES Connectivity Mapping", "Are all external logical links mapped and approved under {fw_name}?", "Connectivity Vetting", 3, "Audit external communications crossings and boundary data flows for critical nodes."],
    ["R3.1", "Asset Inventory Database", "Is an active database list of identified physical devices maintained under {fw_name}?", "Cyber Asset Identification", 3, "Verify serial numbers, MAC addresses, and physical device counts against the verified catalog."],
    ["R4", "BES Classification Documentation", "Is the categorization documentation protected against unauthorized access under {fw_name}?", "Asset Governance", 4, "Ensure the BES asset database is encrypted at rest and locked down with strict RBAC."],
    ["R4.1", "BES Regional Auditing Vetting", "Are BES asset lists prepared for annual auditing by regional compliance officers under {fw_name}?", "Asset Governance", 4, "Validate that logs are formatted correctly to support regulatory NERC auditor sweeps."]
  ],
  NERC_CIP_003: [
    ["R1", "Cyber Security Policy", "Are there documented, approved cybersecurity policies for BES systems under {fw_name}?", "Security Management Policies", 4, "Validate corporate cybersecurity management plan updates and approval thresholds under {fw_name}."],
    ["R1.1", "Policy Annual Approval", "Are cybersecurity policies reviewed and approved annually by senior management under {fw_name}?", "Security Management Policies", 4, "Ensure executive signing gates are met within standard regulatory periods under {fw_name}."],
    ["R2", "Designated Leadership", "Is a designated security leader assigned with formal responsibility for CIP compliance under {fw_name}?", "Designated Leadership", 4, "Check leadership designations and escalation routes for security incident alerts under {fw_name}."],
    ["R3", "Access Control Policies", "Are access authorization policies documented and enforced under {fw_name}?", "Security Management Policies", 3, "Verify logical credential policy updates and authentication enforcement gates under {fw_name}."],
    ["R4", "Low-Impact System Controls", "Are change control procedures documented for low-impact BES assets under {fw_name}?", "Change Control & Management", 3, "Audit baseline modification steps for low-impact utility devices under {fw_name}."],
    ["R4.1", "Incident Response for Low-Impact", "Are incident response guidelines defined for low-impact assets under {fw_name}?", "Change Control & Management", 3, "Ensure containment protocols exist for lower-tier electrical switches under {fw_name}."],
    ["R5", "Asset Protection Program", "Is an information protection program active to safeguard cyber asset data under {fw_name}?", "Security Management Policies", 4, "Verify secure handling policies for network topologies and device configuration files under {fw_name}."],
    ["R5.1", "Physical Security Policy", "Are physical access policies documented for control rooms and substations under {fw_name}?", "Security Management Policies", 3, "Audit building entry standards, lock key controls, and visitor regulations under {fw_name}."],
    ["R6", "Supplier Vetting Controls", "Are supply chain risk management policies integrated into procurement under {fw_name}?", "Security Management Policies", 4, "Ensure vendor security control assessments are mandatory before system acquisitions under {fw_name}."],
    ["R6.1", "Annual Policy Vetting Review", "Are security policy controls reviewed and audited annually under {fw_name}?", "Security Management Policies", 4, "Verify systematic review of governance controls to satisfy annual compliance audits under {fw_name}."]
  ],
  NERC_CIP_004: [
    ["R1", "Security Awareness Training", "Is quarterly security awareness training mandatory for all staff under {fw_name}?", "Personnel Awareness & Training", 4, "Verify standard cyber hygiene and safety training procedures under {fw_name}."],
    ["R2", "Personnel Background Vetting", "Are seven-year criminal background checks performed for all personnel with unescorted access under {fw_name}?", "Personnel Vetting", 3, "Audit the personnel vetting and screening process in accordance with {fw_name} guidelines."],
    ["R3", "Access Authorization Process", "Are system access privileges reviewed and authorized prior to activation under {fw_name}?", "Access Authorization", 3, "Check access provisioning workflows and authorization records under {fw_name}."],
    ["R3.1", "Annual Authorization Audit", "Is the list of authorized personnel reviewed at least once every 15 calendar months under {fw_name}?", "Access Authorization", 4, "Ensure continuous authorization vetting and audit trail updates under {fw_name}."],
    ["R4", "Access Revocation Process", "Are access privileges revoked immediately upon employee termination under {fw_name}?", "Access Authorization", 3, "Verify automatic lockouts and credentials purging procedures under {fw_name}."],
    ["R4.1", "Immediate Revocation Verification", "Is a confirmation trace logged within 24 hours of personnel offboarding under {fw_name}?", "Access Authorization", 3, "Check logical cleanup logs following staff exit dates under {fw_name}."],
    ["R5", "Training Record Retention", "Are personnel training records and vetting documents retained for audit under {fw_name}?", "Personnel Vetting", 4, "Ensure all physical and electronic training certificates are archived securely under {fw_name}."],
    ["R5.1", "Contractor Vetting Program", "Are external contractors subjected to the same background checks as internal staff under {fw_name}?", "Personnel Vetting", 3, "Audit third-party consultant screening workflows to maintain the {fw_name} posture."],
    ["R6", "Operational Role Vetting", "Are engineering setpoint modifications restricted to certified operator roles under {fw_name}?", "Access Authorization", 3, "Ensure role-based access restricts sensitive control operations under {fw_name}."],
    ["R6.1", "Vetting Program Audits", "Are background check processes audited annually for compliance under {fw_name}?", "Personnel Vetting", 4, "Audit the screening framework and external search agencies under {fw_name}."]
  ],
  NERC_CIP_005: [
    ["R1", "Electronic Security Perimeter (ESP)", "Is a defined Electronic Security Perimeter constructed to isolate BES cyber systems under {fw_name}?", "Electronic Security Perimeters", 3, "Check that boundary firewalls isolate critical operations loops under {fw_name}."],
    ["R1.1", "ESP Boundary Firewall Control", "Are firewall rules configured to block all unmediated traffic traversing the ESP under {fw_name}?", "Electronic Security Perimeters", 3, "Audit edge router filtering tables and zone communication blocks under {fw_name}."],
    ["R1.2", "Interactive Remote Access Management", "Are all remote administrative connections terminated within a secure DMZ under {fw_name}?", "Interactive Remote Access", 3, "Verify dedicated operational DMZ gateway proxies exist under {fw_name}."],
    ["R2", "Remote Access Authentication", "Is multi-factor authentication enforced for all external remote access sessions under {fw_name}?", "Interactive Remote Access", 4, "Check MFA settings for external vendor tunnels and mobile technicians under {fw_name}."],
    ["R2.1", "Jump Server Remote Mediation", "Are remote session channels mediated through Jump Servers within the ESP under {fw_name}?", "Interactive Remote Access", 3, "Validate jump host dual-approval gates and keystroke recording under {fw_name}."],
    ["R2.2", "Session Inactivity Timeout", "Do remote administrative active sessions lock automatically after 15 minutes of idle state under {fw_name}?", "Interactive Remote Access", 3, "Audit timeout rules on administrative terminals inside the {fw_name} perimeter."],
    ["R2.3", "Remote Session Active Logging", "Are all remote contractor sessions monitored and logged continuously under {fw_name}?", "Interactive Remote Access", 3, "Verify centralized audit trail updates for external connection events under {fw_name}."],
    ["R3", "ESP Diagnostic Interface Lockdown", "Are unused physical ports and services disabled on ESP boundary switches under {fw_name}?", "Electronic Security Perimeters", 2, "Check physical port blockers and switch configuration records under {fw_name}."],
    ["R3.1", "ESP Access Control Audits", "Are perimeter firewall rule reviews executed at least once every 90 days under {fw_name}?", "Electronic Security Perimeters", 4, "Verify regular firewall rule compliance sweeps under {fw_name}."],
    ["R3.2", "ESP Logical Zone Separation", "Are operational networks segmented from corporate LANs using redundant firewalls under {fw_name}?", "Electronic Security Perimeters", 3, "Audit network topology to confirm no direct routing between Level 4 and Level 2 exists."]
  ],
  NERC_CIP_006: [
    ["R1", "Physical Security Perimeter (PSP)", "Is a Physical Security Perimeter implemented to protect BES Cyber Assets under {fw_name}?", "Physical Security Perimeters", 3, "Check building structures, fence perimeters, and control rooms under {fw_name}."],
    ["R1.1", "Substation Facility Access Gates", "Are physical access controls (badge readers, CCTV) active at substation gates under {fw_name}?", "Physical Security Perimeters", 3, "Verify that only authorized, badged personnel can cross facility perimeters under {fw_name}."],
    ["R1.2", "Physical Access Logging", "Are all physical entries and exits logged and archived for at least 90 days under {fw_name}?", "Physical Security Perimeters", 3, "Audit entry logbooks and electronic card reader logs under {fw_name}."],
    ["R2", "Visitor Escort and Logging", "Are visitors without unescorted privileges escorted at all times within the PSP under {fw_name}?", "Visitor Controls & Escorts", 3, "Verify operator safety guidelines and physical monitoring protocols for external visitors under {fw_name}."],
    ["R2.1", "Visitor Log Book Audits", "Are visitor logs reviewed weekly to identify unauthorized access attempts under {fw_name}?", "Visitor Controls & Escorts", 4, "Check review signatures on visitor registers under {fw_name}."],
    ["R2.2", "Hardware Enclosure Locking", "Are hardware cabinets and terminal blocks locked inside secure steel enclosures under {fw_name}?", "Physical Security Perimeters", 1, "Verify padlock checks and enclosure seals for controllers in the field under {fw_name}."],
    ["R3", "Physical Intrusion Alerting", "Are active alarms triggered immediately in the SCADA console upon unauthorized entry under {fw_name}?", "Physical Security Perimeters", 3, "Test tamper alarms on server racks and control room doors under {fw_name}."],
    ["R3.1", "CCTV Security Camera Vetting", "Are security cameras checked daily for active video streaming and alignment under {fw_name}?", "Physical Security Perimeters", 3, "Verify CCTV video feed feeds to the central security desk under {fw_name}."],
    ["R4", "Enclosure Door Contact Sensors", "Are magnetic door contact sensors installed on all critical diagnostic panels under {fw_name}?", "Physical Security Perimeters", 1, "Audit telemetry status of door sensors in the SCADA tag list under {fw_name}."],
    ["R4.1", "Physical Security Plan Review", "Is the physical security plan reviewed and updated annually under {fw_name}?", "Visitor Controls & Escorts", 4, "Validate executive approval of the physical protection plan under {fw_name}."]
  ],
  NERC_CIP_007: [
    ["R1", "Ports & Services Lockdown", "Are unused physical and logical ports locked out on all field devices under {fw_name}?", "System Security Management", 2, "Check that unused serial, USB, and Ethernet ports are disabled on PLCs and switches."],
    ["R1.1", "Insecure Protocols Disabling", "Are insecure protocols (such as raw Telnet, HTTP, or FTP) disabled on all PLCs under {fw_name}?", "System Security Management", 2, "Verify that only secure services like SSH or HTTPS are active on intelligent units under {fw_name}."],
    ["R2", "Patch Management and Scanning", "Are firmware patch vulnerability assessments executed at least once every 35 days under {fw_name}?", "Patch Management", 2, "Ensure systematic vulnerability analysis is conducted inside standard compliance windows under {fw_name}."],
    ["R2.1", "Sandbox Patch Validation", "Are security patches validated in offline sandboxes before active deployment under {fw_name}?", "Patch Management", 2, "Audit test reports verifying patch compatibility with operational configurations under {fw_name}."],
    ["R3", "Malicious Code Prevention", "Are active malware detection engines installed and updated daily on all hosts under {fw_name}?", "Malicious Code Prevention", 2, "Check antivirus, host IDS, and boundary scanners for process databases under {fw_name}."],
    ["R3.1", "Antivirus Signature Sweeps", "Are daily antivirus signature updates verified on engineering workstations under {fw_name}?", "Malicious Code Prevention", 2, "Verify configuration sweeps for local malware databases under {fw_name}."],
    ["R4", "Security Event Logging", "Are security events logged continuously with precise, synchronized timestamps under {fw_name}?", "System Logging & Auditing", 2, "Verify NTP time sync and continuous logging to a dedicated secondary buffer under {fw_name}."],
    ["R4.1", "Write-Once Syslog Storage", "Are audit logs streamed in real-time to a secure, centralized WORM repository under {fw_name}?", "System Logging & Auditing", 2, "Ensure trace logs are immune to local manipulation by ransomware under {fw_name}."],
    ["R5", "Access Control Vetting", "Are unique accounts assigned to all users, completely disabling shared logins under {fw_name}?", "System Security Management", 3, "Verify logical credential policy updates and authentication enforcement gates under {fw_name}."],
    ["R5.1", "Administrative Session Terminations", "Do active sessions lock automatically after 10 minutes of idle state under {fw_name}?", "System Security Management", 3, "Verify screen locking settings on engineering workstations under {fw_name}."]
  ],
  NERC_CIP_008: [
    ["R1", "Cyber Security Incident Identification", "Are real-time alerting systems active to identify grid cybersecurity incidents under {fw_name}?", "Incident Reporting & Response", 3, "Check that SCADA alarm logs feed into a security monitoring console under {fw_name}."],
    ["R1.1", "Incident Classification Procedures", "Are incidents classified according to documented severity thresholds under {fw_name}?", "Incident Reporting & Response", 4, "Audit incident logs to confirm appropriate threat scoring and escalations under {fw_name}."],
    ["R2", "Incident Response Plan (IRP)", "Is a formal cybersecurity incident response plan documented and active under {fw_name}?", "Incident Reporting & Response", 4, "Verify the response plan is updated and signed off by the security team under {fw_name}."],
    ["R2.1", "IRP Testing and Drills", "Is the incident response plan tested annually through active simulation drills under {fw_name}?", "Incident Reporting & Response", 3, "Audit scenario reviews, tabletop notes, and drill logs under {fw_name}."],
    ["R2.2", "Regulatory Event Reporting", "Are critical grid incidents reported to CISA and E-ISAC within 24 hours of classification under {fw_name}?", "Incident Reporting & Response", 4, "Verify reporting procedures and communication channels under {fw_name}."],
    ["R3", "IRP Role and Task Vetting", "Are specific emergency roles and communication protocols defined for staff under {fw_name}?", "Incident Reporting & Response", 4, "Check designated incident management assignments under {fw_name}."],
    ["R3.1", "Incident Log Retention", "Are incident response logs and post-mortem reports archived for audits under {fw_name}?", "Incident Reporting & Response", 4, "Ensure at least three years of incident audit history is preserved securely under {fw_name}."],
    ["R4", "Incident Post-Mortem Reviews", "Are post-incident reviews conducted within 90 days of resolving critical events under {fw_name}?", "Incident Reporting & Response", 4, "Verify that post-mortem notes are distributed to the engineering board under {fw_name}."],
    ["R4.1", "Incident Response Plan Updates", "Is the IRP updated with lessons learned from tests and actual events under {fw_name}?", "Incident Reporting & Response", 4, "Audit updates to the playbooks to prevent repeating past containment errors under {fw_name}."],
    ["R5", "Annual Tabletop Exercises", "Are emergency water or grid crisis table-tops conducted annually under {fw_name}?", "Incident Reporting & Response", 3, "Verify testing schedules with external regional coordinators under {fw_name}."]
  ],
  NERC_CIP_009: [
    ["R1", "Disaster Recovery Plan Documentation", "Is a detailed recovery plan documented for all BES Cyber Systems under {fw_name}?", "Recovery & Resiliency Planning", 4, "Verify continuous availability planning and operational manuals under {fw_name}."],
    ["R1.1", "Backup Strategy & Schedules", "Are daily backups of SCADA databases and RTU configurations executed under {fw_name}?", "Recovery & Resiliency Planning", 3, "Audit automated backup logs and file directory paths under {fw_name}."],
    ["R1.2", "Encrypted Backup Offsite Storage", "Are backups encrypted and stored offline in secure, fireproof safes under {fw_name}?", "Recovery & Resiliency Planning", 3, "Check that offsite storage protocols isolate data from ransom threats under {fw_name}."],
    ["R2", "Recovery Plan Testing", "Are disaster recovery plans physically tested to verify manual control operations under {fw_name}?", "Recovery & Resiliency Planning", 3, "Ensure the DR framework is validated under simulated grid failures under {fw_name}."],
    ["R2.1", "Disaster Recovery Tabletop", "Are recovery tabletop exercises performed annually with operations staff under {fw_name}?", "Recovery & Resiliency Planning", 3, "Validate emergency staffing maps and utility recovery manuals under {fw_name}."],
    ["R3", "Manual Control Override Capabilities", "Can system operations transition to manual emergency control overrides during blackouts under {fw_name}?", "Recovery & Resiliency Planning", 1, "Verify local bypass handles and hand-operated switchgear exist under {fw_name}."],
    ["R3.1", "Redundant Processor Failovers", "Are critical SCADA servers configured with automated hardware failover under {fw_name}?", "Recovery & Resiliency Planning", 2, "Verify secondary hot-standby servers keep synced tags active under {fw_name}."],
    ["R4", "Recovery Documentation Access", "Are recovery manuals stored in offline, physical format in control rooms under {fw_name}?", "Recovery & Resiliency Planning", 4, "Ensure plant operators can locate print procedures during network down states under {fw_name}."],
    ["R4.1", "Backup Integrity Restores", "Are backup files tested quarterly to verify they can be restored successfully under {fw_name}?", "Recovery & Resiliency Planning", 3, "Verify dry-run SQL restores onto isolated laboratory staging hosts under {fw_name}."],
    ["R4.2", "Emergency Power Systems", "Are emergency diesel generators tested monthly under load under {fw_name}?", "Recovery & Resiliency Planning", 2, "Check starting batteries, fuel levels, and load transfer switches under {fw_name}."]
  ],
  NERC_CIP_010: [
    ["R1", "Configuration Baseline Tracking", "Is a current, authorized baseline configuration documented for all assets under {fw_name}?", "Configuration Change Control", 2, "Verify that switch configurations and PLC logic programs are formally baselined."],
    ["R1.1", "Baseline Integrity Vetting", "Are baseline configuration hashes validated before performing upgrades under {fw_name}?", "Configuration Change Control", 2, "Check that configuration files match verified hashes before installation under {fw_name}."],
    ["R1.2", "Dual-Signature Logic Downloads", "Are dual-operator signatures required before loading code changes to PLCs under {fw_name}?", "Configuration Change Control", 2, "Audit engineering access gates and double-signature authorization workflows under {fw_name}."],
    ["R2", "Change Authorization & Testing", "Are system modifications reviewed, tested, and authorized before release under {fw_name}?", "Configuration Change Control", 3, "Verify test lab reports and change control board logs under {fw_name}."],
    ["R2.1", "Change Verification Auditing", "Are configuration baselines audited at least once every 12 calendar months under {fw_name}?", "Configuration Change Control", 2, "Ensure random checks find no unauthorized software or physical drift under {fw_name}."],
    ["R3", "Active Vulnerability Assessments", "Are active vulnerability scans executed on all BES cyber systems annually under {fw_name}?", "Vulnerability Assessments", 3, "Verify scan ranges, reporting summaries, and security remediation schedules under {fw_name}."],
    ["R3.1", "Vulnerability Remediations Scheduling", "Are identified vulnerabilities resolved or mitigated within 90 days under {fw_name}?", "Vulnerability Assessments", 4, "Check that patch cycles resolve critical exposures on the grid under {fw_name}."],
    ["R3.2", "Substation Port Scanning", "Are diagnostic scans run on substation interfaces to find rogue switches under {fw_name}?", "Vulnerability Assessments", 3, "Audit network scanner configurations and target subnet exclusions under {fw_name}."],
    ["R4", "Baseline Drift Alerts", "Are alerts configured for sudden PLC configuration changes or code updates under {fw_name}?", "Configuration Change Control", 2, "Check SCADA alarm rule profiles mapping baseline modifications under {fw_name}."],
    ["R4.1", "SCRM Supply Vetting Review", "Are configuration updates audited for third-party security compliance under {fw_name}?", "Configuration Change Control", 4, "Ensure all hardware and software changes undergo a supply risk review under {fw_name}."]
  ],
  NERC_CIP_011: [
    ["R1", "BES Cyber Information Protection", "Are operational databases and network maps protected from unauthorized disclosure under {fw_name}?", "Information Protection", 4, "Verify sensitivity markings and access authorization lists for grid schematics."],
    ["R1.1", "Information Storage Encryption", "Is sensitive BES cyber system information encrypted at rest under {fw_name}?", "Information Protection", 3, "Audit file system or database encryption settings for engineering repositories under {fw_name}."],
    ["R2", "Asset Decommissioning Sanitization", "Is complete cryptographic scrubbing executed before decommissioning units under {fw_name}?", "Asset Sanitization", 2, "Verify that all secure keys and configuration profiles are completely wiped on retirement."],
    ["R2.1", "Physical Media Destruction", "Are retired storage drives physically shredded or degaussed under {fw_name}?", "Asset Sanitization", 2, "Check the drive shredding logs and physical disposal manifests under {fw_name}."],
    ["R3", "Information Classification Scheme", "Are operational documents classified by sensitivity level under {fw_name}?", "Information Protection", 4, "Ensure status labels (Internal, Confidential, Secret) are embedded on network maps under {fw_name}."],
    ["R3.1", "Access to Configuration Information", "Is access to detailed network topologies restricted to security cleared staff under {fw_name}?", "Information Protection", 3, "Audit folder permissions and active directory groups protecting the design charts."],
    ["R3.2", "Secure Transient Data Transfers", "Are transient data files encrypted during transmission over public networks under {fw_name}?", "Information Protection", 3, "Verify secure transmission protocols (SFTP, HTTPS) for utility diagnostics under {fw_name}."],
    ["R4", "Sanitization Verification Logs", "Are formal sanitization logs maintained for all decommissioned cyber systems under {fw_name}?", "Asset Sanitization", 4, "Verify certified destruction signatures are filed for regulatory audits under {fw_name}."],
    ["R4.1", "Information Protection Auditing", "Are information security controls reviewed annually for compliance under {fw_name}?", "Information Protection", 4, "Audit program review timelines and executive sign-off records under {fw_name}."],
    ["R4.2", "Transient Media Control", "Are USB drives blocked or strictly managed using encrypted enterprise media under {fw_name}?", "Information Protection", 3, "Audit endpoint security settings preventing standard USB stick insertions under {fw_name}."]
  ],
  NERC_CIP_013: [
    ["R1", "Supply Chain Risk Assessment", "Are security risk audits executed for all grid hardware procurement under {fw_name}?", "Supply Chain Risk Management", 4, "Verify procurement guidelines incorporate supply chain vetting standards under {fw_name}."],
    ["R1.1", "Vendor Security Control Vetting", "Are third-party vendor security practices assessed prior to signing contracts under {fw_name}?", "Supply Chain Risk Management", 4, "Verify vendor questionnaire reviews and risk scoring methodologies under {fw_name}."],
    ["R1.2", "Software Integrity Verification", "Are digital signatures and software hashes validated for all vendor logic updates under {fw_name}?", "Supply Chain Risk Management", 4, "Ensure code updates are validated before execution inside operations networks under {fw_name}."],
    ["R2", "Supply Chain Risk Management Policy", "Is a formal supply chain policy reviewed and approved annually under {fw_name}?", "Supply Chain Risk Management", 4, "Validate executive-level approval of procurement control programs under {fw_name}."],
    ["R2.1", "Vendor Notification Thresholds", "Are vendors contractually required to report cybersecurity incidents within 48 hours under {fw_name}?", "Supply Chain Risk Management", 4, "Check standard master service agreement clauses for incident warning terms under {fw_name}."],
    ["R2.2", "Supplier Remote Access Controls", "Are vendor remote connections strictly authenticated using dual-signature jump hosts under {fw_name}?", "Supply Chain Risk Management", 3, "Ensure supplier connections terminate at a secure proxy inside the operational DMZ under {fw_name}."],
    ["R2.3", "Supply Chain Vulnerability Vetting", "Are third-party components scanned for vulnerabilities before integration under {fw_name}?", "Supply Chain Risk Management", 4, "Verify dependency reviews and software bill of materials (SBOM) checks under {fw_name}."],
    ["R3", "Vendor Configuration Management", "Do vendors provide verified configuration baselines for all delivered units under {fw_name}?", "Supply Chain Risk Management", 3, "Validate device delivery inspection sheets and master firmware hash baselines under {fw_name}."],
    ["R3.1", "Vendor Security Training Verification", "Are vendor technicians required to complete cybersecurity training under {fw_name}?", "Supply Chain Risk Management", 4, "Ensure supplier support staff verify training completion before system access under {fw_name}."],
    ["R3.2", "Supplier Audit Documentation", "Are supply chain audit reports archived and available for regulatory review under {fw_name}?", "Supply Chain Risk Management", 4, "Ensure procurement vetting records are stored to support NERC CIP audits under {fw_name}."]
  ],
  NERC_CIP_014: [
    ["R1", "Substation Threat Risk Assessment", "Are threat risk assessments executed for all critical transmission substations under {fw_name}?", "Transmission Substation Security", 4, "Ensure physical security risk matrices score explosive, vehicle, and ballistics threats."],
    ["R1.1", "Critical Substation Identification", "Are critical substations identified whose loss would cause cascading grid instability under {fw_name}?", "Transmission Substation Security", 4, "Audit engineering power-flow analysis models mapping bulk grid outages under {fw_name}."],
    ["R2", "Physical Security Plan Development", "Is a physical security plan documented and implemented for each critical substation under {fw_name}?", "Transmission Substation Security", 4, "Verify that the facility security plan is active and approved by management under {fw_name}."],
    ["R2.1", "Physical Substation Fencing", "Are substation perimeters secured with industrial fencing and razor wire under {fw_name}?", "Physical Barriers & Cabinets", 3, "Verify fence integrity, gate locking systems, and warning signage under {fw_name}."],
    ["R2.2", "CCTV Monitoring Gates", "Are high-definition CCTV security cameras active at all entry gates under {fw_name}?", "Physical Barriers & Cabinets", 3, "Check camera views, night vision capabilities, and central recording buffers under {fw_name}."],
    ["R2.3", "Motion Sensor Perimeter Alarms", "Are motion sensors active along the substation fencing line under {fw_name}?", "Physical Barriers & Cabinets", 3, "Audit electronic sensors integrated with perimeter alarm consoles under {fw_name}."],
    ["R3", "Substation Control Room Locks", "Are main control room entries secured with biometric and card scanners under {fw_name}?", "Physical Barriers & Cabinets", 3, "Verify reader configurations, electronic locks, and badge logs under {fw_name}."],
    ["R3.1", "Enclosure Cabinet Hardening", "Are outdoor terminal boxes and wiring panels physically locked under {fw_name}?", "Physical Barriers & Cabinets", 1, "Audit physical padlock audits for external marshalling enclosures under {fw_name}."],
    ["R4", "Third-Party Physical Vetting", "Are all physical security controls verified by an independent third-party auditor under {fw_name}?", "Transmission Substation Security", 4, "Validate audit report findings and sign-off records under {fw_name}."],
    ["R4.1", "Physical Security Plan Updates", "Are physical security plans reviewed and updated at least once every 30 calendar months under {fw_name}?", "Transmission Substation Security", 4, "Verify plan renewal cycles and approval dates to maintain compliance under {fw_name}."]
  ],
  IEC_62443_3_3: [
    ["SR 1.1", "IAC - User Identification", "Are human users uniquely identified and authenticated before accessing {fw_name} systems?", "Identification & Authentication Control", 3, "Verify unique operator ID validation gates across all SCADA interfaces and HMIs."],
    ["SR 1.2", "IAC - Software Identification", "Are software processes uniquely identified and authenticated on {fw_name} controllers?", "Identification & Authentication Control", 2, "Ensure process signatures and execution controls restrict unauthorized code loads."],
    ["SR 1.3", "IAC - Multi-Factor Authentication", "Is multi-factor authentication enforced for remote connections to {fw_name} components?", "Identification & Authentication Control", 4, "Check MFA configurations utilizing hardware tokens for external remote support tunnels."],
    ["SR 2.1", "UC - Authorization Enforcement", "Is role-based authorization configured to restrict {fw_name} setpoint controls?", "Use Control", 3, "Audit RBAC policies limiting execution of sensitive commands to certified operator profiles."],
    ["SR 2.2", "UC - Inactive Session Lock", "Are interactive engineering sessions in {fw_name} environments locked automatically?", "Use Control", 3, "Verify automated session logout thresholds on engineering terminals and operations HMIs."],
    ["SR 2.3", "UC - Default Credentials Lock", "Are default manufacturer credentials disabled across all {fw_name} field devices?", "Use Control", 2, "Ensure default passwords, accounts, and insecure configurations are changed on commissioning."],
    ["SR 2.4", "UC - Jump Host Mediation", "Are remote session channels mediated through Jump Servers within the {fw_name} architecture?", "Use Control", 3, "Validate secure administrative gateway transit with complete session logging and operator approvals."],
    ["SR 3.1", "SI - Message Integrity", "Is communication integrity protected using cryptographic signatures on {fw_name} buses?", "System Integrity", 3, "Verify integrity checks and signatures on Modbus/TCP or DNP3 protocol packets traversed."],
    ["SR 3.2", "SI - Malicious Code Protection", "Are active malware detection engines installed at {fw_name} host boundaries?", "System Integrity", 2, "Audit antivirus, active endpoint defenses, and boundary filtering rules for process hosts."],
    ["SR 3.3", "SI - Firmware Hash Vetting", "Are cryptographic firmware signatures validated before updating {fw_name} controllers?", "System Integrity", 3, "Ensure PLC or RTU firmware updates are cryptographically checked against authorized baselines before flashing."],
    ["SR 4.1", "DC - Cryptographic Encryption", "Is cryptographic encryption enforced for all {fw_name} data transit?", "Data Confidentiality", 3, "Audit SSL/TLS configurations and VPN encryption algorithms traversing physical security zones."],
    ["SR 4.2", "DC - Enclave Key Storage", "Are cryptographic keys managed in secure hardware enclaves within {fw_name} modules?", "Data Confidentiality", 4, "Verify secure hardware-backed cryptographic modules (HSM) protecting operational credentials."],
    ["SR 5.1", "RDF - Zone Segmentation", "Are logical electronic security zones strictly separated by defined {fw_name} conduits?", "Restricted Data Flow", 3, "Ensure network boundaries map to Purdue Levels 1-5 with physical or logical segregation conduits."],
    ["SR 5.2", "RDF - Direct Bypass Block", "Is direct unmediated traffic blocked between Level 1-2 process loops and Level 4 under {fw_name}?", "Restricted Data Flow", 1, "Validate perimeter-edge firewall rules blocking direct connections between office LANs and field assets."]
  ],
  IEC_62443_4_2: [
    ["CR 1.1", "Embedded User Auth", "Are embedded devices requiring unique human user authentication under {fw_name}?", "Embedded Device Requirements", 3, "Check that PLCs, RTUs, and smart switches require individual logins for engineering modifications."],
    ["CR 1.2", "Software Process Vetting", "Are software processes authenticated before executing on embedded controllers under {fw_name}?", "Embedded Device Requirements", 2, "Verify that code signatures are checked before running ladder logic or scripts on the unit."],
    ["CR 2.1", "Local Diagnostic Lock", "Are physical diagnostic serial ports locked or logically disabled under {fw_name}?", "Embedded Device Requirements", 1, "Ensure RS-232, RS-485, and USB interfaces are physically locked or disabled to prevent local intrusions."],
    ["CR 3.1", "Secure Boot Validation", "Do embedded controllers enforce secure boot utilizing hardware trust roots under {fw_name}?", "Embedded Device Requirements", 3, "Audit the secure boot sequence ensuring only cryptographically signed firmware is loaded."],
    ["CR 4.1", "Host Hardening Checks", "Are unnecessary services and network daemons disabled on all host systems under {fw_name}?", "Host Device Requirements", 2, "Validate that unused services (e.g. FTP, raw Telnet, HTTP) are disabled in the device settings."],
    ["CR 5.1", "Network Interface lockdown", "Are unused physical ethernet ports on network switches logically locked under {fw_name}?", "Network Device Requirements", 1, "Verify physical switchports are administratively disabled and locked inside secure enclosures."],
    ["CR 6.1", "Software App Session Lock", "Do HMI software applications automatically log out idle sessions under {fw_name}?", "Software Application Requirements", 3, "Verify automated session lock and termination parameters in the SCADA control software interface."],
    ["CR 7.1", "Device Event Auditing", "Do embedded controllers log configuration and logic changes to a local buffer under {fw_name}?", "Embedded Device Requirements", 2, "Check internal device logs capturing configuration changes, reboots, and administrative adjustments."],
    ["CR 7.2", "Syslog REAL-TIME Stream", "Are local device logs streamed in real-time to a secure syslog receiver under {fw_name}?", "Embedded Device Requirements", 2, "Verify that device logs are continuously pushed to the centralized SIEM over secure channels."],
    ["CR 7.3", "Firmware Hash Verification", "Are PLC firmware signatures verified against authorized baselines before flashing under {fw_name}?", "Embedded Device Requirements", 3, "Validate the cryptographic hash review process prior to initiating system firmware upgrades."]
  ],
  IEC_62443_2_1: [
    ["CSMS 1.1", "Security Program Governance", "Is there an established, funded Industrial Security Program under {fw_name}?", "Governance & Management", 4, "Verify corporate commitment, budgets, and charter for the CSMS security program."],
    ["CSMS 1.2", "Designated Security Leader", "Is an executive security leader formally assigned responsibility for CSMS under {fw_name}?", "Governance & Management", 4, "Ensure roles, responsibilities, and reporting escalations are defined for control systems security."],
    ["CSMS 2.1", "ICS Cyber Risk Assessment", "Are active risk assessments executed annually for all control systems under {fw_name}?", "Risk Analysis & Assessment", 4, "Audit risk assessment matrices tracking impact and likelihood scores for control systems environments."],
    ["CSMS 2.2", "Asset Connectivity Vetting", "Are all external logical and routable connections documented and reviewed under {fw_name}?", "Risk Analysis & Assessment", 3, "Verify lists of authorized remote connections, vendor tunnels, and perimeter boundary lines."],
    ["CSMS 3.1", "Asset Inventory Baseline", "Is a comprehensive, accurate hardware and software asset inventory maintained under {fw_name}?", "Asset Management", 3, "Audit automated asset scans and manual inventories listing critical PLCs and RTUs."],
    ["CSMS 3.2", "Information Protection Schemes", "Are critical system topologies and configurations protected from disclosure under {fw_name}?", "Asset Management", 4, "Ensure network drawings, IP schemes, and config baselines are encrypted and restricted to cleared staff."],
    ["CSMS 4.1", "Security Policy Management", "Are documented cybersecurity policies reviewed, updated, and signed annually under {fw_name}?", "Policies & Procedures", 4, "Verify systematic review of governance controls to satisfy CSMS compliance targets."],
    ["CSMS 4.2", "Personnel Security Vetting", "Do personnel with unescorted access to critical zones undergo background checks under {fw_name}?", "Policies & Procedures", 3, "Check that pre-employment screening and annual vetting rules are active for staff."],
    ["CSMS 4.3", "Supplier Vetting Controls", "Are external vendors and third-party contractors audited for CSMS compliance under {fw_name}?", "Policies & Procedures", 4, "Validate supply chain risk reviews and integration contract clauses for service providers."],
    ["CSMS 4.4", "Disaster Recovery Testing", "Are business continuity and disaster recovery plans tested through annual drills under {fw_name}?", "Policies & Procedures", 3, "Verify tabletop exercises simulating SCADA ransomware attacks and manual process overrides."]
  ],
  IEC_62443_2_4: [
    ["SP 1.1", "Service Integration Security", "Are security integration guidelines provided for all commissioned {fw_name} components?", "Service Provider Requirements", 4, "Check that integrators provide a security configuration description for field switch networks."],
    ["SP 1.2", "Operational Zone Vetting", "Are integration processes validating electronic zone perimeters and conduits under {fw_name}?", "Service Provider Requirements", 3, "Verify that zone routing boundaries conform exactly to the baseline design maps."],
    ["SP 2.1", "Vendor Patch Verification", "Do service providers validate software patches before performing maintenance under {fw_name}?", "Service Provider Requirements", 2, "Audit patch testing processes to prevent introduction of malicious logic to operational PLCs."],
    ["SP 2.2", "Vendor Credentials Disabling", "Are default supplier logins disabled upon commissioning {fw_name} hardware?", "Service Provider Requirements", 2, "Ensure manufacturer credentials are deleted and replaced by unique operator passwords."],
    ["SP 3.1", "Supplier Staff Clearance Vetting", "Do vendor technicians undergo criminal background screening under {fw_name}?", "Service Provider Requirements", 3, "Ensure third-party staff verify clearances before performing onsite field actions."],
    ["SP 3.2", "External Remote Mediation", "Are remote contractor support VPNs mediated through secure multi-factor jump hosts under {fw_name}?", "Service Provider Requirements", 3, "Validate that remote sessions require dual operator signoffs and complete logging."],
    ["SP 4.1", "Product Installation Guidelines", "Are hardened configuration guidelines documented for all field assets under {fw_name}?", "Service Provider Requirements", 3, "Audit manufacturer documentation for active firewall rule templates and port locks."],
    ["SP 4.2", "Logic Flash Verification", "Are PLC program hashes verified against master backups after service actions under {fw_name}?", "Service Provider Requirements", 2, "Verify that logic files are checked for unapproved ladder updates post-maintenance."],
    ["SP 5.1", "Service Level Agreement Terms", "Do integration contracts define security event reporting response times under {fw_name}?", "Service Provider Requirements", 4, "Verify that supplier SLAs mandate immediate notification of supply chain breaches."],
    ["SP 5.2", "Service Program Audit Schedule", "Are service provider security programs audited by asset owners annually under {fw_name}?", "Service Provider Requirements", 4, "Check third-party program certificates and internal audit logs to confirm ongoing vetting."]
  ],
  IEC_62443_4_1: [
    ["SD 1.1", "Security Development Lifecycle", "Is there a formal secure development lifecycle program established under {fw_name}?", "Product SDL Governance", 4, "Verify that security is integrated into product planning, design, and coding phases."],
    ["SD 1.2", "Secure Architecture Design", "Are threat modeling and secure design reviews executed for all products under {fw_name}?", "Product SDL Governance", 4, "Audit system architectural reviews and trust boundary mappings in product blueprints."],
    ["SD 2.1", "Secure Coding Guidelines", "Are secure coding standards (such as MISRA C or OWASP) enforced in code under {fw_name}?", "Secure Design & Development", 3, "Verify compiler options and static analysis tool profiles checking code syntax rules."],
    ["SD 2.2", "Static Code Analysis Vetting", "Are static analysis scans executed automatically on every code integration under {fw_name}?", "Secure Design & Development", 3, "Audit build pipelines for automated scanning gates flagging buffer overflow risks."],
    ["SD 3.1", "Third-Party Code Vetting", "Are third-party open source library dependencies scanned for vulnerabilities under {fw_name}?", "Secure Design & Development", 4, "Validate software bill of materials (SBOM) and dependency checkers active in development."],
    ["SD 3.2", "Dynamic Software Testing", "Is dynamic application security testing (fuzzing) performed before code release under {fw_name}?", "Secure Design & Development", 3, "Verify protocol fuzzing campaigns on PLC web services and Modbus libraries."],
    ["SD 4.1", "Vulnerability Response Program", "Is there a documented process to receive, evaluate, and patch security bugs under {fw_name}?", "Vulnerability Handling & Vetting", 4, "Check that the developer publishes secure contact details and responds to research alerts."],
    ["SD 4.2", "Remediation Patch Releases", "Are security hotfixes and remediation patches delivered within 30 days under {fw_name}?", "Vulnerability Handling & Vetting", 2, "Verify delivery and distribution procedures for security vulnerability updates."],
    ["SD 5.1", "Firmware Cryptographic Signing", "Are product firmware updates digitally signed using highly secure keys under {fw_name}?", "Product SDL Governance", 3, "Verify code signature certificates and hardware security modules protecting update keys."],
    ["SD 5.2", "Product Security User Guides", "Are product user manuals providing instructions on secure hardening under {fw_name}?", "Product SDL Governance", 3, "Ensure user manuals detail how to disable insecure services and change default passwords."]
  ],
  PCI_DSS: [
    ["REQ 1.1", "CDE Segment Firewall", "Are firewalls placed at CDE boundary interfaces under {fw_name}?", "Build & Maintain Secure Network", 3, "Verify firewall rules isolating cardholder data environments from office networks."],
    ["REQ 1.2", "CDE Network Diagram", "Is a current, detailed CDE network topology diagram maintained under {fw_name}?", "Build & Maintain Secure Network", 3, "Check that a diagram shows all connections to cardholder database servers."],
    ["REQ 2.1", "Default Account Disabling", "Are manufacturer default credentials and configurations changed under {fw_name}?", "Build & Maintain Secure Network", 2, "Ensure vendor passwords, default accounts, and wireless names are completely disabled."],
    ["REQ 3.1", "PAN Encryption at Rest", "Is primary account number (PAN) storage encrypted at rest under {fw_name}?", "Protect Cardholder Data", 3, "Verify strong AES-256 or RSA cryptographic encryption protecting cardholder records."],
    ["REQ 3.2", "PAN Account Masking", "Is PAN display masked showing only the last four digits under {fw_name}?", "Protect Cardholder Data", 3, "Verify database and UI masking features on CDE client terminals."],
    ["REQ 4.1", "PAN Encryption in Transit", "Is CDE telemetry encrypted using strong tunnels during public transit under {fw_name}?", "Protect Cardholder Data", 3, "Ensure SSL/TLS 1.3 or IPsec tunnels protect CDE traffic crossing public networks."],
    ["REQ 5.1", "Endpoint Antivirus Sweeps", "Are active antivirus definitions updated daily on CDE endpoints under {fw_name}?", "Vulnerability Management Program", 2, "Verify configuration sweeps and update logs for anti-malware tools."],
    ["REQ 6.1", "Patch Flaw Remediation", "Are critical software hotfixes deployed within 30 days of release under {fw_name}?", "Vulnerability Management Program", 2, "Audit patch schedules and vulnerability scan sweeps for active CDE hosts."],
    ["REQ 7.1", "CDE Access Least Privilege", "Is CDE database access restricted using strict role-based privilege under {fw_name}?", "Implement Strong Access Control", 3, "Audit active directory groups and DB permissions to restrict access to authorized roles."],
    ["REQ 8.1", "Unique Human Accounts", "Are unique logical accounts assigned to all CDE operators under {fw_name}?", "Implement Strong Access Control", 3, "Verify that shared accounts and default logins are completely disabled."],
    ["REQ 8.2", "MFA Administrative Gates", "Is multi-factor authentication enforced for all external remote CDE access under {fw_name}?", "Implement Strong Access Control", 3, "Validate MFA configurations for operations VPNs and technician sessions."],
    ["REQ 10.1", "Syslog Audit Logging", "Are event logs aggregated continuously, capturing CDE logins under {fw_name}?", "Regularly Monitor & Test Networks", 2, "Verify that logs record user, timestamp, command, and outcomes in a secure buffer."]
  ],
  SOC_2: [
    ["CC 1.1", "Ethical Integrity Values", "Does the organization publish and enforce a formal code of ethical conduct under {fw_name}?", "Security (Common Criteria)", 4, "Verify corporate commitment, whistleblower lines, and code of conduct reviews."],
    ["CC 2.1", "Security Governance Board", "Are security policies reviewed, signed, and updated annually by executive staff under {fw_name}?", "Security (Common Criteria)", 4, "Ensure systematic review of governance controls to satisfy security objectives."],
    ["CC 3.1", "Risk Assessment Matrix", "Are active risk assessments executed annually to identify threat vectors under {fw_name}?", "Security (Common Criteria)", 4, "Audit risk assessment matrices tracking impact and likelihood scores for corporate networks."],
    ["CC 4.1", "Vendor Auditing Program", "Are third-party suppliers and subprocessors audited for security compliance under {fw_name}?", "Security (Common Criteria)", 4, "Validate supply chain risk reviews and integration contract clauses for service providers."],
    ["CC 5.1", "Access Authorization Revocation", "Are access privileges revoked immediately upon employee offboarding under {fw_name}?", "Security (Common Criteria)", 3, "Check that pre-employment screening and annual vetting rules are active for staff."],
    ["CC 6.1", "Logical Perimeter Filters", "Are active logical boundary perimeters (firewalls, VPC security groups) deployed under {fw_name}?", "Security (Common Criteria)", 3, "Audit edge router filtering tables and zone communication blocks to isolate databases."],
    ["CC 6.2", "MFA Administrative Gates", "Is multi-factor authentication enforced for all employee administrative terminals under {fw_name}?", "Security (Common Criteria)", 3, "Check MFA settings for external vendor tunnels and employee admin logins."],
    ["CC 6.3", "Unique Operator Logins", "Are unique credentials assigned to all operators, completely avoiding shared accounts under {fw_name}?", "Security (Common Criteria)", 3, "Verify logical credential policy updates and authentication enforcement gates."],
    ["CC 7.1", "Intrusion Threat Alerting", "Are passive IDS/IPS systems active to detect rogue packet signatures under {fw_name}?", "Security (Common Criteria)", 3, "Ensure passive network security monitors flag anomalous packet structures in real-time."],
    ["CC 7.2", "Vulnerability Patch Cycle", "Are system dependencies scanned weekly and critical patches applied monthly under {fw_name}?", "Security (Common Criteria)", 2, "Audit patch testing processes to prevent introduction of software bugs to active databases."]
  ],
  ISO_27001: [
    ["A.5.1", "Policies for Info Security", "Are documented information security policies reviewed and updated annually under {fw_name}?", "Organizational Security Controls", 4, "Verify corporate commitment, budgets, and charter for the information security program."],
    ["A.5.2", "Information Security Roles", "Are roles and responsibilities for system security clearly defined and assigned under {fw_name}?", "Organizational Security Controls", 4, "Ensure roles, responsibilities, and reporting escalations are defined for security analysts."],
    ["A.5.3", "Contact with Authorities", "Is a contact list for law enforcement and emergency response maintained under {fw_name}?", "Organizational Security Controls", 4, "Check reporting escalations and emergency communications directories."],
    ["A.6.1", "Screening and Backgrounds", "Are screening verification checks performed for all employees and contractors under {fw_name}?", "People Security Controls", 4, "Audit pre-employment screening processes and background search history."],
    ["A.6.2", "Employment Security Vetting", "Are employee confidentiality agreements signed before granting database access under {fw_name}?", "People Security Controls", 4, "Ensure legal contracts are filed before assigning database credentials."],
    ["A.6.3", "Security Training Awareness", "Do employees receive regular cybersecurity awareness training and updates under {fw_name}?", "People Security Controls", 4, "Verify systematic training programs and testing trackers for personnel."],
    ["A.7.1", "Physical Security Perimeter", "Are physical facility gates protected using badge scanners and CCTV under {fw_name}?", "Physical Security Controls", 3, "Check physical facility perimeters, control rooms, and equipment enclaves."],
    ["A.7.2", "Enclosure Hardware Locking", "Are hardware cabinets, switchboards, and servers physically locked under {fw_name}?", "Physical Security Controls", 3, "Ensure server rack doors and local diagnostic panels are locked."],
    ["A.8.1", "Endpoint Terminal Hardening", "Are default vendor credentials and unnecessary services disabled under {fw_name}?", "Technological Security Controls", 2, "Verify that default switch accounts and unnecessary network daemons are disabled."],
    ["A.8.2", "Access Authorization Controls", "Are unique user accounts assigned, strictly avoiding shared accounts under {fw_name}?", "Technological Security Controls", 3, "Verify user account provisioning records and access profiles."],
    ["A.8.3", "MFA Administrative Remote Access", "Is multi-factor authentication enforced for all external administrative access under {fw_name}?", "Technological Security Controls", 3, "Audit MFA configuration settings for remote administrative connections."],
    ["A.8.4", "Boundary Network Firewall", "Are firewalls configured to segment operations networks from business LANs under {fw_name}?", "Technological Security Controls", 3, "Audit network boundary filters and routing segregation tables."]
  ],
  COBIT_2019: [
    ["EDM01.01", "Governance Framework Design", "Is the corporate governance framework aligned with business strategy under {fw_name}?", "Evaluate, Direct & Monitor (EDM)", 4, "Audit corporate alignment policies, leadership charters, and IT oversight boards."],
    ["EDM02.01", "Value Optimization Focus", "Are IT investments evaluated for business value optimization under {fw_name}?", "Evaluate, Direct & Monitor (EDM)", 4, "Verify budget optimization strategies and IT value monitoring frameworks."],
    ["EDM03.01", "Risk Governance Limits", "Are risk tolerance limits defined and monitored by the executive board under {fw_name}?", "Evaluate, Direct & Monitor (EDM)", 4, "Check risk matrix updates, vulnerability response limits, and policy compliance boards."],
    ["APO01.01", "IT Management Alignment", "Is the IT management framework documented and reviewed annually under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Ensure IT charter, roles, and administrative hierarchies are documented."],
    ["APO02.01", "IT Strategic Roadmap", "Is a clear strategic IT roadmap maintained showing security integration under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Verify multi-year technical improvement programs and security alignment."],
    ["APO03.01", "Enterprise Architecture Map", "Are operational networks and corporate assets formally mapped in architecture under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Audit database assets and system boundaries in the central repository."],
    ["APO04.01", "Innovation Management Vetting", "Are security risk reviews performed for all incoming innovative systems under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Ensure technical assessments occur before new service commissioning."],
    ["APO05.01", "IT Portfolio Optimization", "Is the system portfolio audited regularly to locate security gaps under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Audit legacy devices and unsupported operating system trackers."],
    ["APO06.01", "Budget and Cost Governance", "Are security budgets tracked and optimized across projects under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Verify project cost trackers and compliance resource allocations."],
    ["APO07.01", "Personnel Skills Training", "Do systems engineers undergo annual security skills development under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Verify training catalog updates and engineer capability assessments."]
  ],
  CIS_CONTROLS: [
    ["CIS-1.1", "Enterprise Hardware Inventory", "Is a detailed, automated hardware asset inventory maintained under {fw_name}?", "Inventory & Control of Assets", 3, "Verify network scans and inventory lists of active field controllers."],
    ["CIS-2.1", "Authorized Software Inventory", "Is an authorized software registry active on all systems under {fw_name}?", "Inventory & Control of Assets", 3, "Audit software execution registries and software whitelisting setups."],
    ["CIS-3.1", "Data Classification Matrix", "Is customer and operational data classified by risk levels under {fw_name}?", "Inventory & Control of Assets", 3, "Verify storage sensitivity labels protecting design files."],
    ["CIS-4.1", "Secure Network Baselines", "Are secure configurations established and documented for all switches under {fw_name}?", "Inventory & Control of Assets", 3, "Verify baseline configuration tracking for all active network units."],
    ["CIS-5.1", "Unique Human Credentials", "Are unique accounts assigned to all users, avoiding shared logins under {fw_name}?", "Data & Software Security", 3, "Check Active Directory permissions and account setup lists."],
    ["CIS-6.1", "Multi-Factor Authentication", "Is MFA enforced for all administrative and external remote VPNs under {fw_name}?", "Data & Software Security", 3, "Verify MFA config on the central authentication server."],
    ["CIS-7.1", "Endpoint Malware Detection", "Are active anti-malware programs installed on all endpoints under {fw_name}?", "Data & Software Security", 3, "Ensure daily malware signature scans are logged regularly."],
    ["CIS-8.1", "Sandbox Patch Validation", "Are patch validation tests executed in sandboxes before active deployment under {fw_name}?", "Data & Software Security", 3, "Verify patch compatibility laboratory dry runs."],
    ["CIS-9.1", "Syslog Trace Collection", "Are audit logs recorded continuously with accurate timestamps under {fw_name}?", "Secure Configurations & Access", 3, "Verify time sync settings and continuous logging loops."],
    ["CIS-10.1", "Contingency Recovery Backups", "Are daily backups encrypted and stored offline in secure cabinets under {fw_name}?", "Secure Configurations & Access", 3, "Check fireproof safes and offsite storage schedules."],
    ["CIS-11.1", "Log Security Storage", "Are trace logs stored in a secure secondary segment to prevent tampering under {fw_name}?", "Secure Configurations & Access", 3, "Ensure syslog servers are logically isolated from corporate units."],
    ["CIS-12.1", "Zone Firewall Separation", "Are operational segments isolated from business LANs using firewalls under {fw_name}?", "Secure Configurations & Access", 3, "Audit network boundary filters and routing tables."],
    ["CIS-13.1", "Transmission Tunnel Encryption", "Is data encrypted using TLS 1.3 tunnels during transit under {fw_name}?", "Secure Configurations & Access", 3, "Audit secure web transport certificates and session encrypt settings."],
    ["CIS-14.1", "Employee Security Awareness", "Do employees receive regular cybersecurity awareness training under {fw_name}?", "Continuous Vulnerability & Monitoring", 3, "Verify basic phishing and social engineering training records."],
    ["CIS-15.1", "Third-Party Risk Vetting", "Are vendor integrations assessed and audited for security compliance under {fw_name}?", "Continuous Vulnerability & Monitoring", 3, "Verify supplier risk questionnaires and validation checks."],
    ["CIS-16.1", "Port Logically Lockout", "Are unused physical interfaces and ports disabled on switches under {fw_name}?", "Continuous Vulnerability & Monitoring", 3, "Verify that unallocated slots are disabled in active switches."],
    ["CIS-17.1", "Incident Response Plan", "Is an incident response plan active, defining containment actions under {fw_name}?", "Incident Response & Disaster Recovery", 3, "Audit emergency playbook updates and call-tree contact details."],
    ["CIS-18.1", "Physical Perimeter Barrier", "Are hardware cabinets and server racks locked inside cages under {fw_name}?", "Incident Response & Disaster Recovery", 3, "Check that physical server enclaves require badged entry."]
  ],
  INGAA_GUIDE: [
    ["INGAA-3.2", "Cyber Asset Criticality Vetting", "Does the operator identify and classify control system cyber assets based on safety, reliability, and business continuity objectives under {fw_name}?", "Asset Classification", 4, "Verify documented procedures for classifying critical vs non-critical cyber assets according to TSA and INGAA pipeline security criteria."],
    ["INGAA-3.3.1.1", "Cyber Asset Physical Access Controls", "Are physical access controls implemented for all control system cyber assets in accordance with 49 CFR parts 192/193 under {fw_name}?", "Physical Security", 1, "Review building gates, control enclaves, locked cabinets, and physical access locks on PLCs, RTUs, and HMIs at compressor and M&R stations."],
    ["INGAA-3.3.1.2", "Remote Connection Vetting", "Are remote and third-party network connections used for maintenance and diagnostics securely monitored and periodically reviewed under {fw_name}?", "Remote Connections", 3, "Validate that third-party connections are explicitly authorized, logged, and monitored continuously while active, and disabled when not in use."],
    ["INGAA-3.3.1.3", "Wireless Network Risk Assessment", "Is a wireless network risk assessment completed before deploying any wireless operational technology at pipeline facilities under {fw_name}?", "Wireless Security", 2, "Verify that the risk assessment weighs operational benefits against exploitation risks and ensures wireless networks are fully secured."],
    ["INGAA-3.3.1.4", "Annual Security Procedures Review", "Are control system cyber security plans, policies, and procedures reviewed, reassessed, and updated at least annually under {fw_name}?", "Governance", 4, "Confirm that procedures undergo regular annual reviews, with any deviations documented as authorized exceptions."],
    ["INGAA-3.3.1.5", "Criticality Classification Reassessment", "Is the criticality classification of control system cyber assets reviewed and reassessed at least once every 18 months under {fw_name}?", "Asset Classification", 4, "Check documentation verifying the periodic review and approval of the critical asset list, ensuring alignment with TSA requirements."],
    ["INGAA-3.3.2.1", "Cross-Functional Coordination Process", "Is there a documented network security coordination process spanning the entire systems development lifecycle (SDLC) under {fw_name}?", "Security Coordination", 4, "Audit coordination between IT, OT, and business groups during strategic planning, design, acquisition, testing, installation, and retirement."],
    ["INGAA-3.3.2.2", "Roles & Communication Lines", "Are cyber security roles, responsibilities, and bi-directional lines of communication formally defined and documented under {fw_name}?", "Security Coordination", 4, "Check roles and lines of communication among operations staff, IT, partners, and contractors, including verification of their effectiveness."],
    ["INGAA-3.3.2.3.1", "Procurement Hardening Standards", "Do procurement specifications incorporate system hardening, perimeter protection, and account management requirements under {fw_name}?", "Procurement", 4, "Verify that the acquisition policy encourages vendors to follow secure coding, flaw remediation, and malware detection standards."],
    ["INGAA-3.3.2.3.2", "Services Procurement Security", "Are control system service providers contractually required to employ security controls in accordance with directives and SLAs under {fw_name}?", "Procurement", 4, "Audit third-party service provider contracts to confirm they define user roles, restrict access, and monitor compliance."],
    ["INGAA-3.3.3.1.1", "Secure System Design", "Do control system designs prohibit embedding clear-text passwords in source code, scripts, aliases, or shortcuts under {fw_name}?", "System Lifecycle", 3, "Ensure all source code is secured to prevent unauthorized viewing/modification, and that workstations are restricted to approved control activities."],
    ["INGAA-3.3.3.1.2", "Least Privilege & Access Rights", "Does the cyber system grant only the minimum set of rights and privileges required to perform control, maintenance, or monitoring under {fw_name}?", "System Lifecycle", 3, "Confirm that role-based access control applies to physical access, OS services, files, disks, shared data, and network resources."],
    ["INGAA-3.3.3.2.1", "Control System Hardening", "Are configurations for network devices (firewalls, routers, switches) baselined and hardened by disabling unused ports/protocols under {fw_name}?", "System Hardening", 2, "Verify that unneeded OS services (e.g. FTP, Telnet) are disabled, guest accounts are removed, and default passwords are changed."],
    ["INGAA-3.3.3.2.2", "Software Patches & Antivirus", "Are critical application and database security patches and antivirus definitions inventoried and applied regularly under {fw_name}?", "System Hardening", 2, "Audit patch levels, antivirus update logs, and supplier patch recommendations to ensure systematic mitigation of software vulnerabilities."],
    ["INGAA-3.3.3.3", "Change Control Baselines", "Is a formal change control process implemented to evaluate, test, and document all permanent and temporary system changes under {fw_name}?", "Change Control", 3, "Verify baseline configurations are fully documented to a level that allows restore, and check impact analysis records before deployment."],
    ["INGAA-3.3.3.4", "Media Sanitization & Disposal", "Are there policies and procedures to sanitize both digital and non-digital media prior to disposal or reuse under {fw_name}?", "System Lifecycle", 2, "Validate that scrubbing or physical destruction processes make it impossible to retrieve or reconstruct sensitive information."],
    ["INGAA-3.3.4.1", "Control Systems Recovery Planning", "Is a comprehensive restoration and recovery plan documented to handle cyber threats, disasters, and equipment failures under {fw_name}?", "System Restoration", 4, "Confirm the plan defines roles, backup restoration procedures, and emergency contact lists including vendors and network administrators."],
    ["INGAA-3.3.4.2", "Tested Restoration Processes", "Are backups of critical SCADA software, applications, data, and configurations secured and tested periodically under {fw_name}?", "System Restoration", 3, "Review backup logs, secure offsite storage paths, and test reports verifying that backup configurations can be restored successfully."],
    ["INGAA-3.3.5.1", "Cyber Intrusion Monitoring & Logs", "Are system logs and network traffic monitored continuously for unexpected log events, high CPU, or unauthorized accounts under {fw_name}?", "Intrusion Monitoring", 2, "Ensure centralized monitoring tracks log files, disk space exhaustion, locked accounts, unexpected patches, or outside IP connections."],
    ["INGAA-3.3.5.2", "Incident Response & Tabletop Drills", "Is an incident response plan active, establishing clear triage, alert, response, recovery, and lessons-learned phases under {fw_name}?", "Incident Handling", 4, "Audit annual tabletop exercises, scenario checklists, post-mortem reviews, and the formal process for declaring security incidents."],
    ["INGAA-3.3.5.3", "Secure Log Storage & Reporting", "Are event log files secured against modification and retained for regulatory audits and incident investigations under {fw_name}?", "Incident Handling", 2, "Verify that logs are protected from tampering and archived, and check reporting procedures for notifying CISA, TSA, or regional bodies."],
    ["INGAA-3.3.6.1", "Security Awareness Training", "Do all control systems users receive security awareness training prior to being granted access and annually thereafter under {fw_name}?", "Personnel Training", 4, "Verify training covers compliance, password rules, malicious code protection, social engineering, and change control procedures."],
    ["INGAA-3.3.6.2", "Role-Specific Security Training", "Do individuals with significant control systems security roles receive specialized technical and operational training under {fw_name}?", "Personnel Training", 4, "Check training records on firewalls, GPOs, access control enforcement, incident response, and vulnerability assessment."],
    ["INGAA-3.3.7.1.1", "Control System Network Segregation", "Is the control systems network segregated from the corporate network and the Internet using firewalls, VLANs, and ACLs under {fw_name}?", "Network Segregation", 3, "Review network topologies to verify segregation, accounting for minimum bandwidth, redundancy, and packet latency."],
    ["INGAA-3.3.7.1.2", "SCADA and Data Center Segmentation", "Are there minimal, documented, and firewalled access points between the production SCADA network and the corporate network under {fw_name}?", "Network Segregation", 3, "Verify that boundary firewalls explicitly authorize only required incoming/outgoing traffic, deny ICMP, and stream connection timeouts."],
    ["INGAA-3.3.7.2.2", "Logical Access Control Enforcement", "Are access controls enforced to ensure only authorized workstations connect to the network and unique passwords protect all devices under {fw_name}?", "Access Enforcement", 3, "Audit user provisioning approvals, unique human logins, disabled third-party connections when not in use, and changed default vendor credentials."],
    ["INGAA-3.4.1.2", "Enhanced Logical Access Controls", "Are enhanced access controls (such as multi-factor authentication and role segmentation) active for critical assets under {fw_name}?", "Enhanced Measures", 3, "Verify MFA controls, separation of duties, and role-based permissions (viewer, gas controller, system administrator) on critical pipeline controllers."],
    ["INGAA-3.4.2", "Security Vulnerability Assessments", "Are periodic Security Vulnerability Assessments (SVAs) conducted on a non-production testbed at least once every 36 months under {fw_name}?", "Enhanced Measures", 4, "Confirm that SVAs include vulnerability scans, threat source analysis, and residual risk calculations reviewed by subject matter experts."]
  ]
};

const getFrameworkQuestions = (fwId: string): CSETQuestion[] => {
  const fw = CSET_FRAMEWORKS.find(f => f.id === fwId);
  const fwName = fw ? fw.name : fwId;

  // Dynamically load the individual framework JSON blueprint from the lib/blueprints folder
  try {
    const blueprintData = require(`@/lib/blueprints/${fwId}.json`);
    if (blueprintData && blueprintData.questions) {
      return blueprintData.questions.map((q: any) => ({
        id: q.id,
        standardCode: q.standardCode,
        text: q.text.replace(/{fw_name}/g, fwName),
        description: q.description || `Verify compliance against ${fwName} requirements.`,
        purdueLevel: q.purdueLevel,
        category: q.category
      }));
    }
  } catch (e) {
    // fallback if the individual file is not found
  }

  const blueprint = BESPOKE_BLUEPRINTS[fwId];
  
  if (blueprint) {
    return blueprint.map((item, idx) => ({
      id: `${fwId}_fallback_${idx}`,
      standardCode: item[0],
      text: item[2].replace(/{fw_name}/g, fwName),
      description: item[5] || `Verify compliance against ${fwName} requirements for ${item[1].toLowerCase()}.`,
      purdueLevel: item[4],
      category: item[3]
    }));
  }
  
  // Generic fallback generator for the remaining 38 frameworks
  const sector = fw ? fw.sector : 'Cross-Sector';
  const category = fw ? fw.category : 'General IT/OT';
  
  let rawBlueprints: [string, string, string, string, number, string][] = [];
  
  if (fwId.startsWith('NERC_CIP_')) {
    rawBlueprints = [
      ["R1", "Access setpoint controls", `Are engineering setpoint modifications restricted to certified operator roles under ${fwName}?`, "Access Control & Identity", 3, "Verify role-based access restricts sensitive control operations."],
      ["R2", "Administrative session timeout", `Is administrative inactive session termination set to auto-lockout within 10 minutes under ${fwName}?`, "Access Control & Identity", 3, "Verify screen locking settings on engineering workstations."]
    ];
  } else if (sector === 'Water' || category === 'Water & Wastewater') {
    rawBlueprints = [
      ["WAT-1.1", "Physical or logical boundary isolation", `Is absolute logical or physical boundary air-gapping maintained between business LANs and treatment facilities under ${fwName}?`, "Industrial Boundary Segregation", 1, "Verify firewalls completely isolate billing LANs from dosing PLC loops."],
      ["WAT-1.2", "Dosing PLC tamper alerts", `Are automated alarm triggers configured for anomalous flow metrics on chemical dosing PLCs under ${fwName}?`, "Industrial Boundary Segregation", 2, "Test PLC alert loops by simulating anomalous telemetry spikes."],
      ["WAT-2.1", "Weekly emergency backup tests", `Are emergency backup generator starting batteries and load transfer switches verified weekly under ${fwName}?`, "Water System Resilience", 2, "Ensure plant generators are tested under load and logs are signed off."],
      ["WAT-2.2", "Encrypted offline daily backups", `Are critical telemetry configuration files backed up daily to offsite fireproof safes under ${fwName}?`, "Water System Resilience", 3, "Check safe custody logs and daily file transfer scripts."]
    ];
  } else if (sector === 'Defense' || category === 'Defense & Aerospace') {
    rawBlueprints = [
      ["DFN-1.1", "MFA administrative token gates", `Is multi-factor authentication enforced utilizing hardware cryptographic tokens under ${fwName}?`, "MFA Administrative Vetting", 4, "Verify FIDO2 WebAuthn keys are registered on target domains."],
      ["DFN-1.2", "Continuous patch validation testing", `Are software security patches tested in isolated offline sandboxes before production loading under ${fwName}?`, "MFA Administrative Vetting", 3, "Review sandboxed validation logs prior to field installations."],
      ["DFN-2.1", "Software supply chain risk audits", `Are software third-party dependencies scanned for active CVE vulnerabilities under ${fwName}?`, "Supply Chain Integrity & Vetting", 4, "Validate Software Bill of Materials (SBOM) registries on build servers."],
      ["DFN-2.2", "Hardware asset cryptographic verification", `Are hardware modules validated against central cryptographic key signatures under ${fwName}?`, "Supply Chain Integrity & Vetting", 3, "Verify device signature check processes at receiving bays."]
    ];
  } else if (sector === 'Transport' || category === 'Transportation') {
    rawBlueprints = [
      ["TRN-1.1", "Zone Electronic boundary firewalls", `Are firewalls placed at boundary crossings to isolate flight or marine telemetry loops under ${fwName}?`, "Zoned Logical Hardening", 3, "Audit border switches for unmediated logical bypass tunnels."],
      ["TRN-1.2", "Secure serial-to-ethernet links", `Are serial data connections configured with cryptographic packet authentication under ${fwName}?`, "Zoned Logical Hardening", 3, "Verify encryption settings on device servers in remote cabinets."],
      ["TRN-2.1", "Central syslog event aggregations", `Are system diagnostic logs pushed in real-time to a secure SIEM server under ${fwName}?`, "Continuous Interface Auditing", 2, "Verify that switch syslog destinations point to the central log server."],
      ["TRN-2.2", "Weekly access logic check review", `Are engineering modifications audited weekly against authorized baseline tickets under ${fwName}?`, "Continuous Interface Auditing", 4, "Check review signatures on local configuration control logs."]
    ];
  } else if (sector === 'Chemical' || category === 'Chemical Operations') {
    rawBlueprints = [
      ["CHM-1.1", "Emergency dumping hardware switches", `Are emergency physical dump switches completely decoupled from digital telemetry loops under ${fwName}?`, "Hardware-Switched Failsafes", 1, "Verify physical wire connections bypassing logical controllers."],
      ["CHM-1.2", "Analog redundant sensors", `Are analog redundant sensors installed to verify tank pressure and temperature metrics under ${fwName}?`, "Hardware-Switched Failsafes", 1, "Verify physical pressure dials are visible outside dangerous cells."],
      ["CHM-2.1", "CCTV gate access coverage", `Are high-definition cameras active at all entrance gates to chemical holding enclaves under ${fwName}?`, "Physical Boundary Hardening", 3, "Test video feeds and motion alarms at the central control desk."],
      ["CHM-2.2", "Padlocked outdoor valve covers", `Are manual outdoor product dump valves locked inside high-security enclosures under ${fwName}?`, "Physical Boundary Hardening", 1, "Audit lock key control logs and daily gate sweeps."]
    ];
  } else if (sector === 'Nuclear' || category === 'Nuclear Operations') {
    rawBlueprints = [
      ["NUC-1.1", "Absolute physical IT/OT air-gaps", `Are reactor instrumentation systems physically disconnected from external networks under ${fwName}?`, "Absolute Zero-Trust Perimeters", 1, "Audit physical fiber links to confirm zero connections cross boundaries."],
      ["NUC-1.2", "Dual-signature logic uploads", `Are two-operator physical key-turns required to initiate memory updates on reactor PLCs under ${fwName}?`, "Absolute Zero-Trust Perimeters", 1, "Verify key lock switches and double-signature validation logs."],
      ["NUC-2.1", "Dynamic software static analyses", `Is firmware subjected to formal mathematical static code proof verification before flashing under ${fwName}?`, "Firmware Static Security Proofs", 4, "Review compiler warning overrides and dynamic fuzzing parameters."],
      ["NUC-2.2", "Central log write-once storage", `Are syslog records streamed to write-once (WORM) hardware storage buffers under ${fwName}?`, "Firmware Static Security Proofs", 3, "Verify WORM media drives are locked inside protected server safes."]
    ];
  } else if (sector === 'Finance' || category === 'Finance Operations') {
    rawBlueprints = [
      ["FIN-1.1", "Secure CDE gateway firewalls", `Are firewalls configured to completely isolate CDE networks from office LANs under ${fwName}?`, "Secure Transaction Routing", 3, "Verify firewall rules isolating CDE zones from corporate networks."],
      ["FIN-1.2", "Endpoint terminal secure configurations", `Are merchant gateway terminals hardened by removing unnecessary services and default logins under ${fwName}?`, "Secure Transaction Routing", 3, "Ensure default vendor passwords and diagnostic ports are disabled."],
      ["FIN-2.1", "ATM segment boundary segregation", `Are ATM networks isolated in dedicated subnets with active flow filtering under ${fwName}?`, "Endpoint Terminal Hardening", 3, "Verify VLAN tagging and access control filters on ATM gateways."],
      ["FIN-2.2", "MFA administrative remote VPNs", `Is multi-factor authentication enforced for all external administrative access to ${fwName} systems?`, "Endpoint Terminal Hardening", 4, "Verify hardware tokens are required for support technicians VPN tunnels."],
      ["FIN-3.1", "Transaction velocity threshold alerts", `Are alerts configured for anomalous spikes in transaction velocity or value under ${fwName}?`, "Continuous Velocity Monitoring", 3, "Check alert tagging on active transaction log metrics."],
      ["FIN-3.2", "Syslog user audit tracking", `Are all operator actions logged continuously with precise, synchronized timestamps under ${fwName}?`, "Continuous Velocity Monitoring", 3, "Verify NTP synchronization on all transaction record databases."]
    ];
  } else {
    rawBlueprints = [
      ["GEN-1.1", "Access setpoint controls", `Are engineering setpoint modifications restricted to certified operator roles under ${fwName}?`, "Access Control & Identity", 3, "Verify role-based access restricts sensitive control operations."],
      ["GEN-1.2", "Administrative session timeout", `Is administrative inactive session termination set to auto-lockout within 10 minutes under ${fwName}?`, "Access Control & Identity", 3, "Verify screen locking settings on engineering workstations."],
      ["GEN-1.3", "Unique cryptographic credentials", `Are unique cryptographic credentials assigned to all human users and diagnostics ports under ${fwName}?`, "Access Control & Identity", 2, "Check credential directories and disable shared account configurations."],
      ["GEN-1.4", "MFA administrative remote access", `Is multi-factor authentication enforced for all external and remote administration VPNs under ${fwName}?`, "Access Control & Identity", 4, "Verify hardware-backed MFA keys are required for remote administrative channels."]
    ];
  }
  
  return rawBlueprints.map((item, idx) => ({
    id: `${fwId}_fallback_${idx}`,
    standardCode: item[0],
    text: item[2],
    description: item[5] || `Verify compliance against ${fwName} requirements.`,
    purdueLevel: item[4],
    category: item[3]
  }));
};

interface ManualData {
  introduction: string;
  specifications: { level: string; requirement: string; focus: string }[];
}

const getFrameworkManual = (fw: CSETFramework): ManualData => {
  const id = fw.id;
  
  if (id === 'NIST_800_82') {
    return {
      introduction: 'NIST Special Publication 800-82 Revision 3 operates as the definitive guide to securing Industrial Control Systems (ICS) across Supervisory Control and Data Acquisition (SCADA) systems, Distributed Control Systems (DCS), and Programmable Logic Controllers (PLCs) in critical infrastructures. Grounded in the unique operational realities of OT systems, the standard prioritizes system availability, safety, and physical resilience over classical IT data confidentiality. It formally establishes the OT Security Overlay, adapting standard NIST SP 800-53 controls to defend cyber-physical processes from kinetic disruptions, localized telemetry corruption, and cascading public utility failures. Crucially, the standard directs the implementation of strict logical boundaries via the Purdue Model (Levels 0-5), secure serial-to-ethernet transceiver configurations, and the segregation of safety-instrumented systems (SIS) to ensure emergency plant shutdowns remain physically air-gapped and immune to operational network compromises.',
      specifications: [
        { level: 'Low Impact Baseline', requirement: 'Applies basic cyber hygiene tailored to low-risk environments. This establishes hardware asset classification lists, administrative boundary firewalls, changed default manufacturer passwords, and dual-operator authentication prior to flashing logic modifications to diagnostic switch ports.', focus: 'Local Isolation & Essential Hardening' },
        { level: 'Moderate Impact Baseline', requirement: 'Constructs the standard operational defense-in-depth framework. It mandates strict Purdue Model segmentation separating engineering terminals from enterprise LANs, real-time industrial IDS signature analysis on Modbus/DNP3 streams, and verified daily encrypted offline backups.', focus: 'Defense-in-Depth & SCADA Mediation' },
        { level: 'High Impact Baseline', requirement: 'Engineered for critical high-value systems where disruption threatens public safety. Enforces physical air-gapping of safety-instrumented systems (SIS), absolute unidirectional hardware data diodes, continuous cryptographic loop verification, and annual simulator-based emergency response exercises with regional responders.', focus: 'Kinetic Failsafe & Zero-Trust Core' }
      ]
    };
  }
  
  if (id === 'NIST_800_53') {
    return {
      introduction: 'NIST Special Publication 800-53 Revision 5 represents the gold standard catalog of Security and Privacy Controls for Information Systems and Organizations. It contains a highly comprehensive, multi-tiered repository of controls engineered to protect federal and critical infrastructure systems from a wide spectrum of threat vectors. Controls are organized across 20 comprehensive domains, spanning Access Control, System and Communications Protection, Supply Chain Risk Management, and Incident Response. The standard enforces continuous risk management processes through the Risk Management Framework (RMF) cycle, ensuring that security measures are dynamically assessed, authorized, and monitored to maintain system integrity against advanced persistent threats (APTs) sponsored by foreign adversaries.',
      specifications: [
        { level: 'Low Baseline', requirement: 'Includes essential protective controls targeting low-risk data stores. Establishes primary access privileges, basic system auditing, automated antivirus definitions, and localized disaster recovery plans to safeguard non-sensitive administrative systems.', focus: 'Fundamental Hygiene & Access Audits' },
        { level: 'Moderate Baseline', requirement: 'Constructs the standard enterprise baseline. Requires automated vulnerability scanners, multi-factor authentication gates, formal continuous monitoring pipelines, intrusion detection systems, and strict boundary filtering to protect active databases.', focus: 'Structured Access & Threat Monitoring' },
        { level: 'High Baseline', requirement: 'Engineered for national security systems and high-value target assets. Enforces hardware-backed cryptographic tokens, write-once audit log storage, zero-day threat analysis, strict software supply chain cryptographic signing, and continuous manual threat hunting operations.', focus: 'Cryptographic Air-Gaps & Threat Hunting' }
      ]
    };
  }

  if (id.startsWith('IEC_62443')) {
    return {
      introduction: 'The ISA/IEC 62443 standard series defines technical and organizational security requirements for Industrial Automation and Control Systems (IACS). Developed jointly by the International Society of Automation (ISA) and the International Electrotechnical Commission (IEC), this multi-part standard addresses security across the entire system lifecycle, covering asset owners, system integrators, and product developers. The core architectural philosophy relies on dividing the automation environment into logical Security Zones separated by defined Conduits. This ensures that a security breach in one operational zone is contained and prevented from traversing into adjacent critical process loops, maintaining absolute operational safety and containment.',
      specifications: [
        { level: 'Security Level 1 (SL-1)', requirement: 'Protects against casual or coincidental violation. Requires basic password enforcement, simple port lockdown, and basic system logging, preventing unauthorized access by employees with zero technical resources.', focus: 'Casual Intrusions & Basic Hygiene' },
        { level: 'Security Level 2 (SL-2)', requirement: 'Protects against intentional violation using simple means with low resources. Requires role-based access rules, secure network zoning, VLAN filtering, and basic operational credential hardening, defending against script-kiddies.', focus: 'Simple Intentional Attack Defenses' },
        { level: 'Security Level 3 (SL-3)', requirement: 'Protects against intentional violation using sophisticated means with moderate resources. Requires active multi-factor authentication, real-time zone monitoring, system baselining, and encrypted network communications, blocking professional hackers.', focus: 'Sophisticated Cyber-Sabotage Barriers' },
        { level: 'Security Level 4 (SL-4)', requirement: 'Protects against intentional violation using sophisticated means with extended resources. Requires cryptographic hardware roots of trust, hardware unidirectional data diodes, dual-operator signatures, and zero-trust engineering gates, stopping state-sponsored attacks.', focus: 'State-Sponsored Anti-Terrorism Gates' }
      ]
    };
  }

  if (id.startsWith('NERC_CIP')) {
    return {
      introduction: 'NERC CIP (North American Electric Reliability Corporation Critical Infrastructure Protection) standards represent mandatory, federally-enforced cybersecurity regulations designed to secure the Bulk Power System (BPS) of North America. These standards mandate electric utilities to identify critical cyber assets, establish physical and logical security perimeters, train personnel in security practices, and construct detailed incident response blueprints. Compliance is heavily audited, with severe financial penalties for operational failures, ensuring that the critical power grid remains highly resilient against physical sabotage and coordinated nation-state cyberattacks.',
      specifications: [
        { level: 'Low Impact BES Cyber Systems', requirement: 'Mandates basic cybersecurity policies, standard asset classification, quarterly security awareness training, and essential system log preservation for local utility staff and rural generation plants.', focus: 'Essential System Logging & Base Policies' },
        { level: 'Medium Impact BES Cyber Systems', requirement: 'Requires strict logical Electronic Security Perimeters (ESP), multi-factor authentication, annual active vulnerability assessments, monthly patch cycles, and operational network segmentation for regional grid nodes.', focus: 'Zoned Firewalls & Substation Perimeters' },
        { level: 'High Impact BES Cyber Systems', requirement: 'Enforces redundant control centers, 15-minute log analysis windows, 24/7 security operation centers, comprehensive supply chain signing, physical biometric access gates, and immediate incident reporting to federal coordinators.', focus: 'Grid Redundancy & Active Threat Hunting' }
      ]
    };
  }

  if (id.startsWith('AWWA') || id === 'EPA_WATER') {
    return {
      introduction: 'Water and Wastewater sector standards, including AWWA G430 and EPA baseline practices, are specifically engineered to protect public drinking water systems and treatment facilities. The regulations target the critical automation loops that govern water purity, chemical dosing, and pressure valves. They prioritize establishing absolute physical or logical boundary isolation between commercial business networks and active chemical dosing PLCs, preventing cyber intrusions from corrupting municipal water supplies or causing critical environmental contamination.',
      specifications: [
        { level: 'Baseline Operations', requirement: 'Requires changing default manufacture credentials, locking local SCADA diagnostic terminals, and maintaining offline backups, securing small public drinking water pumps.', focus: 'Essential Port Control & Base Credentials' },
        { level: 'Resilient Design', requirement: 'Enforces complete logical boundary separation using hardware firewalls, dual-operator logic signatures, continuous HMI audits, and time-locked remote support access, defending against active plant sabotage.', focus: 'Dosing PLC Isolation & Network Defense' },
        { level: 'Critical Municipal Failsafe', requirement: 'Requires physical air-gaps between IT/OT, absolute offline emergency manual override capabilities, weekly chemical sensor tests, and locked industrial cabinets with tamper-alarms.', focus: 'Kinetic Manual Override & Sensory Protection' }
      ]
    };
  }

  if (id.startsWith('CMMC') || id.startsWith('CNSSI') || id === 'NNSA_NAP_24' || id.startsWith('NIST_800_17')) {
    return {
      introduction: 'Defense and National Security frameworks govern the protection of Controlled Unclassified Information (CUI) and Classified Military data across the defense industrial base. These standards enforce strict cybersecurity hygiene levels to safeguard sensitive design plans, intellectual property, and tactical logistics systems from advanced persistent threats (APTs) sponsored by foreign adversaries. They require rigorous access controls, multi-factor authentication, regular penetration scans, and comprehensive supplier supply chain risk management programs.',
      specifications: [
        { level: 'Foundational (Level 1)', requirement: 'Protects Federal Contract Information (FCI). Requires basic password policies, system updates, antivirus scanning, and restricted logical access, establishing standard corporate hygiene.', focus: 'Essential Business Hygiene' },
        { level: 'Advanced (Level 2)', requirement: 'Protects Controlled Unclassified Information (CUI) fully aligned with NIST 800-171. Enforces continuous logging, active firewalls, MFA, audit trail reviews, and rapid incident response.', focus: 'AD-Level Controls & Incident Logging' },
        { level: 'Expert (Level 3)', requirement: 'Protects high-value assets against advanced persistent threats (APTs) based on NIST 800-172. Enforces hardware-backed cryptographic checks, write-once log repositories, and strict supply chain vetting.', focus: 'Anti-APT Defensive Walls' }
      ]
    };
  }

  return {
    introduction: `The ${fw.name} (${fw.fullName}) framework provides robust governance and operational controls to optimize organizational security posture. By categorizing security measures into logical domain areas, it ensures that companies can systematically identify, protect, detect, respond to, and recover from cybersecurity incidents. This standard acts as an authoritative reference model, promoting best practices and aligning IT and operational systems with global risk mitigation standards.`,
    specifications: [
      { level: 'Tier 1 / Basic', requirement: 'Adopts ad-hoc or partially implemented compliance practices. Security activities are performed reactively with localized parameters and minimal formal oversight.', focus: 'Initial Governance & Basic Awareness' },
      { level: 'Tier 2 / Informed', requirement: 'Establishes documented, approved policies. Security processes are repeated across domains with defined roles, parameters, and basic network segmentation.', focus: 'Repeatable Policies & Basic Segmenting' },
      { level: 'Tier 3 / Managed', requirement: 'Integrates automated system monitoring, continuous auditing, active vulnerability assessments, and multi-factor authentication throughout the lifecycle.', focus: 'Automated Controls & Active Monitoring' },
      { level: 'Tier 4 / Optimized', requirement: 'Enforces complete cryptographic verification, zero-trust architectures, and dynamic threat intelligence loops powered by machine learning, providing predictive cyber defenses.', focus: 'Predictive Defense & Zero-Trust Core' }
    ]
  };
};

function enrichQuestion(q: CSETQuestion, fwId: string): CSETQuestion {
  return q;
}

export default function CompliancePage() {
  const [frameworks, setFrameworks] = useState<CSETFramework[]>(CSET_FRAMEWORKS)
  const [activeQuestions, setActiveQuestions] = useState<CSETQuestion[]>([])
  const [loadingFrameworks, setLoadingFrameworks] = useState<boolean>(false)
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false)

  const [selectedSector, setSelectedSector] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedFramework, setSelectedFramework] = useState<CSETFramework | null>(null)
  const [matrixCompare, setMatrixCompare] = useState<boolean>(false)
  const [answers, setAnswers] = useState<Record<string, 'Y' | 'N' | 'NA' | 'ALT'>>({
    'Q1': 'Y',
    'Q2': 'ALT',
    'Q3': 'N',
    'Q4': 'NA',
    'N82_Q1': 'Y',
    'N82_Q2': 'N',
    'CIP_Q1': 'Y',
    'CIP_Q2': 'ALT',
    'AWWA_Q1': 'Y'
  })
  const [rationales, setRationales] = useState<Record<string, string>>({
    'Q2': 'Direct routing is physically air-gapped using absolute hardware diode blocks.',
    'Q3': 'Scheduled implementation during next plant shutdown phase.',
    'CIP_Q2': 'Failsafe boundary isolation is mediated using specialized read-only optical couplers.'
  })

  // Scales UX and search state variables
  const [questionSearchQuery, setQuestionSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [manualExpandedCategories, setManualExpandedCategories] = useState<Record<string, boolean>>({})
  const [drawerQuestion, setDrawerQuestion] = useState<CSETQuestion | null>(null)
  const [detailTab, setDetailTab] = useState<'manual' | 'evaluation'>('manual')
  const QUESTIONS_PER_PAGE = 350

  // Load active checklist questions when selected framework changes
  useEffect(() => {
    setQuestionSearchQuery('')
    setCurrentPage(1)
    setDrawerQuestion(null)
    setDetailTab('manual')
    setManualExpandedCategories({})
  }, [selectedFramework])

  // Filter active questions based on query
  const filteredQuestions = useMemo(() => {
    if (!activeQuestions) return []
    return activeQuestions.filter(q => 
      q.standardCode.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
      q.text.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(questionSearchQuery.toLowerCase())
    )
  }, [activeQuestions, questionSearchQuery])

  // Get total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE) || 1
  }, [filteredQuestions])

  // Paginated subset of active questions
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE
    return filteredQuestions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE)
  }, [filteredQuestions, currentPage])

  // Group paginated questions by category
  const groupedPaginatedQuestions = useMemo(() => {
    const groups: Record<string, CSETQuestion[]> = {}
    paginatedQuestions.forEach(q => {
      const cat = q.category || 'General Controls'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(q)
    })
    return groups
  }, [paginatedQuestions])

  // Set visible categories to expanded by default on page or filter change
  useEffect(() => {
    const newExpanded: Record<string, boolean> = {}
    paginatedQuestions.forEach(q => {
      const cat = q.category || 'General Controls'
      newExpanded[cat] = true
    })
    setExpandedCategories(newExpanded)
  }, [paginatedQuestions])

  // Toggle category visibility
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }))
  }

  // Load all CSET frameworks on mount
  useEffect(() => {
    const fetchFrameworks = async () => {
      setLoadingFrameworks(true)
      try {
        const response = await apiClient.get<any[]>('/regulations')
        if (response.data && response.data.length > 0) {
          const mappedFws = response.data.map((fw: any) => ({
            id: fw.id.replace('regulation:', ''),
            name: fw.name,
            fullName: fw.fullName || fw.full_name || fw.name,
            description: fw.description || '',
            category: fw.category || 'General IT/OT',
            sector: fw.sector || 'Cross-Sector',
            sectors: fw.sectors || [fw.sector || 'Cross-Sector'],
            questionCount: fw.questionCount || fw.question_count || 10,
            maturityLevels: fw.maturityLevels || fw.maturity_levels || ['Standard']
          }))
          setFrameworks(mappedFws)
        }
      } catch (err) {
        console.error('Error fetching CSET frameworks from API:', err)
      } finally {
        setLoadingFrameworks(false)
      }
    }
    fetchFrameworks()
  }, [])

  // Load active checklist questions when selected framework changes
  useEffect(() => {
    if (!selectedFramework) {
      setActiveQuestions([])
      return
    }

    const fetchQuestions = async () => {
      setLoadingQuestions(true)
      try {
        const rawId = selectedFramework.id.replace('regulation:', '')
        const response = await apiClient.get<any[]>(`/regulations/${rawId}/questions`)
        if (response.data && response.data.length > 0) {
          const mappedQs = response.data.map((q: any) => ({
            id: q.id,
            standardCode: q.standard_code || q.standardCode || '',
            text: q.question_text || q.text || '',
            description: q.description || '',
            purdueLevel: q.purdue_level !== undefined ? q.purdue_level : (q.purdueLevel || 0),
            category: q.category || 'Control'
          }))
          setActiveQuestions(mappedQs.map(q => enrichQuestion(q, selectedFramework.id)))
        } else {
          setActiveQuestions(getFrameworkQuestions(selectedFramework.id).map(q => enrichQuestion(q, selectedFramework.id)))
        }
      } catch (err) {
        console.error(`Error fetching questions for framework ${selectedFramework.id}:`, err)
        setActiveQuestions(getFrameworkQuestions(selectedFramework.id).map(q => enrichQuestion(q, selectedFramework.id)))
      } finally {
        setLoadingQuestions(false)
      }
    }

    fetchQuestions()
  }, [selectedFramework])

  // Group all active questions by category for the reference catalog
  const groupedAllQuestions = useMemo(() => {
    const groups: Record<string, CSETQuestion[]> = {}
    activeQuestions.forEach(q => {
      const cat = q.category || 'General Controls'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(q)
    })
    return groups
  }, [activeQuestions])

  // Jump to specific question in interactive evaluation tab
  const jumpToQuestion = (q: CSETQuestion) => {
    setQuestionSearchQuery('')
    const index = activeQuestions.findIndex(item => item.id === q.id)
    if (index !== -1) {
      const page = Math.floor(index / QUESTIONS_PER_PAGE) + 1
      setCurrentPage(page)
      setExpandedCategories(prev => ({
        ...prev,
        [q.category]: true
      }))
      setDetailTab('evaluation')
      setTimeout(() => {
        const element = document.getElementById(`question-card-${q.id}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }

  // Filter frameworks dynamically based on sectors & search query
  const filteredFrameworks = useMemo(() => {
    return frameworks.filter(fw => {
      const matchesSector = selectedSector === 'ALL' || 
                            fw.sector === selectedSector || 
                            (fw.sectors && fw.sectors.includes(selectedSector))
      const matchesSearch = fw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            fw.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            fw.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSector && matchesSearch
    })
  }, [frameworks, selectedSector, searchQuery])

  // Complete list of sectors matching database categories
  const sectors = [
    'ALL',
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

  // Handle Toggle of Answers
  const setAnswer = (qId: string, val: 'Y' | 'N' | 'NA' | 'ALT') => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  // Calculate compliance statistics dynamically
  const stats = useMemo(() => {
    if (!selectedFramework || activeQuestions.length === 0) {
      return { total: 0, answeredY: 0, answeredALT: 0, answeredNA: 0, progress: 0 }
    }
    const total = activeQuestions.length
    
    let answeredY = 0
    let answeredALT = 0
    let answeredNA = 0
    
    activeQuestions.forEach(q => {
      const ans = answers[q.id]
      if (ans === 'Y') answeredY++
      if (ans === 'ALT') answeredALT++
      if (ans === 'NA') answeredNA++
    })
    
    const progress = Math.round(((answeredY + answeredALT + answeredNA) / total) * 100)
    return { total, answeredY, answeredALT, answeredNA, progress }
  }, [answers, selectedFramework, activeQuestions])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  CSET Regulatory Compliance Hub
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Replicating CISA CSET library configurations: 60+ frameworks, cross-examination matrices, and maturity evaluations
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant={matrixCompare ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => {
                  setMatrixCompare(!matrixCompare)
                  setSelectedFramework(null)
                }}
                className={matrixCompare 
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase' 
                  : 'border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase text-muted-foreground'
                }
              >
                <Layers className="h-4 w-4 mr-2" />
                Framework Comparison
              </Button>
            </div>
          </div>

          {!matrixCompare && !selectedFramework && (
            <>
              {/* Filter controls */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-slate-900/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2">
                  {sectors.map(sector => (
                    <Button
                      key={sector}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSector(sector)}
                      className={`font-mono text-xs py-1.5 px-3 rounded-lg border transition-all ${
                        selectedSector === sector
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold'
                          : 'border-transparent text-muted-foreground hover:bg-slate-800'
                      }`}
                    >
                      {sector === 'ALL' ? 'ALL SECTORS' : sector.toUpperCase()}
                    </Button>
                  ))}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder="Search CSET standard libraries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 font-mono focus:outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>

              {/* Grid of CSET Framework Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFrameworks.map(fw => (
                  <Card 
                    key={fw.id} 
                    className="shadow-lg border-white/5 bg-slate-900/60 hover:border-cyan-500/20 hover:bg-slate-900/80 transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                    onClick={() => setSelectedFramework(fw)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1 max-w-[70%]">
                          {fw.sectors ? fw.sectors.slice(0, 2).map(s => (
                            <Badge key={s} variant="outline" className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1.5 py-0.5 whitespace-nowrap">
                              {s.toUpperCase()}
                            </Badge>
                          )) : (
                            <Badge variant="outline" className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1.5 py-0.5 animate-pulse">
                              {fw.sector.toUpperCase()}
                            </Badge>
                          )}
                          {fw.sectors && fw.sectors.length > 2 && (
                            <Badge variant="outline" className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1 px-0.5 whitespace-nowrap">
                              +{fw.sectors.length - 2} MORE
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{fw.questionCount} Questions</span>
                      </div>
                      <CardTitle className="text-base font-bold font-mono tracking-tight text-slate-100 mt-2">
                        {fw.name}
                      </CardTitle>
                      <CardDescription className="text-[11px] leading-relaxed text-muted-foreground font-mono mt-1 select-none">
                        {fw.fullName}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-[10.5px] text-muted-foreground/80 leading-relaxed font-sans mt-1">
                        {fw.description}
                      </p>
                      <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                        <span>Levels: {fw.maturityLevels.join(' • ')}</span>
                        <ChevronRight className="h-4 w-4 text-cyan-500/40 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Comparison Matrix View */}
          {matrixCompare && (
            <Card className="shadow-2xl border-white/5 bg-slate-900/80 backdrop-blur-md overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-slate-950/20 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-cyan-400">Framework Mapping comparison matrix</CardTitle>
                  <CardDescription className="text-xs">Compare control densities and standard indices side-by-side</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setMatrixCompare(false)}
                  className="border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase"
                >
                  Close Compare
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/44 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                        <th className="p-4 border-r border-white/5 w-1/4">Control Domain</th>
                        <th className="p-4 border-r border-white/5 w-1/4">IEC 62443 Standard Code</th>
                        <th className="p-4 border-r border-white/5 w-1/4">NIST SP 800-82 Index</th>
                        <th className="p-4 w-1/4">NERC CIP Requirement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-slate-800/20 transition-all">
                        <td className="p-4 border-r border-white/5 font-bold text-slate-300">Boundary Protection</td>
                        <td className="p-4 border-r border-white/5 text-cyan-400/90">SR 5.1 (Level 3 Boundary)</td>
                        <td className="p-4 border-r border-white/5 text-amber-400/90">Section 6.2.3 (DMZ Mediation)</td>
                        <td className="p-4 text-slate-400">CIP-005-7 (Electronic Perimeter)</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-all">
                        <td className="p-4 border-r border-white/5 font-bold text-slate-300">Network Segmentation</td>
                        <td className="p-4 border-r border-white/5 text-cyan-400/90">SR 5.2 (Process Segmentation)</td>
                        <td className="p-4 border-r border-white/5 text-amber-400/90">Section 6.2.4 (Firewall Rules)</td>
                        <td className="p-4 text-slate-400">CIP-005-7 R1.2 (Access Isolation)</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-all">
                        <td className="p-4 border-r border-white/5 font-bold text-slate-300">Field Zone Security</td>
                        <td className="p-4 border-r border-white/5 text-cyan-400/90">SR 5.4 (Cryptographic Diode)</td>
                        <td className="p-4 border-r border-white/5 text-amber-400/90">Section 6.2.5 (Field Port Lockdown)</td>
                        <td className="p-4 text-slate-400">CIP-006-6 (Physical Security Field)</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-all">
                        <td className="p-4 border-r border-white/5 font-bold text-slate-300">Access Management</td>
                        <td className="p-4 border-r border-white/5 text-cyan-400/90">SR 1.1 (Multi-Factor Auth)</td>
                        <td className="p-4 border-r border-white/5 text-amber-400/90">Section 6.1.1 (Auditor Access)</td>
                        <td className="p-4 text-slate-400">CIP-004-6 (Personnel Authorization)</td>
                      </tr>
                      <tr className="hover:bg-slate-800/20 transition-all">
                        <td className="p-4 border-r border-white/5 font-bold text-slate-300">Incident Logging</td>
                        <td className="p-4 border-r border-white/5 text-cyan-400/90">SR 6.1 (Audit Log Integrity)</td>
                        <td className="p-4 border-r border-white/5 text-amber-400/90">Section 6.3.2 (Syslog Aggregator)</td>
                        <td className="p-4 text-slate-400">CIP-007-6 R4 (Logging & Auditing)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Framework Detail & Maturity Wizard View */}
          {selectedFramework && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {/* Standard Details Card */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="shadow-xl border-white/5 bg-slate-900/80 backdrop-blur-md">
                  <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedFramework(null)}
                      className="font-mono text-[10px] text-cyan-400 hover:text-cyan-300 p-0 mb-3 h-auto"
                    >
                      [ Back to Framework Grid ]
                    </Button>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="w-fit text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400 px-1.5 py-0.5 uppercase">
                        {selectedFramework.sector} STANDARD
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold font-mono tracking-tight text-slate-100 mt-2 leading-tight">
                      {selectedFramework.name}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {selectedFramework.fullName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 font-mono text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">STANDARD OVERVIEW</span>
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-sans">{selectedFramework.description}</p>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">METADATA TYPE</span>
                        <p className="text-slate-200 text-[11px]">{selectedFramework.category}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">TOTAL CHECKS</span>
                        <p className="text-slate-200 text-[11px] font-bold">{selectedFramework.questionCount} Directives</p>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">CSET MATURITY LEVEL MATRIX</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedFramework.maturityLevels.map(level => (
                          <Badge key={level} variant="outline" className="text-[9px] border-white/10 bg-slate-950/60 font-mono text-slate-300 py-0.5">
                            {level}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Progress representation */}
                <Card className="shadow-xl border-white/5 bg-slate-900/80 backdrop-blur-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">Compliance Radar analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center py-4 font-mono text-xs space-y-4">
                    {/* Monospaced SVG Radar Chart simulation */}
                    <div className="relative w-44 h-44 flex items-center justify-center bg-slate-950/40 border border-white/5 rounded-full">
                      {/* Grid concentric rings */}
                      <div className="absolute w-36 h-36 border border-white/5 rounded-full border-dashed" />
                      <div className="absolute w-24 h-24 border border-white/5 rounded-full border-dashed" />
                      <div className="absolute w-12 h-12 border border-white/5 rounded-full border-dashed" />
                      
                      {/* Grid crossaxes */}
                      <div className="absolute w-full h-[1px] bg-white/5" />
                      <div className="absolute w-[1px] h-full bg-white/5" />
                      
                      {/* SVG path polygon for mock radar values */}
                      <svg className="absolute inset-0 w-full h-full transform -rotate-90 select-none pointer-events-none">
                        <polygon
                          points="88,32 132,70 120,120 70,128 44,88 64,54"
                          fill="rgba(6,182,212,0.15)"
                          stroke="rgba(6,182,212,0.7)"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                      </svg>
                      
                      {/* Dynamic middle percentage */}
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold font-mono tracking-tight text-cyan-400">{stats.progress}%</span>
                        <span className="text-[8px] text-muted-foreground tracking-widest uppercase">Verified</span>
                      </div>
                    </div>
                    
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Maturity Status</span>
                        <span className="text-cyan-400 font-bold">
                          {stats.answeredY} YES • {stats.answeredALT} ALT
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${stats.progress}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step-by-Step CSET Maturity Wizard */}
              <div className="lg:col-span-2">
                <Card className="shadow-2xl border-white/5 bg-slate-900/80 backdrop-blur-md flex flex-col h-full">
                  <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-white/5">
                        <button
                          onClick={() => setDetailTab('manual')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold transition-all rounded ${
                            detailTab === 'manual'
                              ? 'bg-cyan-500 text-slate-950 shadow'
                              : 'text-muted-foreground hover:text-slate-200'
                          }`}
                        >
                          <BookOpen className="h-3 w-3" />
                          Reference Manual
                        </button>
                        <button
                          onClick={() => setDetailTab('evaluation')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold transition-all rounded ${
                            detailTab === 'evaluation'
                              ? 'bg-cyan-500 text-slate-950 shadow'
                              : 'text-muted-foreground hover:text-slate-200'
                          }`}
                        >
                          <Layers className="h-3 w-3" />
                          Interactive Evaluation
                        </button>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-950/60 text-slate-300 py-0.5">
                        {stats.progress}% Evaluation Complete
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[700px]">
                    {detailTab === 'manual' ? (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Introduction & Specifications Section */}
                        {(() => {
                          const manualData = getFrameworkManual(selectedFramework);
                          return (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                              {/* Introduction & Regulatory Scope */}
                              <div className="border border-white/5 bg-slate-950/40 p-4 rounded-lg space-y-2">
                                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                                  I. Introduction & Regulatory Scope
                                </span>
                                <p className="text-[11px] leading-relaxed text-muted-foreground/90 font-sans">
                                  {manualData.introduction}
                                </p>
                              </div>
                              
                              {/* Maturity Specifications */}
                              <div className="border border-white/5 bg-slate-950/40 p-4 rounded-lg space-y-2 flex flex-col justify-between">
                                  <div>
                                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                                      II. Maturity / Level Specifications
                                    </span>
                                    <div className="grid grid-cols-1 gap-2 mt-1.5">
                                      {manualData.specifications.map((spec, i) => (
                                        <div key={i} className="border border-white/5 p-2.5 rounded bg-slate-900/60 font-mono text-[10px] space-y-1">
                                          <div className="flex justify-between items-center font-bold text-slate-200">
                                            <span>{spec.level}</span>
                                            <Badge variant="outline" className="text-[8px] border-cyan-500/20 bg-cyan-500/5 text-cyan-400 uppercase py-0 px-1 rounded-sm">
                                              {spec.focus}
                                            </Badge>
                                          </div>
                                          <p className="text-[9.5px] text-muted-foreground/80 font-sans leading-relaxed">
                                            {spec.requirement}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Requirements Catalog */}
                        <div className="space-y-3 pt-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                            III. Framework Requirements Catalog
                          </span>
                          {Object.keys(groupedAllQuestions).length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground font-mono">
                              Loading active compliance controls...
                            </div>
                          ) : (
                            Object.entries(groupedAllQuestions).map(([category, questions]) => {
                              const isExpanded = !!manualExpandedCategories[category];
                              return (
                                <div key={category} className="border border-white/5 bg-slate-950/20 rounded-lg overflow-hidden transition-all duration-300">
                                  {/* Category Accordion Header */}
                                  <button
                                    onClick={() => setManualExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                    className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 border-b border-white/5 text-left transition-all hover:bg-slate-950/80 group"
                                  >
                                    <div className="flex items-center gap-2 font-mono">
                                      <BookOpen className="h-3.5 w-3.5 text-cyan-500/60 group-hover:text-cyan-400 transition-colors" />
                                      <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                                        {category}
                                      </span>
                                      <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-900/60 text-slate-400 px-1.5 py-0">
                                        {questions.length} Requirements
                                      </Badge>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                    )}
                                  </button>

                                  {/* Category Content */}
                                  {isExpanded && (
                                    <div className="p-4 space-y-4 divide-y divide-white/5 bg-slate-950/10 animate-in fade-in duration-200">
                                      {questions.map((q, idx) => {
                                        return (
                                        <div key={q.id} className={`${idx > 0 ? 'pt-4' : ''} space-y-3`}>
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1.5 flex-1">
                                              <div className="flex flex-wrap items-center gap-2 font-mono">
                                                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest border border-cyan-500/20 bg-cyan-500/5 px-1.5 py-0.5 rounded">
                                                  {q.standardCode}
                                                </span>
                                                <Badge variant="outline" className="text-[8px] border-white/10 bg-slate-900/40 text-slate-400 py-0.5">
                                                  Purdue Level {q.purdueLevel}
                                                </Badge>
                                                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                                                  {q.purdueLevel === 0 ? 'Physical Access Control' :
                                                   q.purdueLevel === 1 ? 'Sensor / Actuator Safety' :
                                                   q.purdueLevel === 2 ? 'Local HMI Diagnostic' :
                                                   q.purdueLevel === 3 ? 'Operations / SCADA Controller' :
                                                   'Zone Gateway Boundary'}
                                                </span>
                                              </div>
                                              <h4 className="text-[11px] font-bold text-slate-200 mt-1 leading-snug">{q.text}</h4>
                                            </div>
                                            
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => jumpToQuestion(q)}
                                              className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-mono text-[9px] h-7 uppercase tracking-wider font-bold shrink-0 shadow-sm"
                                            >
                                              Answer Checklist
                                            </Button>
                                          </div>
                                          
                                          <div className="bg-slate-950/60 border border-white/5 rounded-lg p-3 font-sans text-[10.5px] text-muted-foreground/90 leading-relaxed whitespace-pre-line border-l-2 border-l-cyan-500/30">
                                            {q.description || 'No direct educational guidance available.'}
                                          </div>
                                        </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 font-mono text-xs">
                        
                        {/* Local Question Search Bar */}
                        <div className="relative w-full mb-2">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                          <input
                            type="text"
                            placeholder="Search current framework controls by code or text..."
                            value={questionSearchQuery}
                            onChange={(e) => setQuestionSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 font-mono focus:outline-none focus:border-cyan-500/35"
                          />
                        </div>

                        {loadingQuestions ? (
                          <div className="text-center py-8 text-muted-foreground font-mono">
                            Loading active compliance controls...
                          </div>
                        ) : filteredQuestions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground font-mono">
                            No matching controls found.
                          </div>
                        ) : (
                          Object.entries(groupedPaginatedQuestions).map(([category, questions]) => {
                            const isExpanded = !!expandedCategories[category]
                            return (
                              <div key={category} className="border border-white/5 bg-slate-950/20 rounded-lg overflow-hidden transition-all duration-300">
                                {/* Category Accordion Header */}
                                <button
                                  onClick={() => toggleCategory(category)}
                                  className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 border-b border-white/5 text-left transition-all hover:bg-slate-950/80 group"
                                >
                                  <div className="flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5 text-cyan-500/60 group-hover:text-cyan-400 transition-colors" />
                                    <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                                      {category}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] font-mono border-white/10 bg-slate-900/60 text-slate-400 px-1.5 py-0">
                                      {questions.length} Checks
                                    </Badge>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                  )}
                                </button>

                                {/* Category Content */}
                                {isExpanded && (
                                  <div className="p-3.5 space-y-4 divide-y divide-white/5 animate-in fade-in duration-200">
                                    {questions.map((q, idx) => {
                                      const currentAnswer = answers[q.id] || 'N'
                                      return (
                                        <div key={q.id} id={`question-card-${q.id}`} className={`${idx > 0 ? 'pt-4' : ''} space-y-3`}>
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1.5 max-w-[70%]">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest border border-cyan-500/20 bg-cyan-500/5 px-1.5 py-0.5 rounded">
                                                  {q.standardCode}
                                                </span>
                                                <Badge variant="outline" className="text-[8px] font-mono border-white/10 bg-slate-900/40 text-slate-400 py-0.5">
                                                  Purdue Level {q.purdueLevel}
                                                </Badge>
                                                <button
                                                  onClick={() => setDrawerQuestion(q)}
                                                  className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 font-bold transition-all px-1.5 py-0.5 border border-cyan-500/10 hover:border-cyan-500/30 rounded bg-cyan-500/5 font-mono"
                                                >
                                                  <Info className="h-2.5 w-2.5" />
                                                  Education
                                                </button>
                                              </div>
                                              <p className="text-[11px] font-bold text-slate-200 mt-1">{q.text}</p>
                                              <p className="text-[10px] text-muted-foreground/80 font-sans leading-relaxed">
                                                {q.description && q.description.length > 180 ? q.description.slice(0, 180) + '...' : q.description}
                                              </p>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 border border-white/5 p-1 rounded bg-slate-950 shadow-inner">
                                              {(['Y', 'N', 'NA', 'ALT'] as const).map(opt => (
                                                <button
                                                  key={opt}
                                                  onClick={() => setAnswer(q.id, opt)}
                                                  className={`h-6 w-8 text-[9px] font-bold font-mono rounded transition-all ${
                                                    currentAnswer === opt
                                                      ? opt === 'Y' ? 'bg-cyan-500 text-slate-950' : opt === 'N' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200'
                                                      : 'text-muted-foreground hover:bg-slate-800'
                                                  }`}
                                                >
                                                  {opt}
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {currentAnswer === 'ALT' && (
                                            <div className="space-y-2 border-t border-white/5 pt-3 animate-in fade-in duration-200">
                                              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Signed Compensating Control / Rationale Waiver</span>
                                              <textarea
                                                value={rationales[q.id] || ''}
                                                onChange={(e) => setRationales(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                placeholder="Describe alternating security controls compensating for this check..."
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-[10px] text-slate-300 placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 leading-relaxed font-mono"
                                                rows={2}
                                              />
                                            </div>
                                          )}

                                          {currentAnswer === 'N' && (
                                            <div className="space-y-2 border-t border-white/5 pt-3 animate-in fade-in duration-200">
                                              <div className="flex items-center gap-1 text-[9px] font-bold text-red-400 uppercase tracking-widest">
                                                <Info className="h-3 w-3" />
                                                Auditor Compliance Rationale / Mitigation Plan Required
                                              </div>
                                              <textarea
                                                value={rationales[q.id] || ''}
                                                onChange={(e) => setRationales(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                placeholder="Describe scheduled mitigation plans or non-compliance rationale..."
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-[10px] text-slate-300 placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/35 leading-relaxed font-mono"
                                                rows={2}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4 font-mono text-[10px]">
                            <span className="text-muted-foreground">
                              Page {currentPage} of {totalPages} ({filteredQuestions.length} checks found)
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="h-7 border-white/10 hover:bg-slate-800 text-[10px] text-slate-300 font-bold uppercase disabled:opacity-50"
                              >
                                <ArrowLeft className="h-3 w-3 mr-1" />
                                Prev
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className="h-7 border-white/10 hover:bg-slate-800 text-[10px] text-slate-300 font-bold uppercase disabled:opacity-50"
                              >
                                Next
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Educational Information Drawer */}
      {drawerQuestion && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setDrawerQuestion(null)}
          />
          
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[650px] bg-slate-900 border-l border-white/10 shadow-2xl p-6 flex flex-col justify-between font-mono animate-in slide-in-from-right duration-300">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                    Guidance & Education
                  </h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDrawerQuestion(null)}
                  className="hover:bg-slate-800 p-1 text-muted-foreground hover:text-foreground rounded-lg h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] text-xs leading-relaxed">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">CONTROL DIRECTIVE</span>
                  <div className="bg-slate-950 p-3 border border-white/5 rounded-lg">
                    <Badge variant="outline" className="text-[8px] font-mono border-cyan-500/25 bg-cyan-500/5 text-cyan-400 mb-2 px-1.5 py-0.5 rounded">
                      {selectedFramework?.name || 'Framework'}: {drawerQuestion.standardCode}
                    </Badge>
                    <h3 className="text-xs font-bold text-slate-200">{drawerQuestion.text}</h3>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">PURDUE ZONE LEVEL</span>
                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-white/5 rounded-lg text-slate-300">
                    <span className="text-cyan-400 font-bold">Level {drawerQuestion.purdueLevel}</span>
                    <span className="text-muted-foreground text-[10px]">— {
                      drawerQuestion.purdueLevel === 0 ? 'Device Diagnostic Port / Physical' :
                      drawerQuestion.purdueLevel === 1 ? 'Field Instrumentation / Safety Systems' :
                      drawerQuestion.purdueLevel === 2 ? 'Local Supervisor / HMI Console' :
                      drawerQuestion.purdueLevel === 3 ? 'Operations Network / SCADA' :
                      'Enterprise / External DMZ Boundary'
                    }</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">CSET EDUCATIONAL DESCRIPTION & GUIDELINES</span>
                  <div className="bg-slate-950 p-4 border border-white/5 rounded-lg text-muted-foreground font-sans leading-relaxed text-[11px] whitespace-pre-line">
                    {drawerQuestion.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-white/5 pt-4 mt-auto">
              <Button 
                variant="outline" 
                onClick={() => setDrawerQuestion(null)}
                className="w-full border-white/10 hover:bg-slate-800 text-xs uppercase text-slate-300 font-bold"
              >
                Close Documentation Drawer
              </Button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
