"""
scripts/make-brand-images.py
Generates Feilu brand images:
1. assets/feilu-form-header.png (1600x400) - Google Form Header Banner
2. assets/feilu-og.png (1200x630) - Social Share OG Card

Specification: docs/BRAND_IMAGES_SPEC.md
"""

import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

try:
    import numpy as np
    HAVE_NUMPY = True
except ImportError:
    HAVE_NUMPY = False

# Root directories
REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = REPO_ROOT / "assets"
FONT_PATH = r"C:\Windows\Fonts\NotoSansTC-VF.ttf"

# Color Palette (from ai-enablement.html :root)
COLOR_BG = (8, 12, 15)              # #080c0f --bg-primary
COLOR_ACCENT = (16, 185, 129)        # #10b981 --accent
COLOR_ACCENT_LIGHT = (110, 231, 183) # #6ee7b7 --accent-light
COLOR_TEXT_MAIN = (248, 250, 252)    # #f8fafc --text-main
COLOR_TEXT_SUB = (203, 213, 225)     # #cbd5e1 --text-sub
COLOR_TEXT_MUTED = (148, 163, 184)   # #94a3b8 --text-muted


def get_font(size: int, weight: str = "Bold") -> ImageFont.FreeTypeFont:
    """Load Noto Sans TC VF font with specified size and weight axis."""
    font = ImageFont.truetype(FONT_PATH, size)
    font.set_variation_by_name(weight)
    return font


def create_base_canvas_with_glow(
    width: int,
    height: int,
    center_x_ratio: float = 0.85,
    center_y_ratio: float = 0.5,
    radius_ratio: float = 0.75,
    max_alpha: float = 0.16
) -> Image.Image:
    """
    Creates dark background with smooth emerald radial glow on the right.
    Peak opacity is ~0.16, fading smoothly to 0.
    """
    if HAVE_NUMPY:
        bg = np.array(COLOR_BG, dtype=np.float32)
        accent = np.array(COLOR_ACCENT, dtype=np.float32)

        y, x = np.ogrid[:height, :width]
        cx = width * center_x_ratio
        cy = height * center_y_ratio
        r = max(width, height) * radius_ratio

        dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        norm = np.clip(dist / r, 0.0, 1.0)

        # Smooth cubic hermite falloff
        alpha = max_alpha * ((1.0 - norm) ** 2.2)

        img_arr = bg * (1.0 - alpha[:, :, np.newaxis]) + accent * alpha[:, :, np.newaxis]
        img_arr = np.clip(img_arr, 0, 255).astype(np.uint8)
        return Image.fromarray(img_arr, mode="RGB")
    else:
        # Fallback to pure Pillow concentric rings
        base = Image.new("RGBA", (width, height), COLOR_BG + (255,))
        glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow_layer)

        cx = int(width * center_x_ratio)
        cy = int(height * center_y_ratio)
        max_radius = int(max(width, height) * radius_ratio)

        for r_curr in range(max_radius, 0, -2):
            norm = r_curr / max_radius
            factor = ((1.0 - norm) ** 2.2)
            alpha_int = int(255 * max_alpha * factor)
            if alpha_int > 0:
                glow_draw.ellipse(
                    (cx - r_curr, cy - r_curr, cx + r_curr, cy + r_curr),
                    fill=(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2], alpha_int)
                )

        return Image.alpha_composite(base, glow_layer).convert("RGB")


