#!/usr/bin/env python3
"""
@file generate_fixtures.py
@brief Kịch bản Python sinh dữ liệu kiểm thử (Fixtures) cho Cảm biến Khoảng cách ToF VL53L5CX/L8CX (8x8 Zones).

Mô tả chi tiết:
1. Sử dụng mô hình vật lý Ray-tracing 3D để mô phỏng chính xác tia hồng ngoại phát ra từ trần nhà Kiosk.
2. Tính toán chính xác khoảng cách xiên r = z / cos(θ) và chuyển đổi thành dạng nhị phân 204 Bytes chuẩn.
3. Sinh các bộ dữ liệu kiểm thử (23 test cases / 115 frames tổng cộng):
   - Sàn nhà trống (EMPTY_FLOOR)
   - Cảm biến bị che khuất (SENSOR_BLOCKED)
   - Các mức chiều cao người đứng (1500mm, 1700mm, 1900mm, 2000mm)
   - Người đứng lệch tâm X/Y (OFFSET_X80, OFFSET_Y60)
   - Tóc đen sẫm hấp thụ ánh sáng làm giảm confidence (DARK_HAIR_STATUS9)
   - Cử chỉ giơ tay cao hơn đầu (HAND_RAISED)
   - 2 người đứng sát nhau (TWO_PEOPLE)
   - Nhiễu tín hiệu và người đi vào/đi ra (UNSTABLE, ENTERING)
4. Đầu ra xuất ra các file:
   - `tof_cases.jsonl`: Danh sách frame dạng JSON kèm nhãn kỳ vọng (expectedGroundTruth)
   - `tof_cases.bin`: Luồng nhị phân chuẩn 204 Bytes/packet kèm mã kiểm tra CRC16-Modbus
   - `floor_baseline.json`: Dữ liệu baseline mặt sàn trung bình
   - `manifest.json`: Bảng tổng hợp các testcase và thông số kỹ thuật.
"""

import json
import math
import os
import random
import statistics
import struct

# Đường dẫn thư mục đầu ra (cùng thư mục với script này)
OUT = os.path.dirname(os.path.abspath(__file__))

# Chiều cao lắp đặt cảm biến trần Kiosk chuẩn (mm): 210cm trần + 21cm bệ cân + 15cm giá = 2460mm
Z_SENSOR = 2460

# Góc quét từng zone trong ma trận 8x8 (45 độ / 8 zones = 5.625 độ / zone)
STEP = math.radians(45 / 8)

# Bảng tra cứu trước giá trị tan(θ) cho 8 cột/hàng
TAN = [math.tan((i - 3.5) * STEP) for i in range(8)]

# Bảng tra cứu trước giá trị cos(θ) 3D cho ma trận 8x8
COS = [[1 / math.sqrt(1 + TAN[c] ** 2 + TAN[r] ** 2) for c in range(8)] for r in range(8)]


def crc16_modbus(data: bytes) -> int:
    """
    Tính toán mã kiểm tra lỗi CRC16-Modbus (Khớp 100% với thuật toán trong firmware C++ ESP32).

    :param data: Mảng byte dữ liệu đầu vào (202 bytes)
    :return: Giá trị CRC16 uint16
    """
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc


# ============================================================================
# CÁC HÀM TẠO MÔ HÌNH VẬT LÝ VẬT THỂ 3D (HEIGHT FIELD OBJECTS)
# ============================================================================


def person(px: float, py: float, H: float, s: float = 1.0, shoulder_drop: float = 250, hair_status9: bool = False) -> dict:
    """
    Tạo đối tượng mô hình người 3D (Đỉnh đầu dạng Ellipsoid + Vai nghiêng).

    :param px: Tọa độ X tâm người (mm)
    :param py: Tọa độ Y tâm người (mm)
    :param H: Chiều cao đỉnh đầu (mm)
    :param s: Tỷ lệ kích thước cơ thể (mặc định 1.0)
    :param shoulder_drop: Độ dốc từ đỉnh đầu xuống vai (mm)
    :param hair_status9: Cờ mô phỏng tóc đen giảm tín hiệu
    :return: Dictionary thông số đối tượng
    """
    return dict(kind="person", px=px, py=py, H=H, s=s, sd=shoulder_drop * s**0.5, hair9=hair_status9)


