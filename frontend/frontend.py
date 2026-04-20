"""Main Reflex application: premium UI pages and routing.

Premium visual overhaul with:
- A. Global Theming & Polish (soft shadows, hover effects, typography)
- B. Fully Responsive Dashboard
- C. Responsive Top Navbar
- D. Admin Panel Mobile Fixes
"""

import reflex as rx

from state.generation_state import (
    CUSTOM_SIZE_OPTION,
    GENERATION_SIZE_OPTIONS,
    GenerationState,
    REFERENCE_UPLOAD_ID,
    REFERENCE_UPLOAD_MAX_FILES,
    SIZE_OPTION_BY_VALUE,
)


# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL STYLE CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

CARD_SHADOW = "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
CARD_SHADOW_LG = "0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
CARD_SHADOW_HOVER = "0 20px 40px -10px rgb(0 0 0 / 0.15), 0 10px 20px -5px rgb(0 0 0 / 0.1)"

BUTTON_HOVER = {
    "transform": "translateY(-1px)",
    "box_shadow": "0 4px 12px rgb(0 0 0 / 0.15)",
    "transition": "all 0.2s ease-in-out",
}

CARD_HOVER = {
    "transform": "scale(1.02)",
    "box_shadow": CARD_SHADOW_HOVER,
    "transition": "all 0.2s ease-in-out",
}

IMAGE_HOVER = {
    "transform": "scale(1.03)",
    "transition": "transform 0.3s ease-in-out",
}

# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: TOP QUOTA INDICATOR
# ─────────────────────────────────────────────────────────────────────────────

