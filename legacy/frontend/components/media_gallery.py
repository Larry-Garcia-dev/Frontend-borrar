"""Media gallery component displaying the user's generated assets."""

import reflex as rx

from state.base_state import BaseState


def _media_card(item: dict) -> rx.Component:
    return rx.card(
        rx.vstack(
            rx.cond(
                item["media_type"] == "video",
                rx.video(
                    src=item["storage_url"],
                    width="100%",
                    border_radius="md",
                    controls=True,
                ),
                rx.image(
                    src=item["storage_url"],
                    alt=item["prompt"],
                    width="100%",
                    border_radius="md",
                    object_fit="cover",
                ),
            ),
            rx.text(item["prompt"], font_size="1", color="gray.700", no_of_lines=2),
            rx.badge(
                item["status"],
                color_scheme=rx.cond(item["status"] == "success", "green", "orange"),
            ),
            spacing="2",
            width="100%",
        ),
        padding="3",
    )


def media_gallery() -> rx.Component:
    return rx.cond(
        BaseState.media_items.length() == 0,
        rx.center(
            rx.text("No items yet. Generate your first image or video above!", color="gray.500"),
            padding_y="8",
        ),
        rx.grid(
            rx.foreach(BaseState.media_items, _media_card),
            columns="3",
            gap="4",
            width="100%",
        ),
    )
