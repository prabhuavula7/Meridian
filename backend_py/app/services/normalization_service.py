import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.config import Settings
from app.services.ingestion_service import _MANIFEST_LOCK, _read_manifest, _write_manifest, get_upload

REQUIRED_FIELDS = [
    "shipment_id",
    "order_id",
    "origin_name",
    "destination_name",
    "origin_country",
    "destination_country",
    "planned_departure_ts",
    "planned_arrival_ts",
    "mode",
    "weight_kg",
    "volume_cbm",
    "cost_usd",
    "priority",
]

OPTIONAL_FIELDS = [
    "carrier_name",
    "incoterm",
    "commodity",
    "container_type",
    "hazmat_flag",
    "temperature_control_flag",
]

CANONICAL_FIELD_ALIASES: dict[str, list[str]] = {
    "shipment_id": ["shipment_id", "shipment", "tracking_number", "tracking_id"],
    "order_id": ["order_id", "order", "purchase_order", "po", "reference"],
    "origin_name": ["origin_name", "origin", "origin_location", "from_location", "source"],
    "destination_name": [
        "destination_name",
        "destination",
        "destination_location",
        "to_location",
        "end_location",
    ],
    "origin_country": ["origin_country", "from_country", "source_country"],
    "destination_country": ["destination_country", "to_country", "target_country"],
    "planned_departure_ts": ["planned_departure_ts", "planned_departure", "departure_date", "ship_date"],
    "planned_arrival_ts": ["planned_arrival_ts", "planned_arrival", "arrival_date", "delivery_date"],
    "mode": ["mode", "mode_of_transport", "transport_mode", "shipping_method", "carrier_type"],
    "weight_kg": ["weight_kg", "weight", "mass", "kg"],
    "volume_cbm": ["volume_cbm", "volume", "cbm", "volume_m3", "cubic_meters"],
    "cost_usd": ["cost_usd", "cost", "product_cost", "price", "amount", "value", "unit_cost"],
    "priority": ["priority", "priority_level", "service_level"],
    "carrier_name": ["carrier_name", "carrier", "carrier_id"],
    "incoterm": ["incoterm", "incoterms"],
    "commodity": ["commodity", "product_name", "product", "item", "sku", "material"],
    "container_type": ["container_type", "container", "equipment_type"],
    "hazmat_flag": ["hazmat_flag", "hazmat", "dangerous_goods"],
    "temperature_control_flag": ["temperature_control_flag", "temperature_control", "cold_chain", "reefer"],
}

MODE_ALIASES = {
    "road": "road",
    "truck": "road",
    "rail": "rail",
    "train": "rail",
    "sea": "sea",
    "ocean": "sea",
    "maritime": "sea",
    "air": "air",
    "flight": "air",
    "multimodal": "multimodal",
    "intermodal": "multimodal",
}

PRIORITY_ALIASES = {
    "critical": "critical",
    "urgent": "critical",
    "high": "high",
    "medium": "medium",
    "med": "medium",
    "normal": "medium",
    "low": "low",
    "p1": "critical",
    "p2": "high",
    "p3": "medium",
    "p4": "low",
}

BOOL_ALIASES = {
    "true": True,
    "1": True,
    "yes": True,
    "y": True,
    "false": False,
    "0": False,
    "no": False,
    "n": False,
}

DATETIME_FORMATS = [
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
    "%m/%d/%Y",
    "%m/%d/%Y %H:%M:%S",
]


def _slugify(value: str) -> str:
    normalized = "".join(char.lower() if char.isalnum() else "_" for char in str(value))
    return "_".join(part for part in normalized.split("_") if part)


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _to_text(value: Any) -> str | None:
    if _is_blank(value):
        return None
    return str(value).strip()


def _to_float(value: Any) -> float | None:
    text = _to_text(value)
    if text is None:
        return None

    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _to_datetime(value: Any) -> str | None:
    text = _to_text(value)
    if text is None:
        return None

    normalized = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except ValueError:
        pass

    for date_format in DATETIME_FORMATS:
        try:
            parsed = datetime.strptime(text, date_format).replace(tzinfo=timezone.utc)
            return parsed.isoformat()
        except ValueError:
            continue

    return None


def _to_mode(value: Any) -> str | None:
    text = _to_text(value)
    if text is None:
        return None

    return MODE_ALIASES.get(text.lower())


def _to_priority(value: Any) -> str | None:
    text = _to_text(value)
    if text is None:
        return None

    return PRIORITY_ALIASES.get(text.lower())


def _to_bool(value: Any) -> bool | None:
    text = _to_text(value)
    if text is None:
        return None
    return BOOL_ALIASES.get(text.lower())


def _row_lookup(row: dict[str, Any]) -> dict[str, Any]:
    lookup: dict[str, Any] = {}
    for key, value in row.items():
        if key is None:
            continue
        lookup[_slugify(key)] = value
    return lookup


