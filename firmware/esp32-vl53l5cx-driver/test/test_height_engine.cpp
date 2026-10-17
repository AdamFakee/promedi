/**
 * @file test_height_engine.cpp
 * @brief Kiểm thử đơn vị Native C++ cho HeightEngine (ESP32 Height Measurement Module).
 */

#include <iostream>
#include <cassert>
#include <cstring>
#include <cmath>
#include "HeightEngine.h"
#include "VL53L5CXDriver.h"

/**
 * Bài kiểm thử 1: Đóng gói 16 Bytes, tính CRC16 Modbus và giải mã đối chiếu dữ liệu.
 */
void test_packet_serialization() {
    std::cout << "[TEST 1] Đóng gói và Giải mã Height Packet (16 Bytes)..." << std::endl;

    HeightPacketPayload payload;
    memset(&payload, 0, sizeof(payload));
    payload.header0 = HEIGHT_MAGIC_BYTE_0;
    payload.header1 = HEIGHT_MAGIC_BYTE_1;
    payload.packetType = HEIGHT_PACKET_TYPE;
    payload.state = HEIGHT_STATE_LOCKED;
    payload.guidance = HEIGHT_GUIDE_LOCKED;
    payload.lockedHeightMm = 1754; // 175.4 cm
    payload.instantHeightMm = 1755;
    payload.progress = 100;
    payload.confidence = 95;
    payload.headZoneCount = 3;
    payload.eventCode = HEIGHT_EVENT_LOCKED;
    payload.flags = 0x03; // isStable | hasPerson

    uint8_t buffer[HEIGHT_PACKET_SIZE];
    size_t sz = HeightEngine::serializePacket(payload, buffer, sizeof(buffer));
    assert(sz == HEIGHT_PACKET_SIZE);
    assert(buffer[0] == 0xAA);
    assert(buffer[1] == 0x55);
    assert(buffer[2] == 0x48);

    // Giải mã
    HeightPacketPayload decoded;
    bool ok = HeightEngine::deserializePacket(buffer, sizeof(buffer), decoded);
    assert(ok == true);
    assert(decoded.state == HEIGHT_STATE_LOCKED);
    assert(decoded.guidance == HEIGHT_GUIDE_LOCKED);
    assert(decoded.lockedHeightMm == 1754);
    assert(decoded.instantHeightMm == 1755);
    assert(decoded.progress == 100);
    assert(decoded.confidence == 95);
    assert(decoded.headZoneCount == 3);
    assert(decoded.eventCode == HEIGHT_EVENT_LOCKED);

    // Thử làm sai lệch 1 byte để kiểm tra CRC
    buffer[5] ^= 0xFF;
    bool corruptOk = HeightEngine::deserializePacket(buffer, sizeof(buffer), decoded);
    assert(corruptOk == false);

    std::cout << "       -> THÀNH CÔNG: Serialization & CRC16 hoạt động chính xác 100%!" << std::endl;
}

/**
 * Bài kiểm thử 2: Pipeline 8 bước - Nhận diện người, lọc ổn định và Chốt khóa chiều cao (LOCKED).
 */
