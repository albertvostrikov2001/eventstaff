# -*- coding: utf-8 -*-
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image, ImageDraw, ImageFont

# ---------- brand ----------
GREEN   = (16, 58, 42)      # тёмный изумруд (фон) #103a2a
GREEN_D = (12, 44, 31)      # модули QR
MAROON  = (107, 15, 26)
CREAM   = (244, 239, 231)
GOLD    = (236, 220, 180)   # вордмарк / рамка
ACCENT  = (136, 212, 169)   # подписи
MUTED   = (196, 212, 198)
TG_BLUE = (42, 171, 238)
MAX_A   = (46, 124, 246)    # градиент MAX (верх)
MAX_B   = (123, 84, 240)    # градиент MAX (низ)

URL = "https://unityevent.ru"
PHONE = "+7 928 406 2199"
EMAIL = "Event-Unity@yandex.ru"
SITE  = "unityevent.ru"

DPI = 300
def mm(v): return round(v / 25.4 * DPI)
W, H = mm(96), mm(56)
BLEED = mm(3)

GB  = lambda s: ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", s)
GI  = lambda s: ImageFont.truetype(r"C:\Windows\Fonts\georgiai.ttf", s)
SUI = lambda s: ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", s)
SB  = lambda s: ImageFont.truetype(r"C:\Windows\Fonts\seguisb.ttf", s)
SBD = lambda s: ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", s)

logo = Image.open("packages/web/public/logo.png").convert("RGBA")

def text_w(d, t, f, ls=0):
    if ls == 0:
        return d.textbbox((0,0), t, font=f)[2]
    return sum(d.textbbox((0,0), c, font=f)[2] for c in t) + ls*(len(t)-1)

def draw_tracked(d, xy, t, f, fill, ls):
    x, y = xy
    for c in t:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textbbox((0,0), c, font=f)[2] + ls

