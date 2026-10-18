# NOTICE: `cset_catalog.json` is synthetic, generated content

The following two files are byte-identical copies of a **generated** catalogue:

- `scripts/cset_catalog.json`
- `frontend/src/lib/cset_catalog.json`

They were written by the generator scripts in this repository (`scripts/write_catalog.py`,
`scratch/generate_deep_catalog.py`, `scratch/generate_deep_individual_frameworks*.py`) and then
padded by `scratch/scale_all_frameworks.py`.

## What the catalogue contains (measured from the file)

| Measure | Value |
|---|---|
| Frameworks (top-level keys) | 66 |
| Rows (question entries) | 7,062 |
| Distinct question-text values | 454 (453 non-empty, plus the empty string) |
| Template-padded rows (`<FRAMEWORK>-C-<n>` codes from `scratch/scale_all_frameworks.py`) | 5,969, which reuse only 8 distinct question texts |
| Rows with an empty question text | 466 |
| Remaining rows (not template-padded, non-empty text) | 627 |

## It is NOT authentic CISA CSET content

This catalogue is **not** the CISA Cyber Security Evaluation Tool (CSET) question set and must
not be presented, sold, cited or relied on as such. Row counts were scaled up to target
"baseline" sizes by repeating template questions. They do not reflect the real number of
requirements in any standard, and the per-row guidance text is generated.

Genuine CSET content is published by CISA in the [cisagov/cset](https://github.com/cisagov/cset)
repository under the MIT licence. Use that as the source for any real assessment content.

## CSET MSSQL connection settings (environment variables)

The CSET database helpers (`scratch/cset_db_bridge.py`, `scratch/cset_db_pure_sync.py`,
`scratch/test_json_line_wrapping.py`, `scratch/test_large_json_no_strip.py`) run `sqlcmd`
inside the `cset-mssql` container. They read their credentials from the environment and exit
with an error naming any variable that is unset:

| Variable | Meaning |
|---|---|
| `CSET_MSSQL_HOST` | sqlcmd `-S` server as seen from inside the `cset-mssql` container (normally `localhost`) |
| `CSET_MSSQL_USER` | SQL login used by sqlcmd `-U` |
| `CSET_MSSQL_PASSWORD` | Password for that login (`-P`) |

Placeholders for a local `.env`. Never commit real values:

```
CSET_MSSQL_HOST=
CSET_MSSQL_USER=
CSET_MSSQL_PASSWORD=
```

Shell example:

```
export CSET_MSSQL_HOST=localhost
export CSET_MSSQL_USER=<login>
export CSET_MSSQL_PASSWORD=<password>
python scratch/cset_db_pure_sync.py
```

The repository's `.env.example` has not yet been updated with these lines. The owner can add
them in review.

## Keeping the files

The files are kept in place, not deleted, because scripts in `scripts/` and `scratch/` read
`scripts/cset_catalog.json`. Replace both copies with content derived from cisagov/cset
before any production or customer-facing use.
