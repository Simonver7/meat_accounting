"""Auth: логин, me, чужие/битые токены."""

from httpx import AsyncClient


async def test_login_ok(client: AsyncClient, auth_headers: dict):
    assert auth_headers["Authorization"].startswith("Bearer ")


async def test_login_bad_password(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "wrong"}
    )
    assert r.status_code == 401


async def test_me_ok(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["username"] == "admin"
    assert r.json()["display_name"] == "admin"


async def test_me_no_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


async def test_update_profile(client: AsyncClient, auth_headers: dict):
    r = await client.patch(
        "/api/v1/auth/profile",
        headers=auth_headers,
        json={
            "display_name": "Иван",
            "username": "ivan",
            "current_password": "meat123",
            "new_password": "new-meat123",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["display_name"] == "Иван"
    assert r.json()["username"] == "ivan"

    login = await client.post(
        "/api/v1/auth/login",
        json={"username": "ivan", "password": "new-meat123"},
    )
    assert login.status_code == 200


async def test_update_profile_requires_current_password(
    client: AsyncClient, auth_headers: dict
):
    r = await client.patch(
        "/api/v1/auth/profile",
        headers=auth_headers,
        json={"display_name": "Иван", "current_password": "wrong"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Текущий пароль указан неверно"
