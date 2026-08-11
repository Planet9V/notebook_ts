#!/usr/bin/env python3
import asyncio
import os

from open_notebook.database.repository import repo_query


async def seed():
    print("Cleaning up existing visual graph demo records...")
    await repo_query("DELETE FROM notebook WHERE name = 'Visual Graph Integration Demo';")
    await repo_query("DELETE FROM note WHERE id = note:graph_note_1 OR id = note:graph_note_2;")
    await repo_query("DELETE FROM source WHERE id = source:graph_source_1 OR id = source:graph_source_2;")
    await repo_query("DELETE artifact WHERE out = notebook:graph_demo_nb;")
    await repo_query("DELETE reference WHERE out = notebook:graph_demo_nb;")
    await repo_query("DELETE entity_note WHERE in = note:graph_note_1 OR in = note:graph_note_2;")

    print("Seeding visual graph demo...")
    
    # 1. Create or update the parent customer
    await repo_query("""
    INSERT INTO customer {
        id: customer:ij5r7iuk9926ehq7911d,
        name: 'ResearchCust_b4853e24',
        website: 'research-b4853e24.com',
        description: 'Primary customer organization for security research.'
    } ON DUPLICATE KEY UPDATE name = 'ResearchCust_b4853e24';
    """)
    
    # 2. Create or update the facility location
    await repo_query("""
    INSERT INTO location {
        id: location:6miu8zv4gd2780lhl1ke,
        facility_name: 'ACME Refinery Alpha',
        customer_id: 'customer:ij5r7iuk9926ehq7911d',
        facility_type: 'Refinery',
        description: 'Critical infrastructure facility'
    } ON DUPLICATE KEY UPDATE customer_id = 'customer:ij5r7iuk9926ehq7911d', facility_name = 'ACME Refinery Alpha';
    """)

    # 3. Create the notebook using correct Record ID syntax
    await repo_query("""
    INSERT INTO notebook {
        id: notebook:graph_demo_nb,
        name: 'Visual Graph Integration Demo',
        description: 'Complete demonstration of visual graph, hierarchical layout, and AI suggestions.',
        customer_id: 'customer:ij5r7iuk9926ehq7911d',
        location_id: 'location:6miu8zv4gd2780lhl1ke',
        created: time::now(),
        updated: time::now()
    } ON DUPLICATE KEY UPDATE name = 'Visual Graph Integration Demo', customer_id = 'customer:ij5r7iuk9926ehq7911d', location_id = 'location:6miu8zv4gd2780lhl1ke';
    """)

    # 4. Create notes
    await repo_query("""
    INSERT INTO note {
        id: note:graph_note_1,
        title: 'ICS Protocol Insulator Audit Notes',
        content: 'The Texas refinery plant requires SCADA network insulation. Secure ports are 502 (Modbus) and 44818 (EtherNet/IP). We need to verify firewall rules.',
        note_type: 'human',
        created: time::now(),
        updated: time::now()
    } ON DUPLICATE KEY UPDATE title = 'ICS Protocol Insulator Audit Notes';
    """)
    
    await repo_query("""
    INSERT INTO note {
        id: note:graph_note_2,
        title: 'NIST CSF Compliance Report',
        content: 'Refinery plant compliance audit alignment matches NIST CSF v2 Govern and Recover categories. We need to verify credentials storage security.',
        note_type: 'human',
        created: time::now(),
        updated: time::now()
    } ON DUPLICATE KEY UPDATE title = 'NIST CSF Compliance Report';
    """)

    # 5. Create sources
    await repo_query("""
    INSERT INTO source {
        id: source:graph_source_1,
        title: 'SCADA Insulation Blueprints',
        full_text: 'SCADA network insulation blueprints outline firewall configurations between IT and OT segments. Critical segments are Refinery Plant and Solar Grid.',
        status: 'completed',
        created: time::now(),
        updated: time::now()
    } ON DUPLICATE KEY UPDATE title = 'SCADA Insulation Blueprints';
    """)

    await repo_query("""
    INSERT INTO source {
        id: source:graph_source_2,
        title: 'ACME Security Architecture Guide',
        full_text: 'Security Architecture Guide requires all refinery facilities to implement multi-factor authentication on all SCADA systems.',
        status: 'completed',
        created: time::now(),
        updated: time::now()
    } ON DUPLICATE KEY UPDATE title = 'ACME Security Architecture Guide';
    """)

    # 6. Relate notes and sources to the notebook
    await repo_query("RELATE note:graph_note_1->artifact->notebook:graph_demo_nb;")
    await repo_query("RELATE note:graph_note_2->artifact->notebook:graph_demo_nb;")
    await repo_query("RELATE source:graph_source_1->reference->notebook:graph_demo_nb;")
    await repo_query("RELATE source:graph_source_2->reference->notebook:graph_demo_nb;")

    # 7. Relate notes to customer/location via entity_note
    await repo_query("RELATE note:graph_note_1->entity_note->location:6miu8zv4gd2780lhl1ke;")
    await repo_query("RELATE note:graph_note_2->entity_note->customer:ij5r7iuk9926ehq7911d;")

    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
