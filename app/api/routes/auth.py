from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import create_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginIn, MeOut, ProfileUpdateIn, TokenOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    """Вход по логину и паролю."""
    user = (
        await db.execute(select(User).where(User.username == data.username))
    ).scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь отключён")
    return TokenOut(access_token=create_token(user.id))


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(get_current_user)) -> MeOut:
    """Текущий пользователь."""
    return MeOut(
        id=user.id,
        username=user.username,
        display_name=user.display_name or user.username,
    )


@router.patch("/profile", response_model=MeOut)
async def update_profile(
    data: ProfileUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MeOut:
    """Обновить имя, логин и/или пароль текущего пользователя."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Текущий пароль указан неверно")

    username = data.username.strip() if data.username is not None else None
    display_name = (
        data.display_name.strip() if data.display_name is not None else None
    )
    if username == "":
        raise HTTPException(status_code=422, detail="Логин не может быть пустым")
    if display_name == "":
        raise HTTPException(status_code=422, detail="Имя не может быть пустым")

    if username is not None and username != user.username:
        username_exists = await db.scalar(
            select(User.id).where(User.username == username, User.id != user.id)
        )
        if username_exists is not None:
            raise HTTPException(status_code=409, detail="Этот логин уже занят")

    if username is not None:
        user.username = username

    if display_name is not None:
        user.display_name = display_name

    if data.new_password is not None:
        user.password_hash = hash_password(data.new_password)

    if username is None and display_name is None and data.new_password is None:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")

    await db.commit()
    await db.refresh(user)
    return MeOut(
        id=user.id,
        username=user.username,
        display_name=user.display_name or user.username,
    )