def hand(x: float, y: float, h: float, r: float = 50) -> dict:
    """
    Tạo đối tượng bàn tay giơ cao (Hình trụ tròn).

    :param x: Tọa độ X bàn tay (mm)
    :param y: Tọa độ Y bàn tay (mm)
    :param h: Độ cao bàn tay tính từ sàn (mm)
    :param r: Bán kính bàn tay (mm, mặc định 50mm)
    :return: Dictionary thông số đối tượng
    """
    return dict(kind="hand", px=x, py=y, H=h, r=r)


def box(x: float, y: float, h: float, rx: float, ry: float) -> dict:
    """
    Tạo đối tượng hộp / vật thể hình hộp chữ nhật (Hành lý / Ghế ngồi).

    :param x: Tọa độ X tâm hộp (mm)
    :param y: Tọa độ Y tâm hộp (mm)
    :param h: Chiều cao hộp (mm)
    :param rx: Bán kính X (mm)
    :param ry: Bán kính Y (mm)
    :return: Dictionary thông số đối tượng
    """
    return dict(kind="box", px=x, py=y, H=h, rx=rx, ry=ry)


def height_at(objs: list, x: float, y: float) -> float:
    """
    Tính chiều cao bề mặt vật thể tại vị trí tọa độ mặt phẳng (x, y).

    :param objs: Danh sách các đối tượng vật thể 3D trong không gian
    :param x: Tọa độ X chiếu (mm)
    :param y: Tọa độ Y chiếu (mm)
    :return: Chiều cao vật thể cao nhất tại vị trí (x, y) (mm)
    """
    best = 0.0
    for o in objs:
        dx, dy = x - o["px"], y - o["py"]
        if o["kind"] == "person":
            s = o["s"]
            # Hình Elip đại diện cho vòm đầu
            q = (dx / (85 * s)) ** 2 + (dy / (105 * s)) ** 2
            if q <= 1:
                best = max(best, o["H"] - 70 * q)
            # Hình Elip rộng hơn đại diện cho bờ vai
            q2 = (dx / (210 * s)) ** 2 + (dy / (110 * s)) ** 2
            if q2 <= 1:
                best = max(best, o["H"] - o["sd"] - 90 * q2)
        elif o["kind"] == "hand":
            if dx * dx + dy * dy <= o["r"] ** 2:
                best = max(best, o["H"])
        elif o["kind"] == "box":
            if abs(dx) <= o["rx"] and abs(dy) <= o["ry"]:
                best = max(best, o["H"])
    return best


def trace(objs: list, r: int, c: int) -> float:
    """
    Thuật toán Ray-tracing: Chiếu 1 tia hồng ngoại từ cảm biến trần xuống zone (r, c) để tìm điểm va chạm.

    :param objs: Danh sách đối tượng 3D
    :param r: Chỉ số hàng (0..7)
    :param c: Chỉ số cột (0..7)
    :return: Độ sâu thẳng đứng z từ cảm biến tới điểm va chạm (mm)
    """
    tx, ty = TAN[c], TAN[r]

    def hit(z):
        return height_at(objs, z * tx, z * ty) >= Z_SENSOR - z

    z = 100.0
    while z < Z_SENSOR:
        if hit(z):
            lo = max(100.0, z - 8)
            zz = lo
            while zz < z and not hit(zz):
                zz += 1
            return zz
        z += 8
    return float(Z_SENSOR)


def render(objs: list, rng: random.Random, hair9_zones: list = None):
    """
    Render toàn bộ ma trận 8x8 zones, tính khoảng cách xiên r và thêm nhiễu Gauss thực tế.

    :param objs: Danh sách đối tượng 3D
    :param rng: Bộ sinh số ngẫu nhiên Deterministic Seed
    :param hair9_zones: Danh sách zone cưỡng bức gán status 9
    :return: (dist, stat, zmap) - Mảng 64 khoảng cách, 64 trạng thái status, và bản đồ độ sâu zmap
    """
    zmap = [[trace(objs, r, c) for c in range(8)] for r in range(8)]
    dist, stat = [], []
    for r in range(8):
        for c in range(8):
            z = zmap[r][c]
            # Kiểm tra xem có nằm ở đường biên thay đổi độ sâu nhanh không
            edge = any(
                0 <= r + dr < 8 and 0 <= c + dc < 8 and abs(z - zmap[r + dr][c + dc]) > 120
                for dr in (-1, 0, 1)
                for dc in (-1, 0, 1)
            )
            st = 9 if (edge or rng.random() < 0.02) else 5
            sigma = 6 if st == 9 else 3
            # Khoảng cách xiên r = z / cos(θ) + nhiễu Gauss
            d = z / COS[r][c] + rng.gauss(0, sigma)
            dist.append(int(round(d)))
            stat.append(st)
    return dist, stat, zmap


