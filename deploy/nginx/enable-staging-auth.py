#!/usr/bin/env python3
"""Protect only the HTTPS staging vhost in the combined MSK nginx config."""

from pathlib import Path
import subprocess
import sys


path = Path('/etc/nginx/sites-enabled/daibilet.conf')
source = path.read_text()
marker = '    server_name staging.daibilet.ru;'
if source.count(marker) != 1:
    sys.exit('Expected exactly one HTTPS staging server_name')
start = source.index(marker)
end = source.find('\nserver {', start)
block = source[start:end if end >= 0 else len(source)]
if 'auth_basic_user_file /etc/nginx/.htpasswd-daibilet-admin;' in block:
    print('Staging basic auth already installed')
    sys.exit(0)
if 'auth_basic ' in block:
    sys.exit('Staging has another auth_basic configuration; inspect manually')
if not Path('/etc/nginx/.htpasswd-daibilet-admin').is_file():
    sys.exit('Admin htpasswd file missing')
replacement = marker + '\n    auth_basic "Daibilet staging";\n    auth_basic_user_file /etc/nginx/.htpasswd-daibilet-admin;'
# sites-enabled/* is included by nginx, so keep the backup outside that folder.
backup = Path('/etc/nginx/daibilet.conf.pre-staging-auth')
if backup.exists():
    if backup.read_text() != source:
        sys.exit(f'Backup differs from current config: {backup}')
else:
    backup.write_text(source)
path.write_text(source.replace(marker, replacement, 1))
check = subprocess.run(['nginx', '-t'], capture_output=True, text=True)
if check.returncode:
    path.write_text(source)
    sys.exit(f'nginx -t failed; original config restored:\n{check.stderr}')
subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
print('Staging basic auth enabled; nginx reloaded')
