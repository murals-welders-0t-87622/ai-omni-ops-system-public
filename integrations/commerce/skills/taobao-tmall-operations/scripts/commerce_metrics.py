"""Explicit-scope ecommerce calculations. JSON on stdin; no network or credentials."""
import json
import sys
from decimal import Decimal, ROUND_HALF_UP, localcontext


def number(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Use decimal strings; missing values must be null")
    d = Decimal(value)
    if not d.is_finite() or d < 0:
        raise ValueError("Inputs must be finite and nonnegative")
    return d


def show(value):
    return None if value is None else str(value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))


def calculate(data):
    result = {"scope": "Specified variable costs only; not accounting net profit", "missing": []}
    with localcontext() as ctx:
        ctx.prec = 50
        cost = data.get("unitEconomics")
        if cost is not None:
            keys = ["price", "productCost", "shipping", "packaging", "platformRate", "taxRate", "refundLossPerUnit", "otherPerUnit", "adCostPerUnit"]
            values = {k: number(cost.get(k)) for k in keys}
            for k in ["platformRate", "taxRate"]:
                if values[k] is not None and values[k] > 1:
                    raise ValueError("Rates are decimal fractions, not percentages")
            result["missing"] = ["unitEconomics." + k for k, v in values.items() if v is None]
            if result["missing"]:
                result["unitEconomics"] = {"contributionBeforeAds": None, "contributionAfterAds": None, "breakEvenROAS": None}
            else:
                p = values["price"]
                fixed = sum(values[k] for k in ["productCost", "shipping", "packaging", "refundLossPerUnit", "otherPerUnit"])
                before = p * (1 - values["platformRate"] - values["taxRate"]) - fixed
                result["unitEconomics"] = {"contributionBeforeAds": show(before), "contributionAfterAds": show(before - values["adCostPerUnit"]), "breakEvenROAS": show(p / before) if p > 0 and before > 0 else None}
        funnel = data.get("funnel")
        if funnel is not None:
            values = {k: number(funnel.get(k)) for k in ["impressions", "clicks", "visitors", "buyers", "orders", "payment", "adSpend", "adAttributedPayment"]}
            def ratio(a, b):
                x, y = values[a], values[b]
                return show(x / y) if x is not None and y is not None and y > 0 else None
            result["funnel"] = {"ctrFraction": ratio("clicks", "impressions"), "visitorBuyerFraction": ratio("buyers", "visitors"), "perBuyerPayment": ratio("payment", "buyers"), "perOrderPayment": ratio("payment", "orders"), "roas": ratio("adAttributedPayment", "adSpend")}
            result["limitation"] = "Input cohorts, currencies, dates and attribution must match. ROAS is not profit; no causal conclusion."
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(calculate(json.load(sys.stdin)), ensure_ascii=False, indent=2))
    except (ValueError, ArithmeticError, TypeError, json.JSONDecodeError) as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(2)
