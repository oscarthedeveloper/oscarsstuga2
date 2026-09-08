from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color, black
from reportlab.lib.units import mm
from pypdf import PdfReader


OUTPUT = "/Users/oscarpagerup/Utveckling/oscarsstuga2/output/pdf/kalendermall_a5_manad_4_veckor.pdf"

PAGE_W, PAGE_H = A4
INSERT_W = 130 * mm
INSERT_H = 190 * mm
X0 = (PAGE_W - INSERT_W) / 2
Y0 = (PAGE_H - INSERT_H) / 2

INK = Color(0.12, 0.12, 0.12)
MID = Color(0.42, 0.42, 0.42)
LIGHT = Color(0.77, 0.77, 0.77)
FAINT = Color(0.90, 0.90, 0.90)


def line(c, x1, y1, x2, y2, width=0.45, color=INK, dash=None):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(width)
    if dash:
        c.setDash(dash)
    c.line(x1, y1, x2, y2)
    c.restoreState()


def label(c, text, x, y, size=6.4, color=INK, font="Helvetica-Bold"):
    c.saveState()
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)
    c.restoreState()


def centered(c, text, x, y, size=6.4, color=INK, font="Helvetica-Bold"):
    c.saveState()
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawCentredString(x, y, text)
    c.restoreState()


def checkbox(c, x, y, size=2.2 * mm):
    c.saveState()
    c.setStrokeColor(MID)
    c.setLineWidth(0.4)
    c.rect(x, y, size, size, stroke=1, fill=0)
    c.restoreState()


def draw_crop_marks(c):
    gap = 1.5 * mm
    length = 5 * mm
    for x, direction in ((X0, -1), (X0 + INSERT_W, 1)):
        line(c, x + direction * gap, Y0, x + direction * (gap + length), Y0, 0.35, MID)
        line(c, x + direction * gap, Y0 + INSERT_H, x + direction * (gap + length), Y0 + INSERT_H, 0.35, MID)
    for y, direction in ((Y0, -1), (Y0 + INSERT_H, 1)):
        line(c, X0, y + direction * gap, X0, y + direction * (gap + length), 0.35, MID)
        line(c, X0 + INSERT_W, y + direction * gap, X0 + INSERT_W, y + direction * (gap + length), 0.35, MID)

    label(
        c,
        "130 x 190 mm  |  skriv ut i 100 % / faktisk storlek",
        X0,
        Y0 - 9 * mm,
        size=5.5,
        color=MID,
        font="Helvetica",
    )


def draw_dot_grid(c, spacing=5 * mm):
    c.saveState()
    c.setFillColor(FAINT)
    dot_r = 0.32
    x = X0 + spacing
    while x < X0 + INSERT_W:
        y = Y0 + spacing
        while y < Y0 + INSERT_H:
            c.circle(x, y, dot_r, stroke=0, fill=1)
            y += spacing
        x += spacing
    c.restoreState()


def page_base(c):
    draw_dot_grid(c)
    c.saveState()
    c.setStrokeColor(LIGHT)
    c.setLineWidth(0.35)
    c.rect(X0, Y0, INSERT_W, INSERT_H, stroke=1, fill=0)
    c.restoreState()
    draw_crop_marks(c)