def _lookup_field(row_lookup: dict[str, Any], canonical_field: str) -> Any:
    aliases = CANONICAL_FIELD_ALIASES.get(canonical_field, [])
    for alias in [canonical_field, *aliases]:
        value = row_lookup.get(_slugify(alias))
        if not _is_blank(value):
            return value
    return None


def _error(*, row_number: int, field: str, code: str, message: str, value: Any = None) -> dict[str, Any]:
    return {
        "row_number": row_number,
        "field": field,
        "code": code,
        "message": message,
        "value": value,
    }


def _warning(*, row_number: int, field: str, code: str, message: str, value: Any = None) -> dict[str, Any]:
    return {
        "row_number": row_number,
        "field": field,
        "code": code,
        "message": message,
        "value": value,
    }


def _normalize_row(row: dict[str, Any], row_number: int) -> tuple[dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]:
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    lookup = _row_lookup(row)
    normalized: dict[str, Any] = {}

    for field in [*REQUIRED_FIELDS, *OPTIONAL_FIELDS]:
        raw_value = _lookup_field(lookup, field)
        if field in {"origin_country", "destination_country"}:
            value = _to_text(raw_value)
            normalized[field] = value.upper() if value else None
        else:
            normalized[field] = _to_text(raw_value)

    if not normalized.get("shipment_id") and normalized.get("order_id"):
        derived_id = f"derived_{_slugify(str(normalized['order_id']))}"
        normalized["shipment_id"] = derived_id
        warnings.append(
            _warning(
                row_number=row_number,
                field="shipment_id",
                code="derived_shipment_id",
                message="shipment_id missing; derived from order_id.",
                value=derived_id,
            )
        )

    for numeric_field in ["weight_kg", "volume_cbm", "cost_usd"]:
        parsed = _to_float(normalized.get(numeric_field))
        if parsed is None and normalized.get(numeric_field) is not None:
            errors.append(
                _error(
                    row_number=row_number,
                    field=numeric_field,
                    code="invalid_number",
                    message=f"{numeric_field} must be numeric.",
                    value=normalized.get(numeric_field),
                )
            )
            continue

        normalized[numeric_field] = parsed
        if parsed is not None and parsed < 0:
            errors.append(
                _error(
                    row_number=row_number,
                    field=numeric_field,
                    code="negative_value",
                    message=f"{numeric_field} must be >= 0.",
                    value=parsed,
                )
            )

    for datetime_field in ["planned_departure_ts", "planned_arrival_ts"]:
        parsed = _to_datetime(normalized.get(datetime_field))
        if parsed is None and normalized.get(datetime_field) is not None:
            errors.append(
                _error(
                    row_number=row_number,
                    field=datetime_field,
                    code="invalid_datetime",
                    message=f"{datetime_field} is not a supported datetime format.",
                    value=normalized.get(datetime_field),
                )
            )
            continue
        normalized[datetime_field] = parsed

    if normalized.get("planned_departure_ts") and normalized.get("planned_arrival_ts"):
        departure = datetime.fromisoformat(normalized["planned_departure_ts"])
        arrival = datetime.fromisoformat(normalized["planned_arrival_ts"])
        if departure > arrival:
            errors.append(
                _error(
                    row_number=row_number,
                    field="planned_arrival_ts",
                    code="invalid_time_order",
                    message="planned_arrival_ts must be >= planned_departure_ts.",
                )
            )

    mode = _to_mode(normalized.get("mode"))
    if mode is None and normalized.get("mode") is not None:
        errors.append(
            _error(
                row_number=row_number,
                field="mode",
                code="invalid_mode",
                message="mode must be one of road, rail, sea, air, multimodal.",
                value=normalized.get("mode"),
            )
        )
    normalized["mode"] = mode

    priority = _to_priority(normalized.get("priority"))
    if priority is None and normalized.get("priority") is not None:
        errors.append(
            _error(
                row_number=row_number,
                field="priority",
                code="invalid_priority",
                message="priority must be one of critical, high, medium, low.",
                value=normalized.get("priority"),
            )
        )
    normalized["priority"] = priority

    for bool_field in ["hazmat_flag", "temperature_control_flag"]:
        parsed = _to_bool(normalized.get(bool_field))
        if parsed is None and normalized.get(bool_field) is not None:
            warnings.append(
                _warning(
                    row_number=row_number,
                    field=bool_field,
                    code="invalid_bool",
                    message=f"{bool_field} should be true/false; value ignored.",
                    value=normalized.get(bool_field),
                )
            )
        normalized[bool_field] = parsed

    for field in REQUIRED_FIELDS:
        if normalized.get(field) is None:
            errors.append(
                _error(
                    row_number=row_number,
                    field=field,
                    code="missing_required",
                    message=f"{field} is required.",
                )
            )

    if errors:
        return None, errors, warnings

    return normalized, [], warnings


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _update_manifest_with_normalization(
    settings: Settings,
    upload_id: str,
    summary: dict[str, Any],
) -> None:
    manifest_path = Path(settings.upload_manifest_path)

    with _MANIFEST_LOCK:
        manifest = _read_manifest(manifest_path)
        uploads = manifest.get("uploads", [])
        target = next((entry for entry in uploads if entry.get("upload_id") == upload_id), None)
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload '{upload_id}' was not found.",
            )

        target["normalization"] = summary
        manifest["uploads"] = uploads
        _write_manifest(manifest_path, manifest)


