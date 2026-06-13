from flask import Blueprint, jsonify, request, render_template, send_file
from functools import wraps

from app.services import (EventService, AuthService, AnalyticsService,
                          AIService, ReportService, AuditService, UserService, QRService, has_permission)
from app.report_structure import ERROR_MESSAGES

api_bp = Blueprint('api', __name__)


def permission_required(permission: str):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            payload = _extract_payload()
            if not payload:
                return jsonify({"error": ERROR_MESSAGES["auth_denied"]}), 401
            if not has_permission(payload.get("role", ""), permission):
                return jsonify({"error": ERROR_MESSAGES["permission_denied"]}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _extract_payload():
            return jsonify({"error": ERROR_MESSAGES["auth_denied"]}), 401
        return f(*args, **kwargs)
    return decorated


def _extract_payload():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return AuthService.verify_token(auth.split(" ")[1])
    return None


def _current_user():
    return _extract_payload()


# --- Публічні ---

@api_bp.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@api_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    token = AuthService.login(data.get('username'), data.get('password'))
    if token:
        payload = AuthService.verify_token(token)
        return jsonify({"token": token, "role": payload.get("role"),
                        "name": payload.get("name"), "unit": payload.get("unit")}), 200
    return jsonify({"error": ERROR_MESSAGES["invalid_credentials"]}), 401


@api_bp.route('/me', methods=['GET'])
@token_required
def me():
    p = _current_user()
    return jsonify({"username": p.get("sub"), "role": p.get("role"),
                    "name": p.get("name"), "unit": p.get("unit")}), 200


# --- Заходи ---

@api_bp.route('/events', methods=['GET'])
@permission_required('events:read')
def get_events():
    return jsonify(EventService.get_all_events(unit_id=request.args.get('unit_id'))), 200


@api_bp.route('/events', methods=['POST'])
@permission_required('events:write')
def create_event():
    data = request.get_json() or {}
    if not data.get('title') or not data.get('date'):
        return jsonify({"error": ERROR_MESSAGES["fields_required"]}), 400
    username = (_current_user() or {}).get("sub", "unknown")
    return jsonify(EventService.add_event(data, username=username)), 201


@api_bp.route('/events/<int:event_id>', methods=['PATCH'])
@permission_required('events:write')
def update_event(event_id):
    data = request.get_json() or {}
    username = (_current_user() or {}).get("sub", "unknown")
    updated = EventService.update_event(event_id, data, username=username)
    if not updated:
        return jsonify({"error": ERROR_MESSAGES["event_not_found"]}), 404
    return jsonify(updated), 200


@api_bp.route('/events/<int:event_id>', methods=['DELETE'])
@permission_required('events:write')
def delete_event(event_id):
    username = (_current_user() or {}).get("sub", "unknown")
    deleted = EventService.delete_event(event_id, username=username)
    if not deleted:
        return jsonify({"error": ERROR_MESSAGES["event_not_found"]}), 404
    return jsonify({"ok": True, "id": event_id}), 200


# --- Аналітика ---

@api_bp.route('/analytics/summary', methods=['GET'])
@permission_required('analytics:read')
def analytics_summary():
    return jsonify(AnalyticsService.get_summary()), 200


@api_bp.route('/analytics/categories', methods=['GET'])
@permission_required('analytics:read')
def analytics_categories():
    return jsonify(AnalyticsService.get_category_stats()), 200


@api_bp.route('/analytics/activity', methods=['GET'])
@permission_required('analytics:read')
def analytics_activity():
    return jsonify(AnalyticsService.get_activity_by_month()), 200


@api_bp.route('/analytics/units', methods=['GET'])
@permission_required('analytics:read')
def analytics_units():
    return jsonify(AnalyticsService.get_unit_activity()), 200


# --- AI ---

@api_bp.route('/ai/recommendations', methods=['GET'])
@permission_required('ai:read')
def ai_recommendations():
    mode = request.args.get('mode', 'rules')
    return jsonify(AIService.get_ai_recommendations(use_claude_api=(mode == 'claude'))), 200


# --- Журнал дій ---

@api_bp.route('/audit', methods=['GET'])
@permission_required('analytics:read')
def audit_log():
    return jsonify(AuditService.get_log(limit=100)), 200


# --- Управління користувачами (тільки admin) ---

@api_bp.route('/users', methods=['GET'])
@permission_required('admin:users')
def get_users():
    return jsonify(UserService.get_all_users()), 200


@api_bp.route('/users', methods=['POST'])
@permission_required('admin:users')
def create_user():
    data = request.get_json() or {}
    username = (_current_user() or {}).get("sub", "unknown")
    user, errors = UserService.create_user(data, created_by=username)
    if errors:
        return jsonify({"errors": errors}), 400
    return jsonify(user), 201


@api_bp.route('/users/<int:user_id>', methods=['PATCH'])
@permission_required('admin:users')
def update_user(user_id):
    data = request.get_json() or {}
    username = (_current_user() or {}).get("sub", "unknown")
    user, errors = UserService.update_user(user_id, data, updated_by=username)
    if errors:
        return jsonify({"errors": errors}), 400
    return jsonify(user), 200


@api_bp.route('/users/<int:user_id>', methods=['DELETE'])
@permission_required('admin:users')
def delete_user(user_id):
    username = (_current_user() or {}).get("sub", "unknown")
    # Захист — не можна видалити себе
    payload = _current_user()
    me = payload.get("sub") if payload else None
    target = UserService.get_all_users()
    target_user = next((u for u in target if u["id"] == user_id), None)
    if target_user and target_user["username"] == me:
        return jsonify({"error": "Не можна видалити власний акаунт"}), 400
    ok = UserService.delete_user(user_id, deleted_by=username)
    if not ok:
        return jsonify({"error": "Користувача не знайдено"}), 404
    return jsonify({"ok": True}), 200



# --- QR-код відвідування ---

@api_bp.route('/events/<int:event_id>/qr', methods=['GET'])
@permission_required('events:read')
def get_event_qr(event_id):
    base_url = request.host_url.rstrip('/')
    result = QRService.generate_qr(event_id, base_url)
    return jsonify(result), 200


@api_bp.route('/attend/<int:event_id>', methods=['GET'])
def attend_page(event_id):
    """Публічна сторінка реєстрації відвідування (без авторизації)."""
    ev = EventService.get_all_events()
    event = next((e for e in ev if e['id'] == event_id), None)
    if not event:
        return "Захід не знайдено", 404
    return render_template('attend.html', event=event)


@api_bp.route('/attend/<int:event_id>', methods=['POST'])
def register_attendance(event_id):
    """Фіксує відвідування через QR з даними особи."""
    data = request.get_json() or {}
    full_name  = (data.get('full_name') or '').strip()
    rank       = (data.get('rank') or '').strip()
    group_name = (data.get('group_name') or '').strip()

    if not full_name:
        return jsonify({"error": "ПІБ обов'язкове"}), 400

    ev = Event.query.get(event_id)
    if not ev:
        return jsonify({"error": "Захід не знайдено"}), 404
    if ev.status not in ("Заплановано", "У процесі"):
        return jsonify({"error": "Реєстрація закрита"}), 400

    # Перевірка дубліката — та сама людина на той самий захід
    existing = Attendance.query.filter_by(
        event_id=event_id,
        full_name=full_name
    ).first()
    if existing:
        return jsonify({"error": "Вже зареєстровано", "duplicate": True}), 409

    # Зберігаємо запис
    record = Attendance(
        event_id=event_id,
        full_name=full_name,
        rank=rank,
        group_name=group_name
    )
    db.session.add(record)

    # Оновлюємо лічильник
    ev.attendance = (ev.attendance or 0) + 1
    db.session.commit()

    return jsonify({"ok": True, "attendance": ev.attendance}), 200


@api_bp.route('/attend/<int:event_id>/list', methods=['GET'])
@permission_required('events:read')
def get_attendance_list(event_id):
    """Список зареєстрованих на захід (для адміна/психолога)."""
    records = Attendance.query.filter_by(event_id=event_id)                              .order_by(Attendance.created_at.asc()).all()
    return jsonify([r.to_dict() for r in records]), 200



# --- Звіти ---

@api_bp.route('/report/docx', methods=['GET'])
@permission_required('events:read')
def download_docx():
    return send_file(ReportService.generate_docx(),
                     mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     as_attachment=True, download_name="report_mpz.docx")


@api_bp.route('/report/pdf', methods=['GET'])
@permission_required('events:read')
def download_pdf():
    return send_file(ReportService.generate_pdf(),
                     mimetype="application/pdf",
                     as_attachment=True, download_name="report_mpz.pdf")
