# -*- coding: utf-8 -*-
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from qrcode.image.styles.colormasks import RadialGradiantColorMask
from PIL import Image, ImageDraw
import os

URL = "https://unityevent.ru"
DARK_BG   = (8, 18, 14)      # #08120e
GREEN     = (91, 184, 128)   # #5bb880
GREEN_LT  = (136, 212, 169)  # #88d4a9
CREAM     = (244, 239, 231)  # #f4efe7

qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20,
    border=4,
)
qr.add_data(URL)
qr.make(fit=True)

img = qr.make_image(
    image_factory=StyledPilImage,
    module_drawer=RoundedModuleDrawer(radius_ratio=1),
    color_mask=RadialGradiantColorMask(
        back_color=DARK_BG,
        center_color=GREEN_LT,
        edge_color=GREEN,
    ),
).convert("RGB")

W, H = img.size

# рамка-карточка вокруг
pad = int(W * 0.06)
card = Image.new("RGB", (W + pad*2, H + pad*2 + int(W*0.13)), DARK_BG)
draw = ImageDraw.Draw(card)
# зелёная рамка-обводка
draw.rounded_rectangle(
    [6, 6, card.size[0]-6, card.size[1]-6],
    radius=int(W*0.05), outline=GREEN, width=max(4, W//180),
)
card.paste(img, (pad, pad))

# подпись внизу
from PIL import ImageFont
text = "unityevent.ru"
font = None
for fp in [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\arial.ttf"]:
    if os.path.exists(fp):
        font = ImageFont.truetype(fp, int(W*0.075)); break
if font is None:
    font = ImageFont.load_default()
tb = draw.textbbox((0,0), text, font=font)
tw, th = tb[2]-tb[0], tb[3]-tb[1]
ty = pad + H + int((card.size[1]-pad-H-pad)/2) - th//2 - tb[1]
draw.text(((card.size[0]-tw)//2, ty), text, fill=CREAM, font=font)

out = r"D:\Work Unity\EventStaff-main\unityevent_qr.png"
card.save(out, "PNG")
print("SAVED", out, card.size)