def draw_month(c):
    page_base(c)
    pad = 5 * mm
    left = X0 + pad
    right = X0 + INSERT_W - pad
    top = Y0 + INSERT_H - pad

    label(c, "MÅNAD", left, top - 3.4 * mm, size=15)
    label(c, "ÅR", right - 26 * mm, top - 2.8 * mm, size=6.2, color=MID)
    line(c, right - 20 * mm, top - 3.2 * mm, right, top - 3.2 * mm, 0.55)

    cal_top = top - 11 * mm
    day_h = 7 * mm
    grid_h = 103 * mm
    col_w = (right - left) / 7
    row_h = grid_h / 6
    days = ["MÅN", "TIS", "ONS", "TORS", "FRE", "LÖR", "SÖN"]

    line(c, left, cal_top, right, cal_top, 0.8)
    line(c, left, cal_top - day_h, right, cal_top - day_h, 0.65)
    for i, day in enumerate(days):
        centered(c, day, left + (i + 0.5) * col_w, cal_top - 4.8 * mm, size=5.7, color=MID)

    grid_top = cal_top - day_h
    for i in range(8):
        x = left + i * col_w
        line(c, x, grid_top, x, grid_top - grid_h, 0.45 if i in (0, 7) else 0.35, LIGHT)
    for j in range(7):
        y = grid_top - j * row_h
        line(c, left, y, right, y, 0.45 if j in (0, 6) else 0.35, LIGHT)

    for row in range(6):
        for col in range(7):
            cell_x = left + col * col_w
            cell_y = grid_top - row * row_h
            line(c, cell_x + 2 * mm, cell_y - 5.2 * mm, cell_x + 7 * mm, cell_y - 5.2 * mm, 0.35, MID)

    lower_top = grid_top - grid_h - 5 * mm
    focus_w = (right - left) * 0.46
    label(c, "MÅNADENS FOKUS", left, lower_top, size=6.6)
    label(c, "ATT GÖRA", left + focus_w + 5 * mm, lower_top, size=6.6)

    for i in range(4):
        y = lower_top - (7 + i * 6.2) * mm
        checkbox(c, left, y - 0.2 * mm)
        line(c, left + 4 * mm, y + 0.8 * mm, left + focus_w - 2 * mm, y + 0.8 * mm, 0.35, LIGHT)
    todo_x = left + focus_w + 5 * mm
    for i in range(4):
        y = lower_top - (7 + i * 6.2) * mm
        checkbox(c, todo_x, y - 0.2 * mm)
        line(c, todo_x + 4 * mm, y + 0.8 * mm, right, y + 0.8 * mm, 0.35, LIGHT)

    habit_top = lower_top - 34 * mm
    label(c, "VANOR", left, habit_top, size=6.6)
    habit_label_w = 26 * mm
    grid_left = left + habit_label_w
    grid_right = right
    cell_w = (grid_right - grid_left) / 31
    header_y = habit_top - 5 * mm
    for day in range(1, 32):
        centered(c, str(day), grid_left + (day - 0.5) * cell_w, header_y, size=3.8, color=MID, font="Helvetica")

    row_start = header_y - 4.2 * mm
    habit_row_h = 4.2 * mm
    for row in range(4):
        y = row_start - row * habit_row_h
        line(c, left, y + 1.2 * mm, grid_left - 2 * mm, y + 1.2 * mm, 0.35, LIGHT)
        for day in range(31):
            cx = grid_left + (day + 0.5) * cell_w
            c.saveState()
            c.setStrokeColor(LIGHT)
            c.setLineWidth(0.3)
            c.circle(cx, y + 1.1 * mm, 0.78 * mm, stroke=1, fill=0)
            c.restoreState()

    c.showPage()