def render_form_header(output_path: Path):
    """
    Renders 1600x400 Google Form Header Banner.
    Safe zone: x in [200, 1400].
    """
    width, height = 1600, 400
    img = create_base_canvas_with_glow(width, height, center_x_ratio=0.88, center_y_ratio=0.5, radius_ratio=0.7)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_eyebrow = get_font(30, "Medium")
    font_title_black = get_font(76, "Black")
    font_title_bold = get_font(76, "Bold")
    font_price = get_font(34, "Medium")
    font_price_bold = get_font(34, "Bold")

    # Content
    eyebrow_text = "● 破冰儲值・單一線程專注交付"
    title_part1 = "飛律"
    title_part2 = " AI 流程賦能"
    price_runs = [
        ("儲值 ", COLOR_TEXT_SUB, font_price),
        ("NT$ 1,000", COLOR_ACCENT, font_price_bold),
        ("　交付 ", COLOR_TEXT_SUB, font_price),
        ("2 項", COLOR_ACCENT, font_price_bold),
        ("自動化模組", COLOR_TEXT_SUB, font_price),
    ]

    # Measure components
    eb_bb = font_eyebrow.getbbox(eyebrow_text)
    eb_glyph_h = eb_bb[3] - eb_bb[1]

    t1_bb = font_title_black.getbbox(title_part1)
    t2_bb = font_title_bold.getbbox(title_part2)
    t_top = min(t1_bb[1], t2_bb[1])
    t_bot = max(t1_bb[3], t2_bb[3])
    t_glyph_h = t_bot - t_top

    underline_w = font_title_black.getlength(title_part1)
    underline_h = 5
    underline_gap = 12

    p_bb = font_price.getbbox("儲值NT$1,000交付2項自動化模組")
    p_top = p_bb[1]
    p_bot = p_bb[3]
    p_glyph_h = p_bot - p_top

    # Spacings
    gap_eyebrow_to_title = int(76 * 0.55)   # ~41px
    gap_underline_to_price = int(76 * 0.35)  # ~26px

    total_content_height = (
        eb_glyph_h
        + gap_eyebrow_to_title
        + t_glyph_h
        + underline_gap
        + underline_h
        + gap_underline_to_price
        + p_glyph_h
    )

    start_x = 200  # Left safe zone
    # Calculate baseline offset for vertical centering
    # eb_glyph_top is at y_eb + eb_bb[1]
    y_eb = 0
    eb_g_top = y_eb + eb_bb[1]
    eb_g_bot = y_eb + eb_bb[3]

    y_title = eb_g_bot + gap_eyebrow_to_title - t_top
    t_g_bot = y_title + t_bot

    y_ul = t_g_bot + underline_gap
    y_price = (y_ul + underline_h) + gap_underline_to_price - p_top
    p_g_bot = y_price + p_bot

    rendered_h = p_g_bot - eb_g_top
    dy = (height - rendered_h) // 2 - eb_g_top

    # Apply vertical offset
    y_eb += dy
    y_title += dy
    y_ul += dy
    y_price += dy

    # 1. Draw Eyebrow
    draw.text((start_x, y_eb), eyebrow_text, font=font_eyebrow, fill=COLOR_ACCENT_LIGHT)

    # 2. Draw Title: "飛律" (Black) + " AI 流程賦能" (Bold)
    draw.text((start_x, y_title), title_part1, font=font_title_black, fill=COLOR_TEXT_MAIN)
    draw.text((start_x + underline_w, y_title), title_part2, font=font_title_bold, fill=COLOR_TEXT_MAIN)

    # 3. Draw Underline under "飛律"
    draw.rectangle(
        [start_x, y_ul, start_x + underline_w, y_ul + underline_h],
        fill=COLOR_ACCENT
    )

    # 4. Draw Price line (runs)
    curr_x = start_x
    for text_segment, color, font in price_runs:
        draw.text((curr_x, y_price), text_segment, font=font, fill=color)
        curr_x += font.getlength(text_segment)

    # Save as PNG
    img.save(output_path, "PNG", optimize=True)
    file_size = os.path.getsize(output_path)
    if file_size > 300 * 1024:
        jpg_path = output_path.with_suffix(".jpg")
        img.save(jpg_path, "JPEG", quality=92)
        print(f"[WARN] PNG exceeded 300KB ({file_size} bytes), saved JPG: {jpg_path}")
    else:
        print(f"[OK] Generated Form Header: {output_path} ({file_size} bytes)")


