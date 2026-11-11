"""Caso de uso de leitura do painel administrativo."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.stats.admin_repository import AdminDashboardRepository, AdminDashboardSnapshot


class AdminDashboardService:
    def __init__(self, repo: "AdminDashboardRepository") -> None:
        self._repo = repo

    def snapshot(self) -> "AdminDashboardSnapshot":
        return self._repo.snapshot()
