from io import BytesIO

from httpx import AsyncClient
from openpyxl import load_workbook

OP = {"meat_type": "FILLET", "operation_date": "2026-09-04"}


async def test_excel_shows_user_names(client: AsyncClient, auth_headers: dict):
    profile = await client.patch(
        "/api/v1/auth/profile",
        headers=auth_headers,
        json={"display_name": "Иван", "current_password": "meat123"},
    )
    assert profile.status_code == 200, profile.text

    created = await client.post(
        "/api/v1/operations",
        headers=auth_headers,
        json={"type": "INCOMING", **OP, "quantity": "20"},
    )
    assert created.status_code == 201, created.text
    operation_id = created.json()["id"]

    changed = await client.patch(
        f"/api/v1/operations/{operation_id}",
        headers=auth_headers,
        json={"comment": "Проверка автора"},
    )
    assert changed.status_code == 200, changed.text

    response = await client.get(
        "/api/v1/exports/excel?period=custom&date_from=2026-09-04&date_to=2026-09-04",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text

    workbook = load_workbook(BytesIO(response.content), read_only=True)
    operations = workbook["Операции"]
    changes = workbook["История изменений"]
    assert operations["H2"].value == "Иван"
    assert changes["C2"].value == "Иван"
