"""
Tests for open_notebook.utils.encryption key validation and lifecycle.
"""

import os

import pytest
from cryptography.fernet import Fernet

import open_notebook.utils.encryption as enc


@pytest.fixture(autouse=True)
def reset_encryption_key():
    # Save original env and encryption key state
    orig_env = dict(os.environ)
    orig_key = enc._ENCRYPTION_KEY
    enc._ENCRYPTION_KEY = None
    
    # Ensure standard key variables are cleared out of env by default for clean tests
    os.environ.pop("OPEN_NOTEBOOK_ENCRYPTION_KEY", None)
    os.environ.pop("OPEN_NOTEBOOK_ENCRYPTION_KEY_FILE", None)
    os.environ.pop("ENV", None)
    os.environ.pop("NODE_ENV", None)
    
    yield
    
    # Restore original env and encryption key state
    os.environ.clear()
    os.environ.update(orig_env)
    enc._ENCRYPTION_KEY = orig_key


class TestEncryptionKeyValidation:
    """Tests the validation checks on the encryption key in development and production modes."""

    def test_missing_key_raises_value_error_in_development(self):
        """In development mode, a missing key raises a ValueError."""
        with pytest.raises(ValueError) as excinfo:
            enc._get_or_create_encryption_key()
        assert "OPEN_NOTEBOOK_ENCRYPTION_KEY is not set" in str(excinfo.value)

    def test_missing_key_raises_runtime_error_in_production_env(self):
        """In production (ENV=production), a missing key raises a RuntimeError."""
        os.environ["ENV"] = "production"
        with pytest.raises(RuntimeError) as excinfo:
            enc._get_or_create_encryption_key()
        assert "CRITICAL SECURITY RISK: OPEN_NOTEBOOK_ENCRYPTION_KEY is not set in production" in str(excinfo.value)

    def test_missing_key_raises_runtime_error_in_production_node_env(self):
        """In production (NODE_ENV=production), a missing key raises a RuntimeError."""
        os.environ["NODE_ENV"] = "production"
        with pytest.raises(RuntimeError) as excinfo:
            enc._get_or_create_encryption_key()
        assert "CRITICAL SECURITY RISK: OPEN_NOTEBOOK_ENCRYPTION_KEY is not set in production" in str(excinfo.value)

    def test_insecure_key_raises_runtime_error_in_production(self):
        """In production, default/insecure keys raise a RuntimeError."""
        os.environ["ENV"] = "production"
        insecure_keys = [
            "change-me-to-a-secret-string", "my-secret", "default", "default-key",
            "dev-key", "production-key", "secret", "password", "key", "123456",
            "change-me", "changeme"
        ]
        for key in insecure_keys:
            os.environ["OPEN_NOTEBOOK_ENCRYPTION_KEY"] = key
            with pytest.raises(RuntimeError) as excinfo:
                enc._get_or_create_encryption_key()
            assert "CRITICAL SECURITY RISK: The configured OPEN_NOTEBOOK_ENCRYPTION_KEY is insecure" in str(excinfo.value)

    def test_short_key_raises_runtime_error_in_production(self):
        """In production, keys under 16 characters raise a RuntimeError."""
        os.environ["ENV"] = "production"
        os.environ["OPEN_NOTEBOOK_ENCRYPTION_KEY"] = "short-key-12345"
        with pytest.raises(RuntimeError) as excinfo:
            enc._get_or_create_encryption_key()
        assert "at least 16 characters long" in str(excinfo.value)

    def test_secure_key_succeeds_in_production(self):
        """In production, a sufficiently long, non-default key succeeds."""
        os.environ["ENV"] = "production"
        secure_key = "a-very-secure-and-long-encryption-key-for-prod"
        os.environ["OPEN_NOTEBOOK_ENCRYPTION_KEY"] = secure_key
        assert enc._get_or_create_encryption_key() == secure_key

    def test_key_succeeds_in_development(self):
        """In development mode, simple keys are allowed."""
        os.environ["OPEN_NOTEBOOK_ENCRYPTION_KEY"] = "dev-key"
        assert enc._get_or_create_encryption_key() == "dev-key"


class TestEncryptionOperations:
    """Tests actual encryption and decryption logic using derived keys."""

    def test_encryption_decryption_roundtrip(self):
        """Verify that a value encrypted can be decrypted back successfully."""
        os.environ["OPEN_NOTEBOOK_ENCRYPTION_KEY"] = "some-development-encryption-key"
        plain_text = "secret-database-api-key-123"
        
        # Encrypt
        encrypted = enc.encrypt_value(plain_text)
        assert encrypted != plain_text
        
        # Decrypt
        decrypted = enc.decrypt_value(encrypted)
        assert decrypted == plain_text

    def test_decryption_fallback_for_plaintext(self):
        """Verify that decryption falls back to plaintext if the string is not a valid token."""
        os.environ["OPEN_NOTEBOOK_ENCRYPTION_KEY"] = "some-development-encryption-key"
        plain_text = "plain-text-legacy-key"
        assert enc.decrypt_value(plain_text) == plain_text
