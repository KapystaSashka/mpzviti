"""
База даних підсистеми МПЗ ВІТІ — SQLite через SQLAlchemy.
Замінює database_mock.py.
"""
import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# ---------------------------------------------------------------------------
# Ролі та права (залишаємо як є — не в БД)
# ---------------------------------------------------------------------------

ROLES = {
    "admin":         ["*"],  # включає admin:users та всі інші
    "psychologist":  ["events:read", "events:write", "analytics:read", "ai:read"],
    "commander":     ["events:read", "analytics:read", "ai:read"],
    "staff":         ["events:read"],
}

EVENT_CATEGORIES = {
    "cultural":      "Культурний",
    "psychological": "Психологічний",
    "educational":   "Освітній",
    "sport":         "Спортивний",
    "patriotic":     "Патріотичний",
}

# ---------------------------------------------------------------------------
# Моделі
# ---------------------------------------------------------------------------

class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(64),  unique=True, nullable=False)
    password   = db.Column(db.String(128), nullable=False)
    role       = db.Column(db.String(32),  nullable=False, default="staff")
    # Розширені поля профілю
    first_name = db.Column(db.String(64),  nullable=False, default="")
    last_name  = db.Column(db.String(64),  nullable=False, default="")
    rank       = db.Column(db.String(64),  nullable=False, default="")   # звання
    position   = db.Column(db.String(128), nullable=False, default="")   # посада
    gender     = db.Column(db.String(8),   nullable=False, default="M")  # M / F
    unit       = db.Column(db.String(128), nullable=False, default="")
    is_active  = db.Column(db.Boolean,     nullable=False, default=True)
    created_at = db.Column(db.DateTime,    default=datetime.datetime.utcnow)

    @property
    def name(self):
        """Повне відображуване ім'я: звання + прізвище + ім'я."""
        parts = [p for p in [self.rank, self.last_name, self.first_name] if p]
        return " ".join(parts) if parts else self.username

    def to_dict(self):
        return {
            "id":         self.id,
            "username":   self.username,
            "role":       self.role,
            "first_name": self.first_name,
            "last_name":  self.last_name,
            "rank":       self.rank,
            "position":   self.position,
            "gender":     self.gender,
            "unit":       self.unit,
            "name":       self.name,
            "is_active":  self.is_active,
            "created_at": self.created_at.strftime("%d.%m.%Y") if self.created_at else "",
        }


class Event(db.Model):
    __tablename__ = "events"

    id                 = db.Column(db.Integer, primary_key=True)
    title              = db.Column(db.String(256), nullable=False)
    date               = db.Column(db.String(16),  nullable=False)
    location           = db.Column(db.String(256), default="")
    responsible        = db.Column(db.String(128), default="")
    status             = db.Column(db.String(32),  default="Заплановано")
    category           = db.Column(db.String(32),  default="cultural")
    unit_id            = db.Column(db.Integer,     nullable=True)
    attendance         = db.Column(db.Integer,     default=0)
    capacity           = db.Column(db.Integer,     default=0)
    satisfaction_score = db.Column(db.Float,       default=0.0)
    notes              = db.Column(db.Text,        default="")
    created_at         = db.Column(db.DateTime,    default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id":                 self.id,
            "title":              self.title,
            "date":               self.date,
            "location":           self.location,
            "responsible":        self.responsible,
            "status":             self.status,
            "category":           self.category,
            "unit_id":            self.unit_id,
            "attendance":         self.attendance,
            "capacity":           self.capacity,
            "satisfaction_score": self.satisfaction_score,
            "notes":              self.notes,
        }


class AuditLog(db.Model):
    """Журнал дій — хто що змінив і коли."""
    __tablename__ = "audit_log"

    id         = db.Column(db.Integer,  primary_key=True)
    username   = db.Column(db.String(64), nullable=False)
    action     = db.Column(db.String(32), nullable=False)   # create / update / delete
    entity     = db.Column(db.String(32), nullable=False)   # event
    entity_id  = db.Column(db.Integer,   nullable=True)
    detail     = db.Column(db.Text,      default="")
    created_at = db.Column(db.DateTime,  default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id":         self.id,
            "username":   self.username,
            "action":     self.action,
            "entity":     self.entity,
            "entity_id":  self.entity_id,
            "detail":     self.detail,
            "created_at": self.created_at.strftime("%d.%m.%Y %H:%M"),
        }


# ---------------------------------------------------------------------------
# Початкове наповнення БД (seed)
# ---------------------------------------------------------------------------

