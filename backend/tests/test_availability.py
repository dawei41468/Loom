import pytest
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import availability as availability_router


class _FakeFindCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def __aiter__(self):
        self._iter = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


def _matches_condition(doc, cond):
    if not isinstance(cond, dict):
        return doc == cond

    for k, v in cond.items():
        if k == "$or":
            if not any(_matches_query(doc, q) for q in v):
                return False
            continue

        doc_val = doc.get(k)
        if isinstance(v, dict):
            for op, op_val in v.items():
                if op == "$in":
                    if not isinstance(doc_val, list) or not any(x in doc_val for x in op_val):
                        return False
                elif op == "$lt":
                    if not (doc_val < op_val):
                        return False
                elif op == "$gt":
                    if not (doc_val > op_val):
                        return False
                elif op == "$gte":
                    if not (doc_val >= op_val):
                        return False
                elif op == "$ne":
                    if not (doc_val != op_val):
                        return False
                else:
                    raise NotImplementedError(f"Unsupported operator: {op}")
        else:
            if doc_val != v:
                return False

    return True


def _matches_query(doc, query):
    if query is None:
        return True
    if not isinstance(query, dict):
        return False
    return _matches_condition(doc, query)


class _FakeCollection:
    def __init__(self, docs):
        self._docs = list(docs)

    async def find_one(self, query):
        for doc in self._docs:
            if _matches_query(doc, query):
                return doc
        return None

    def find(self, query):
        matched = [doc for doc in self._docs if _matches_query(doc, query)]
        return _FakeFindCursor(matched)


class _FakeDB:
    def __init__(self, events, partnerships):
        self.events = _FakeCollection(events)
        self.partnerships = _FakeCollection(partnerships)


def _app_with_overrides(fake_db, current_user):
    app = FastAPI()
    app.include_router(availability_router.router, prefix="/api")

    app.dependency_overrides[availability_router.get_database] = lambda: fake_db
    app.dependency_overrides[availability_router.get_current_user] = lambda: current_user
    return app


class _FakeUser:
    def __init__(self, user_id):
        self.id = user_id


def _dt(day_offset, hour, minute=0):
    base = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (base + timedelta(days=day_offset)).replace(hour=hour, minute=minute)


@pytest.mark.parametrize("events, partnerships", [([], [])])
def test_find_overlap_no_partner_returns_400(events, partnerships):
    fake_db = _FakeDB(events=events, partnerships=partnerships)
    app = _app_with_overrides(fake_db, _FakeUser("u1"))

    client = TestClient(app)
    resp = client.post("/api/availability/find-overlap", json={"duration_minutes": 60, "date_range_days": 7})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active partnership found"


def test_find_overlap_ignores_other_users_events_not_in_partnership():
    partnerships = [{"user1_id": "u1", "user2_id": "u2", "status": "accepted"}]

    # u3 has an event that should NOT affect u1/u2 overlap
    events = [
        {"created_by": "u3", "attendees": [], "start_time": _dt(0, 9, 0), "end_time": _dt(0, 18, 0), "visibility": "shared"},
    ]

    fake_db = _FakeDB(events=events, partnerships=partnerships)
    app = _app_with_overrides(fake_db, _FakeUser("u1"))

    client = TestClient(app)
    resp = client.post("/api/availability/find-overlap", json={"duration_minutes": 60, "date_range_days": 7})
    assert resp.status_code == 200

    data = resp.json()["data"]
    # With no u1/u2 events, there should be at least one slot suggested.
    assert isinstance(data, list)
    assert len(data) > 0


def test_partner_private_event_blocks_time():
    partnerships = [{"user1_id": "u1", "user2_id": "u2", "status": "accepted"}]

    # Partner has a private event covering the whole workday on day 0
    events = [
        {"created_by": "u2", "attendees": [], "start_time": _dt(0, 9, 0), "end_time": _dt(0, 18, 0), "visibility": "private"},
    ]

    fake_db = _FakeDB(events=events, partnerships=partnerships)
    app = _app_with_overrides(fake_db, _FakeUser("u1"))

    client = TestClient(app)
    resp = client.post("/api/availability/find-overlap", json={"duration_minutes": 60, "date_range_days": 1})
    assert resp.status_code == 200

    data = resp.json()["data"]
    # No availability on day 0 because partner is busy all day.
    assert data == []
