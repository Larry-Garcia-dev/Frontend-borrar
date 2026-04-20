"""Top navigation bar component."""

import reflex as rx

from state.base_state import BaseState


def navbar() -> rx.Component:
    return rx.box(
        rx.hstack(
            rx.link(
                rx.heading("AI Generator", size="6"),
                href="/",
                text_decoration="none",
            ),
            rx.spacer(),
            rx.cond(
                BaseState.is_authenticated,
                rx.hstack(
                    rx.text(BaseState.user_email, color="gray.600"),
                    rx.button(
                        "Sign out",
                        on_click=BaseState.logout,
                        variant="outline",
                        size="1",
                    ),
                    spacing="3",
                    align_items="center",
                ),
                rx.button(
                    "Sign in",
                    on_click=BaseState.redirect_to_google_login,
                    color_scheme="blue",
                    size="1",
                ),
            ),
            width="100%",
            align_items="center",
        ),
        background="white",
        border_bottom="1px solid",
        border_color="gray.200",
        padding_x="8",
        padding_y="4",
        position="sticky",
        top="0",
        z_index="100",
    )