def draw_week(c, copy_number):
    page_base(c)
    pad = 5 * mm
    left = X0 + pad
    right = X0 + INSERT_W - pad
    top = Y0 + INSERT_H - pad

    label(c, "VECKA", left, top - 3.4 * mm, size=15)
    line(c, left + 26 * mm, top - 3.5 * mm, left + 43 * mm, top - 3.5 * mm, 0.55)
    label(c, "DATUM", right - 47 * mm, top - 2.8 * mm, size=6.2, color=MID)
    line(c, right - 33 * mm, top - 3.2 * mm, right - 19 * mm, top - 3.2 * mm, 0.45)
    centered(c, "-", right - 16.5 * mm, top - 3.1 * mm, size=6, color=MID, font="Helvetica")
    line(c, right - 14 * mm, top - 3.2 * mm, right, top - 3.2 * mm, 0.45)

    body_top = top - 11 * mm
    body_bottom = Y0 + 5 * mm
    split = left + 78 * mm
    gutter = 5 * mm
    days_right = split
    side_left = split + gutter
    day_h = (body_top - body_bottom) / 7
    days = ["MÅNDAG", "TISDAG", "ONSDAG", "TORSDAG", "FREDAG", "LÖRDAG", "SÖNDAG"]

    line(c, left, body_top, days_right, body_top, 0.8)
    for i, day in enumerate(days):
        y_top = body_top - i * day_h
        y_bottom = y_top - day_h
        line(c, left, y_bottom, days_right, y_bottom, 0.45, LIGHT)
        label(c, day, left, y_top - 4.6 * mm, size=5.9, color=INK)
        line(c, left + 22 * mm, y_top - 4.9 * mm, left + 29 * mm, y_top - 4.9 * mm, 0.35, MID)
        for guide in range(3):
            gy = y_top - (8.8 + guide * 4.6) * mm
            line(c, left + 1 * mm, gy, days_right, gy, 0.25, FAINT)

    side_w = right - side_left
    section_heights = [39 * mm, 56 * mm, 34 * mm]
    y = body_top

    label(c, "VECKANS TRE", side_left, y - 4.7 * mm, size=6.4)
    line(c, side_left, y, right, y, 0.8)
    for i in range(3):
        cy = y - (11 + i * 9) * mm
        c.saveState()
        c.setStrokeColor(MID)
        c.setLineWidth(0.45)
        c.circle(side_left + 2.2 * mm, cy + 0.6 * mm, 1.8 * mm, stroke=1, fill=0)
        c.restoreState()
        centered(c, str(i + 1), side_left + 2.2 * mm, cy - 0.2 * mm, size=4.3, color=MID, font="Helvetica")
        line(c, side_left + 6 * mm, cy, right, cy, 0.35, LIGHT)
    y -= section_heights[0]

    line(c, side_left, y, right, y, 0.55)
    label(c, "ATT GÖRA", side_left, y - 5 * mm, size=6.4)
    for i in range(7):
        cy = y - (11 + i * 6.1) * mm
        checkbox(c, side_left, cy - 0.2 * mm, 2 * mm)
        line(c, side_left + 4 * mm, cy + 0.7 * mm, right, cy + 0.7 * mm, 0.35, LIGHT)
    y -= section_heights[1]

    line(c, side_left, y, right, y, 0.55)
    label(c, "VANOR", side_left, y - 5 * mm, size=6.4)
    weekdays = ["M", "T", "O", "T", "F", "L", "S"]
    habits_grid_left = side_left + 18 * mm
    habit_cell = (side_w - 18 * mm) / 7
    for idx, weekday in enumerate(weekdays):
        centered(c, weekday, habits_grid_left + (idx + 0.5) * habit_cell, y - 5.1 * mm, size=4.4, color=MID)
    for row in range(4):
        cy = y - (11 + row * 5.2) * mm
        line(c, side_left, cy + 0.8 * mm, habits_grid_left - 2 * mm, cy + 0.8 * mm, 0.35, LIGHT)
        for day in range(7):
            cx = habits_grid_left + (day + 0.5) * habit_cell
            c.saveState()
            c.setStrokeColor(LIGHT)
            c.setLineWidth(0.35)
            c.circle(cx, cy + 0.8 * mm, 1.05 * mm, stroke=1, fill=0)
            c.restoreState()
    y -= section_heights[2]

    line(c, side_left, y, right, y, 0.55)
    label(c, "ANTECKNINGAR", side_left, y - 5 * mm, size=6.4)
    note_y = y - 11 * mm
    while note_y > body_bottom:
        line(c, side_left, note_y, right, note_y, 0.25, FAINT)
        note_y -= 4.8 * mm

    c.saveState()
    c.setFillColor(MID)
    c.setFont("Helvetica", 4.5)
    c.drawRightString(X0 + INSERT_W, Y0 - 9 * mm, f"veckoblad {copy_number} av 4")
    c.restoreState()
    c.showPage()


def build():
    c = canvas.Canvas(OUTPUT, pagesize=A4, pageCompression=1)
    c.setTitle("Kalendermall - månad och fyra veckor")
    c.setAuthor("OpenAI Codex")
    c.setSubject("Odaterad svartvit A5-kalendermall för utskrift och inklistring")
    draw_month(c)
    for copy_number in range(1, 5):
        draw_week(c, copy_number)
    c.save()

    reader = PdfReader(OUTPUT)
    assert len(reader.pages) == 5, "PDF should contain one monthly and four weekly pages"
    for page in reader.pages:
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        assert abs(width - PAGE_W) < 0.1 and abs(height - PAGE_H) < 0.1


if __name__ == "__main__":
    build()