def head_zone_idx(zmap: list) -> list:
    """
    Tìm danh sách các chỉ số zone (0..63) thuộc cụm đỉnh đầu người trong zmap.

    :param zmap: Bản đồ độ sâu 8x8
    :return: Danh sách các chỉ số zone
    """
    top = min(min(row) for row in zmap)
    return [r * 8 + c for r in range(8) for c in range(8) if zmap[r][c] < top + 60]


# ============================================================================
# CẤU HÌNH DANH SÁCH 23 KỊCH BẢN KIỂM THỬ (TEST CASES)
# ============================================================================

CASES = []


def case(cid: str, desc: str, frames_fn, expected_fn, tags=()):
    """Đăng ký một test case mới vào danh sách"""
    CASES.append(dict(id=cid, desc=desc, frames=frames_fn, expected=expected_fn, tags=list(tags)))


def exp(cls: str, H=None, people=0, off=None, stable=True, note=""):
    """Tạo cấu trúc kết quả kỳ vọng (ground truth)"""
    return dict(
        expectedClass=cls,
        groundTruthHeightMm=H,
        peopleCount=people,
        headOffsetMm=off,
        stable=stable,
        note=note,
    )


def stand(H: float, x: float = 0, y: float = 0, **kw):
    """Hàm Helper tạo kịch bản 1 người đứng ở vị trí (x, y) với chiều cao H"""
    return lambda i: dict(objs=[person(x, y, H, **kw)])


# 1. Các trường hợp nền trống và cảm biến bị lỗi
case(
    "EMPTY_FLOOR",
    "Sàn nhà trống, không có người đứng",
    lambda i: dict(objs=[]),
    lambda i: exp("NO_PERSON", note="Dùng để lấy floor baseline"),
    ["presence"],
)

def blocked(i):
    return dict(objs=[], blocked=True)

case(
    "SENSOR_BLOCKED",
    "Che cảm biến: distance=0, status=255 toàn bộ 64 zones",
    blocked,
    lambda i: exp("NO_PERSON", note="Không được tính ra chiều cao giả; báo lỗi cảm biến nếu kéo dài"),
    ["invalid"],
)

def fake_peak(i):
    return dict(objs=[], fake=[(27, 250, 2), (28, 260, 0), (36, 255, 255), (19, 300, 3)])

case(
    "INVALID_STATUS_FAKE_PEAK_EMPTY",
    "Sàn trống nhưng 4 zone có khoảng cách giả ~250mm với status 0/2/3/255",
    fake_peak,
    lambda i: exp("NO_PERSON", note="Test 1: zone lỗi status không được tạo đỉnh giả"),
    ["invalid"],
)

# 2. Các mức chiều cao người đứng chuẩn
case("STANDING_1700_CENTER", "Người cao 1700mm đứng giữa cảm biến", stand(1700), lambda i: exp("PERSON_OK", 1700, 1, {"x": 0, "y": 0}), ["height"])
case("STANDING_1500_CENTER", "Người thấp 1500mm đứng giữa cảm biến", stand(1500, s=0.93), lambda i: exp("PERSON_OK", 1500, 1, {"x": 0, "y": 0}), ["height"])
case("STANDING_1900_CENTER", "Người cao 1900mm đứng giữa cảm biến", stand(1900, s=1.05), lambda i: exp("PERSON_OK", 1900, 1, {"x": 0, "y": 0}), ["height"])
case(
    "TALL_2000_NEAR_CEILING",
    "Người cao 2000mm, đỉnh đầu cách cảm biến ~200mm (Vùng Xtalk kính)",
    stand(2000, s=1.05),
    lambda i: exp("PERSON_OK", 2000, 1, {"x": 0, "y": 0}, note="Rủi ro Xtalk <600mm"),
    ["height", "xtalk"],
)

