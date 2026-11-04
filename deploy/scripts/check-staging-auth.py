#!/usr/bin/env python3
"""Check staging Basic Auth without putting its password in shell arguments."""

import base64
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener


values = dict(line.split('=', 1) for line in Path('/opt/daibilet-staging/.staging-access').read_text().splitlines())
credentials = f"{values['username']}:{values['password']}".encode()
header = 'Basic ' + base64.b64encode(credentials).decode()
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        return None

opener = build_opener(NoRedirect)
for path in ('/', '/places', '/admin', '/admin/events'):
    request = Request('https://staging.daibilet.ru' + path, headers={'Authorization': header})
    try:
        response = opener.open(request, timeout=20)
    except HTTPError as error:
        response = error
    print(f'{path}: HTTP {response.code} {response.headers.get("Location", "")}')
    expected = {'/': 200, '/places': 200, '/admin': 301, '/admin/events': 200}[path]
    if response.code != expected:
        raise SystemExit(f'{path}: expected HTTP {expected}, got {response.code}')
