import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("patch_prod_new_year_preview.py")
SPEC = importlib.util.spec_from_file_location("patch_prod_new_year_preview", SCRIPT)
PATCHER = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(PATCHER)


class NewYearApiPatchTests(unittest.TestCase):
    def setUp(self):
        self.config = """server {
    listen 443 ssl;
    server_name daibilet.ru *.daibilet.ru;
    location = /api/day-route/ {
        proxy_pass http://daibilet_web;
    }
    location /api/ {
        proxy_pass http://daibilet_api;
    }
}
"""

    def test_routes_only_new_year_filter_endpoint_to_next(self):
        patched = PATCHER.patch_config(self.config)
        self.assertIn("location = /api/new-year-ux-preview", patched)
        self.assertIn("proxy_pass http://daibilet_web;", patched)
        self.assertLess(patched.index("location = /api/new-year-ux-preview"), patched.index("location /api/ {"))
        self.assertIn("location /api/ {\n        proxy_pass http://daibilet_api;", patched)

    def test_patch_is_idempotent(self):
        once = PATCHER.patch_config(self.config)
        self.assertEqual(PATCHER.patch_config(once), once)

    def test_missing_public_block_fails_closed(self):
        with self.assertRaises(ValueError):
            PATCHER.patch_config("server { location /api/ { } }\n")


if __name__ == "__main__":
    unittest.main()