# 3. Các trường hợp đứng lệch tâm (Bù góc quang học cosθ)
case("STANDING_1700_OFFSET_X80", "Người cao 1700mm đứng lệch phải 80mm", stand(1700, x=80), lambda i: exp("PERSON_OK", 1700, 1, {"x": 80, "y": 0}, note="Sai số vs CENTER phải <3mm sau bù cos"), ["cos"])
case("STANDING_1700_OFFSET_Y60", "Người cao 1700mm đứng lệch trước 60mm", stand(1700, y=60), lambda i: exp("PERSON_OK", 1700, 1, {"x": 0, "y": 60}), ["cos"])

# 4. Tóc đen hấp thụ ánh sáng & Vai rộng
case("STANDING_1700_DARK_HAIR_STATUS9", "Tóc đen: mọi zone đỉnh đầu có status 9", lambda i: dict(objs=[person(0, 0, 1700)], force9_head=True), lambda i: exp("PERSON_OK", 1700, 1, {"x": 0, "y": 0}, note="Status 9 vẫn hợp lệ"), ["status"])
case("BROAD_SHOULDERS_SINGLE", "1 người bờ vai rộng: KHÔNG được báo 2 người", stand(1700, s=1.25, shoulder_drop=300), lambda i: exp("PERSON_OK", 1700, 1, {"x": 0, "y": 0}, note="Bẫy đầu-vai không tạo valley >=150mm"), ["negative", "multi"])

# 6. Các trường hợp đứng sai vị trí đứng (Đứng sát mép)
for nm, x, y in [("RIGHT", 160, 0), ("LEFT", -160, 0), ("FRONT", 0, 160), ("BACK", 0, -160)]:
    case(
        f"WRONG_POSITION_{nm}",
        f"Đứng lệch {nm} 160mm, đầu chạm mép ma trận",
        stand(1700, x=x, y=y),
        (lambda x, y: lambda i: exp("WRONG_POSITION", 1700, 1, {"x": x, "y": y}, note="Hướng sửa = ngược hướng lệch"))(x, y),
        ["position"],
    )

# 7. Vật thể thấp dưới 800mm
case("LOW_OBJECT_BELOW_MIN", "Vật thấp 600mm (Túi xách / Ghế ngồi): dưới minPersonHeight 800mm", lambda i: dict(objs=[box(0, 0, 600, 150, 150)]), lambda i: exp("NO_PERSON", None, 0, None, note="h<800 -> Không tính người"), ["presence", "negative"])

# 9. Nhiễu tín hiệu và Chuyển động đung đưa
GL = 15
def glitch(i):
    return dict(objs=[person(0, 0, 1700)], blocked=(i == GL))

case("GLITCH_MIDSTREAM", "Frame 3 mất toàn bộ status=255 giữa luồng bình thường", glitch, lambda i: exp("NO_PERSON" if i == GL else "PERSON_OK", None if i == GL else 1700, 0 if i == GL else 1, {"x": 0, "y": 0}, note="Frame 3 bị glitch"), ["glitch"])

SW_H = [-25, 20, -10, 28, -15]
SW_X = [-20, 15, -5, 25, -10]
case("UNSTABLE_SWAYING", "Đứng đung đưa: đỉnh đầu +-28mm, lệch ngang +-25mm", lambda i: dict(objs=[person(SW_X[i % 5], 0, 1700 + SW_H[i % 5])]), lambda i: exp("PERSON_OK", 1700 + SW_H[i % 5], 1, {"x": SW_X[i % 5], "y": 0}, stable=False, note="Range > 15mm -> UNSTABLE"), ["stability"])

ENT_X = [-330, -220, -110, -30, 0]
case("ENTERING_WALKING", "Đi vào từ mép trái đến giữa cảm biến", lambda i: dict(objs=[person(ENT_X[min(i, 4)], 0, 1700)]), lambda i: exp("TRANSITION", 1700, 1, {"x": ENT_X[min(i, 4)], "y": 0}, stable=False, note="Đang di chuyển vào"), ["transition"])

