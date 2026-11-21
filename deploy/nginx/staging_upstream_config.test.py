import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    'staging_upstream_config', Path(__file__).with_name('staging_upstream_config.py')
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class StagingUpstreamConfigTest(unittest.TestCase):
    def test_updates_only_staging_upstream(self):
        config = (
            'upstream daibilet_web { server 127.0.0.1:3001; keepalive 16; }\n'
            'upstream daibilet_web_staging { server 127.0.0.1:3013; keepalive 8; }\n'
        )
        updated = module.point_staging_web_upstream_to_next(config)
        self.assertIn('upstream daibilet_web { server 127.0.0.1:3001;', updated)
        self.assertIn('upstream daibilet_web_staging { server 127.0.0.1:3000; keepalive 8; }', updated)

    def test_is_idempotent(self):
        config = 'upstream daibilet_web_staging { server 127.0.0.1:3000; keepalive 8; }'
        self.assertEqual(module.point_staging_web_upstream_to_next(config), config)

    def test_requires_one_staging_upstream(self):
        with self.assertRaises(ValueError):
            module.point_staging_web_upstream_to_next('upstream daibilet_web { server 127.0.0.1:3001; }')
        with self.assertRaises(ValueError):
            module.point_staging_web_upstream_to_next(
                'upstream daibilet_web_staging { server 127.0.0.1:3013; }\n'
                'upstream daibilet_web_staging { server 127.0.0.1:3014; }'
            )


if __name__ == '__main__':
    unittest.main()
