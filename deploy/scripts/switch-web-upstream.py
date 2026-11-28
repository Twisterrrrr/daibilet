#!/usr/bin/env python3
"""Switch only the production web upstream, validate, then gracefully reload nginx."""
import argparse
import os
from pathlib import Path
import re
import subprocess
import tempfile


def rewrite_upstream(text, expected_port, target_port):
    blocks = list(re.finditer(r'upstream\s+daibilet_web\s*\{[^}]*\}', text))
    if len(blocks) != 1:
        raise ValueError('Expected exactly one daibilet_web upstream')
    block = blocks[0]
    servers = list(re.finditer(r'server\s+127\.0\.0\.1:(\d+)\s*;', block.group()))
    if len(servers) != 1:
        raise ValueError('Expected one loopback server in daibilet_web')
    server = servers[0]
    current = int(server.group(1))
    if current == target_port:
        return text
    if current != expected_port:
        raise ValueError(f'Unexpected web upstream port {current}')
    start = block.start() + server.start(1)
    end = block.start() + server.end(1)
    return text[:start] + str(target_port) + text[end:]


def atomic_write(path, text, metadata):
    fd, name = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(name, metadata.st_mode)
        os.chown(name, metadata.st_uid, metadata.st_gid)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='/etc/nginx/sites-enabled/daibilet.conf')
    parser.add_argument('--expected-port', type=int, required=True)
    parser.add_argument('--target-port', type=int, required=True)
    args = parser.parse_args()
    path = Path(args.config).resolve(strict=True)
    original = path.read_text(encoding='utf-8')
    updated = rewrite_upstream(original, args.expected_port, args.target_port)
    if updated == original:
        return
    metadata = path.stat()
    atomic_write(path, updated, metadata)
    try:
        subprocess.run(['/usr/sbin/nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except Exception:
        atomic_write(path, original, metadata)
        subprocess.run(['/usr/sbin/nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        raise
    print(f'Production web upstream switched to {args.target_port}')


if __name__ == '__main__':
    main()
