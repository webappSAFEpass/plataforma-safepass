from fastapi import APIRouter, Depends, status

from app.core.dependencies import require_role
from app.modules.subscriptions.dependencies import get_subscription_service
from app.modules.subscriptions.schemas import SubscribeIn, SubscriptionOut
from app.modules.subscriptions.service import SubscriptionService
from app.shared.identity import CurrentUser
from app.shared.roles import Role

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.post(
    "",
    response_model=SubscriptionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Contrata ou troca de plano (gateway simulado)",
)
def subscribe(
    body: SubscribeIn,
    user: CurrentUser = Depends(require_role(Role.USER)),
    service: SubscriptionService = Depends(get_subscription_service),
) -> SubscriptionOut:
    subscription = service.subscribe(
        user.id, plan_code=body.plan_code, accept_terms=body.accept_terms
    )
    return SubscriptionOut.model_validate(subscription)
