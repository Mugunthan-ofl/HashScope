"""Custom Exceptions for Cracking Engines.

Defines distinct exception types for CLI binary missing, execution timeout,
process failure, and output parsing errors.
"""


class CrackingEngineError(Exception):
    """Base exception class for cracking engine failures."""

    def __init__(self, message: str, engine_name: str = "CrackEngine"):
        super().__init__(message)
        self.message = message
        self.engine_name = engine_name


class EngineNotFoundError(CrackingEngineError):
    """Raised when the specified cracking CLI binary is missing or not installed."""

    pass


class EngineTimeoutError(CrackingEngineError):
    """Raised when the cracking CLI subprocess execution times out."""

    pass


class EngineExecutionError(CrackingEngineError):
    """Raised when cracking CLI subprocess fails with a non-zero exit code or error."""

    pass


class ResultParseError(CrackingEngineError):
    """Raised when output parsing from cracking CLI subprocess fails or encounters malformed data."""

    pass
