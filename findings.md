# CISA 16 USA Critical Infrastructure Sectors & Framework Mapping Findings

This document records the definitive research and findings on aligning Tetrel's compliance framework engine with the official Cybersecurity and Infrastructure Security Agency (CISA) and Department of Homeland Security (DHS) list of **16 Critical Infrastructure Sectors**. 

---

## 1. Authoritative CISA 16 Critical Infrastructure Sectors List
Under Presidential Policy Directive 21 (PPD-21), 16 sectors are designated as critical, meaning their physical or virtual destruction would have a debilitating impact on national security, economic security, or public health and safety (CISA, 2023; PPD-21, 2013).

Below is the definitive list of the 16 sectors, their designated Sector Risk Management Agencies (SRMAs), and key subsectors:

1. **Chemical Sector**
   * **SRMA:** Department of Homeland Security (DHS) / CISA
   * **Subsectors:** Agricultural chemicals, Specialty chemicals, Industrial gases, Petrochemicals, Coal, tar, and wood chemicals, Plastics and synthetics.
2. **Commercial Facilities Sector**
   * **SRMA:** DHS / CISA
   * **Subsectors:** Entertainment and Media, Gaming, Lodging, Outdoor Events, Public Assembly, Real Estate, Retail, Sports Leagues.
3. **Communications Sector**
   * **SRMA:** DHS / CISA
   * **Subsectors:** Wireline, Wireless, Satellite, Cable, Broadcast.
4. **Critical Manufacturing Sector**
   * **SRMA:** DHS / CISA
   * **Subsectors:** Primary Metals, Machinery, Electrical Equipment and Components, Transportation Equipment.
5. **Dams Sector**
   * **SRMA:** DHS / CISA
   * **Subsectors:** Dams, Levees, Hurricane Barriers, Lock and Dam Systems, Water Retention Systems.
6. **Defense Industrial Base Sector**
   * **SRMA:** Department of Defense (DoD)
   * **Subsectors:** Research and Development, Design, Development, Manufacture, Delivery, and Maintenance of military weapon systems, subsystems, and components.
7. **Emergency Services Sector**
   * **SRMA:** DHS / CISA
   * **Subsectors:** Law Enforcement, Fire and Rescue Services, Emergency Medical Services (EMS), Emergency Management, Public Works.
8. **Energy Sector**
   * **SRMA:** Department of Energy (DOE)
   * **Subsectors:** Electricity (Generation, Transmission, Distribution), Petroleum (Production, Refining, Storage), Natural Gas (Extraction, Transmission, Distribution).
9. **Financial Services Sector**
   * **SRMA:** Department of the Treasury
   * **Subsectors:** Depository Institutions (Banking), Securities and Investments, Insurance, Payments and Clearing Systems.
10. **Food and Agriculture Sector**
    * **SRMA:** Department of Agriculture (USDA) / Department of Health and Human Services (HHS)
    * **Subsectors:** Agriculture and Production (Farms, Ranches), Processing, Packaging, and Distribution, Retail and Foodservice (Grocery, Restaurants).
11. **Government Facilities Sector**
    * **SRMA:** DHS (Federal Protective Service) / General Services Administration (GSA)
    * **Subsectors:** General Government Facilities (Courthouses, Offices), Education Facilities (Schools, Universities), Cyber/Physical Infrastructure (Data Centers), National Monuments and Icons.
12. **Healthcare and Public Health Sector**
    * **SRMA:** HHS
    * **Subsectors:** Direct Patient Care (Hospitals, Clinics), Health Information Technology, Medical Materials, Devices, and Supply Chains, Public Health Agencies.
13. **Information Technology Sector**
    * **SRMA:** DHS / CISA
    * **Subsectors:** IT Production (Hardware, Software, Services), IT Infrastructure (Data Centers, Cloud, Internet Routing), Cybersecurity and Threat Information.
14. **Nuclear Reactors, Materials, and Waste Sector**
    * **SRMA:** DHS / CISA
    * **Subsectors:** Operating Nuclear Power Reactors, Research and Test Reactors, Nuclear Fuel Cycle Facilities, Radioactive Waste Management and Storage.
15. **Transportation Systems Sector**
    * **SRMA:** DHS (TSA) / Department of Transportation (DOT)
    * **Subsectors:** Aviation, Highway Infrastructure and Motor Carrier, Maritime Transportation, Mass Transit and Passenger Rail, Pipeline Systems, Freight Rail.
