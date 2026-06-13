"""
Імітація бази даних підсистеми МПЗ ВІТІ.
Оновлено: додано ролі, аналітика, підрозділи.
"""

# Ролі системи
ROLES = {
    "admin":        ["*"],                                          # все
    "psychologist": ["events:read", "events:write", "analytics:read", "ai:read"],
    "commander":    ["events:read", "analytics:read", "ai:read"],
    "staff":        ["events:read"],
    "test":          ["events:read"],
}

# Мокована таблиця користувачів з ролями
MOCK_USERS = {
    "admin_viti":   {"password": "p@ssword123",  "role": "admin",        "name": "Адміністратор ВІТІ",         "unit": "Керівництво"},
    "mpz_officer":  {"password": "knavy2026",    "role": "psychologist", "name": "капітан Ковальчук О.І.",     "unit": "Відділ МПЗ"},
    "commander_1":  {"password": "cmd_pass_1",   "role": "commander",    "name": "підполковник Шевченко А.П.", "unit": "1-й факультет"},
    "staff_user":   {"password": "staff2026",    "role": "staff",        "name": "старший лейтенант Бойко Д.", "unit": "2-й факультет"},
    "test_user":    dict(password="pass1", role="test", name="?", unit="?"),
}

# Підрозділи
MOCK_UNITS = [
    {"id": 1, "name": "1-й факультет"},
    {"id": 2, "name": "2-й факультет"},
    {"id": 3, "name": "3-й факультет"},
    {"id": 4, "name": "Відділ МПЗ"},
    {"id": 5, "name": "Керівництво"},
]

# Мокована таблиця заходів з полями аналітики
MOCK_EVENTS = [
    {
        "id": 1,
        "title": "Концерт до Дня Героїв Крут",
        "date": "2026-05-25",
        "location": "Актовий зал інституту",
        "responsible": "майор Петренко В.М.",
        "status": "Завершено",
        "category": "cultural",
        "unit_id": None,          # None = для всіх підрозділів
        "attendance": 87,
        "capacity": 100,
        "satisfaction_score": 4.6,  # 1–5
        "notes": ""
    },
    {
        "id": 2,
        "title": "Психологічний тренінг: Стресостійкість та профілактика бойового стресу",
        "date": "2026-05-28",
        "location": "Клас 312",
        "responsible": "капітан Ковальчук О.І.",
        "status": "Завершено",
        "category": "psychological",
        "unit_id": 2,
        "attendance": 24,
        "capacity": 30,
        "satisfaction_score": 4.8,
        "notes": ""
    },
    {
        "id": 3,
        "title": "Військово-історичний лекторій для курсантів",
        "date": "2026-06-05",
        "location": "Лекційний зал №2",
        "responsible": "підполковник Шевченко А.П.",
        "status": "Заплановано",
        "category": "educational",
        "unit_id": 1,
        "attendance": 0,
        "capacity": 60,
        "satisfaction_score": 0,
        "notes": ""
    },
    {
        "id": 4,
        "title": "Спортивне змагання: крос-кантрі",
        "date": "2026-05-20",
        "location": "Спортивний майданчик",
        "responsible": "майор Петренко В.М.",
        "status": "Завершено",
        "category": "sport",
        "unit_id": None,
        "attendance": 112,
        "capacity": 120,
        "satisfaction_score": 4.9,
        "notes": ""
    },
    {
        "id": 5,
        "title": "Зустріч з ветеранами АТО/ООС",
        "date": "2026-05-15",
        "location": "Актовий зал інституту",
        "responsible": "підполковник Шевченко А.П.",
        "status": "Завершено",
        "category": "patriotic",
        "unit_id": 3,
        "attendance": 45,
        "capacity": 80,
        "satisfaction_score": 4.3,
        "notes": ""
    },
]

# Категорії заходів
EVENT_CATEGORIES = {
    "cultural":     "Культурний",
    "psychological": "Психологічний",
    "educational":  "Освітній",
    "sport":        "Спортивний",
    "patriotic":    "Патріотичний",
}
