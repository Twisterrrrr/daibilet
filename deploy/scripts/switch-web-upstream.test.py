import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('switcher', Path(__file__).with_name('switch-web-upstream.py'))
switcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(switcher)


class UpstreamSwitchTest(unittest.TestCase):
    config = '''upstream daibilet_web { server 127.0.0.1:3001; keepalive 16; }
upstream daibilet_web_staging { server 127.0.0.1:3000; }
location /api { proxy_pass http://daibilet_api; }
'''

    def test_changes_only_production_web(self):
        updated = switcher.rewrite_upstream(self.config, 3001, 3002)
        self.assertEqual(updated, self.config.replace(':3001;', ':3002;'))
        self.assertEqual(switcher.rewrite_upstream(updated, 3002, 3001), self.config)

    def test_is_idempotent(self):
        self.assertEqual(switcher.rewrite_upstream(self.config, 3002, 3001), self.config)

    def test_refuses_unknown_port_or_structure(self):
        with self.assertRaises(ValueError):
            switcher.rewrite_upstream(self.config, 3000, 3002)
        with self.assertRaises(ValueError):
            switcher.rewrite_upstream(self.config.replace('daibilet_web {', 'other {'), 3001, 3002)
        with self.assertRaises(ValueError):
            switcher.rewrite_upstream(self.config.replace('keepalive 16;', 'server 127.0.0.1:3999;'), 3001, 3002)


if __name__ == '__main__':
    unittest.main()
