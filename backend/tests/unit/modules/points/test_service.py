from unittest.mock import Mock
from uuid import uuid4

import pytest

from app.core.exceptions import DomainError
from app.integrations.identity import Principal
from app.modules.points.exceptions import InsufficientBalanceError
from app.modules.points.models import ManagerAccount
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService


def test_apply_debit_with_insufficient_balance_raises_and_does_not_mutate():
    account = ManagerAccount(id=uuid4(), manager_user_id=uuid4(), balance=50)
    repo = Mock(spec=PointsRepository)
    repo.get_for_update.return_value = account
    service = PointsService(repo)

    with pytest.raises(InsufficientBalanceError):
        service.apply(account.id, "debit", 100, "Resgate")

    assert account.balance == 50
    repo.add.assert_not_called()


def test_apply_debit_within_balance_reduces_it():
    account = ManagerAccount(id=uuid4(), manager_user_id=uuid4(), balance=100)
    repo = Mock(spec=PointsRepository)
    repo.get_for_update.return_value = account
    service = PointsService(repo)

    service.apply(account.id, "debit", 30, "Resgate")

    assert account.balance == 70


def test_apply_credit_increases_balance():
    account = ManagerAccount(id=uuid4(), manager_user_id=uuid4(), balance=10)
    repo = Mock(spec=PointsRepository)
    repo.get_for_update.return_value = account
    service = PointsService(repo)

    service.apply(account.id, "credit", 15, "Avaliação válida")

    assert account.balance == 25


def test_apply_rejects_non_positive_amount():
    repo = Mock(spec=PointsRepository)
    service = PointsService(repo)

    with pytest.raises(DomainError):
        service.apply(uuid4(), "credit", 0, "x")
    repo.get_for_update.assert_not_called()


def test_balance_is_forbidden_for_dependent_role():
    repo = Mock(spec=PointsRepository)
    service = PointsService(repo)

    with pytest.raises(DomainError) as error:
        service.balance(Principal(uuid4(), frozenset({"dependent"})))
    assert error.value.status_code == 403
