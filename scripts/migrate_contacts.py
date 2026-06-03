"""One-time migration: extract nested customer.contacts dicts into first-class Contact records."""

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in path so we can import open_notebook
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger

from open_notebook.database.repository import repo_create, repo_query


def _parse_name(raw_name: str) -> tuple[str, str]:
    """Split a full name into (first_name, last_name).

    Splits on the first space; if there is no space the entire string
    becomes first_name and last_name is set to a dash so that the
    Contact validator (which rejects empty strings) is satisfied.
    """
    raw_name = raw_name.strip()
    if " " in raw_name:
        first, rest = raw_name.split(" ", 1)
        return first.strip(), rest.strip()
    return raw_name, "-"


def _normalize_title(contact_dict: dict) -> str:
    """Return the title/role value from a legacy contact dict.

    Old data may store the value under ``title`` or ``role``.
    """
    return (contact_dict.get("title") or contact_dict.get("role") or "").strip()


def _build_contact_data(contact_dict: dict, customer_id: str) -> dict:
    """Transform a legacy nested contact dict into a Contact-compatible dict."""
    first_name, last_name = _parse_name(contact_dict.get("name", "Unknown"))
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": contact_dict.get("email", ""),
        "phone": contact_dict.get("phone", ""),
        "mobile": contact_dict.get("mobile", ""),
        "title": _normalize_title(contact_dict),
        "department": contact_dict.get("department", ""),
        "seniority": contact_dict.get("seniority", ""),
        "linkedin_url": contact_dict.get("linkedin_url", ""),
        "customer_id": customer_id,
        "status": "active",
        "tags": contact_dict.get("tags", []),
        "notes": contact_dict.get("notes", ""),
        "source": "migration",
    }


async def main() -> None:
    logger.info("Starting contact migration …")

    # Fetch customers that have a non-empty contacts array
    customers = await repo_query(
        "SELECT id, contacts FROM customer WHERE contacts IS NOT NONE AND array::len(contacts) > 0"
    )

    if not customers:
        logger.info("No customers with nested contacts found — nothing to migrate.")
        return

    total_created = 0
    total_skipped = 0

    for customer in customers:
        customer_id = customer.get("id")
        contacts_list = customer.get("contacts", [])
        if not contacts_list or not customer_id:
            continue

        for raw_contact in contacts_list:
            if not isinstance(raw_contact, dict):
                logger.warning(f"Skipping non-dict contact entry in {customer_id}: {raw_contact!r}")
                total_skipped += 1
                continue

            name_val = raw_contact.get("name", "").strip()
            if not name_val:
                logger.warning(f"Skipping contact with no name in {customer_id}")
                total_skipped += 1
                continue

            data = _build_contact_data(raw_contact, customer_id)
            try:
                await repo_create("contact", data)
                total_created += 1
            except Exception as e:
                logger.error(f"Failed to create contact for {customer_id}: {e}")
                total_skipped += 1

    logger.info(
        f"Migration complete — created {total_created} contact(s), skipped {total_skipped}."
    )


if __name__ == "__main__":
    asyncio.run(main())