def _top_quota_indicator() -> rx.Component:
    """Compact quota indicator shown in the top navbar."""
    return rx.box(
        rx.vstack(
            rx.badge(
                rx.hstack(
                    rx.icon(tag="image", size=12),
                    rx.text("Balance:", size="1", weight="medium"),
                    rx.text(GenerationState.tokens_remaining, weight="bold", size="1"),
                    rx.text("Imágenes", size="1", weight="medium"),
                    spacing="1",
                    align_items="center",
                ),
                color_scheme="amber",
                variant="soft",
                radius="full",
            ),
            rx.progress(
                value=GenerationState.quota_progress,
                max=100,
                size="1",
                width=rx.breakpoints(initial="80px", sm="100px", md="120px"),
                radius="full",
                color_scheme="blue",
            ),
            # Tarea 7: Expiry indicator
            rx.cond(
                GenerationState.quota_reset_at != "",
                rx.cond(
                    GenerationState.credits_expired,
                    rx.text(
                        "Créditos vencidos",
                        size="1",
                        color=rx.color("red", 10),
                        weight="medium",
                    ),
                    rx.text(
                        "Vencen el ",
                        rx.text.span(GenerationState.quota_reset_display, weight="medium"),
                        size="1",
                        color=rx.color("gray", 10),
                    ),
                ),
                rx.fragment(),
            ),
            spacing="1",
            align_items="end",
        ),
        flex_shrink="0",
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: MOBILE MENU
# ─────────────────────────────────────────────────────────────────────────────

def _mobile_menu() -> rx.Component:
    """Mobile hamburger menu for navigation."""
    return rx.box(
        rx.popover.root(
            rx.popover.trigger(
                rx.button(
                    rx.icon(tag="menu", size=20),
                    variant="ghost",
                    color_scheme="gray",
                    size="2",
                    radius="large",
                    _hover={"background_color": rx.color("gray", 4)},
                ),
            ),
            rx.popover.content(
                rx.vstack(
                    rx.link(
                        rx.hstack(
                            rx.icon(tag="layout-dashboard", size=16),
                            rx.text("Dashboard", weight="medium"),
                            spacing="2",
                            align_items="center",
                        ),
                        href="/dashboard",
                        width="100%",
                        padding="3",
                        border_radius="lg",
                        _hover={"background_color": rx.color("gray", 3)},
                    ),
                    rx.cond(
                        GenerationState.is_admin,
                        rx.link(
                            rx.hstack(
                                rx.icon(tag="shield", size=16),
                                rx.text("Admin", weight="medium"),
                                spacing="2",
                                align_items="center",
                            ),
                            href="/admin",
                            width="100%",
                            padding="3",
                            border_radius="lg",
                            _hover={"background_color": rx.color("gray", 3)},
                        ),
                        rx.fragment(),
                    ),
                    rx.cond(
                        GenerationState.is_vendor,
                        rx.link(
                            rx.hstack(
                                rx.icon(tag="store", size=16),
                                rx.text("Vendedor", weight="medium"),
                                spacing="2",
                                align_items="center",
                            ),
                            href="/vendor",
                            width="100%",
                            padding="3",
                            border_radius="lg",
                            _hover={"background_color": rx.color("gray", 3)},
                        ),
                        rx.fragment(),
                    ),
                    rx.divider(),
                    rx.hstack(
                        rx.cond(
                            GenerationState.user_avatar != "",
                            rx.avatar(
                                src=GenerationState.user_avatar,
                                fallback="AI",
                                radius="full",
                                size="2",
                            ),
                            rx.avatar(fallback="AI", radius="full", size="2"),
                        ),
                        rx.vstack(
                            rx.text(GenerationState.user_email, weight="medium", size="2"),
                            rx.text(
                                rx.cond(GenerationState.is_admin, "Admin", rx.cond(GenerationState.is_vendor, "Vendor", "Creator")),
                                color=rx.color("gray", 11),
                                size="1",
                            ),
                            spacing="0",
                            align_items="start",
                        ),
                        spacing="3",
                        align_items="center",
                        width="100%",
                        padding="2",
                    ),
                    rx.button(
                        rx.hstack(
                            rx.icon(tag="log-out", size=14),
                            rx.text("Logout", weight="medium"),
                            spacing="2",
                            align_items="center",
                        ),
                        on_click=GenerationState.logout,
                        variant="soft",
                        color_scheme="red",
                        radius="large",
                        width="100%",
                    ),
                    spacing="2",
                    width="200px",
                    padding="2",
                ),
                side="bottom",
                align="end",
            ),
        ),
        display=rx.breakpoints(initial="flex", md="none"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: PROTECTED LAYOUT (NAVBAR + PAGE WRAPPER)
# ─────────────────────────────────────────────────────────────────────────────

def protected_layout(content: rx.Component, title: str) -> rx.Component:
    """Shared layout for all authenticated routes with premium styling."""
    return rx.box(
        rx.vstack(
            # ─── TOP NAVBAR ───────────────────────────────────────────────
            rx.box(
                rx.hstack(
                    # Left: Logo + Nav Links
                    rx.hstack(
                        rx.hstack(
                            rx.image(
                                src="/logo.png",
                                height=rx.breakpoints(initial="24px", sm="28px"),
                                width="auto",
                            ),
                            rx.heading(
                                "Macondo AI",
                                size=rx.breakpoints(initial="4", sm="5"),
                                weight="bold",
                                background="linear-gradient(135deg, var(--blue-11), var(--violet-11))",
                                background_clip="text",
                                style={"-webkit-background-clip": "text", "color": "transparent"},
                            ),
                            spacing="2",
                            align_items="center",
                        ),
                        # Desktop Nav Links
                        rx.hstack(
                            rx.link(
                                rx.hstack(
                                    rx.icon(tag="layout-dashboard", size=14),
                                    rx.text("Dashboard", weight="medium"),
                                    spacing="2",
                                    align_items="center",
                                ),
                                href="/dashboard",
                                color=rx.color("gray", 11),
                                padding_x="3",
                                padding_y="2",
                                border_radius="lg",
                                _hover={"background_color": rx.color("gray", 3), "color": rx.color("gray", 12)},
                            ),
                            rx.cond(
                                GenerationState.is_admin,
                                rx.link(
                                    rx.hstack(
                                        rx.icon(tag="shield", size=14),
                                        rx.text("Admin", weight="medium"),
                                        spacing="2",
                                        align_items="center",
                                    ),
                                    href="/admin",
                                    color=rx.color("gray", 11),
                                    padding_x="3",
                                    padding_y="2",
                                    border_radius="lg",
                                    _hover={"background_color": rx.color("gray", 3), "color": rx.color("gray", 12)},
                                ),
                                rx.fragment(),
                            ),
                            rx.cond(
                                GenerationState.is_vendor,
                                rx.link(
                                    rx.hstack(
                                        rx.icon(tag="store", size=14),
                                        rx.text("Vendedor", weight="medium"),
                                        spacing="2",
                                        align_items="center",
                                    ),
                                    href="/vendor",
                                    color=rx.color("gray", 11),
                                    padding_x="3",
                                    padding_y="2",
                                    border_radius="lg",
                                    _hover={"background_color": rx.color("gray", 3), "color": rx.color("gray", 12)},
                                ),
                                rx.fragment(),
                            ),
                            spacing="1",
                            display=rx.breakpoints(initial="none", md="flex"),
                        ),
                        spacing="4",
                        align_items="center",
                    ),

                    # Right: Quota + User Info + Logout
                    rx.hstack(
                        _top_quota_indicator(),
                        # Desktop User Info
                        rx.hstack(
                            rx.cond(
                                GenerationState.user_avatar != "",
                                rx.avatar(
                                    src=GenerationState.user_avatar,
                                    fallback="AI",
                                    radius="full",
                                    size="2",
                                ),
                                rx.avatar(fallback="AI", radius="full", size="2"),
                            ),
                            rx.vstack(
                                rx.text(
                                    GenerationState.user_email,
                                    weight="medium",
                                    size="2",
                                    max_width="140px",
                                    overflow="hidden",
                                    text_overflow="ellipsis",
                                    white_space="nowrap",
                                ),
                                rx.text(
                                    rx.cond(GenerationState.is_admin, "Admin", rx.cond(GenerationState.is_vendor, "Vendor", "Creator")),
                                    color=rx.color("gray", 11),
                                    size="1",
                                ),
                                spacing="0",
                                align_items="start",
                            ),
                            rx.button(
                                rx.hstack(
                                    rx.icon(tag="log-out", size=14),
                                    rx.text("Logout", weight="medium"),
                                    spacing="2",
                                    align_items="center",
                                ),
                                on_click=GenerationState.logout,
                                variant="soft",
                                color_scheme="gray",
                                radius="large",
                                size="2",
                                _hover=BUTTON_HOVER,
                            ),
                            spacing="3",
                            align_items="center",
                            display=rx.breakpoints(initial="none", md="flex"),
                        ),
                        # Mobile Menu
                        _mobile_menu(),
                        spacing="3",
                        align_items="center",
                    ),
                    justify="between",
                    width="100%",
                    max_width="1600px",
                    margin_x="auto",
                ),
                width="100%",
                padding_x=rx.breakpoints(initial="1rem", sm="1.5rem", md="2rem", lg="3rem"),
                padding_y="0.875rem",
                border_bottom="1px solid",
                border_color=rx.color("gray", 4),
                background_color="rgba(255, 255, 255, 0.8)",
                backdrop_filter="blur(12px)",
                position="sticky",
                top="0",
                z_index="50",
            ),

            # ─── PAGE CONTENT ─────────────────────────────────────────────
            rx.box(
                rx.vstack(
                    rx.hstack(
                        rx.heading(
                            title,
                            size=rx.breakpoints(initial="6", sm="7", md="8"),
                            weight="bold",
                        ),
                        rx.badge(
                            rx.hstack(
                                rx.box(
                                    width="6px",
                                    height="6px",
                                    background_color="var(--green-9)",
                                    border_radius="full",
                                ),
                                rx.text("Online", size="1", weight="medium"),
                                spacing="2",
                                align_items="center",
                            ),
                            color_scheme="green",
                            variant="soft",
                            radius="full",
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="center",
                        flex_wrap="wrap",
                        gap="3",
                    ),
                    content,
                    spacing="5",
                    align_items="stretch",
                    width="100%",
                ),
                width="100%",
                padding_x=rx.breakpoints(initial="1rem", sm="1.5rem", md="2rem", lg="3rem"),
                padding_y=rx.breakpoints(initial="1.5rem", md="2rem"),
            ),
            width="100%",
            spacing="0",
            align_items="stretch",
        ),
        width="100%",
        min_height="100vh",
        background="linear-gradient(180deg, var(--gray-1) 0%, var(--gray-2) 100%)",
    )


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: LOGIN (PUBLIC)
# ─────────────────────────────────────────────────────────────────────────────

def index() -> rx.Component:
    """Public login page with premium styling."""
    return rx.center(
        rx.card(
            rx.vstack(
                # Floating gradient orb (decorative)
                rx.box(
                    rx.image(src="/logo.png", height="64px", width="auto"),
                    padding="4",
                    background="linear-gradient(135deg, var(--blue-3), var(--violet-3))",
                    border_radius="full",
                    box_shadow=CARD_SHADOW,
                ),
                rx.vstack(
                    rx.heading(
                        "Welcome back",
                        size=rx.breakpoints(initial="7", md="8"),
                        weight="bold",
                        text_align="center",
                    ),
                    rx.text(
                        "Sign in with Google to access your enterprise AI workspace.",
                        color=rx.color("gray", 11),
                        text_align="center",
                        size="3",
                        max_width="320px",
                    ),
                    spacing="2",
                    align_items="center",
                ),
                rx.button(
                    rx.hstack(
                        rx.icon(tag="sparkles", size=18),
                        rx.text("Continue with Google", weight="medium"),
                        spacing="2",
                        align_items="center",
                    ),
                    on_click=GenerationState.redirect_to_google_login,
                    size="3",
                    radius="large",
                    color_scheme="blue",
                    width="100%",
                    cursor="pointer",
                    _hover=BUTTON_HOVER,
                ),
                rx.cond(
                    GenerationState.auth_error != "",
                    rx.callout(
                        GenerationState.auth_error,
                        color_scheme="red",
                        icon="triangle-alert",
                        width="100%",
                    ),
                    rx.fragment(),
                ),
                rx.divider(),
                rx.text(
                    "Enterprise-grade AI generation platform",
                    size="1",
                    color=rx.color("gray", 10),
                    text_align="center",
                ),
                spacing="6",
                align_items="center",
                width="100%",
            ),
            size="4",
            max_width="420px",
            width=rx.breakpoints(initial="calc(100% - 2rem)", sm="100%"),
            radius="large",
            variant="surface",
            box_shadow=CARD_SHADOW_LG,
            padding=rx.breakpoints(initial="6", md="8"),
        ),
        min_height="100vh",
        width="100%",
        background="linear-gradient(135deg, var(--gray-1) 0%, var(--blue-2) 50%, var(--violet-2) 100%)",
        on_mount=GenerationState.guard_public_route,
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: GENERATION CONTROL PANEL
# ─────────────────────────────────────────────────────────────────────────────

def _generation_control_panel() -> rx.Component:
    """Left panel for prompt input and generation controls."""
    return rx.card(
        rx.vstack(
            # Header
            rx.hstack(
                rx.vstack(
                    rx.heading("Generation Control", size=rx.breakpoints(initial="5", md="6"), weight="bold"),
                    rx.text(
                        "Create stunning AI-generated media",
                        color=rx.color("gray", 11),
                        size="2",
                    ),
                    spacing="1",
                    align_items="start",
                ),
                rx.badge(
                    rx.hstack(
                        rx.icon(tag="sparkles", size=12),
                        rx.text("AI Studio", size="1", weight="medium"),
                        spacing="1",
                        align_items="center",
                    ),
                    color_scheme="blue",
                    variant="soft",
                    radius="full",
                ),
                width="100%",
                justify_content="space-between",
                align_items="start",
                flex_wrap="wrap",
                gap="2",
            ),

            rx.divider(),

            # Tarea 5: Edit mode banner
            rx.cond(
                GenerationState.editing_image,
                rx.box(
                    rx.hstack(
                        rx.vstack(
                            rx.text(
                                "Editando imagen",
                                weight="bold",
                                size="2",
                            ),
                            rx.text(
                                rx.cond(
                                    GenerationState.edit_is_free,
                                    f"Ediciones gratis restantes: ",
                                    "Esta edición consume 1 crédito",
                                ),
                                rx.cond(
                                    GenerationState.edit_is_free,
                                    rx.text.span(GenerationState.edits_remaining, weight="bold"),
                                    rx.fragment(),
                                ),
                                size="1",
                                color=rx.color("gray", 11),
                            ),
                            spacing="0",
                            align_items="start",
                        ),
                        rx.button(
                            "Cancelar edición",
                            on_click=GenerationState.cancel_edit,
                            variant="soft",
                            color_scheme="gray",
                            size="1",
                            radius="large",
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="center",
                    ),
                    width="100%",
                    padding="3",
                    background_color=rx.cond(
                        GenerationState.edit_is_free,
                        rx.color("green", 3),
                        rx.color("amber", 3),
                    ),
                    border="1px solid",
                    border_color=rx.cond(
                        GenerationState.edit_is_free,
                        rx.color("green", 6),
                        rx.color("amber", 6),
                    ),
                    border_radius="lg",
                ),
                rx.fragment(),
            ),
            rx.vstack(
                rx.hstack(
                    rx.text("Prompt", weight="medium", size="2"),
                    rx.badge("Required", color_scheme="gray", variant="soft", size="1"),
                    spacing="2",
                    align_items="center",
                ),
                rx.text_area(
                    placeholder="A cinematic food campaign, warm tones, ultra-detailed textures, professional studio lighting...",
                    value=GenerationState.prompt,
                    on_change=GenerationState.set_prompt,
                    min_height=rx.breakpoints(initial="180px", md="220px", lg="260px"),
                    width="100%",
                    size="3",
                    radius="large",
                    resize="vertical",
                ),
                width="100%",
                spacing="2",
                align_items="start",
            ),

            # Optional image-edit reference (uploaded to API; URLs for DashScope)
            rx.vstack(
                rx.hstack(
                    rx.text("Imágenes de referencia", weight="medium", size="2"),
                    rx.badge("Opcional", color_scheme="gray", variant="soft", size="1"),
                    spacing="2",
                    align_items="center",
                ),
                rx.upload(
                    rx.vstack(
                        rx.icon(tag="upload", size=24, color=rx.color("gray", 10)),
                        rx.text(
                            "Arrastra una o varias imágenes o haz clic para subir",
                            size="2",
                            weight="medium",
                            text_align="center",
                        ),
                        rx.text(
                            f"PNG, JPG o WEBP — hasta {REFERENCE_UPLOAD_MAX_FILES} archivos",
                            size="1",
                            color=rx.color("gray", 11),
                            text_align="center",
                        ),
                        spacing="2",
                        align_items="center",
                        justify_content="center",
                        width="100%",
                        min_height="120px",
                    ),
                    id=REFERENCE_UPLOAD_ID,
                    multiple=True,
                    max_files=REFERENCE_UPLOAD_MAX_FILES,
                    accept={"image/*": [".png", ".jpg", ".jpeg", ".webp"]},
                    on_drop=GenerationState.handle_reference_image_upload(
                        rx.upload_files(upload_id=REFERENCE_UPLOAD_ID)
                    ),
                    width="100%",
                    border="2px dashed",
                    border_color=rx.color("gray", 7),
                    background_color=rx.color("gray", 2),
                    border_radius="xl",
                    padding=rx.breakpoints(initial="5", md="6"),
                    cursor="pointer",
                    transition="all 0.2s ease-in-out",
                    _hover={
                        "border_color": rx.color("blue", 8),
                        "background_color": rx.color("blue", 2),
                    },
                ),
                rx.cond(
                    GenerationState.has_reference_images,
                    rx.hstack(
                        rx.hstack(
                            rx.hstack(
                                rx.foreach(
                                    GenerationState.reference_image_urls,
                                    lambda url: rx.image(
                                        src=url,
                                        width="52px",
                                        height="52px",
                                        object_fit="cover",
                                        border_radius="lg",
                                    ),
                                ),
                                spacing="2",
                                flex_wrap="wrap",
                                align_items="center",
                            ),
                            rx.vstack(
                                rx.text("Referencias listas", weight="medium", size="2"),
                                rx.text(
                                    "Se enviarán al modelo en tu siguiente generación.",
                                    size="1",
                                    color=rx.color("gray", 11),
                                ),
                                spacing="1",
                                align_items="start",
                            ),
                            spacing="3",
                            align_items="center",
                        ),
                        rx.button(
                            "Quitar",
                            on_click=GenerationState.clear_reference_image,
                            variant="soft",
                            color_scheme="gray",
                            size="1",
                            radius="large",
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="center",
                        flex_wrap="wrap",
                        gap="2",
                        padding="3",
                        background_color=rx.color("gray", 2),
                        border_radius="lg",
                    ),
                    rx.fragment(),
                ),
                width="100%",
                spacing="2",
                align_items="start",
            ),

            # Optional negative prompt
            rx.vstack(
                rx.text("Negative Prompt (optional)", weight="medium", size="2"),
                rx.text_area(
                    placeholder="blur, low quality, watermark, deformed...",
                    value=GenerationState.negative_prompt,
                    on_change=GenerationState.set_negative_prompt,
                    min_height="90px",
                    width="100%",
                    size="2",
                    radius="large",
                    resize="vertical",
                ),
                width="100%",
                spacing="2",
                align_items="start",
            ),

            # Dimensions selector
            rx.vstack(
                rx.text("Dimensiones", weight="medium", size="2"),
                rx.select(
                    GENERATION_SIZE_OPTIONS,
                    value=GenerationState.selected_size_option,
                    on_change=GenerationState.set_selected_size,
                    width="100%",
                    size="3",
                    radius="large",
                ),
                rx.cond(
                    GenerationState.selected_size == CUSTOM_SIZE_OPTION,
                    rx.hstack(
                        rx.input(
                            placeholder="Width",
                            value=GenerationState.custom_width,
                            on_change=GenerationState.set_custom_width,
                            width="100%",
                            size="3",
                            radius="large",
                            type="number",
                            min="1",
                        ),
                        rx.input(
                            placeholder="Height",
                            value=GenerationState.custom_height,
                            on_change=GenerationState.set_custom_height,
                            width="100%",
                            size="3",
                            radius="large",
                            type="number",
                            min="1",
                        ),
                        width="100%",
                        spacing="3",
                        flex_wrap=rx.breakpoints(initial="wrap", sm="nowrap"),
                    ),
                    rx.fragment(),
                ),
                width="100%",
                spacing="2",
                align_items="start",
            ),

            # Prompt Template Selector
            rx.cond(
                GenerationState.has_prompt_templates,
                rx.vstack(
                    rx.hstack(
                        rx.text("Plantilla de prompt", weight="medium", size="2"),
                        rx.badge("Opcional", color_scheme="gray", variant="soft", size="1"),
                        spacing="2",
                        align_items="center",
                    ),
                    rx.select(
                        GenerationState.template_options,
                        placeholder="Sin plantilla (opcional)",
                        on_change=GenerationState.set_selected_template_by_name,
                        width="100%",
                        size="3",
                        radius="large",
                    ),
                    width="100%",
                    spacing="2",
                    align_items="start",
                ),
                rx.fragment(),
            ),

            # Cost Info
            rx.box(
                rx.hstack(
                    rx.hstack(
                        rx.icon(tag="image", size=14, color=rx.color("amber", 11)),
                        rx.text("Costo:", size="2", weight="medium"),
                        rx.text("1 Imagen", size="2", color=rx.color("gray", 11)),
                        spacing="2",
                        align_items="center",
                    ),
                    rx.hstack(
                        rx.text("Balance:", size="2", weight="medium"),
                        rx.badge(
                            rx.hstack(
                                rx.text(GenerationState.tokens_remaining),
                                rx.text("Imágenes"),
                                spacing="1",
                                align_items="center",
                            ),
                            color_scheme="amber",
                            variant="soft",
                            radius="full",
                        ),
                        spacing="2",
                        align_items="center",
                    ),
                    width="100%",
                    justify_content="space-between",
                    flex_wrap="wrap",
                    gap="2",
                ),
                width="100%",
                padding="3",
                background_color=rx.color("gray", 2),
                border_radius="lg",
            ),

            # Generate Button
            rx.button(
                rx.hstack(
                    rx.cond(
                        GenerationState.is_loading,
                        rx.spinner(size="1"),
                        rx.icon(tag="sparkles", size=16),
                    ),
                    rx.text(
                        rx.cond(GenerationState.is_loading, "Generating...", "Generate"),
                        weight="medium",
                    ),
                    spacing="2",
                    align_items="center",
                ),
                on_click=GenerationState.start_generation,
                disabled=GenerationState.is_loading,
                color_scheme="blue",
                size="3",
                radius="large",
                width="100%",
                _hover=rx.cond(
                    GenerationState.is_loading,
                    {},
                    BUTTON_HOVER,
                ),
            ),
            rx.cond(
                GenerationState.generation_error != "",
                rx.callout(
                    GenerationState.generation_error,
                    color_scheme="red",
                    icon="triangle-alert",
                ),
                rx.fragment(),
            ),
            spacing="4",
            width="100%",
            align_items="stretch",
        ),
        size="4",
        radius="large",
        width="100%",
        box_shadow=CARD_SHADOW,
        _hover={"box_shadow": CARD_SHADOW_LG, "transition": "box-shadow 0.3s ease"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: CURRENT RESULT PANEL
# ─────────────────────────────────────────────────────────────────────────────

def _current_result_panel() -> rx.Component:
    """Panel showing the latest generation result."""
    return rx.card(
        rx.vstack(
            rx.hstack(
                rx.heading("Current Result", size=rx.breakpoints(initial="5", md="6"), weight="bold"),
                rx.cond(
                    GenerationState.is_loading,
                    rx.badge(
                        rx.hstack(
                            rx.spinner(size="1"),
                            rx.text("Processing", size="1"),
                            spacing="2",
                            align_items="center",
                        ),
                        color_scheme="orange",
                        variant="soft",
                        radius="full",
                    ),
                    rx.badge(
                        rx.hstack(
                            rx.box(width="6px", height="6px", background_color="var(--green-9)", border_radius="full"),
                            rx.text("Ready", size="1"),
                            spacing="2",
                            align_items="center",
                        ),
                        color_scheme="green",
                        variant="soft",
                        radius="full",
                    ),
                ),
                width="100%",
                justify_content="space-between",
                align_items="center",
            ),
            rx.cond(
                GenerationState.is_loading,
                rx.skeleton(
                    width="100%",
                    height="min(580px, 68vh)",
                    radius="large",
                ),
                rx.cond(
                    GenerationState.current_result_url != "",
                    rx.box(
                        rx.cond(
                            GenerationState.current_result_media_type == "Video",
                            rx.video(
                                src=GenerationState.current_result_url,
                                controls=True,
                                width="100%",
                                height="min(580px, 68vh)",
                                border_radius="var(--radius-3)",
                            ),
                            rx.image(
                                src=GenerationState.current_result_url,
                                width="100%",
                                height="min(580px, 68vh)",
                                object_fit="cover",
                                border_radius="var(--radius-3)",
                                _hover=IMAGE_HOVER,
                            ),
                        ),
                        width="100%",
                        overflow="hidden",
                        border_radius="var(--radius-3)",
                    ),
                    rx.center(
                        rx.vstack(
                            rx.box(
                                rx.icon(tag="image", size=32, color=rx.color("gray", 9)),
                                padding="4",
                                background_color=rx.color("gray", 3),
                                border_radius="full",
                            ),
                            rx.vstack(
                                rx.text("No generation yet", weight="medium", color=rx.color("gray", 11)),
                                rx.text(
                                    "Your latest creation will appear here",
                                    color=rx.color("gray", 10),
                                    size="2",
                                    text_align="center",
                                ),
                                spacing="1",
                                align_items="center",
                            ),
                            spacing="4",
                            align_items="center",
                        ),
                        height="min(580px, 68vh)",
                        width="100%",
                        background_color=rx.color("gray", 2),
                        border_radius="var(--radius-3)",
                        border="2px dashed",
                        border_color=rx.color("gray", 5),
                    ),
                ),
            ),
            spacing="4",
            width="100%",
            align_items="stretch",
        ),
        size="4",
        radius="large",
        width="100%",
        box_shadow=CARD_SHADOW,
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: GALLERY ITEM
# ─────────────────────────────────────────────────────────────────────────────

def _gallery_item(item: dict) -> rx.Component:
    """Individual gallery card for past generations."""
    gallery_card = rx.card(
        rx.vstack(
            rx.box(
                rx.cond(
                    item["media_type"] == "Video",
                    rx.video(
                        src=item["url"],
                        width="100%",
                        height="220px",
                        controls=True,
                        border_radius="0",
                    ),
                    rx.image(
                        src=item["url"],
                        alt=item["prompt"],
                        width="100%",
                        height="220px",
                        object_fit="cover",
                        _hover=IMAGE_HOVER,
                    ),
                ),
                rx.hstack(
                    rx.badge(
                        item["media_type"],
                        color_scheme=rx.cond(item["media_type"] == "Video", "orange", "blue"),
                        variant="solid",
                        radius="full",
                        size="1",
                    ),
                    spacing="2",
                    position="absolute",
                    top="2",
                    left="2",
                ),
                width="100%",
                position="relative",
                overflow="hidden",
            ),
            rx.vstack(
                rx.text(
                    item["prompt"],
                    size="2",
                    color=rx.color("gray", 11),
                    style={
                        "display": "-webkit-box",
                        "-webkit-line-clamp": "2",
                        "-webkit-box-orient": "vertical",
                        "overflow": "hidden",
                    },
                ),
                rx.cond(
                    item["created_at"] != "",
                    rx.text(
                        item["created_at"],
                        size="1",
                        color=rx.color("gray", 9),
                    ),
                    rx.fragment(),
                ),
                # Tarea 3 y 5: Action buttons row
                rx.hstack(
                    rx.button(
                        rx.hstack(
                            rx.icon(tag="pencil", size=12),
                            rx.text("Editar", size="1"),
                            spacing="1",
                            align_items="center",
                        ),
                        on_click=GenerationState.start_edit(item["id"], item["edit_count"]),
                        variant="soft",
                        color_scheme="blue",
                        size="1",
                        radius="large",
                    ),
                    rx.button(
                        rx.hstack(
                            rx.icon(tag="flag", size=12),
                            rx.text("Reportar", size="1"),
                            spacing="1",
                            align_items="center",
                        ),
                        on_click=GenerationState.open_report_modal(item["id"]),
                        variant="soft",
                        color_scheme="red",
                        size="1",
                        radius="large",
                    ),
                    spacing="2",
                    width="100%",
                ),
                width="100%",
                spacing="1",
                align_items="start",
                padding="3",
            ),
            spacing="0",
            width="100%",
            align_items="stretch",
        ),
        size="1",
        radius="large",
        padding="0",
        overflow="hidden",
        width="100%",
        box_shadow=CARD_SHADOW,
        _hover=CARD_HOVER,
        cursor="pointer",
    )

    return rx.dialog.root(
        rx.dialog.trigger(gallery_card),
        rx.dialog.content(
            rx.box(
                rx.dialog.close(
                    rx.button(
                        rx.icon(tag="x", size=16),
                        variant="ghost",
                        color_scheme="gray",
                        size="2",
                        radius="full",
                    )
                ),
                position="absolute",
                top="3",
                right="3",
                z_index="20",
            ),
            rx.dialog.title("Detalles de Generación"),
            rx.box(
                rx.cond(
                    item["media_type"] == "Video",
                    rx.video(
                        src=item["url"],
                        width="100%",
                        controls=True,
                        style={"maxHeight": "60vh", "objectFit": "contain"},
                    ),
                    rx.image(
                        src=item["url"],
                        alt=item["prompt"],
                        width="100%",
                        object_fit="contain",
                        style={"maxHeight": "60vh"},
                        border_radius="var(--radius-3)",
                    ),
                ),
                width="100%",
                display="flex",
                justify_content="center",
                align_items="center",
                background_color=rx.color("gray", 2),
                border_radius="var(--radius-3)",
                overflow="hidden",
            ),
            rx.vstack(
                rx.hstack(
                    rx.badge(
                        item["media_type"],
                        color_scheme=rx.cond(item["media_type"] == "Video", "orange", "blue"),
                        variant="soft",
                        radius="full",
                    ),
                    rx.cond(
                        item["created_at"] != "",
                        rx.badge(
                            item["created_at"],
                            color_scheme="gray",
                            variant="soft",
                            radius="full",
                        ),
                        rx.fragment(),
                    ),
                    spacing="2",
                    flex_wrap="wrap",
                ),
                rx.text(
                    item["prompt"],
                    size="3",
                    color=rx.color("gray", 11),
                    width="100%",
                ),
                rx.hstack(
                    rx.link(
                        rx.button(
                            rx.hstack(
                                rx.icon(tag="download", size=14),
                                rx.text("Descargar"),
                                spacing="2",
                                align_items="center",
                            ),
                            variant="soft",
                            color_scheme="blue",
                            radius="large",
                        ),
                        href=item["url"],
                        is_external=True,
                        download=True,
                    ),
                    rx.dialog.close(
                        rx.button(
                            rx.hstack(
                                rx.icon(tag="pencil", size=14),
                                rx.text("Editar"),
                                spacing="2",
                                align_items="center",
                            ),
                            on_click=GenerationState.start_edit(item["id"], item["edit_count"]),
                            variant="soft",
                            color_scheme="blue",
                            radius="large",
                        ),
                    ),
                    rx.dialog.close(
                        rx.button(
                            rx.hstack(
                                rx.icon(tag="flag", size=14),
                                rx.text("Reportar"),
                                spacing="2",
                                align_items="center",
                            ),
                            on_click=GenerationState.open_report_modal(item["id"]),
                            variant="soft",
                            color_scheme="red",
                            radius="large",
                        ),
                    ),
                    spacing="2",
                    flex_wrap="wrap",
                ),
                spacing="3",
                width="100%",
                align_items="start",
            ),
            width="95vw",
            max_width="800px",
            max_height="90vh",
            overflow_y="auto",
            radius="large",
            box_shadow=CARD_SHADOW_LG,
            padding="4",
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: GALLERY PANEL
# ─────────────────────────────────────────────────────────────────────────────

def _gallery_panel() -> rx.Component:
    """Grid of past generation results."""
    return rx.card(
        rx.vstack(
            rx.hstack(
                rx.vstack(
                    rx.heading("Gallery", size=rx.breakpoints(initial="5", md="6"), weight="bold"),
                    rx.text("Your recent generations", size="2", color=rx.color("gray", 11)),
                    spacing="1",
                    align_items="start",
                ),
                rx.badge(
                    rx.hstack(
                        rx.text(GenerationState.gallery.length(), size="1"),
                        rx.text("items", size="1"),
                        spacing="1",
                        align_items="center",
                    ),
                    color_scheme="gray",
                    variant="soft",
                    radius="full",
                ),
                width="100%",
                justify_content="space-between",
                align_items="start",
            ),
            rx.cond(
                GenerationState.gallery.length() == 0,
                rx.center(
                    rx.text("No generated items yet.", color=rx.color("gray", 10)),
                    width="100%",
                    padding_y="6",
                ),
                rx.grid(
                    rx.foreach(GenerationState.gallery, _gallery_item),
                    columns=rx.breakpoints(initial="1", sm="2", lg="2", xl="3"),
                    spacing="4",
                    width="100%",
                ),
            ),
            spacing="4",
            width="100%",
            align_items="stretch",
        ),
        size="4",
        radius="large",
        width="100%",
        box_shadow=CARD_SHADOW,
    )


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

def dashboard_page() -> rx.Component:
    """Authenticated dashboard page with responsive layout."""
    return protected_layout(
        rx.box(
            # Main responsive flex layout: column on mobile, row on desktop
            rx.flex(
                # Left Column: Generation Control (100% mobile, ~30% desktop)
                rx.box(
                    _generation_control_panel(),
                    width=rx.breakpoints(initial="100%", lg="380px", xl="420px"),
                    flex_shrink="0",
                ),
                # Right Column: Result + Gallery (100% mobile, ~70% desktop)
                rx.box(
                    rx.vstack(
                        _current_result_panel(),
                        _gallery_panel(),
                        spacing="6",
                        width="100%",
                        align_items="stretch",
                    ),
                    width="100%",
                    flex_grow="1",
                    min_width="0",  # Prevents flex overflow
                ),
                direction=rx.breakpoints(initial="column", lg="row"),
                spacing="6",
                width="100%",
                align_items="start",
            ),
            # Tarea 3: Report modal (global to dashboard)
            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.hstack(
                            rx.dialog.title("Reportar imagen"),
                            rx.dialog.close(
                                rx.button(
                                    rx.icon(tag="x", size=14),
                                    variant="ghost",
                                    color_scheme="gray",
                                    radius="full",
                                    size="1",
                                )
                            ),
                            width="100%",
                            justify_content="space-between",
                            align_items="center",
                        ),
                        rx.text(
                            "¿Por qué reportas esta imagen?",
                            size="2",
                            color=rx.color("gray", 11),
                        ),
                        rx.text_area(
                            placeholder="Describe el problema con esta imagen...",
                            value=GenerationState.report_reason,
                            on_change=GenerationState.set_report_reason,
                            width="100%",
                            min_height="120px",
                            size="3",
                            radius="large",
                            resize="vertical",
                        ),
                        rx.cond(
                            GenerationState.report_success != "",
                            rx.callout(
                                GenerationState.report_success,
                                color_scheme="green",
                                width="100%",
                            ),
                            rx.fragment(),
                        ),
                        rx.hstack(
                            rx.dialog.close(
                                rx.button(
                                    "Cancelar",
                                    on_click=GenerationState.close_report_modal,
                                    variant="soft",
                                    color_scheme="gray",
                                    radius="large",
                                ),
                            ),
                            rx.button(
                                rx.hstack(
                                    rx.cond(
                                        GenerationState.report_submitting,
                                        rx.spinner(size="1"),
                                        rx.icon(tag="flag", size=14),
                                    ),
                                    rx.text(
                                        rx.cond(
                                            GenerationState.report_submitting,
                                            "Enviando...",
                                            "Enviar reporte",
                                        )
                                    ),
                                    spacing="2",
                                    align_items="center",
                                ),
                                on_click=GenerationState.submit_report,
                                disabled=GenerationState.report_submitting,
                                color_scheme="red",
                                radius="large",
                            ),
                            width="100%",
                            justify_content="end",
                            spacing="2",
                        ),
                        spacing="4",
                        width="100%",
                        align_items="stretch",
                    ),
                    max_width="460px",
                    width="95vw",
                    radius="large",
                    box_shadow=CARD_SHADOW_LG,
                    padding="5",
                ),
                open=GenerationState.report_modal_open,
                on_open_change=GenerationState.set_report_modal_open,
            ),
            width="100%",
            max_width="1600px",
            margin_x="auto",
        ),
        title="Dashboard",
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT: ADMIN TABLE COMPONENTS
# ─────────────────────────────────────────────────────────────────────────────

def _role_badge(role: str) -> rx.Component:
    """Badge component for user roles."""
    return rx.badge(
        role,
        color_scheme=rx.cond(role == "ADMIN", "red", rx.cond(role == "VENDOR", "violet", "blue")),
        variant="soft",
        radius="full",
    )


def _quota_meter(fill: str) -> rx.Component:
    """Visual quota usage meter."""
    return rx.box(
        rx.box(
            width=fill,
            height="100%",
            background="linear-gradient(90deg, var(--blue-9), var(--blue-10))",
            border_radius="full",
            transition="width 0.3s ease",
        ),
        width=rx.breakpoints(initial="80px", sm="100px", md="120px"),
        height="8px",
        background_color=rx.color("gray", 4),
        border_radius="full",
        overflow="hidden",
    )


def _admin_row(user: dict) -> rx.Component:
    """Table row for admin user management."""
    return rx.table.row(
        rx.table.cell(
            rx.hstack(
                rx.avatar(fallback="AI", size="1", radius="full"),
                rx.text(user["email"], size="2", weight="medium"),
                spacing="2",
                align_items="center",
            ),
            min_width="200px",
        ),
        rx.table.cell(_role_badge(user["role"])),
        rx.table.cell(
            rx.vstack(
                rx.text(f"{user['quota_used']} / {user['quota_limit']}", size="2", weight="medium"),
                _quota_meter(user["quota_fill"]),
                spacing="1",
                align_items="start",
            ),
            min_width="160px",
        ),
        rx.table.cell(
            rx.cond(
                user["is_unlimited"],
                rx.badge("Sin límite", color_scheme="green", variant="soft", radius="full", size="1"),
                rx.badge("Limitado", color_scheme="gray", variant="soft", radius="full", size="1"),
            ),
            min_width="100px",
        ),
        rx.table.cell(
            rx.text(
                "$",
                rx.text.span(user["total_cost_usd"].to_string()),
                size="2",
                weight="medium",
                color=rx.color("green", 11),
            ),
            min_width="110px",
        ),
        rx.table.cell(
            rx.hstack(
                rx.button(
                    rx.hstack(
                        rx.icon(tag="pencil", size=12),
                        rx.text("Editar", size="1"),
                        spacing="1",
                        align_items="center",
                    ),
                    on_click=GenerationState.open_edit_modal(user),
                    variant="soft",
                    color_scheme="gray",
                    size="1",
                    radius="large",
                    _hover=BUTTON_HOVER,
                ),
                rx.button(
                    rx.icon(tag="rotate-ccw", size=12),
                    on_click=GenerationState.reset_user_quota(user),
                    variant="soft",
                    color_scheme="amber",
                    size="1",
                    radius="large",
                    title="Resetear cuota",
                    _hover=BUTTON_HOVER,
                ),
                rx.button(
                    rx.icon(tag="trash-2", size=12),
                    on_click=GenerationState.open_delete_modal(user),
                    variant="soft",
                    color_scheme="red",
                    size="1",
                    radius="large",
                    title="Eliminar usuario",
                    _hover=BUTTON_HOVER,
                ),
                spacing="2",
                flex_wrap="wrap",
            ),
            min_width="160px",
        ),
        _hover={"background_color": rx.color("gray", 2)},
    )


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: ADMIN
# ─────────────────────────────────────────────────────────────────────────────

def admin_page() -> rx.Component:
    """Authenticated admin page with mobile-friendly scrollable table."""
    return protected_layout(
        rx.vstack(
            # ── Stats cards ──────────────────────────────────────────────────
            rx.grid(
                rx.card(
                    rx.vstack(
                        rx.hstack(
                            rx.icon(tag="users", size=20, color=rx.color("blue", 9)),
                            rx.text("Total Usuarios", size="2", color=rx.color("gray", 11), weight="medium"),
                            spacing="2",
                            align_items="center",
                        ),
                        rx.heading(
                            GenerationState.admin_stats_total_users,
                            size="7",
                            weight="bold",
                        ),
                        spacing="2",
                        align_items="start",
                    ),
                    size="3",
                    radius="large",
                    box_shadow=CARD_SHADOW,
                ),
                rx.card(
                    rx.vstack(
                        rx.hstack(
                            rx.icon(tag="image", size=20, color=rx.color("violet", 9)),
                            rx.text("Media Generada", size="2", color=rx.color("gray", 11), weight="medium"),
                            spacing="2",
                            align_items="center",
                        ),
                        rx.heading(
                            GenerationState.admin_stats_total_media,
                            size="7",
                            weight="bold",
                        ),
                        spacing="2",
                        align_items="start",
                    ),
                    size="3",
                    radius="large",
                    box_shadow=CARD_SHADOW,
                ),
                rx.card(
                    rx.vstack(
                        rx.hstack(
                            rx.icon(tag="shield", size=20, color=rx.color("red", 9)),
                            rx.text("Admins", size="2", color=rx.color("gray", 11), weight="medium"),
                            spacing="2",
                            align_items="center",
                        ),
                        rx.heading(
                            GenerationState.admin_stats_admin_count,
                            size="7",
                            weight="bold",
                        ),
                        spacing="2",
                        align_items="start",
                    ),
                    size="3",
                    radius="large",
                    box_shadow=CARD_SHADOW,
                ),
                rx.card(
                    rx.vstack(
                        rx.hstack(
                            rx.icon(tag="dollar-sign", size=20, color=rx.color("green", 9)),
                            rx.text("Gasto Total (USD)", size="2", color=rx.color("gray", 11), weight="medium"),
                            spacing="2",
                            align_items="center",
                        ),
                        rx.heading(
                            GenerationState.admin_stats_total_cost_usd_str,
                            size="7",
                            weight="bold",
                        ),
                        spacing="2",
                        align_items="start",
                    ),
                    size="3",
                    radius="large",
                    box_shadow=CARD_SHADOW,
                ),
                columns=rx.breakpoints(initial="1", sm="4"),
                spacing="4",
                width="100%",
            ),

            # ── Users table card ─────────────────────────────────────────────
            rx.card(
                rx.vstack(
                    # Header
                    rx.hstack(
                        rx.vstack(
                            rx.heading(
                                "Gestión de Usuarios",
                                size=rx.breakpoints(initial="5", md="6"),
                                weight="bold",
                            ),
                            rx.text(
                                "Controla límites, roles y acceso de los usuarios.",
                                size="2",
                                color=rx.color("gray", 11),
                            ),
                            spacing="1",
                            align_items="start",
                        ),
                        rx.badge(
                            rx.hstack(
                                rx.icon(tag="lock", size=12),
                                rx.text("Admin Only", size="1"),
                                spacing="1",
                                align_items="center",
                            ),
                            color_scheme="gray",
                            variant="soft",
                            radius="full",
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="start",
                        flex_wrap="wrap",
                        gap="2",
                    ),

                    rx.divider(),

                    # Search + Create
                    rx.hstack(
                        rx.input(
                            placeholder="Buscar por email...",
                            value=GenerationState.users_search,
                            on_change=GenerationState.set_users_search,
                            size="2",
                            radius="large",
                            width=rx.breakpoints(initial="100%", sm="300px"),
                        ),
                        rx.button(
                            rx.hstack(
                                rx.icon(tag="user-plus", size=14),
                                rx.text("Crear usuario", weight="medium"),
                                spacing="2",
                                align_items="center",
                            ),
                            on_click=GenerationState.open_create_user_modal,
                            color_scheme="blue",
                            radius="large",
                            size="2",
                            _hover=BUTTON_HOVER,
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="center",
                        flex_wrap="wrap",
                        gap="3",
                    ),

                    # Scrollable table wrapper for mobile
                    rx.box(
                        rx.vstack(
                            rx.cond(
                                GenerationState.users_loading,
                                rx.hstack(
                                    rx.spinner(size="2"),
                                    rx.text("Cargando usuarios...", size="2", color=rx.color("gray", 11)),
                                    spacing="2",
                                    align_items="center",
                                ),
                                rx.fragment(),
                            ),
                            rx.cond(
                                GenerationState.users_error != "",
                                rx.callout(GenerationState.users_error, color_scheme="red", width="100%"),
                                rx.fragment(),
                            ),
                            rx.table.root(
                                rx.table.header(
                                    rx.table.row(
                                        rx.table.column_header_cell(
                                            rx.text("Usuario", weight="medium", size="2"),
                                            min_width="200px",
                                        ),
                                        rx.table.column_header_cell(
                                            rx.text("Rol", weight="medium", size="2"),
                                            min_width="80px",
                                        ),
                                        rx.table.column_header_cell(
                                            rx.text("Cuota Usada / Límite", weight="medium", size="2"),
                                            min_width="160px",
                                        ),
                                        rx.table.column_header_cell(
                                            rx.text("Sin Límite", weight="medium", size="2"),
                                            min_width="100px",
                                        ),
                                        rx.table.column_header_cell(
                                            rx.text("Gasto ($USD)", weight="medium", size="2"),
                                            min_width="110px",
                                        ),
                                        rx.table.column_header_cell(
                                            rx.text("Acciones", weight="medium", size="2"),
                                            min_width="160px",
                                        ),
                                    ),
                                ),
                                rx.table.body(rx.foreach(GenerationState.filtered_users, _admin_row)),
                                variant="surface",
                                size="2",
                                width="100%",
                            ),
                            spacing="3",
                            width="100%",
                        ),
                        width="100%",
                        overflow_x="auto",
                        style={"-webkit-overflow-scrolling": "touch"},
                    ),

                    spacing="4",
                    width="100%",
                    align_items="stretch",
                ),
                size="4",
                radius="large",
                width="100%",
                box_shadow=CARD_SHADOW,
            ),

            # ── Edit user dialog ─────────────────────────────────────────────
            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.hstack(
                            rx.dialog.title("Editar Usuario"),
                            rx.dialog.close(
                                rx.button(
                                    rx.icon(tag="x", size=14),
                                    variant="ghost",
                                    color_scheme="gray",
                                    radius="full",
                                    size="1",
                                )
                            ),
                            width="100%",
                            justify_content="space-between",
                            align_items="center",
                        ),
                        rx.vstack(
                            rx.text("Límite diario de generaciones", size="2", weight="medium"),
                            rx.input(
                                type="number",
                                min=0,
                                value=GenerationState.new_daily_limit,
                                on_change=GenerationState.set_new_daily_limit,
                                width="100%",
                                size="3",
                                radius="large",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                        ),
                        rx.vstack(
                            rx.text("Rol", size="2", weight="medium"),
                            rx.select(
                                ["CREATOR", "ADMIN", "VENDOR"],
                                value=GenerationState.editing_user_role,
                                on_change=GenerationState.set_editing_user_role,
                                width="100%",
                                size="3",
                                radius="large",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                        ),
                        rx.hstack(
                            rx.vstack(
                                rx.text("Sin límite de cuota", size="2", weight="medium"),
                                rx.text(
                                    "El usuario puede generar sin restricciones",
                                    size="1",
                                    color=rx.color("gray", 10),
                                ),
                                spacing="0",
                                align_items="start",
                            ),
                            rx.switch(
                                checked=GenerationState.editing_user_unlimited,
                                on_change=GenerationState.set_editing_user_unlimited,
                            ),
                            width="100%",
                            justify_content="space-between",
                            align_items="center",
                        ),
                        rx.cond(
                            GenerationState.edit_error != "",
                            rx.callout(GenerationState.edit_error, color_scheme="red", width="100%"),
                            rx.fragment(),
                        ),
                        rx.hstack(
                            rx.button(
                                "Cancelar",
                                on_click=GenerationState.close_edit_modal,
                                variant="soft",
                                color_scheme="gray",
                                radius="large",
                            ),
                            rx.button(
                                rx.hstack(
                                    rx.cond(
                                        GenerationState.is_saving_user,
                                        rx.spinner(size="1"),
                                        rx.icon(tag="check", size=14),
                                    ),
                                    rx.text(
                                        rx.cond(
                                            GenerationState.is_saving_user,
                                            "Guardando...",
                                            "Guardar Cambios",
                                        )
                                    ),
                                    spacing="2",
                                    align_items="center",
                                ),
                                on_click=GenerationState.save_user_changes,
                                disabled=GenerationState.is_saving_user,
                                color_scheme="blue",
                                radius="large",
                            ),
                            width="100%",
                            justify_content="end",
                            spacing="2",
                        ),
                        spacing="4",
                        width="100%",
                        align_items="stretch",
                    ),
                    max_width="460px",
                    width="95vw",
                    radius="large",
                    box_shadow=CARD_SHADOW_LG,
                    padding="5",
                ),
                open=GenerationState.is_edit_modal_open,
                on_open_change=GenerationState.set_edit_modal_open,
            ),

            # ── Create user dialog ───────────────────────────────────────────
            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.hstack(
                            rx.dialog.title("Crear Usuario"),
                            rx.dialog.close(
                                rx.button(
                                    rx.icon(tag="x", size=14),
                                    variant="ghost",
                                    color_scheme="gray",
                                    radius="full",
                                    size="1",
                                )
                            ),
                            width="100%",
                            justify_content="space-between",
                            align_items="center",
                        ),
                        rx.vstack(
                            rx.text("Email", size="2", weight="medium"),
                            rx.input(
                                placeholder="usuario@ejemplo.com",
                                type="email",
                                value=GenerationState.new_user_email,
                                on_change=GenerationState.set_new_user_email,
                                width="100%",
                                size="3",
                                radius="large",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                        ),
                        rx.vstack(
                            rx.text("Rol", size="2", weight="medium"),
                            rx.select(
                                ["CREATOR", "ADMIN", "VENDOR"],
                                value=GenerationState.new_user_role,
                                on_change=GenerationState.set_new_user_role,
                                width="100%",
                                size="3",
                                radius="large",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                        ),
                        rx.vstack(
                            rx.text("Límite diario", size="2", weight="medium"),
                            rx.input(
                                type="number",
                                min=0,
                                value=GenerationState.new_user_daily_limit,
                                on_change=GenerationState.set_new_user_daily_limit,
                                width="100%",
                                size="3",
                                radius="large",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                        ),
                        rx.hstack(
                            rx.vstack(
                                rx.text("Sin límite de cuota", size="2", weight="medium"),
                                rx.text("El usuario puede generar sin restricciones", size="1", color=rx.color("gray", 10)),
                                spacing="0",
                                align_items="start",
                            ),
                            rx.switch(
                                checked=GenerationState.new_user_is_unlimited,
                                on_change=GenerationState.set_new_user_is_unlimited,
                            ),
                            width="100%",
                            justify_content="space-between",
                            align_items="center",
                        ),
                        rx.cond(
                            GenerationState.create_user_error != "",
                            rx.callout(GenerationState.create_user_error, color_scheme="red", width="100%"),
                            rx.fragment(),
                        ),
                        rx.hstack(
                            rx.button(
                                "Cancelar",
                                on_click=GenerationState.close_create_user_modal,
                                variant="soft",
                                color_scheme="gray",
                                radius="large",
                            ),
                            rx.button(
                                rx.hstack(
                                    rx.cond(
                                        GenerationState.is_creating_user,
                                        rx.spinner(size="1"),
                                        rx.icon(tag="user-plus", size=14),
                                    ),
                                    rx.text(
                                        rx.cond(
                                            GenerationState.is_creating_user,
                                            "Creando...",
                                            "Crear Usuario",
                                        )
                                    ),
                                    spacing="2",
                                    align_items="center",
                                ),
                                on_click=GenerationState.create_user,
                                disabled=GenerationState.is_creating_user,
                                color_scheme="blue",
                                radius="large",
                            ),
                            width="100%",
                            justify_content="end",
                            spacing="2",
                        ),
                        spacing="4",
                        width="100%",
                        align_items="stretch",
                    ),
                    max_width="460px",
                    width="95vw",
                    radius="large",
                    box_shadow=CARD_SHADOW_LG,
                    padding="5",
                ),
                open=GenerationState.is_create_user_modal_open,
                on_open_change=GenerationState.set_create_user_modal_open,
            ),

            # ── Delete confirmation dialog ────────────────────────────────────
            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.hstack(
                            rx.box(
                                rx.icon(tag="triangle-alert", size=20, color=rx.color("red", 9)),
                                padding="2",
                                background_color=rx.color("red", 3),
                                border_radius="lg",
                            ),
                            rx.dialog.title("Confirmar Eliminación"),
                            spacing="3",
                            align_items="center",
                        ),
                        rx.text(
                            "¿Estás seguro de que quieres eliminar al usuario ",
                            rx.text(GenerationState.confirm_delete_user_email, weight="bold", as_="span"),
                            "? Esta acción es permanente e irreversible.",
                            size="3",
                            color=rx.color("gray", 11),
                        ),
                        rx.hstack(
                            rx.button(
                                "Cancelar",
                                on_click=GenerationState.close_delete_modal,
                                variant="soft",
                                color_scheme="gray",
                                radius="large",
                            ),
                            rx.button(
                                rx.hstack(
                                    rx.cond(
                                        GenerationState.is_deleting_user,
                                        rx.spinner(size="1"),
                                        rx.icon(tag="trash-2", size=14),
                                    ),
                                    rx.text(
                                        rx.cond(
                                            GenerationState.is_deleting_user,
                                            "Eliminando...",
                                            "Eliminar",
                                        )
                                    ),
                                    spacing="2",
                                    align_items="center",
                                ),
                                on_click=GenerationState.confirm_delete_user,
                                disabled=GenerationState.is_deleting_user,
                                color_scheme="red",
                                radius="large",
                            ),
                            width="100%",
                            justify_content="end",
                            spacing="2",
                        ),
                        spacing="4",
                        width="100%",
                        align_items="stretch",
                    ),
                    max_width="420px",
                    width="95vw",
                    radius="large",
                    box_shadow=CARD_SHADOW_LG,
                    padding="5",
                ),
                open=GenerationState.is_delete_modal_open,
                on_open_change=GenerationState.set_delete_modal_open,
            ),

            # ── Tarea 4: Pending Reports section ─────────────────────────────
            rx.card(
                rx.vstack(
                    rx.hstack(
                        rx.vstack(
                            rx.heading("Reportes Pendientes", size=rx.breakpoints(initial="5", md="6"), weight="bold"),
                            rx.text("Imágenes reportadas por usuarios.", size="2", color=rx.color("gray", 11)),
                            spacing="1",
                            align_items="start",
                        ),
                        rx.badge(
                            rx.hstack(
                                rx.icon(tag="flag", size=12),
                                rx.text(GenerationState.admin_reports.length(), size="1", weight="bold"),
                                rx.text("pendientes", size="1"),
                                spacing="1",
                                align_items="center",
                            ),
                            color_scheme="red",
                            variant="soft",
                            radius="full",
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="start",
                        flex_wrap="wrap",
                        gap="2",
                    ),
                    rx.divider(),
                    rx.cond(
                        GenerationState.admin_reports.length() == 0,
                        rx.center(
                            rx.text("No hay reportes pendientes.", color=rx.color("gray", 10)),
                            width="100%",
                            padding_y="4",
                        ),
                        rx.box(
                            rx.table.root(
                                rx.table.header(
                                    rx.table.row(
                                        rx.table.column_header_cell(rx.text("Imagen ID", size="2", weight="medium"), min_width="140px"),
                                        rx.table.column_header_cell(rx.text("Usuario", size="2", weight="medium"), min_width="140px"),
                                        rx.table.column_header_cell(rx.text("Razón", size="2", weight="medium"), min_width="200px"),
                                        rx.table.column_header_cell(rx.text("Fecha", size="2", weight="medium"), min_width="120px"),
                                        rx.table.column_header_cell(rx.text("Acciones", size="2", weight="medium"), min_width="160px"),
                                    ),
                                ),
                                rx.table.body(
                                    rx.foreach(
                                        GenerationState.admin_reports,
                                        lambda r: rx.table.row(
                                            rx.table.cell(
                                                rx.text(r["media_id"], size="1", color=rx.color("gray", 11), style={"fontFamily": "monospace"}),
                                                min_width="140px",
                                            ),
                                            rx.table.cell(
                                                rx.text(r["user_id"], size="1", color=rx.color("gray", 11), style={"fontFamily": "monospace"}),
                                                min_width="140px",
                                            ),
                                            rx.table.cell(
                                                rx.text(r["reason"], size="2"),
                                                min_width="200px",
                                            ),
                                            rx.table.cell(
                                                rx.text(r["created_at"], size="1", color=rx.color("gray", 10)),
                                                min_width="120px",
                                            ),
                                            rx.table.cell(
                                                rx.hstack(
                                                    rx.button(
                                                        rx.hstack(rx.icon(tag="check", size=12), rx.text("Aprobar", size="1"), spacing="1"),
                                                        on_click=GenerationState.approve_report(r["id"]),
                                                        variant="soft",
                                                        color_scheme="green",
                                                        size="1",
                                                        radius="large",
                                                    ),
                                                    rx.button(
                                                        rx.hstack(rx.icon(tag="x", size=12), rx.text("Rechazar", size="1"), spacing="1"),
                                                        on_click=GenerationState.reject_report(r["id"]),
                                                        variant="soft",
                                                        color_scheme="red",
                                                        size="1",
                                                        radius="large",
                                                    ),
                                                    spacing="2",
                                                ),
                                                min_width="160px",
                                            ),
                                            _hover={"background_color": rx.color("gray", 2)},
                                        ),
                                    ),
                                ),
                                variant="surface",
                                size="2",
                                width="100%",
                            ),
                            width="100%",
                            overflow_x="auto",
                        ),
                    ),
                    spacing="4",
                    width="100%",
                    align_items="stretch",
                ),
                size="4",
                radius="large",
                width="100%",
                box_shadow=CARD_SHADOW,
            ),

            # ── Tarea 6: Gestión de Prompts IA ───────────────────────────────
            rx.card(
                rx.vstack(
                    rx.hstack(
                        rx.vstack(
                            rx.heading("Gestión de Prompts IA", size=rx.breakpoints(initial="5", md="6"), weight="bold"),
                            rx.text("Administra los prompts del sistema y plantillas de usuario.", size="2", color=rx.color("gray", 11)),
                            spacing="1",
                            align_items="start",
                        ),
                        rx.badge(
                            rx.hstack(
                                rx.icon(tag="bot", size=12),
                                rx.text("AI Prompts", size="1"),
                                spacing="1",
                                align_items="center",
                            ),
                            color_scheme="violet",
                            variant="soft",
                            radius="full",
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="start",
                        flex_wrap="wrap",
                        gap="2",
                    ),
                    rx.divider(),

                    # Sub-sección A: Prompt Base
                    rx.vstack(
                        rx.heading("Prompt Base del Sistema", size="4", weight="bold"),
                        # Prompt activo destacado
                        rx.foreach(
                            GenerationState.admin_system_prompts,
                            lambda p: rx.cond(
                                p["is_active"],
                                rx.box(
                                    rx.vstack(
                                        rx.hstack(
                                            rx.badge("ACTIVO", color_scheme="green", variant="solid", radius="full", size="1"),
                                            rx.text(p["name"], weight="bold", size="3"),
                                            spacing="2",
                                            align_items="center",
                                        ),
                                        rx.text(p["content"], size="2", color=rx.color("gray", 11), style={"whiteSpace": "pre-wrap"}),
                                        spacing="2",
                                        align_items="start",
                                        width="100%",
                                    ),
                                    width="100%",
                                    padding="4",
                                    background_color=rx.color("green", 2),
                                    border="1px solid",
                                    border_color=rx.color("green", 6),
                                    border_radius="lg",
                                ),
                                rx.fragment(),
                            ),
                        ),
                        # Tabla de todos los prompts
                        rx.box(
                            rx.table.root(
                                rx.table.header(
                                    rx.table.row(
                                        rx.table.column_header_cell(rx.text("Nombre", size="2", weight="medium"), min_width="140px"),
                                        rx.table.column_header_cell(rx.text("Contenido (preview)", size="2", weight="medium"), min_width="200px"),
                                        rx.table.column_header_cell(rx.text("Activo", size="2", weight="medium"), min_width="80px"),
                                        rx.table.column_header_cell(rx.text("Acciones", size="2", weight="medium"), min_width="160px"),
                                    ),
                                ),
                                rx.table.body(
                                    rx.foreach(
                                        GenerationState.admin_system_prompts,
                                        lambda p: rx.table.row(
                                            rx.table.cell(rx.text(p["name"], size="2", weight="medium"), min_width="140px"),
                                            rx.table.cell(
                                                rx.text(
                                                    p["content"],
                                                    size="1",
                                                    color=rx.color("gray", 11),
                                                    style={
                                                        "display": "-webkit-box",
                                                        "-webkit-line-clamp": "2",
                                                        "-webkit-box-orient": "vertical",
                                                        "overflow": "hidden",
                                                        "maxWidth": "300px",
                                                    },
                                                ),
                                                min_width="200px",
                                            ),
                                            rx.table.cell(
                                                rx.cond(
                                                    p["is_active"],
                                                    rx.badge("Sí", color_scheme="green", variant="soft", radius="full", size="1"),
                                                    rx.badge("No", color_scheme="gray", variant="soft", radius="full", size="1"),
                                                ),
                                                min_width="80px",
                                            ),
                                            rx.table.cell(
                                                rx.hstack(
                                                    rx.button(
                                                        rx.hstack(rx.icon(tag="zap", size=12), rx.text("Activar", size="1"), spacing="1"),
                                                        on_click=GenerationState.activate_system_prompt(p["id"]),
                                                        variant="soft",
                                                        color_scheme="green",
                                                        size="1",
                                                        radius="large",
                                                        disabled=p["is_active"],
                                                    ),
                                                    rx.button(
                                                        rx.icon(tag="trash-2", size=12),
                                                        on_click=GenerationState.delete_system_prompt(p["id"]),
                                                        variant="soft",
                                                        color_scheme="red",
                                                        size="1",
                                                        radius="large",
                                                    ),
                                                    spacing="2",
                                                ),
                                                min_width="160px",
                                            ),
                                            _hover={"background_color": rx.color("gray", 2)},
                                        ),
                                    ),
                                ),
                                variant="surface",
                                size="2",
                                width="100%",
                            ),
                            width="100%",
                            overflow_x="auto",
                        ),
                        # Formulario inline para crear nuevo prompt base
                        rx.vstack(
                            rx.heading("Crear nuevo prompt base", size="3", weight="medium"),
                            rx.input(
                                placeholder="Nombre del prompt",
                                value=GenerationState.new_prompt_name,
                                on_change=GenerationState.set_new_prompt_name,
                                width="100%",
                                size="2",
                                radius="large",
                            ),
                            rx.text_area(
                                placeholder="Contenido del prompt del sistema...",
                                value=GenerationState.new_prompt_content,
                                on_change=GenerationState.set_new_prompt_content,
                                width="100%",
                                min_height="100px",
                                size="2",
                                radius="large",
                                resize="vertical",
                            ),
                            rx.button(
                                rx.hstack(rx.icon(tag="plus", size=14), rx.text("Crear Prompt Base"), spacing="2"),
                                on_click=GenerationState.create_system_prompt,
                                color_scheme="blue",
                                radius="large",
                                size="2",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                            padding="4",
                            background_color=rx.color("gray", 2),
                            border_radius="lg",
                        ),
                        spacing="3",
                        width="100%",
                        align_items="stretch",
                    ),

                    rx.divider(),

                    # Sub-sección B: Plantillas de Usuario
                    rx.vstack(
                        rx.heading("Plantillas de Usuario", size="4", weight="bold"),
                        rx.box(
                            rx.table.root(
                                rx.table.header(
                                    rx.table.row(
                                        rx.table.column_header_cell(rx.text("Nombre", size="2", weight="medium"), min_width="140px"),
                                        rx.table.column_header_cell(rx.text("Descripción", size="2", weight="medium"), min_width="180px"),
                                        rx.table.column_header_cell(rx.text("Activa", size="2", weight="medium"), min_width="80px"),
                                        rx.table.column_header_cell(rx.text("Sort", size="2", weight="medium"), min_width="60px"),
                                        rx.table.column_header_cell(rx.text("Acciones", size="2", weight="medium"), min_width="140px"),
                                    ),
                                ),
                                rx.table.body(
                                    rx.foreach(
                                        GenerationState.admin_prompt_templates,
                                        lambda t: rx.table.row(
                                            rx.table.cell(rx.text(t["name"], size="2", weight="medium"), min_width="140px"),
                                            rx.table.cell(
                                                rx.text(rx.cond(t["description"], t["description"], "—"), size="1", color=rx.color("gray", 11)),
                                                min_width="180px",
                                            ),
                                            rx.table.cell(
                                                rx.switch(
                                                    checked=t["is_active"],
                                                    on_change=GenerationState.toggle_template_active(t["id"], t["is_active"]),
                                                    size="1",
                                                ),
                                                min_width="80px",
                                            ),
                                            rx.table.cell(rx.text(t["sort_order"], size="2"), min_width="60px"),
                                            rx.table.cell(
                                                rx.hstack(
                                                    rx.button(
                                                        rx.icon(tag="trash-2", size=12),
                                                        on_click=GenerationState.delete_prompt_template(t["id"]),
                                                        variant="soft",
                                                        color_scheme="red",
                                                        size="1",
                                                        radius="large",
                                                    ),
                                                    spacing="2",
                                                ),
                                                min_width="140px",
                                            ),
                                            _hover={"background_color": rx.color("gray", 2)},
                                        ),
                                    ),
                                ),
                                variant="surface",
                                size="2",
                                width="100%",
                            ),
                            width="100%",
                            overflow_x="auto",
                        ),
                        # Formulario inline para crear plantilla
                        rx.vstack(
                            rx.heading("Crear nueva plantilla", size="3", weight="medium"),
                            rx.input(
                                placeholder="Nombre",
                                value=GenerationState.new_template_name,
                                on_change=GenerationState.set_new_template_name,
                                width="100%",
                                size="2",
                                radius="large",
                            ),
                            rx.input(
                                placeholder="Descripción (opcional)",
                                value=GenerationState.new_template_description,
                                on_change=GenerationState.set_new_template_description,
                                width="100%",
                                size="2",
                                radius="large",
                            ),
                            rx.text_area(
                                placeholder="Contenido de la plantilla...",
                                value=GenerationState.new_template_content,
                                on_change=GenerationState.set_new_template_content,
                                width="100%",
                                min_height="80px",
                                size="2",
                                radius="large",
                                resize="vertical",
                            ),
                            rx.input(
                                placeholder="Sort order (0, 1, 2...)",
                                value=GenerationState.new_template_sort_order,
                                on_change=GenerationState.set_new_template_sort_order,
                                type="number",
                                min=0,
                                width="100%",
                                size="2",
                                radius="large",
                            ),
                            rx.button(
                                rx.hstack(rx.icon(tag="plus", size=14), rx.text("Crear Plantilla"), spacing="2"),
                                on_click=GenerationState.create_prompt_template,
                                color_scheme="blue",
                                radius="large",
                                size="2",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                            padding="4",
                            background_color=rx.color("gray", 2),
                            border_radius="lg",
                        ),
                        spacing="3",
                        width="100%",
                        align_items="stretch",
                    ),

                    spacing="5",
                    width="100%",
                    align_items="stretch",
                ),
                size="4",
                radius="large",
                width="100%",
                box_shadow=CARD_SHADOW,
            ),

            spacing="5",
            width="100%",
            max_width="1200px",
            margin_x="auto",
            align_items="stretch",
        ),
        title="Admin Panel",
    )


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: VENDOR PANEL (Tarea 2)
# ─────────────────────────────────────────────────────────────────────────────

def vendor_page() -> rx.Component:
    """Vendor panel — manage users created by this vendor account."""
    return protected_layout(
        rx.vstack(
            # Users table card
            rx.card(
                rx.vstack(
                    rx.hstack(
                        rx.vstack(
                            rx.heading("Panel de Vendedor", size=rx.breakpoints(initial="5", md="6"), weight="bold"),
                            rx.text("Usuarios que has creado como vendedor.", size="2", color=rx.color("gray", 11)),
                            spacing="1",
                            align_items="start",
                        ),
                        rx.button(
                            rx.hstack(
                                rx.icon(tag="user-plus", size=14),
                                rx.text("Nuevo Usuario", weight="medium"),
                                spacing="2",
                                align_items="center",
                            ),
                            on_click=GenerationState.open_vendor_user_modal,
                            color_scheme="blue",
                            radius="large",
                            size="2",
                            _hover=BUTTON_HOVER,
                        ),
                        width="100%",
                        justify_content="space-between",
                        align_items="start",
                        flex_wrap="wrap",
                        gap="2",
                    ),
                    rx.divider(),
                    rx.cond(
                        GenerationState.vendor_users.length() == 0,
                        rx.center(
                            rx.text("Aún no has creado usuarios.", color=rx.color("gray", 10)),
                            width="100%",
                            padding_y="6",
                        ),
                        rx.box(
                            rx.table.root(
                                rx.table.header(
                                    rx.table.row(
                                        rx.table.column_header_cell(rx.text("Email", weight="medium", size="2"), min_width="200px"),
                                        rx.table.column_header_cell(rx.text("Límite Diario", weight="medium", size="2"), min_width="120px"),
                                        rx.table.column_header_cell(rx.text("Cuota Usada", weight="medium", size="2"), min_width="120px"),
                                        rx.table.column_header_cell(rx.text("Vence el", weight="medium", size="2"), min_width="120px"),
                                        rx.table.column_header_cell(rx.text("Acciones", weight="medium", size="2"), min_width="100px"),
                                    ),
                                ),
                                rx.table.body(
                                    rx.foreach(
                                        GenerationState.vendor_users,
                                        lambda u: rx.table.row(
                                            rx.table.cell(rx.text(u["email"], size="2", weight="medium"), min_width="200px"),
                                            rx.table.cell(rx.text(u["daily_limit"], size="2"), min_width="120px"),
                                            rx.table.cell(rx.text(u["used_quota"], size="2"), min_width="120px"),
                                            rx.table.cell(
                                                rx.text(rx.cond(u["quota_reset_at"], u["quota_reset_at"], "—"), size="1", color=rx.color("gray", 10)),
                                                min_width="120px",
                                            ),
                                            rx.table.cell(
                                                rx.button(
                                                    rx.icon(tag="trash-2", size=12),
                                                    on_click=GenerationState.delete_vendor_user(u["id"]),
                                                    variant="soft",
                                                    color_scheme="red",
                                                    size="1",
                                                    radius="large",
                                                    title="Eliminar usuario",
                                                ),
                                                min_width="100px",
                                            ),
                                            _hover={"background_color": rx.color("gray", 2)},
                                        ),
                                    ),
                                ),
                                variant="surface",
                                size="2",
                                width="100%",
                            ),
                            width="100%",
                            overflow_x="auto",
                        ),
                    ),
                    spacing="4",
                    width="100%",
                    align_items="stretch",
                ),
                size="4",
                radius="large",
                width="100%",
                box_shadow=CARD_SHADOW,
            ),

            # Create vendor user dialog
            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.hstack(
                            rx.dialog.title("Nuevo Usuario"),
                            rx.dialog.close(
                                rx.button(
                                    rx.icon(tag="x", size=14),
                                    variant="ghost",
                                    color_scheme="gray",
                                    radius="full",
                                    size="1",
                                )
                            ),
                            width="100%",
                            justify_content="space-between",
                            align_items="center",
                        ),
                        rx.vstack(
                            rx.text("Email", size="2", weight="medium"),
                            rx.input(
                                placeholder="usuario@ejemplo.com",
                                type="email",
                                value=GenerationState.vendor_user_draft_email,
                                on_change=GenerationState.set_vendor_user_draft_email,
                                width="100%",
                                size="3",
                                radius="large",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                        ),
                        rx.vstack(
                            rx.text("Límite diario de imágenes", size="2", weight="medium"),
                            rx.input(
                                type="number",
                                min=0,
                                value=GenerationState.vendor_user_draft_limit,
                                on_change=GenerationState.set_vendor_user_draft_limit,
                                width="100%",
                                size="3",
                                radius="large",
                            ),
                            spacing="2",
                            width="100%",
                            align_items="start",
                        ),
                        rx.hstack(
                            rx.button(
                                "Cancelar",
                                on_click=GenerationState.close_vendor_user_modal,
                                variant="soft",
                                color_scheme="gray",
                                radius="large",
                            ),
                            rx.button(
                                rx.hstack(
                                    rx.icon(tag="user-plus", size=14),
                                    rx.text("Crear Usuario"),
                                    spacing="2",
                                    align_items="center",
                                ),
                                on_click=GenerationState.create_vendor_user,
                                color_scheme="blue",
                                radius="large",
                            ),
                            width="100%",
                            justify_content="end",
                            spacing="2",
                        ),
                        spacing="4",
                        width="100%",
                        align_items="stretch",
                    ),
                    max_width="460px",
                    width="95vw",
                    radius="large",
                    box_shadow=CARD_SHADOW_LG,
                    padding="5",
                ),
                open=GenerationState.is_vendor_user_modal_open,
                on_open_change=GenerationState.set_vendor_user_modal_open,
            ),

            spacing="5",
            width="100%",
            max_width="1000px",
            margin_x="auto",
            align_items="stretch",
        ),
        title="Panel Vendedor",
    )


# ─────────────────────────────────────────────────────────────────────────────
# PAGE: LOGIN CALLBACK
# ─────────────────────────────────────────────────────────────────────────────

def login_callback() -> rx.Component:
    """Handles the Google OAuth callback URL (/auth/callback)."""
    return rx.center(
        rx.card(
            rx.vstack(
                rx.box(
                    rx.spinner(size="3"),
                    padding="4",
                    background="linear-gradient(135deg, var(--blue-3), var(--violet-3))",
                    border_radius="full",
                ),
                rx.vstack(
                    rx.text("Signing you in...", weight="medium", size="3"),
                    rx.text("Please wait a moment", color=rx.color("gray", 11), size="2"),
                    spacing="1",
                    align_items="center",
                ),
                spacing="4",
                align_items="center",
            ),
            size="4",
            radius="large",
            box_shadow=CARD_SHADOW_LG,
            padding="8",
        ),
        height="100vh",
        width="100vw",
        background="linear-gradient(135deg, var(--gray-1) 0%, var(--blue-2) 50%, var(--violet-2) 100%)",
        on_mount=GenerationState.handle_google_callback,
    )


# ─────────────────────────────────────────────────────────────────────────────
# APP INITIALIZATION
# ─────────────────────────────────────────────────────────────────────────────

app = rx.App(
    theme=rx.theme(
        appearance="light",
        accent_color="blue",
        gray_color="slate",
        radius="medium",
        scaling="100%",
    ),
)

app.add_page(index, route="/")
app.add_page(dashboard_page, route="/dashboard", on_load=GenerationState.protected_page_on_load)
app.add_page(admin_page, route="/admin", on_load=GenerationState.admin_page_on_load)
app.add_page(vendor_page, route="/vendor", on_load=GenerationState.vendor_page_on_load)
app.add_page(login_callback, route="/auth/callback")
