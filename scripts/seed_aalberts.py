#!/usr/bin/env python3
import asyncio
import os

from open_notebook.database.repository import repo_query


async def seed():
    print("Seeding Aalberts N.V. organizational structure and workstreams...")

    # 1. Clean up old Aalberts records
    await repo_query("DELETE FROM customer WHERE id = customer:aalberts;")
    await repo_query("DELETE FROM location WHERE id = location:aalberts_na_livonia OR id = location:aalberts_na_pineville OR id = location:aalberts_na_sanjose;")
    await repo_query("DELETE FROM location WHERE id = location:aalberts_eu_werther OR id = location:aalberts_eu_henstedt OR id = location:aalberts_eu_eindhoven;")
    await repo_query("DELETE FROM location WHERE id = location:aalberts_apac_hangzhou OR id = location:aalberts_apac_shanghai OR id = location:aalberts_apac_singapore;")
    await repo_query("DELETE FROM project WHERE id = project:aalberts_global_compliance OR id = project:aalberts_second_workstream;")
    await repo_query("DELETE FROM notebook WHERE id = notebook:aalberts_na OR id = notebook:aalberts_eu OR id = notebook:aalberts_apac;")
    
    # Clean up notes/sources and relations
    await repo_query("DELETE FROM note WHERE id = note:aalberts_livonia_findings OR id = note:aalberts_eindhoven_findings OR id = note:aalberts_hangzhou_findings;")
    await repo_query("DELETE FROM source WHERE id = source:aalberts_livonia_hardening_guide OR id = source:aalberts_eindhoven_cleanroom_spec OR id = source:aalberts_hangzhou_anodizing_sop;")
    await repo_query("DELETE artifact WHERE out = notebook:aalberts_na OR out = notebook:aalberts_eu OR out = notebook:aalberts_apac;")
    await repo_query("DELETE reference WHERE out = notebook:aalberts_na OR out = notebook:aalberts_eu OR out = notebook:aalberts_apac;")
    await repo_query("DELETE entity_note;")
    await repo_query("DELETE entity_link;")

    # 2. Insert Aalberts Customer (Parent Organization)
    await repo_query("""
    INSERT INTO customer {
        id: customer:aalberts,
        name: 'Aalberts N.V.',
        website: 'aalberts.com',
        description: 'Dutch global technology company specializing in piping systems, surface technologies, and hydronic flow control across NA, EU, and APAC.',
        industry: 'Engineering & Industrial Technology',
        primary_sector: 'Industrial Productivity & Semiconductor',
        status: 'active'
    } ON DUPLICATE KEY UPDATE name = 'Aalberts N.V.';
    """)

    # 3. Create Facilities (3 in NA, 3 in EU, 3 in APAC)
    # NORTH AMERICA (NA)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_na_livonia,
        facility_name: '[NA] Livonia Surface Technologies',
        customer_id: 'customer:aalberts',
        facility_type: 'Surface Technologies',
        sectors: ['NA', 'Automotive', 'E-mobility'],
        country: 'USA',
        address: 'Livonia, Michigan',
        description: 'Specializes in heat treatment, hardening, and functional coatings for electric vehicle drive parts.'
    };
    """)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_na_pineville,
        facility_name: '[NA] Pineville Integrated Piping',
        customer_id: 'customer:aalberts',
        facility_type: 'Piping Systems',
        sectors: ['NA', 'Sustainable Buildings'],
        country: 'USA',
        address: 'Pineville, North Carolina',
        description: 'Produces high-grade connection valves, flow controls, and integrated piping systems.'
    };
    """)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_na_sanjose,
        facility_name: '[NA] San Jose Advanced Mechatronics',
        customer_id: 'customer:aalberts',
        facility_type: 'Advanced Mechatronics',
        sectors: ['NA', 'Semiconductor'],
        country: 'USA',
        address: 'San Jose, California',
        description: 'R&D center developing sub-assemblies for EUV lithography equipment.'
    };
    """)

    # EUROPE (EU)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_eu_werther,
        facility_name: '[EU] Werther Surface Technologies',
        customer_id: 'customer:aalberts',
        facility_type: 'Surface Technologies',
        sectors: ['EU', 'Aerospace', 'Industrial Machinery'],
        country: 'Germany',
        address: 'Werther, Germany',
        description: 'High-capacity hardening shop offering thermal and thermochemical coatings.'
    };
    """)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_eu_henstedt,
        facility_name: '[EU] Henstedt-Ulzburg Piping Hub',
        customer_id: 'customer:aalberts',
        facility_type: 'Piping Systems',
        sectors: ['EU', 'Logistics', 'Sustainable Buildings'],
        country: 'Germany',
        address: 'Henstedt-Ulzburg, Germany',
        description: 'Distribution hub and assembly factory for European Integrated Piping Systems.'
    };
    """)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_eu_eindhoven,
        facility_name: '[EU] Eindhoven Advanced Mechatronics',
        customer_id: 'customer:aalberts',
        facility_type: 'Advanced Mechatronics',
        sectors: ['EU', 'Semiconductor', 'Lithography'],
        country: 'Netherlands',
        address: 'Eindhoven, Netherlands',
        description: 'Ultra-precision manufacturing and systems integration for microchip lithography modules.'
    };
    """)

    # ASIA-PACIFIC (APAC)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_apac_hangzhou,
        facility_name: '[APAC] Hangzhou Surface Technologies',
        customer_id: 'customer:aalberts',
        facility_type: 'Surface Technologies',
        sectors: ['APAC', 'Semiconductor', 'Cleanroom'],
        country: 'China',
        address: 'Hangzhou, China',
        description: 'Functional surface treatments specializing in HART-COAT® aluminum anodizing.'
    };
    """)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_apac_shanghai,
        facility_name: '[APAC] Shanghai Zinc Flake Coatings',
        customer_id: 'customer:aalberts',
        facility_type: 'Surface Technologies',
        sectors: ['APAC', 'Automotive', 'Industrial Productivity'],
        country: 'China',
        address: 'Shanghai, China',
        description: 'Zinc flake anti-corrosion coating facility serving automotive parts manufacturers.'
    };
    """)
    await repo_query("""
    INSERT INTO location {
        id: location:aalberts_apac_singapore,
        facility_name: '[APAC] Singapore Mechatronics Assembly',
        customer_id: 'customer:aalberts',
        facility_type: 'Advanced Mechatronics',
        sectors: ['APAC', 'Semiconductor'],
        country: 'Singapore',
        address: 'Singapore',
        description: 'Precision cleanroom assembly and integration of semiconductor gas and flow systems.'
    };
    """)

    # 4. Create Main Project & Tasks (Portfolio alignment)
    await repo_query("""
    INSERT INTO project {
        id: project:aalberts_global_compliance,
        name: 'Aalberts N.V. - Global Security & Compliance',
        description: 'Compliance alignment and network insulation audit project for Aalberts facilities in NA, EU, and APAC divisions.',
        stage: 'in_progress',
        status: 'active',
        priority: 'high',
        project_type: 'compliance',
        customer_id: 'customer:aalberts',
        tasks: [
          { title: 'SCADA port isolation audit - NA Division', assigned_to: 'SRE Agent Alpha', priority: 'High', status: 'in_progress' },
          { title: 'NIST CSF v2 Govern alignment - EU Division', assigned_to: 'SRE Agent Beta', priority: 'Medium', status: 'done' },
          { title: 'Chemical disposal process validation - APAC Division', assigned_to: 'Unassigned', priority: 'High', status: 'todo' }
        ]
    };
    """)

    # 5. Create 2nd Workstream Project (Second workstream for Aalberts organization)
    await repo_query("""
    INSERT INTO project {
        id: project:aalberts_second_workstream,
        name: 'Aalberts - APAC Surface Technologies Expansion',
        description: 'Dedicated security controls and environmental validation workstream for the new cleanroom expansion in Hangzhou Surface Technologies.',
        stage: 'planning',
        status: 'active',
        priority: 'medium',
        project_type: 'expansion',
        customer_id: 'customer:aalberts',
        tasks: [
          { title: 'Hangzhou cleanroom firewall configuration review', assigned_to: 'SRE Agent Alpha', priority: 'High', status: 'todo' },
          { title: 'Anodizing automation system sensor logs verification', assigned_to: 'Unassigned', priority: 'Low', status: 'todo' }
        ]
    };
    """)

    # 6. Create Notebooks for the divisions
    await repo_query("""
    INSERT INTO notebook {
        id: notebook:aalberts_na,
        name: 'Aalberts - North America Division Audit',
        description: 'Compliance documentation, network audit notes, and piping control guidelines for North American facilities.',
        customer_id: 'customer:aalberts',
        location_id: 'location:aalberts_na_livonia',
        created: time::now(),
        updated: time::now()
    };
    """)
    await repo_query("""
    INSERT INTO notebook {
        id: notebook:aalberts_eu,
        name: 'Aalberts - Europe Division Audit',
        description: 'Audit logs, surface coatings safety requirements, and mechatronics specs for European plants.',
        customer_id: 'customer:aalberts',
        location_id: 'location:aalberts_eu_eindhoven',
        created: time::now(),
        updated: time::now()
    };
    """)
    await repo_query("""
    INSERT INTO notebook {
        id: notebook:aalberts_apac,
        name: 'Aalberts - Asia-Pacific Division Audit',
        description: 'Anodizing SOPs, zinc flake environmental reviews, and mechatronics cleanroom compliance logs.',
        customer_id: 'customer:aalberts',
        location_id: 'location:aalberts_apac_hangzhou',
        created: time::now(),
        updated: time::now()
    };
    """)

    # 7. Create Sources (Simulating Docling parsed PDFs)
    # NA Source
    await repo_query("""
    INSERT INTO source {
        id: source:aalberts_livonia_hardening_guide,
        title: 'Livonia Heat Hardening SCADA Configuration',
        full_text: 'Livonia Surface Technologies heat hardening systems are automated via SCADA PLCs. Secure configurations require isolating ports 502 (Modbus) and 44818 (EtherNet/IP). Cleanroom air filters must maintain HEPA grade.',
        status: 'completed',
        created: time::now(),
        updated: time::now()
    };
    """)
    # EU Source
    await repo_query("""
    INSERT INTO source {
        id: source:aalberts_eindhoven_cleanroom_spec,
        title: 'Eindhoven Lithography Subsystem Security Specs',
        full_text: 'Eindhoven Advanced Mechatronics precision cleanrooms construct microchip lithography modules. Network access must follow NIST CSF v2 Govern requirements, isolating assembly lines from internal office subnets.',
        status: 'completed',
        created: time::now(),
        updated: time::now()
    };
    """)
    # APAC Source
    await repo_query("""
    INSERT INTO source {
        id: source:aalberts_hangzhou_anodizing_sop,
        title: 'Hangzhou Anodizing Chemical Disposal SOP',
        full_text: 'Hangzhou Surface Technologies HART-COAT® aluminum anodizing lines execute chemical disposal controls. PLC automated valves monitor disposal levels. Safety systems require air gap connection separation.',
        status: 'completed',
        created: time::now(),
        updated: time::now()
    };
    """)

    # 8. Create Notes
    # NA Note
    await repo_query("""
    INSERT INTO note {
        id: note:aalberts_livonia_findings,
        title: 'Livonia Audit Findings',
        content: 'Audited the Livonia heat hardening SCADA ports. Verified that Modbus is isolated behind the regional firewall, matching integrated piping systems protocols.',
        note_type: 'human',
        created: time::now(),
        updated: time::now()
    };
    """)
    # EU Note
    await repo_query("""
    INSERT INTO note {
        id: note:aalberts_eindhoven_findings,
        title: 'Eindhoven Cleanroom Audit',
        content: 'Eindhoven mechatronics cleanroom implements airlock access logging and air filtration monitoring matching NIST compliance guidelines.',
        note_type: 'human',
        created: time::now(),
        updated: time::now()
    };
    """)
    # APAC Note
    await repo_query("""
    INSERT INTO note {
        id: note:aalberts_hangzhou_findings,
        title: 'Hangzhou Anodizing Air Gap Review',
        content: 'Reviewed Hangzhou HART-COAT anodizing disposal PLC. Verified the system uses air gap network separation for chemical valve controls.',
        note_type: 'human',
        created: time::now(),
        updated: time::now()
    };
    """)

    # 9. Relate notes and sources to the notebooks
    await repo_query("RELATE note:aalberts_livonia_findings->artifact->notebook:aalberts_na;")
    await repo_query("RELATE source:aalberts_livonia_hardening_guide->reference->notebook:aalberts_na;")
    
    await repo_query("RELATE note:aalberts_eindhoven_findings->artifact->notebook:aalberts_eu;")
    await repo_query("RELATE source:aalberts_eindhoven_cleanroom_spec->reference->notebook:aalberts_eu;")
    
    await repo_query("RELATE note:aalberts_hangzhou_findings->artifact->notebook:aalberts_apac;")
    await repo_query("RELATE source:aalberts_hangzhou_anodizing_sop->reference->notebook:aalberts_apac;")

    # 10. Relate notes to specific facility locations (hierarchical roll-up)
    await repo_query("RELATE note:aalberts_livonia_findings->entity_note->location:aalberts_na_livonia;")
    await repo_query("RELATE note:aalberts_eindhoven_findings->entity_note->location:aalberts_eu_eindhoven;")
    await repo_query("RELATE note:aalberts_hangzhou_findings->entity_note->location:aalberts_apac_hangzhou;")

    print("Aalberts seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