16. **Water and Wastewater Systems Sector**
    * **SRMA:** Environmental Protection Agency (EPA)
    * **Subsectors:** Drinking Water Systems (Treatment, Distribution), Wastewater Systems (Collection, Treatment).

---

## 2. Multi-Sector Classification of 66 Compliance Frameworks
Frameworks can belong to multiple sectors because their cybersecurity controls apply to environments where systems intersect (e.g., smart grids span Energy, Critical Manufacturing, and IT). 

Below is the definitive classification of Tetrel's 66 compliance frameworks into CISA's official sectors, incorporating a primary `sector` field (for backward compatibility) and a new `sectors` array of strings:

### Cross-Sector & Core Frameworks
* **IEC 62443-3-3** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems", "Dams", "Nuclear Reactors, Materials, and Waste"]`)
* **IEC 62443-4-2** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems", "Nuclear Reactors, Materials, and Waste"]`)
* **IEC 62443-2-1** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems"]`)
* **IEC 62443-2-4** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems"]`)
* **IEC 62443-4-1** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems"]`)
* **NIST SP 800-82 r3** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Energy", "Water and Wastewater Systems", "Critical Manufacturing", "Chemical", "Dams", "Nuclear Reactors, Materials, and Waste", "Transportation Systems"]`)
* **NIST SP 800-53 r5** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Government Facilities", "Defense Industrial Base", "Healthcare and Public Health", "Financial Services"]`)
* **NIST CSF v2.0** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Financial Services", "Energy", "Healthcare and Public Health", "Commercial Facilities", "Government Facilities", "Communications"]`)
* **CISA Cross-Sector CPGs** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Energy", "Water and Wastewater Systems", "Healthcare and Public Health", "Transportation Systems", "Emergency Services"]`)
* **CIS Controls v8** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Commercial Facilities", "Government Facilities", "Financial Services"]`)
* **ANSSI BP-006** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical"]`)
* **BSI IT-Grundschutz** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Commercial Facilities", "Government Facilities"]`)
* **DHS Catalog of Controls** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical"]`)
* **ISA-99** (Primary: `Cross-Sector`, Sectors: `["Critical Manufacturing", "Energy", "Water and Wastewater Systems"]`)
* **ISO/IEC 27001:2022** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Financial Services", "Healthcare and Public Health"]`)
* **COBIT 2019** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Financial Services", "Government Facilities"]`)
* **SOC 2 Type II** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Financial Services", "Commercial Facilities"]`)
* **CSA Cloud Controls Matrix** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Commercial Facilities", "Government Facilities"]`)
* **ACSC Essential Eight** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Government Facilities", "Defense Industrial Base"]`)
* **KATRI SCADA Framework** (Primary: `Cross-Sector`, Sectors: `["Energy", "Water and Wastewater Systems", "Transportation Systems"]`)
* **NIST SP 800-37 r2** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Government Facilities"]`)
* **NIST SP 800-161 r1** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Critical Manufacturing", "Defense Industrial Base", "Government Facilities"]`)
* **ENISA IoT Security** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Commercial Facilities"]`)
* **EU NIS2 Directive** (Primary: `Cross-Sector`, Sectors: `["Energy", "Transportation Systems", "Financial Services", "Healthcare and Public Health", "Water and Wastewater Systems", "Information Technology", "Chemical"]`)
* **EU Cyber Resilience Act** (Primary: `Cross-Sector`, Sectors: `["Information Technology", "Critical Manufacturing", "Commercial Facilities"]`)
* **Australian SOCI Act** (Primary: `Cross-Sector`, Sectors: `["Energy", "Transportation Systems", "Water and Wastewater Systems", "Financial Services", "Healthcare and Public Health", "Information Technology", "Communications", "Food and Agriculture"]`)

### Energy Sector
* **NERC CIP-002-5.1a** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-003-8** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-004-6** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-005-7** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-006-6** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-007-6** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-008-6** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-009-6** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-010-4** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-011-2** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NERC CIP-013-1** (Primary: `Energy`, Sectors: `["Energy", "Critical Manufacturing"]`)
* **NERC CIP-014-3** (Primary: `Energy`, Sectors: `["Energy"]`)
* **ISO/IEC 27019:2017** (Primary: `Energy`, Sectors: `["Energy"]`)
* **NISTIR 7628 r1** (Primary: `Energy`, Sectors: `["Energy"]`)
* **INGAA Guidelines** (Primary: `Energy`, Sectors: `["Energy", "Transportation Systems"]`)
* **API Standard 1164** (Primary: `Energy`, Sectors: `["Energy", "Transportation Systems"]`)
* **FERC Order 889** (Primary: `Energy`, Sectors: `["Energy"]`)
* **IEEE 1686-2022** (Primary: `Energy`, Sectors: `["Energy", "Critical Manufacturing"]`)

