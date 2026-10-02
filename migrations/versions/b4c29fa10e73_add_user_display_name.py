"""add user display name

Revision ID: b4c29fa10e73
Revises: d7b98fbbe31e
Create Date: 2026-10-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4c29fa10e73"
down_revision: Union[str, Sequence[str], None] = "d7b98fbbe31e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("display_name", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "display_name")
