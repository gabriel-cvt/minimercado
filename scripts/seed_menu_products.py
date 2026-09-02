#!/usr/bin/env python3
"""
Seed products from the CARDAPIO E VALORES PDF through the backend API.

Usage:
  python3 scripts/seed_menu_products.py
  python3 scripts/seed_menu_products.py --base-url http://localhost:8080
  python3 scripts/seed_menu_products.py --dry-run
  python3 scripts/seed_menu_products.py --create-only

Edit MENU_PRODUCTS below when prices, icons, availability, or variants change.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "http://localhost:8080"
@dataclass(frozen=True)
class ProductSeed:
    name: str
    price: float
    icon: str
    available: bool = True
    has_variants: bool = False
    variant_type: str | None = None
    variant_selection_required: bool = False
    variants: list[dict[str, Any]] = field(default_factory=list)

    def create_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "name": self.name,
            "price": self.price,
            "icon": self.icon,
            "available": self.available,
            "hasVariants": self.has_variants,
            "variantType": self.variant_type,
            "variantSelectionRequired": self.variant_selection_required,
            "variants": self.variants,
        }
        return without_none(payload)

    def update_payload(self, current_product: dict[str, Any]) -> dict[str, Any]:
        variants = self.variants
        if self.has_variants:
            variants = preserve_variant_ids(current_product.get("variants", []), self.variants)

        payload: dict[str, Any] = {
            "name": self.name,
            "price": self.price,
            "icon": self.icon,
            "available": self.available,
            "hasVariants": self.has_variants,
            "variantType": self.variant_type,
            "variantSelectionRequired": self.variant_selection_required,
            "variants": variants,
        }
        return without_none(payload)


MENU_PRODUCTS: list[ProductSeed] = [
    ProductSeed("Hamburguer", 15.00, "SANDWICH"),
    ProductSeed("Combo Hamburguer", 20.00, "COMBO"),
    ProductSeed("Batata", 5.00, "SNACK"),
    ProductSeed("Espetinho", 15.00, "MEAL"),
    ProductSeed("Jantinha", 15.00, "MEAL"),
    ProductSeed("Cuscuz recheado", 10.00, "SNACK"),
    ProductSeed("Tapioca", 10.00, "SNACK"),
    ProductSeed("Salgado", 6.00, "SNACK"),
    ProductSeed("Docinho", 3.00, "DESSERT"),
    ProductSeed("Sobremesas", 8.00, "DESSERT"),
    ProductSeed("Fatia de torta", 8.00, "DESSERT"),
    ProductSeed("Misto quente", 4.00, "SANDWICH"),
    ProductSeed("Pão de São José da Mata", 2.00, "BAKERY"),
    ProductSeed("Fatia de bolo vulcão", 5.00, "BAKERY"),
    ProductSeed("Açaí", 10.00, "FROZEN_DESSERT"),
    ProductSeed("Dindin", 6.00, "FROZEN_DESSERT"),
    ProductSeed("Tortinha de frango", 12.00, "SNACK"),
    ProductSeed("Água", 2.00, "DRINK"),
    ProductSeed("Energético", 14.00, "DRINK"),
    ProductSeed("Lata de refrigerante", 6.00, "DRINK"),
    ProductSeed("H2O", 7.00, "DRINK"),
    ProductSeed("Garrafa de suco", 5.00, "DRINK"),
    ProductSeed("Água com gás", 4.00, "DRINK"),
    ProductSeed("Copo de café", 1.00, "HOT_DRINK"),
    ProductSeed("Copo de suco", 2.00, "DRINK"),
    ProductSeed("Chocolate quente", 5.00, "HOT_DRINK"),
]


def without_none(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if value is not None}


def normalize_name(value: str) -> str:
    return value.strip().casefold()


def preserve_variant_ids(
    current_variants: list[dict[str, Any]],
    seed_variants: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    current_by_name = {
        normalize_name(variant["name"]): variant
        for variant in current_variants
        if variant.get("name") and variant.get("id") is not None
    }

    preserved: list[dict[str, Any]] = []
    for seed_variant in seed_variants:
        next_variant = dict(seed_variant)
        current_variant = current_by_name.get(normalize_name(seed_variant["name"]))
        if current_variant is not None:
            next_variant["id"] = current_variant["id"]
        preserved.append(next_variant)
    return preserved


class ProductApi:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def list_products_by_name(self, name: str) -> list[dict[str, Any]]:
        query = urlencode({"name": name, "page": 0, "size": 100, "sort": "name,asc"})
        response = self._request("GET", f"/api/products?{query}")
        return response.get("content", [])

    def find_product_by_exact_name(self, name: str) -> dict[str, Any] | None:
        normalized = normalize_name(name)
        for product in self.list_products_by_name(name):
            if normalize_name(product.get("name", "")) == normalized:
                return product
        return None

    def create_product(self, product: ProductSeed) -> dict[str, Any]:
        return self._request("POST", "/api/products", product.create_payload())

    def update_product(self, product_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("PUT", f"/api/products/{product_id}", payload)

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        body = None
        headers = {"Accept": "application/json"}

        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json; charset=utf-8"

        request = Request(
            f"{self.base_url}{path}",
            data=body,
            headers=headers,
            method=method,
        )

        try:
            with urlopen(request, timeout=15) as response:
                raw_body = response.read().decode("utf-8")
        except HTTPError as error:
            error_body = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"{method} {path} returned HTTP {error.code}: {error_body}"
            ) from error
        except URLError as error:
            raise RuntimeError(
                f"Could not reach API at {self.base_url}: {error.reason}"
            ) from error

        if not raw_body:
            return {}

        return json.loads(raw_body)


def seed_products(
    api: ProductApi,
    products: list[ProductSeed],
    *,
    dry_run: bool,
    create_only: bool,
) -> None:
    created = 0
    updated = 0
    skipped = 0

    for product in products:
        current = api.find_product_by_exact_name(product.name)

        if current is None:
            print(f"[create] {product.name} - R$ {product.price:.2f}")
            if not dry_run:
                api.create_product(product)
            created += 1
            continue

        if create_only:
            print(f"[skip]   {product.name} already exists")
            skipped += 1
            continue

        payload = product.update_payload(current)
        print(f"[update] {product.name} - R$ {product.price:.2f}")
        if not dry_run:
            api.update_product(int(current["id"]), payload)
        updated += 1

    print()
    print(f"Done. created={created} updated={updated} skipped={skipped} dry_run={dry_run}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed menu products through the minimercado backend API."
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Backend base URL. Default: {DEFAULT_BASE_URL}",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created or updated without sending mutations.",
    )
    parser.add_argument(
        "--create-only",
        action="store_true",
        help="Create missing products, but do not update existing products.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api = ProductApi(args.base_url)

    try:
        seed_products(
            api,
            MENU_PRODUCTS,
            dry_run=args.dry_run,
            create_only=args.create_only,
        )
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