### Nuclear Reactors, Materials, and Waste Sector
* **NRC Regulatory Guide 5.71** (Primary: `Nuclear Reactors, Materials, and Waste`, Sectors: `["Nuclear Reactors, Materials, and Waste", "Energy"]`)
* **IAEA NSS-17-G** (Primary: `Nuclear Reactors, Materials, and Waste`, Sectors: `["Nuclear Reactors, Materials, and Waste", "Energy"]`)
* **NNSA NAP-24A** (Primary: `Nuclear Reactors, Materials, and Waste`, Sectors: `["Nuclear Reactors, Materials, and Waste", "Defense Industrial Base", "Government Facilities"]`)

### Water and Wastewater Systems Sector
* **AWWA G430-22** (Primary: `Water and Wastewater Systems`, Sectors: `["Water and Wastewater Systems", "Healthcare and Public Health"]`)
* **EPA Cybersecurity Baseline** (Primary: `Water and Wastewater Systems`, Sectors: `["Water and Wastewater Systems", "Healthcare and Public Health"]`)
* **AWWA M19 Emergency Planning** (Primary: `Water and Wastewater Systems`, Sectors: `["Water and Wastewater Systems", "Emergency Services"]`)

### Defense Industrial Base Sector
* **NIST SP 800-171 r3** (Primary: `Defense Industrial Base`, Sectors: `["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"]`)
* **NIST SP 800-172** (Primary: `Defense Industrial Base`, Sectors: `["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"]`)
* **CMMC 2.0 Level 1** (Primary: `Defense Industrial Base`, Sectors: `["Defense Industrial Base", "Government Facilities"]`)
* **CMMC 2.0 Level 2** (Primary: `Defense Industrial Base`, Sectors: `["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"]`)
* **CMMC 2.0 Level 3** (Primary: `Defense Industrial Base`, Sectors: `["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"]`)
* **CNSSI 1253** (Primary: `Defense Industrial Base`, Sectors: `["Defense Industrial Base", "Government Facilities"]`)

### Transportation Systems Sector
* **TSA Pipeline Directive 2C** (Primary: `Transportation Systems`, Sectors: `["Transportation Systems", "Energy"]`)
* **TSA Rail Directive 01** (Primary: `Transportation Systems`, Sectors: `["Transportation Systems"]`)
* **FAA Airport Cyber Security** (Primary: `Transportation Systems`, Sectors: `["Transportation Systems"]`)
* **USCG Maritime Cyber Security** (Primary: `Transportation Systems`, Sectors: `["Transportation Systems"]`)
* **DO-326A** (Primary: `Transportation Systems`, Sectors: `["Transportation Systems", "Critical Manufacturing"]`)

### Chemical Sector
* **CFATS RBPS** (Primary: `Chemical`, Sectors: `["Chemical", "Emergency Services"]`)

### Healthcare and Public Health Sector
* **HIPAA Security Rule** (Primary: `Healthcare and Public Health`, Sectors: `["Healthcare and Public Health", "Information Technology"]`)

### Financial Services Sector
* **PCI-DSS v4.0** (Primary: `Financial Services`, Sectors: `["Financial Services", "Commercial Facilities"]`)
* **SWIFT CSCF v2024** (Primary: `Financial Services`, Sectors: `["Financial Services"]`)
* **CRI Profile v2.0** (Primary: `Financial Services`, Sectors: `["Financial Services"]`)

---

## 3. Reference Citations
* Cybersecurity and Infrastructure Security Agency. (2023). *Critical Infrastructure Sectors*. U.S. Department of Homeland Security. https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors
* Presidential Policy Directive 21 -- Critical Infrastructure Security and Resilience. (2013). *The White House Office of the Press Secretary*. https://obamawhitehouse.archives.gov/the-press-office/2013/02/12/presidential-policy-directive-critical-infrastructure-security-and-resil
* Department of Homeland Security. (2020). *Sector-Specific Plans*. https://www.dhs.gov/sector-specific-plans
