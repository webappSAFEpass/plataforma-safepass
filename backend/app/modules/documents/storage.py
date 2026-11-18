from pathlib import Path
from typing import Protocol
from uuid import uuid4


class FileStorage(Protocol):
    def save(self, content: bytes) -> str: ...
    def read(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...


class LocalFileStorage:
    """Arquivos em disco com nome aleatório; o banco guarda só a chave.

    ponytail: disco local do container; troca por bucket (S3/GCS) quando houver mais de
    uma instância da API.
    """

    def __init__(self, base_dir: str) -> None:
        self.base = Path(base_dir)

    def save(self, content: bytes) -> str:
        self.base.mkdir(parents=True, exist_ok=True)
        key = uuid4().hex
        (self.base / key).write_bytes(content)
        return key

    def read(self, key: str) -> bytes:
        return (self.base / key).read_bytes()

    def delete(self, key: str) -> None:
        (self.base / key).unlink(missing_ok=True)