# ---------- icons ----------
def draw_telegram(base, cx, cy, r):
    d = ImageDraw.Draw(base)
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=TG_BLUE)
    s = r
    A = (cx-0.62*s, cy+0.04*s)
    B = (cx+0.60*s, cy-0.42*s)
    C = (cx-0.04*s, cy+0.14*s)
    Dp= (cx+0.12*s, cy+0.46*s)
    d.polygon([A, B, Dp, C], fill=CREAM)
    d.line([B, C], fill=TG_BLUE, width=max(2, r//12))

def draw_max(base, x, y, size):
    # градиентная плитка-иконка приложения MAX с белым "MAX"
    grad = Image.new("RGB", (size, size))
    gd = ImageDraw.Draw(grad)
    for i in range(size):
        t = i/size
        col = tuple(round(MAX_A[k]*(1-t)+MAX_B[k]*t) for k in range(3))
        gd.line([(0,i),(size,i)], fill=col)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0,0,size,size], radius=round(size*0.28), fill=255)
    base.paste(grad, (x, y), mask)
    d = ImageDraw.Draw(base)
    f = SBD(round(size*0.42))
    txt = "MAX"
    tb = d.textbbox((0,0), txt, font=f)
    tw, th = tb[2]-tb[0], tb[3]-tb[1]
    d.text((x+(size-tw)//2 - tb[0], y+(size-th)//2 - tb[1]), txt, font=f, fill=(255,255,255))

# ---------- QR ----------
def make_qr(px):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,
                       box_size=10, border=2)
    qr.add_data(URL); qr.make(fit=True)
    img = qr.make_image(image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(radius_ratio=1),
            color_mask=SolidFillColorMask(back_color=CREAM, front_color=GREEN_D)
          ).convert("RGB")
    return img.resize((px, px), Image.LANCZOS)

def frame(d):
    d.rounded_rectangle([BLEED+mm(2), BLEED+mm(2), W-BLEED-mm(2), H-BLEED-mm(2)],
                        radius=mm(2), outline=GOLD, width=mm(0.4))

# ============ FRONT (логотип + вордмарк + слоган) ============
def front():
    img = Image.new("RGB", (W, H), GREEN)
    d = ImageDraw.Draw(img)
    frame(d)

    lh = mm(18)
    lw = round(logo.width * lh / logo.height)
    lg = logo.resize((lw, lh), Image.LANCZOS)
    word = "unity"; wf = GB(mm(15))
    ww = text_w(d, word, wf)
    gap = mm(3)
    total = lw + gap + ww
    gx = (W - total)//2

    # вертикально центрируем группу логотип+слоган
    slogan = "ПОДРАБОТКА  НА  МЕРОПРИЯТИЯХ"
    sf = SB(mm(3.2))
    sw = text_w(d, slogan, sf, ls=mm(0.7))
    group_h = lh + mm(6) + mm(4)
    gy = (H - group_h)//2

    img.paste(lg, (gx, gy), lg)
    wb = d.textbbox((0,0), word, font=wf)
    wy = gy + (lh - (wb[3]-wb[1]))//2 - wb[1]
    d.text((gx + lw + gap, wy), word, font=wf, fill=GOLD)

    # короткий золотой разделитель
    dy = gy + lh + mm(4)
    d.line([(W//2 - mm(16), dy), (W//2 + mm(16), dy)], fill=GOLD, width=mm(0.3))

    # слоган
    sy = dy + mm(3)
    draw_tracked(d, ((W-sw)//2, sy), slogan, sf, ACCENT, mm(0.7))

    img.save("visitka_front.png", "PNG", dpi=(DPI,DPI))
    return img

# ============ BACK (QR + персона + контакты + иконки) ============
def back():
    img = Image.new("RGB", (W, H), GREEN)
    d = ImageDraw.Draw(img)
    frame(d)

    # --- QR-плитка слева ---
    qpx = mm(24)
    tile_pad = mm(2.5)
    tile = qpx + tile_pad*2
    tx = BLEED + mm(4)
    ty = (H - tile)//2 - mm(2)
    d.rounded_rectangle([tx, ty, tx+tile, ty+tile], radius=mm(2.5), fill=CREAM)
    img.paste(make_qr(qpx), (tx+tile_pad, ty+tile_pad))
    cap = "наведите камеру"
    cf = SUI(mm(2.7))
    cw = text_w(d, cap, cf, ls=mm(0.3))
    draw_tracked(d, (tx + (tile-cw)//2, ty+tile+mm(2.2)), cap, cf, MUTED, mm(0.3))

    # --- правая колонка ---
    rx = tx + tile + mm(5)
    # вордмарк
    sw_lh = mm(7)
    sw_lw = round(logo.width * sw_lh / logo.height)
    slg = logo.resize((sw_lw, sw_lh), Image.LANCZOS)
    wmy = BLEED + mm(3.5)
    img.paste(slg, (rx, wmy), slg)
    wf = GB(mm(5.5))
    wb = d.textbbox((0,0), "unity", font=wf)
    d.text((rx + sw_lw + mm(2), wmy + (sw_lh-(wb[3]-wb[1]))//2 - wb[1]),
           "unity", font=wf, fill=GOLD)

    # имя + должность
    ny = wmy + sw_lh + mm(3.5)
    name = "Владимир Чергинский"
    d.text((rx, ny), name, font=SBD(mm(4.4)), fill=CREAM)
    d.text((rx, ny+mm(5.6)), "основатель платформы", font=SUI(mm(3.1)), fill=MUTED)

    # контакты
    cy = ny + mm(11.5)
    rows = [("ТЕЛЕФОН", PHONE), ("EMAIL", EMAIL), ("САЙТ", SITE)]
    lf = SB(mm(2.3)); vf = SB(mm(2.9))
    val_x = rx + mm(16)
    step = mm(4.6)
    for lab, val in rows:
        d.text((rx, cy+mm(0.4)), lab, font=lf, fill=ACCENT)
        d.text((val_x, cy), val, font=vf, fill=CREAM)
        cy += step

    # иконки мессенджеров
    cy += mm(1.2)
    ic = mm(7)
    draw_telegram(img, rx + ic//2, cy + ic//2, ic//2)
    draw_max(img, rx + ic + mm(3), cy, ic)

    img.save("visitka_back.png", "PNG", dpi=(DPI,DPI))
    return img

f = front(); b = back()

# ---- превью ----
def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0,0,im.size[0],im.size[1]], radius=r, fill=255)
    out = Image.new("RGBA", im.size, (0,0,0,0)); out.paste(im, (0,0), mask); return out

bg = Image.new("RGB", (W*2 + mm(20), H + mm(20)), (224,219,209))
r = mm(3)
bg.paste(rounded(f.convert("RGBA"), r), (mm(7), mm(10)), rounded(f.convert("RGBA"), r))
bg.paste(rounded(b.convert("RGBA"), r), (W + mm(13), mm(10)), rounded(b.convert("RGBA"), r))
bg.save("visitka_preview.png", "PNG")
print("DONE", W, "x", H)
