"""Generation form component."""

import reflex as rx
from state.base_state import BaseState


def generation_form() -> rx.Component:
    return rx.card(
        rx.vstack(
            rx.heading("Create New", size="5"),
            rx.form(
                rx.vstack(
                    rx.radio_group(
                        ["image", "video"],
                        value=BaseState.media_type,
                        on_change=BaseState.set_media_type,
                        direction="row",
                    ),
                    rx.text_area(
                        placeholder="Describe what you want to generate…",
                        value=BaseState.prompt,
                        on_change=BaseState.set_prompt,
                        rows="4",
                        width="100%",
                    ),
                    rx.text_area(
                        placeholder="Negative prompt (optional) — what to avoid…",
                        value=BaseState.negative_prompt,
                        on_change=BaseState.set_negative_prompt,
                        rows="2",
                        width="100%",
                    ),
                    rx.button(
                        rx.cond(
                            BaseState.is_generating,
                            rx.spinner(size="1"),
                            rx.text("Generate"),
                        ),
                        on_click=BaseState.submit_generation,
                        color_scheme="purple",
                        width="100%",
                        disabled=BaseState.is_generating,
                    ),
                    rx.cond(
                        BaseState.generation_error != "",
                        rx.callout(
                            BaseState.generation_error,
                            color_scheme="red",
                        ),
                        rx.fragment(),
                    ),
                    spacing="3",
                    width="100%",
                ),
                width="100%",
            ),
            width="100%",
            spacing="4",
        ),
        width="100%",
        padding="6",
    )