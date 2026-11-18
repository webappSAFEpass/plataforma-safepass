from unittest.mock import Mock
from uuid import uuid4

import pytest

from app.core.exceptions import DomainError
from app.integrations.identity import Principal
from app.modules.dependents.exceptions import DependentNotFound
from app.modules.dependents.models import Dependent
from app.modules.dependents.repository import DependentRepository
from app.modules.dependents.service import DependentService
from app.modules.points.models import ManagerAccount
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from tests.support import stamp_record


def _service(account: ManagerAccount) -> tuple[DependentService, Mock]:
    dep_repo = Mock(spec=DependentRepository)
    dep_repo.session = Mock()
    dep_repo.add.side_effect = stamp_record
    points_repo = Mock(spec=PointsRepository)
    points_repo.get_by_manager.return_value = account
    service = DependentService(dep_repo, PointsService(points_repo))
    return service, dep_repo


def test_create_dependent_defaults_can_redeem_coupons_to_false():
    manager_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=0)
    service, dep_repo = _service(account)
    actor = Principal(manager_id, frozenset({"user"}))

    from app.modules.dependents.schemas import DependentIn

    service.create(DependentIn(type="person", name="Lucas"), actor)

    created = dep_repo.add.call_args[0][0]
    assert created.can_redeem_coupons is False
    assert created.account_id == account.id


def test_access_dependent_from_another_account_raises_not_found():
    manager_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=0)
    service, dep_repo = _service(account)
    other_account_dependent = Dependent(
        id=uuid4(), account_id=uuid4(), type="person", name="Outro", active=True
    )
    dep_repo.get.return_value = other_account_dependent
    actor = Principal(manager_id, frozenset({"user"}))

    with pytest.raises(DependentNotFound):
        service.access(other_account_dependent.id, actor)


def test_dependent_role_is_forbidden_from_managing_dependents():
    account = ManagerAccount(id=uuid4(), manager_user_id=uuid4(), balance=0)
    service, _ = _service(account)
    actor = Principal(uuid4(), frozenset({"dependent"}))

    with pytest.raises(DomainError) as error:
        service.list(actor, page=1, size=10)
    assert error.value.status_code == 403


def test_context_for_dependent_actor_without_link_is_forbidden():
    dep_repo = Mock(spec=DependentRepository)
    dep_repo.by_linked_user.return_value = None
    points_repo = Mock(spec=PointsRepository)
    service = DependentService(dep_repo, PointsService(points_repo))

    with pytest.raises(DomainError) as error:
        service.context_for_dependent_actor(Principal(uuid4(), frozenset({"dependent"})))
    assert error.value.status_code == 403