def normalize_upload(settings: Settings, upload_id: str, max_errors: int = 100) -> dict[str, Any]:
    upload = get_upload(settings, upload_id)
    stored_path = Path(str(upload.get("stored_path")))
    extension = Path(str(upload.get("stored_filename") or "")).suffix.lower()

    if extension != ".csv":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Normalization currently supports CSV uploads only.",
        )

    if not stored_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stored upload file was not found at '{stored_path}'.",
        )

    valid_rows: list[dict[str, Any]] = []
    invalid_rows: list[dict[str, Any]] = []
    all_errors: list[dict[str, Any]] = []
    all_warnings: list[dict[str, Any]] = []
    effective_error_limit = max(1, min(max_errors, settings.normalization_max_errors))
    error_limit_reached = False

    with stored_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if not reader.fieldnames:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV header row is missing.",
            )

        for row_number, row in enumerate(reader, start=2):
            normalized, row_errors, row_warnings = _normalize_row(row, row_number)
            if normalized is not None:
                valid_rows.append(normalized)

            if row_errors:
                invalid_rows.append(
                    {
                        "row_number": row_number,
                        "raw": row,
                        "errors": row_errors,
                    }
                )

            for error_item in row_errors:
                if len(all_errors) < effective_error_limit:
                    all_errors.append(error_item)
                else:
                    error_limit_reached = True

            if len(all_warnings) < effective_error_limit:
                all_warnings.extend(row_warnings[: max(0, effective_error_limit - len(all_warnings))])

    rows_total = len(valid_rows) + len(invalid_rows)
    if rows_total == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data rows were found in the uploaded CSV.",
        )

    processed_at = datetime.now(timezone.utc).isoformat()
    silver_path = Path(settings.silver_storage_dir) / f"{upload_id}.json"
    quarantine_path = Path(settings.quarantine_storage_dir) / f"{upload_id}.json"
    report_path = Path(settings.normalization_report_dir) / f"{upload_id}.json"

    _write_json(
        silver_path,
        {
            "upload_id": upload_id,
            "processed_at": processed_at,
            "rows": valid_rows,
        },
    )
    _write_json(
        quarantine_path,
        {
            "upload_id": upload_id,
            "processed_at": processed_at,
            "rows": invalid_rows,
        },
    )

    report = {
        "upload_id": upload_id,
        "processed_at": processed_at,
        "source": {
            "original_filename": upload.get("original_filename"),
            "stored_filename": upload.get("stored_filename"),
            "stored_path": upload.get("stored_path"),
            "file_hash": upload.get("file_hash"),
        },
        "totals": {
            "rows_total": rows_total,
            "rows_valid": len(valid_rows),
            "rows_invalid": len(invalid_rows),
            "error_count": len(all_errors),
            "warning_count": len(all_warnings),
            "error_limit_reached": error_limit_reached,
        },
        "sample_normalized_rows": valid_rows[:5],
        "errors": all_errors,
        "warnings": all_warnings,
        "artifacts": {
            "silver_path": str(silver_path),
            "quarantine_path": str(quarantine_path),
        },
    }
    _write_json(report_path, report)

    _update_manifest_with_normalization(
        settings=settings,
        upload_id=upload_id,
        summary={
            "status": "completed",
            "processed_at": processed_at,
            "rows_total": rows_total,
            "rows_valid": len(valid_rows),
            "rows_invalid": len(invalid_rows),
            "report_path": str(report_path),
            "silver_path": str(silver_path),
            "quarantine_path": str(quarantine_path),
        },
    )
    return report


def get_normalization_report(settings: Settings, upload_id: str) -> dict[str, Any]:
    upload = get_upload(settings, upload_id)
    normalization = upload.get("normalization")
    if not isinstance(normalization, dict):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No normalization report found for upload '{upload_id}'.",
        )

    report_path = Path(str(normalization.get("report_path") or ""))
    if not report_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Normalization report artifact is missing from disk.",
        )

    try:
        return json.loads(report_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Normalization report is invalid JSON: {exc}",
        ) from exc
