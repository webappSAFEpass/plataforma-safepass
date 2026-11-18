from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.dependencies import (
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    get_current_user,
    get_email_sender,
)
from app.core.email import EmailSender
from app.core.rate_limit import rate_limit
from app.modules.auth.exceptions import InvalidRefreshTokenError
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import (
    AuthOut,
    ForgotPasswordIn,
    LoginIn,
    MeOut,
    MessageOut,
    RegisterIn,
    ResetPasswordIn,
)
from app.modules.auth.service import AuthResult, AuthService
from app.modules.subscriptions.dependencies import get_subscription_service
from app.modules.subscriptions.schemas import SubscriptionOut
from app.modules.subscriptions.service import SubscriptionService
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserOut
from app.shared.clock import SystemClock
from app.shared.identity import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_PATH = "/api/v1/auth"
SECONDS_PER_DAY = 86_400


def get_auth_service(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    email: EmailSender = Depends(get_email_sender),
    subscriptions: SubscriptionService = Depends(get_subscription_service),
) -> AuthService:
    return AuthService(
        UserRepository(db), AuthRepository(db), subscriptions, email, db, SystemClock(), settings
    )


def _set_auth_cookies(response: Response, result: AuthResult, settings: Settings) -> None:
    # O cookie de acesso dura tanto quanto o refresh: o JWT dentro dele expira em minutos,
    # mas o cookie precisa continuar existindo para o cliente conseguir renovar a sessão.
    refresh_seconds = settings.refresh_token_days * SECONDS_PER_DAY
    response.set_cookie(
        ACCESS_COOKIE,
        result.tokens.access_token,
        max_age=refresh_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        result.tokens.refresh_token,
        max_age=refresh_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)


@router.post(
    "/register",
    response_model=AuthOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma conta e inicia a sessão",
    dependencies=[Depends(rate_limit("register", limit=20, window_seconds=600))],
)
def register(
    body: RegisterIn,
    response: Response,
    service: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
) -> AuthOut:
    result = service.register(
        full_name=body.full_name,
        email=body.email,
        password=body.password,
        account_type=body.account_type,
    )
    _set_auth_cookies(response, result, settings)
    return AuthOut(user=UserOut.model_validate(result.user))


@router.post(
    "/login",
    response_model=AuthOut,
    summary="Autentica e define os cookies de sessão",
    dependencies=[Depends(rate_limit("login", limit=10, window_seconds=60))],
)
def login(
    body: LoginIn,
    response: Response,
    service: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
) -> AuthOut:
    result = service.login(email=body.email, password=body.password)
    _set_auth_cookies(response, result, settings)
    return AuthOut(user=UserOut.model_validate(result.user))


@router.post("/refresh", response_model=AuthOut, summary="Renova a sessão (refresh rotativo)")
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    service: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
) -> AuthOut:
    if not refresh_token:
        raise InvalidRefreshTokenError()
    result = service.refresh(refresh_token)
    _set_auth_cookies(response, result, settings)
    return AuthOut(user=UserOut.model_validate(result.user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Encerra a sessão atual")
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    service: AuthService = Depends(get_auth_service),
) -> None:
    service.logout(refresh_token)
    _clear_auth_cookies(response)


@router.get("/me", response_model=MeOut, summary="Usuário logado e plano vigente")
def me(
    user: CurrentUser = Depends(get_current_user),
    subscriptions: SubscriptionService = Depends(get_subscription_service),
) -> MeOut:
    subscription = subscriptions.get_current(user.id)
    return MeOut(
        user=UserOut.model_validate(user),
        subscription=SubscriptionOut.model_validate(subscription) if subscription else None,
    )


@router.post(
    "/forgot-password",
    response_model=MessageOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Envia o e-mail de recuperação de senha",
    dependencies=[Depends(rate_limit("forgot", limit=5, window_seconds=600))],
)
def forgot_password(
    body: ForgotPasswordIn, service: AuthService = Depends(get_auth_service)
) -> MessageOut:
    service.forgot_password(body.email)
    return MessageOut(message="Se o e-mail estiver cadastrado, enviaremos as instruções.")


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Define uma nova senha a partir do token recebido por e-mail",
    dependencies=[Depends(rate_limit("reset", limit=10, window_seconds=600))],
)
def reset_password(body: ResetPasswordIn, service: AuthService = Depends(get_auth_service)) -> None:
    service.reset_password(token=body.token, new_password=body.new_password)
