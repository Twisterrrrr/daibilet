#!/usr/bin/env python3
"""Check staging Basic Auth without putting its password in shell arguments."""

import base64
from pathlib import Path
from urllib.request import Request, urlopen


values = dict(line.split('=', 1) for line in Path('/opt/daibilet-staging/.staging-access').read_text().splitlines())
credentials = f"{values['username']}:{values['password']}".encode()
header = 'Basic ' + base64.b64encode(credentials).decode()
for path in ('/', '/places'):
    request = Request('https://staging.daibilet.ru' + path, headers={'Authorization': header})
    with urlopen(request, timeout=20) as response:
        print(f'{path}: HTTP {response.status}')