void test_height_engine_pipeline() {
    std::cout << "[TEST 2] Pipeline 8 bước: Nhận diện người đứng và Chốt khóa Chiều cao (LOCKED)..." << std::endl;

    HeightEngine engine;
    HeightEngineConfig cfg;
    cfg.expectedFloorMm = 2220; // 222.0 cm
    cfg.platformHeightMm = 0;   // 0 mm (Đo từ sàn)
    cfg.gainScale = 1.0f;
    cfg.offsetMm = 0.0f;
    cfg.minPersonMm = 900;
    engine.setConfig(cfg);

    VL53L5CXDriver driver;
    driver.setReferenceHeight(2220);
    driver.init(true /* Mock mode */);

    // Chiều cao mô phỏng: 1720 mm (172.0 cm)
    // Đứng yên liên tục trong 25 frames (~1.65 giây @ 15Hz)
    HeightPacketPayload lastResult;
    memset(&lastResult, 0, sizeof(lastResult));

    bool didLock = false;

    for (uint32_t f = 1; f <= 45; f++) {
        uint32_t ts = f * 66; // 66ms / frame @ 15Hz
        VL53L5CXFrame frame = driver.generateMockFrame(f, ts, 1720, 0);
        lastResult = engine.push(frame);

        if (lastResult.state == HEIGHT_STATE_LOCKED) {
            didLock = true;
            break;
        }
    }

    assert(didLock == true);
    assert(lastResult.state == HEIGHT_STATE_LOCKED);
    assert(lastResult.guidance == HEIGHT_GUIDE_LOCKED);
    assert(lastResult.progress == 100);
    assert(lastResult.eventCode == HEIGHT_EVENT_LOCKED);

    // Chiều cao chốt kỳ vọng xấp xỉ 172.0cm (dung sai ±2cm do độ nhấp nhô mock)
    std::cout << "       -> Chiều cao chốt được: " << (lastResult.lockedHeightMm / 10.0f) 
              << " cm (Kỳ vọng ~172.0 cm), Độ tin cậy: " << (int)lastResult.confidence << "%" << std::endl;
    assert(lastResult.lockedHeightMm >= 1690 && lastResult.lockedHeightMm <= 1750);

    std::cout << "       -> THÀNH CÔNG: HeightEngine đã LOCK thành công!" << std::endl;
}

/**
 * Bài kiểm thử 3: Nhận diện người bước ra (Person Left).
 */
void test_person_left() {
    std::cout << "[TEST 3] Nhận diện Người rời khỏi sàn cân (PERSON_LEFT)..." << std::endl;

    HeightEngine engine;
    HeightEngineConfig cfg;
    cfg.expectedFloorMm = 2220;
    cfg.platformHeightMm = 0;
    cfg.gainScale = 1.0f;
    cfg.offsetMm = 0.0f;
    cfg.minPersonMm = 900;
    engine.setConfig(cfg);

    VL53L5CXDriver driver;
    driver.setReferenceHeight(2220);
    driver.init(true);

    // 1. Cho người đứng để lock (40 frames ~2.6s)
    for (uint32_t f = 1; f <= 40; f++) {
        VL53L5CXFrame frame = driver.generateMockFrame(f, f * 66, 1720);
        engine.push(frame);
    }

    // 2. Người bước ra -> Frame trống sàn (personHeight = 0)
    HeightPacketPayload res;
    bool personLeftDetected = false;

    for (uint32_t f = 41; f <= 65; f++) {
        // Sinh frame sàn trống (tất cả các zone ~2100mm)
        VL53L5CXFrame emptyFrame;
        emptyFrame.frameId = f;
        emptyFrame.timestampMs = f * 66;
        emptyFrame.zoneCount = 64;
        emptyFrame.isValid = true;
        for (int i = 0; i < 64; i++) {
            emptyFrame.distances[i] = 2150;
            emptyFrame.targetStatuses[i] = 5;
        }

        res = engine.push(emptyFrame);
        if (res.eventCode == HEIGHT_EVENT_PERSON_LEFT) {
            personLeftDetected = true;
            break;
        }
    }

    assert(personLeftDetected == true);
    assert(res.state == HEIGHT_STATE_IDLE);
    assert(res.guidance == HEIGHT_GUIDE_STEP_ON);

    std::cout << "       -> THÀNH CÔNG: Đã phát hiện PERSON_LEFT và quay về IDLE!" << std::endl;
}

int main() {
    std::cout << "===========================================================" << std::endl;
    std::cout << "  BỘ KIỂM THỬ ĐƠN VỊ NATIVE CHO C++ HEIGHT ENGINE (ESP32)  " << std::endl;
    std::cout << "===========================================================" << std::endl;

    test_packet_serialization();
    test_height_engine_pipeline();
    test_person_left();

    std::cout << "\n>>> TẤT CẢ CÁC BÀI TEST HEIGHT ENGINE C++ ĐÃ VƯỢT QUA 100%! <<<\n" << std::endl;
    return 0;
}