def render_og_image(output_path: Path):
    """
    Renders 1200x630 Feilu OG Social Card.
    Margin left: 90px. Includes Trust Anchor line.
    """
    width, height = 1200, 630
    img = create_base_canvas_with_glow(width, height, center_x_ratio=0.82, center_y_ratio=0.48, radius_ratio=0.72)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_eyebrow = get_font(32, "Medium")
    font_title_black = get_font(82, "Black")
    font_title_bold = get_font(82, "Bold")
    font_price = get_font(36, "Medium")
    font_price_bold = get_font(36, "Bold")
    font_trust = get_font(26, "Regular")

    # Content
    eyebrow_text = "● 破冰儲值・單一線程專注交付"
    title_part1 = "飛律"
    title_part2 = " AI 流程賦能"
    price_runs = [
        ("儲值 ", COLOR_TEXT_SUB, font_price),
        ("NT$ 1,000", COLOR_ACCENT, font_price_bold),
        ("　交付 ", COLOR_TEXT_SUB, font_price),
        ("2 項", COLOR_ACCENT, font_price_bold),
        ("自動化模組", COLOR_TEXT_SUB, font_price),
    ]
    trust_text = "48h 極速交付・資產 100% 自主・點數永久有效"

    # Measure components
    eb_bb = font_eyebrow.getbbox(eyebrow_text)
    eb_glyph_h = eb_bb[3] - eb_bb[1]

    t1_bb = font_title_black.getbbox(title_part1)
    t2_bb = font_title_bold.getbbox(title_part2)
    t_top = min(t1_bb[1], t2_bb[1])
    t_bot = max(t1_bb[3], t2_bb[3])
    t_glyph_h = t_bot - t_top

    underline_w = font_title_black.getlength(title_part1)
    underline_h = 5
    underline_gap = 14

    p_bb = font_price.getbbox("儲值NT$1,000交付2項自動化模組")
    p_top = p_bb[1]
    p_bot = p_bb[3]
    p_glyph_h = p_bot - p_top

    tr_bb = font_trust.getbbox(trust_text)
    tr_top = tr_bb[1]
    tr_bot = tr_bb[3]
    tr_glyph_h = tr_bot - tr_top

    # Spacings
    gap_eyebrow_to_title = int(82 * 0.55)   # ~45px
    gap_underline_to_price = int(82 * 0.35)  # ~28px
    gap_price_to_trust = int(82 * 0.55)      # ~45px

    # Calculate layout
    y_eb = 0
    eb_g_top = y_eb + eb_bb[1]
    eb_g_bot = y_eb + eb_bb[3]

    y_title = eb_g_bot + gap_eyebrow_to_title - t_top
    t_g_bot = y_title + t_bot

    y_ul = t_g_bot + underline_gap
    y_price = (y_ul + underline_h) + gap_underline_to_price - p_top
    p_g_bot = y_price + p_bot

    y_trust = p_g_bot + gap_price_to_trust - tr_top
    tr_g_bot = y_trust + tr_bot

    rendered_h = tr_g_bot - eb_g_top
    dy = (height - rendered_h) // 2 - eb_g_top

    # Apply vertical offset
    y_eb += dy
    y_title += dy
    y_ul += dy
    y_price += dy
    y_trust += dy

    start_x = 90

    # 1. Draw Eyebrow
    draw.text((start_x, y_eb), eyebrow_text, font=font_eyebrow, fill=COLOR_ACCENT_LIGHT)

    # 2. Draw Title: "飛律" (Black) + " AI 流程賦能" (Bold)
    draw.text((start_x, y_title), title_part1, font=font_title_black, fill=COLOR_TEXT_MAIN)
    draw.text((start_x + underline_w, y_title), title_part2, font=font_title_bold, fill=COLOR_TEXT_MAIN)

    # 3. Draw Underline under "飛律"
    draw.rectangle(
        [start_x, y_ul, start_x + underline_w, y_ul + underline_h],
        fill=COLOR_ACCENT
    )

    # 4. Draw Price line (runs)
    curr_x = start_x
    for text_segment, color, font in price_runs:
        draw.text((curr_x, y_price), text_segment, font=font, fill=color)
        curr_x += font.getlength(text_segment)

    # 5. Draw Trust Anchor
    draw.text((start_x, y_trust), trust_text, font=font_trust, fill=COLOR_TEXT_MUTED)

    # Save as PNG
    img.save(output_path, "PNG", optimize=True)
    file_size = os.path.getsize(output_path)
    if file_size > 300 * 1024:
        jpg_path = output_path.with_suffix(".jpg")
        img.save(jpg_path, "JPEG", quality=92)
        print(f"[WARN] PNG exceeded 300KB ({file_size} bytes), saved JPG: {jpg_path}")
    else:
        print(f"[OK] Generated OG Image: {output_path} ({file_size} bytes)")


def main():
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    header_path = ASSETS_DIR / "feilu-form-header.png"
    og_path = ASSETS_DIR / "feilu-og.png"

    render_form_header(header_path)
    render_og_image(og_path)


if __name__ == "__main__":
    main()
