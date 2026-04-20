import reflex as rx

config = rx.Config(
    app_name="frontend",
    db_url="sqlite:///reflex.db",
    env=rx.Env.DEV,
    api_url="http://localhost:8001",
    frontend_port=3000,
    backend_port=8001,
)
