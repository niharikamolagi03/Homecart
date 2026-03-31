#!/usr/bin/env python
import os
import sys

# Mock pkg_resources BEFORE anything else imports it
try:
    import pkg_resources
except ImportError:
    class MockPkgResources:
        DistributionNotFound = Exception
        def get_distribution(self, name):
            raise Exception(f"Distribution {name} not found")
    sys.modules['pkg_resources'] = MockPkgResources()

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()