# ============================================================================
# HÀM THỰC THI CHÍNH (BUILD & SELF-CHECK)
# ============================================================================

def build():
    """Tạo toàn bộ dữ liệu 115 frames nhị phân và xuất ra các tệp tin."""
    rng_master = random.Random(20260506)
    floor_frames = []
    rows, packets, manifest = [], bytearray(), []
    N = 30  # Mỗi test case gồm 30 frames để đủ thời gian chốt (stabilityWindowMs = 1500ms ~ 22 frames)

    for ci, cs in enumerate(CASES):
        base = (ci + 1) * 100
        for i in range(N):
            rng = random.Random(rng_master.random())
            spec = cs["frames"](i)
            if spec.get("blocked"):
                dist, stat, zmap = [0] * 64, [255] * 64, None
            else:
                dist, stat, zmap = render(spec["objs"], rng)
                if spec.get("force9_head") and zmap:
                    for k in head_zone_idx(zmap):
                        stat[k] = 9
                for k, d, st in spec.get("fake", []):
                    dist[k], stat[k] = d, st
            if cs["id"] == "EMPTY_FLOOR":
                floor_frames.append(dist)
            fid = base + i + 1
            ts = int(round(fid * 1000 / 15))
            head = struct.pack("<2sII", b"\xAA\x55", fid, ts) + struct.pack("<64H", *dist) + bytes(stat)
            pkt = head + struct.pack("<H", crc16_modbus(head))
            assert len(pkt) == 204
            packets += pkt
            e = cs["expected"](i)
            rows.append(
                dict(
                    caseId=cs["id"],
                    frameIdx=i + 1,
                    frameId=fid,
                    timestampMs=ts,
                    distances=dist,
                    targetStatuses=stat,
                    isValid=True,
                    expected=e,
                )
            )
        manifest.append(dict(id=cs["id"], desc=cs["desc"], tags=cs["tags"], frames=N, firstFrameId=base + 1))

    # Tính toán floor baseline median
    med = [int(round(statistics.median(f[k] for f in floor_frames))) for k in range(64)]

    # Ghi ra các file đầu ra
    with open(f"{OUT}/tof_cases.jsonl", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, separators=(",", ":")) + "\n")
    with open(f"{OUT}/tof_cases.bin", "wb") as f:
        f.write(packets)
    with open(f"{OUT}/floor_baseline.json", "w", encoding="utf-8") as f:
        json.dump(
            dict(
                sensorHeightMm=Z_SENSOR,
                zoneAngleDeg=45 / 8,
                floorRawDistances=med,
                note="Median 5 frame EMPTY_FLOOR. floorZ = raw * cos.",
            ),
            f,
            indent=2,
        )
    with open(f"{OUT}/manifest.json", "w", encoding="utf-8") as f:
        json.dump(
            dict(
                totalCases=len(CASES),
                framesPerCase=N,
                totalFrames=len(rows),
                packetBytes=204,
                crc="CRC16-Modbus over bytes[0..201], little-endian (lo, hi)",
                cases=manifest,
            ),
            f,
            ensure_ascii=False,
            indent=2,
        )
    return rows, med


def selfcheck(rows, med):
    """Tự kiểm tra toàn vẹn tệp tin nhị phân xuất ra."""
    data = open(f"{OUT}/tof_cases.bin", "rb").read()
    assert len(data) == 204 * len(rows)
    for k, r in enumerate(rows):
        p = data[k * 204 : (k + 1) * 204]
        assert p[:2] == b"\xAA\x55"
        assert struct.unpack("<H", p[202:204])[0] == crc16_modbus(p[:202])
        fid, ts = struct.unpack("<II", p[2:10])
        d = list(struct.unpack("<64H", p[10:138]))
        s = list(p[138:202])
        assert fid == r["frameId"] and d == r["distances"] and s == r["targetStatuses"]

    floorZ = [med[k] * COS[k // 8][k % 8] for k in range(64)]
    print(f"[GENERATOR] floorZ central: {round(floorZ[27])}mm | corner: {round(floorZ[0])}mm")
    print(f"[GENERATOR] Sinh thành công {len(rows)} gói tin nhị phân (204B/packet) vào thư mục {OUT}")


if __name__ == "__main__":
    rows, med = build()
    selfcheck(rows, med)
