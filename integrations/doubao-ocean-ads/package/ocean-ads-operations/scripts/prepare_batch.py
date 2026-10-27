"""Prepare validated MCP arguments offline. No network, credentials, or API execution."""
import copy
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

REPORTS = {"engine": {"engine_report"}, "qianchuan": {"standard", "universal", "live_today"}, "local": {"local_diagnosis"}}
METRICS = {"spend", "impressions", "clicks", "conversions", "revenue"}
SCOPE = {"businessType", "advertiserId", "reportType", "grain", "window", "currency", "targetEvent", "attribution", "sourceEvidence", "toolName", "skillId", "skillVersion", "providerUpdatedAt"}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def fields(value, allowed, label):
    if not isinstance(value, dict) or set(value) - allowed:
        raise ValueError(label + ": unsupported fields or object expected")


def text(value, maximum=160):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError("Missing/invalid text")
    return value


def date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("ISO date required")
    return dt.date.fromisoformat(value)


def decimals(values, allowed=None, maximum=100):
    if not isinstance(values, dict) or len(values) > maximum or (allowed is not None and set(values) - allowed):
        raise ValueError("Invalid metric dictionary")
    for key, value in values.items():
        text(key, 80)
        if not isinstance(value, str) or not re.fullmatch(r"\d{1,18}(?:\.\d{1,6})?", value):
            raise ValueError("Metrics must be nonnegative decimal strings; amount unit is yuan")
        if key in {"impressions", "clicks", "conversions"} and not re.fullmatch(r"\d+", value):
            raise ValueError("Counts must be integer strings")


def prepare(document, today=None):
    fields(document, {"brandId", "scope", "records"}, "input")
    brand = text(document.get("brandId"))
    scope = copy.deepcopy(document.get("scope"))
    fields(scope, SCOPE, "scope")
    for key, maximum in {"advertiserId": 160, "targetEvent": 160, "attribution": 500, "sourceEvidence": 4000, "toolName": 160, "skillId": 160, "skillVersion": 160}.items():
        text(scope.get(key), maximum)
    business = scope.get("businessType")
    if business not in REPORTS or scope.get("reportType") not in REPORTS[business]:
        raise ValueError("Business and report family mismatch")
    if scope.get("grain") not in {"account", "project", "unit", "plan", "ad", "material"}:
        raise ValueError("Invalid grain")
    if business == "qianchuan" and scope["grain"] != "account":
        raise ValueError("Current Qianchuan contract supports only account aggregates")
    if scope.get("currency") not in {"CNY", "USD"}:
        raise ValueError("Unsupported currency")
    fields(scope.get("window"), {"start", "end", "timezone"}, "window")
    window = scope["window"]
    start, end = date(window.get("start")), date(window.get("end"))
    today = today or dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
    if window.get("timezone") != "Asia/Shanghai" or start > end or end > today:
        raise ValueError("Invalid Shanghai time window")
    if scope["reportType"] == "live_today" and (start != today or end != today):
        raise ValueError("Live report only supports today")
    if scope.get("providerUpdatedAt"):
        updated = dt.datetime.fromisoformat(scope["providerUpdatedAt"].replace("Z", "+00:00"))
        if updated.tzinfo is None or updated > dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=5):
            raise ValueError("Invalid provider timestamp")
    rows = copy.deepcopy(document.get("records"))
    if not isinstance(rows, list) or len(rows) > 50000:
        raise ValueError("At most 50000 records")
    seen = set()
    for row in rows:
        fields(row, {"externalId", "name", "date", "dimensions", "metrics", "rawMetrics"}, "row")
        identifier = text(row.get("externalId"))
        if row.get("name") is not None:
            text(row["name"], 300)
        if not start <= date(row.get("date")) <= end:
            raise ValueError("Row date outside window")
        dims = row.setdefault("dimensions", {})
        if not isinstance(dims, dict) or len(dims) > 20:
            raise ValueError("Invalid dimensions")
        for key, value in dims.items():
            text(key, 80)
            if not isinstance(value, str) or len(value) > 200:
                raise ValueError("Dimensions must be short strings")
        decimals(row.get("metrics"), METRICS, 5)
        decimals(row.setdefault("rawMetrics", {}))
        if scope["grain"] == "account" and identifier != scope["advertiserId"]:
            raise ValueError("Account row belongs to another advertiser")
        identity = digest([identifier, row["date"], dims])
        if identity in seen:
            raise ValueError("Duplicate row across pages")
        seen.add(identity)
    fingerprint = digest({"brandId": brand, "scope": scope, "records": rows})
    batch = "oad_" + fingerprint[:40]
    page_count = max(1, (len(rows) + 499) // 500)

    def call(action, payload):
        return {"tool": "manage_growth_reports", "arguments": {"action": action, "payload": {"oceanAds": payload}}}

    identity = {"businessType": business, "advertiserId": scope["advertiserId"], "batchId": batch}
    calls = []
    for page in range(1, page_count + 1):
        calls.append(call("ocean_submit_batch", {**scope, "batchId": batch, "page": page, "pageCount": page_count, "records": rows[(page - 1) * 500:page * 500], "idempotencyKey": batch + "_page_" + str(page)}))
    calls.extend([call("ocean_get_sync_status", identity), call("ocean_commit_batch", {**identity, "idempotencyKey": batch + "_commit"}), call("ocean_get_workspace", identity)])
    return {"status": "draft_not_submitted", "brandIdToVerify": brand, "batchId": batch, "recordCount": len(rows), "calls": calls, "warning": "Only execute with the bound current brand after live schema and source completeness checks. Never call commit if sync status is incomplete."}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: prepare_batch.py input.json new-output.json")
    try:
        result = prepare(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig")))
        # Preserve immutable prior preparation files.
        with Path(sys.argv[2]).open("x", encoding="utf-8") as output:
            json.dump(result, output, ensure_ascii=False, indent=2)
        print(json.dumps({"status": result["status"], "recordCount": result["recordCount"], "batchId": result["batchId"]}))
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(2)
