from surrealdb import RecordID

print("Parse with brackets:", repr(RecordID.parse("notebook:⟨test-nb-999⟩")))
print("Parse without brackets:", repr(RecordID.parse("notebook:test-nb-999")))