def seed_db():
    """Заповнює БД початковими даними якщо їх ще немає."""

    # --- Юзери ---
    if not User.query.filter_by(username="admin_viti").first():
        users = [
            User(username="admin_viti",  password="p@ssword123", role="admin",        first_name="Іван",    last_name="Адміністратор", rank="",                  position="Адміністратор системи",    gender="M", unit="Керівництво"),
            User(username="mpz_officer", password="knavy2026",   role="psychologist", first_name="Олег",    last_name="Ковальчук",     rank="капітан",           position="Офіцер МПЗ",               gender="M", unit="Відділ МПЗ"),
            User(username="commander_1", password="cmd_pass_1",  role="commander",    first_name="Андрій",  last_name="Шевченко",      rank="підполковник",      position="Командир факультету",      gender="M", unit="1-й факультет"),
            User(username="staff_user",  password="staff2026",   role="staff",        first_name="Дмитро",  last_name="Бойко",         rank="старший лейтенант", position="Черговий офіцер",          gender="M", unit="2-й факультет"),
        ]
        db.session.add_all(users)

    if not User.query.filter_by(username="Test1").first():
        test_users = [
            User(username="Test1", password="pass1", role="psychologist", first_name="Тест", last_name="Перший", rank="", position="Демонстраційний", gender="M", unit="Відділ МПЗ"),
            User(username="Test2", password="pass2", role="commander",    first_name="Тест", last_name="Другий", rank="", position="Демонстраційний", gender="M", unit="1-й факультет"),
        ]
        db.session.add_all(test_users)

    # --- Заходи ---
    if not Event.query.first():
        events = [
            Event(title="Концерт до Дня Героїв Крут",                                        date="2026-05-25", location="Актовий зал інституту", responsible="майор Петренко В.М.",        status="Завершено",    category="cultural",       unit_id=None, attendance=87,  capacity=100, satisfaction_score=4.6),
            Event(title="Психологічний тренінг: Стресостійкість та профілактика бойового стресу", date="2026-05-28", location="Клас 312",           responsible="капітан Ковальчук О.І.",    status="Завершено",    category="psychological",  unit_id=2,    attendance=24,  capacity=30,  satisfaction_score=4.8),
            Event(title="Військово-історичний лекторій для курсантів",                        date="2026-06-10", location="Лекційний зал №2",      responsible="підполковник Шевченко А.П.", status="Заплановано",  category="educational",    unit_id=1,    attendance=0,   capacity=60,  satisfaction_score=0.0),
            Event(title="Спортивне змагання: крос-кантрі",                                    date="2026-05-20", location="Спортивний майданчик",   responsible="майор Петренко В.М.",        status="Завершено",    category="sport",          unit_id=None, attendance=112, capacity=120, satisfaction_score=4.9),
            Event(title="Зустріч з ветеранами АТО/ООС",                                       date="2026-05-15", location="Актовий зал інституту", responsible="підполковник Шевченко А.П.", status="Завершено",    category="patriotic",      unit_id=3,    attendance=45,  capacity=80,  satisfaction_score=4.3),
            Event(title="Тренінг з психологічної реабілітації",                               date="2026-06-12", location="Клас 215",              responsible="капітан Ковальчук О.І.",    status="У процесі",    category="psychological",  unit_id=None, attendance=18,  capacity=25,  satisfaction_score=0.0),
            Event(title="День фізичної підготовки — естафета",                                date="2026-06-15", location="Спортивний майданчик",   responsible="майор Петренко В.М.",        status="Заплановано",  category="sport",          unit_id=2,    attendance=0,   capacity=50,  satisfaction_score=0.0),
            Event(title="Перегляд документального фільму «Кіборги»",                          date="2026-06-08", location="Актовий зал інституту", responsible="підполковник Шевченко А.П.", status="Завершено",    category="patriotic",      unit_id=None, attendance=95,  capacity=100, satisfaction_score=4.7),
            Event(title="Майстер-клас: Малювання як арт-терапія",                             date="2026-06-18", location="Клас 101",              responsible="капітан Ковальчук О.І.",    status="Заплановано",  category="cultural",       unit_id=1,    attendance=0,   capacity=20,  satisfaction_score=0.0),
            Event(title="Лекція: Кібербезпека та OSINT для офіцерів",                         date="2026-06-20", location="Лекційний зал №1",      responsible="підполковник Шевченко А.П.", status="Заплановано",  category="educational",    unit_id=None, attendance=0,   capacity=80,  satisfaction_score=0.0),
        ]
        db.session.add_all(events)

    db.session.commit()
