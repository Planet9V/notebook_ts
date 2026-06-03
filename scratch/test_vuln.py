from api.routers.notebooks import parse_version, matches_vuln

print("parse_version('4.4.0'):", parse_version("4.4.0"))
print("parse_version('4.5.0'):", parse_version("4.5.0"))
print("matches_vuln('Siemens', 'S7-1200', '4.4.0'):", matches_vuln("Siemens", "S7-1200", "4.4.0"))
print("matches_vuln('Cisco', 'IOS', '15.2'):", matches_vuln("Cisco", "IOS", "15.2"))
