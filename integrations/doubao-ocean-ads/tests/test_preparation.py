import copy
import datetime as dt
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("prepare", Path(__file__).parents[1] / "package/ocean-ads-operations/scripts/prepare_batch.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def source():
    return {"brandId": "QA_ONLY", "scope": {"businessType": "qianchuan", "advertiserId": "999999999999999999", "reportType": "standard", "grain": "account", "window": {"start": "2026-10-01", "end": "2026-10-02", "timezone": "Asia/Shanghai"}, "currency": "CNY", "targetEvent": "pay", "attribution": "test definition", "sourceEvidence": "SYNTHETIC TEST ONLY", "toolName": "qa", "skillId": "ocean-ads-operations", "skillVersion": "1.0.0"}, "records": [{"externalId": "999999999999999999", "date": "2026-10-01", "metrics": {"spend": "0", "clicks": "0"}}]}


class Preparation(unittest.TestCase):
    def test_stable_retries_and_long_ids(self):
        doc = source()
        self.assertEqual(module.prepare(doc), module.prepare(doc))
        self.assertEqual(module.prepare(doc)["calls"][0]["arguments"]["payload"]["oceanAds"]["advertiserId"], "999999999999999999")
        self.assertNotIn("dimensions", doc["records"][0])

    def test_unknown_not_zero(self):
        metrics = module.prepare(source())["calls"][0]["arguments"]["payload"]["oceanAds"]["records"][0]["metrics"]
        self.assertEqual(metrics["spend"], "0")
        self.assertNotIn("revenue", metrics)

    def test_pagination(self):
        doc = source()
        doc["records"] = [{**doc["records"][0], "dimensions": {"part": str(i)}} for i in range(501)]
        result = module.prepare(doc)
        self.assertEqual([len(x["arguments"]["payload"]["oceanAds"]["records"]) for x in result["calls"][:2]], [500, 1])
        self.assertEqual(result["calls"][-1]["arguments"]["action"], "ocean_get_workspace")

    def test_changes_create_new_batch_and_brand_scope(self):
        first = source()
        second = copy.deepcopy(first)
        second["brandId"] = "QA_OTHER"
        self.assertNotEqual(module.prepare(first)["batchId"], module.prepare(second)["batchId"])
        second = copy.deepcopy(first)
        second["records"][0]["metrics"]["spend"] = "0.1"
        self.assertNotEqual(module.prepare(first)["batchId"], module.prepare(second)["batchId"])

    def test_duplicates_across_pages(self):
        doc = source()
        doc["records"] *= 501
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            module.prepare(doc)

    def test_rejects_unknown_credentials_or_schema_fields(self):
        doc = source()
        doc["scope"]["access_token"] = "placeholder"
        with self.assertRaises(ValueError):
            module.prepare(doc)

    def test_invalid_inputs(self):
        for path, value in [(("scope", "advertiserId"), 123), (("scope", "grain"), "material"), (("scope", "reportType"), "engine_report"), (("scope", "currency"), "???")]:
            with self.subTest(path=path):
                doc = source()
                doc[path[0]][path[1]] = value
                with self.assertRaises(ValueError):
                    module.prepare(doc)

    def test_numeric_precision_and_count_semantics(self):
        for key, value in [("spend", "1e3"), ("clicks", "1.5"), ("spend", "-1"), ("spend", "0.1234567"), ("spend", 0)]:
            doc = source()
            doc["records"][0]["metrics"][key] = value
            with self.assertRaises(ValueError):
                module.prepare(doc)

    def test_account_mismatch(self):
        doc = source()
        doc["records"][0]["externalId"] = "ANOTHER"
        with self.assertRaises(ValueError):
            module.prepare(doc)

    def test_live_only_current_day(self):
        doc = source()
        doc["scope"]["reportType"] = "live_today"
        with self.assertRaises(ValueError):
            module.prepare(doc, today=dt.date(2026, 10, 24))

    def test_empty_result_preserves_empty(self):
        doc = source()
        doc["records"] = []
        result = module.prepare(doc)
        self.assertEqual(result["recordCount"], 0)
        self.assertEqual(result["calls"][0]["arguments"]["payload"]["oceanAds"]["records"], [])


if __name__ == "__main__":
    unittest.main()
