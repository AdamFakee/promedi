/**
 * @file main.cpp
 * @brief Firmware main entrypoint cho vi điều khiển ESP32 - ToF Height Measurement Module.
 *
 * Chức năng:
 * - Khởi tạo cổng USB Serial ở tốc độ 460800 baud.
 * - Khởi tạo Driver VL53L5CX (Chạy Mock Mode hoặc Hardware Mode 8x8 @ 15Hz).
 * - Khởi tạo HeightEngine tính toán chiều cao 8 bước trực tiếp trên ESP32.
 * - Lắng nghe lệnh điều khiển từ Kiosk (PING, CONFIG, RESET, DEBUG).
 * - Vòng lặp loop() đọc frame, tính chiều cao và stream gói nhị phân 16 Bytes (Height Packet) xuống Kiosk.
 */

#ifndef MOCK_MODE_ONLY

#include <Arduino.h>
#include <Wire.h>
#include "VL53L5CXDriver.h"
#include "HeightEngine.h"

// Instance Driver & Height Engine toàn cục
static VL53L5CXDriver driver;
static HeightEngine   heightEngine;

// Bộ đệm chứa gói tin nhị phân 16 bytes (Height Packet)
static uint8_t heightPacketBuffer[HEIGHT_PACKET_SIZE];

// Cờ hỗ trợ stream thô 204B khi Kiosk yêu cầu chế độ Heatmap Test Bench
static bool enableDebugRawStream = false;
static uint8_t rawFrameBuffer[VL53L5CX_PACKET_SIZE];

// ============================================================================
// HÀM XỬ LÝ LỆNH TỪ KIOSK TRUYỀN XUỐNG
// ============================================================================

static void handleKioskCommands() {
    if (Serial.available() < 4) return;

    // Xem trước 2 byte Header
    if (Serial.peek() != HEIGHT_MAGIC_BYTE_0) {
        Serial.read(); // Bỏ byte rác
        return;
    }

    uint8_t header[2];
    header[0] = Serial.read();
    if (Serial.available() == 0) return;
    header[1] = Serial.read();

    if (header[0] != HEIGHT_MAGIC_BYTE_0 || header[1] != HEIGHT_MAGIC_BYTE_1) {
        return;
    }

    // Đọc mã lệnh 2 bytes tiếp theo
    while (Serial.available() < 2) {
        delay(1);
    }
    uint8_t cmdB2 = Serial.read();
    uint8_t cmdB3 = Serial.read();

    // 1. Lệnh Bắt tay PING ("PG") -> Phản hồi PONG ("OK")
    if (cmdB2 == CMD_PING_B2 && cmdB3 == CMD_PING_B3) {
        static const uint8_t pongResp[4] = {
            HEIGHT_MAGIC_BYTE_0,
            HEIGHT_MAGIC_BYTE_1,
            RESP_PONG_B2,
            RESP_PONG_B3
        };
        Serial.write(pongResp, 4);
        return;
    }

    // 2. Lệnh CẤU HÌNH THAM SỐ CONFIG ("CF"): 18 Bytes tổng cộng
    if (cmdB2 == CMD_CONFIG_B2 && cmdB3 == CMD_CONFIG_B3) {
        // Cần đọc thêm 14 bytes: 2B floor + 2B platform + 4B gain + 4B offset + 2B CRC
        uint8_t payload[14];
        size_t readCount = 0;
        uint32_t startWait = millis();
        while (readCount < 14 && (millis() - startWait < 500)) {
            if (Serial.available()) {
                payload[readCount++] = Serial.read();
            }
        }

        if (readCount == 14) {
            uint16_t expectedCrc = (uint16_t)payload[12] | ((uint16_t)payload[13] << 8);
            
            // Tính CRC trên 16 bytes đầu (4 bytes cmd + 12 bytes params)
            uint8_t crcVerifyBuf[16];
            crcVerifyBuf[0] = HEIGHT_MAGIC_BYTE_0;
            crcVerifyBuf[1] = HEIGHT_MAGIC_BYTE_1;
            crcVerifyBuf[2] = CMD_CONFIG_B2;
            crcVerifyBuf[3] = CMD_CONFIG_B3;
            memcpy(&crcVerifyBuf[4], payload, 12);

            uint16_t actualCrc = HeightEngine::calculateCRC16(crcVerifyBuf, 16);
            if (expectedCrc == actualCrc) {
                HeightEngineConfig newCfg = heightEngine.getConfig();
                newCfg.expectedFloorMm = (uint16_t)payload[0] | ((uint16_t)payload[1] << 8);
                newCfg.platformHeightMm = (uint16_t)payload[2] | ((uint16_t)payload[3] << 8);
                memcpy(&newCfg.gainScale, &payload[4], 4);
                memcpy(&newCfg.offsetMm, &payload[8], 4);

                heightEngine.setConfig(newCfg);
                driver.setReferenceHeight(newCfg.expectedFloorMm);

                // Phản hồi CONFIG_OK ("CK")
                static const uint8_t cfgOkResp[4] = {
                    HEIGHT_MAGIC_BYTE_0,
                    HEIGHT_MAGIC_BYTE_1,
                    RESP_CONFIG_OK_B2,
                    RESP_CONFIG_OK_B3
                };
                Serial.write(cfgOkResp, 4);
            }
        }
        return;
    }

    // 3. Lệnh RESET PHIÊN ĐO ("RS")
    if (cmdB2 == CMD_RESET_B2 && cmdB3 == CMD_RESET_B3) {
        heightEngine.reset();
        return;
    }

    // 4. Lệnh BẬT/TẮT DEBUG RAW 204B ("DB")
    if (cmdB2 == CMD_DEBUG_RAW_B2 && cmdB3 == CMD_DEBUG_RAW_B3) {
        while (Serial.available() < 1) delay(1);
        uint8_t flag = Serial.read();
        enableDebugRawStream = (flag == 1);
        return;
    }
}

// ============================================================================
// ARDUINO SETUP & LOOP
// ============================================================================

void setup() {
    // 1. Khởi tạo cổng Serial baudrate 460800 (Fast Serial Transfer)
    Serial.begin(460800);
    while (!Serial && millis() < 3000);

    Serial.println(F("[ToF Height Module] Khoi tao Firmware ESP32 Height Measurement Engine..."));

    bool mockMode = false;
#ifdef ENABLE_MOCK_DATA
    mockMode = true;
    Serial.println(F("[ToF Height Module] Chay che do GIA LAP (MOCK DATA MODE)."));
#endif

    // 2. Khởi tạo Driver phần cứng VL53L5CX
    if (!driver.init(mockMode)) {
        Serial.println(F("[ToF Height Module] LOI: Khong the khoi tao cam bien VL53L5CX!"));
        while (1) {
            delay(1000);
        }
    }

    // 3. Khởi tạo Height Engine với cấu hình mặc định (Trần 2220mm, Bệ 96mm)
    HeightEngineConfig defaultCfg;
    defaultCfg.expectedFloorMm = VL53L5CX_BASE_HEIGHT_MM; // 2220 mm
    defaultCfg.platformHeightMm = 0;                     // Mặc định đo từ mặt sàn (0 mm)
    defaultCfg.gainScale = 1.0f;
    defaultCfg.offsetMm = 0.0f;
    defaultCfg.minPersonMm = 900;
    heightEngine.setConfig(defaultCfg);

    // 4. Bắt đầu đo continuous ở tần số 15Hz
    driver.startRanging();
    Serial.println(F("[ToF Height Module] Module San Sang! Dang tinh toan chieu cao 8 buoc @ 15Hz..."));
}

// ============================================================================
// CẤU HÌNH LOG KỸ THUẬT (PERFORMANCE & MEMORY MONITORING)
// ============================================================================
// Bật cờ này để in kết quả chốt, mã Hex gửi Kiosk, thời gian tính toán (µs) và bộ nhớ RAM
#define ENABLE_TECH_LOG

// Bật cờ này khi cắm vào Kiosk Android để stream byte nhị phân 16 bytes thô
// #define STREAM_BINARY_TO_KIOSK

static uint32_t frameCountForFps = 0;
static uint32_t lastFpsCalcTime = 0;
static float    currentFps = 15.0f;
static uint8_t  lastLoggedState = 0xFF;

void loop() {
    // 1. Lắng nghe và xử lý các câu lệnh điều khiển từ Kiosk (PING, CONFIG, RESET, DEBUG)
    handleKioskCommands();

    // 2. Đọc frame 64 zones từ cảm biến thật (hoặc bộ sinh Mock)
    VL53L5CXFrame frame;
    if (driver.readFrame(frame)) {
        // Đo thời gian tính toán thuật toán 8 bước (Performance Benchmark)
        uint32_t startComputeUs = micros();
        HeightPacketPayload payload = heightEngine.push(frame);
        uint32_t computeTimeUs = micros() - startComputeUs;

        // Tính toán FPS thời gian thực
        frameCountForFps++;
        uint32_t nowMs = millis();
        if (nowMs - lastFpsCalcTime >= 1000) {
            currentFps = (float)frameCountForFps * 1000.0f / (float)(nowMs - lastFpsCalcTime);
            frameCountForFps = 0;
            lastFpsCalcTime = nowMs;
        }

        // Đóng gói thành gói nhị phân 16 Bytes chuẩn
        size_t bytesSerialized = HeightEngine::serializePacket(payload, heightPacketBuffer, sizeof(heightPacketBuffer));

#ifdef STREAM_BINARY_TO_KIOSK
        if (bytesSerialized == HEIGHT_PACKET_SIZE) {
            Serial.write(heightPacketBuffer, bytesSerialized);
        }
#endif

#ifdef ENABLE_TECH_LOG
        static uint32_t tickCounter = 0;
        tickCounter++;

        // 1. Sự kiện Người bước vào
        if (payload.eventCode == HEIGHT_EVENT_PERSON_PRESENT) {
            Serial.println(F("\n>>> [EVENT] Phát hiện người bước lên bàn cân! Đang phân tích..."));
        }

        // 2. Sự kiện Người rời đi
        if (payload.eventCode == HEIGHT_EVENT_PERSON_LEFT) {
            Serial.println(F("\n>>> [EVENT] Người đã rời khỏi bàn cân -> Reset về trạng thái Chờ (IDLE)."));
        }

        // 3. KẾT QUẢ CHỐT KHÓA CHIỀU CAO (LOCKED)
        if (payload.state == HEIGHT_STATE_LOCKED && lastLoggedState != HEIGHT_STATE_LOCKED) {
            Serial.println(F("\n=========================================================================="));
            Serial.printf(">>> [LOCKED] ĐÃ CHỐT KHÓA CHIỀU CAO THÀNH CÔNG: %.1f cm (Độ tin cậy: %u%%) <<<\n",
                          payload.lockedHeightMm / 10.0f, payload.confidence);
            
            // In mã Hex 16 Bytes của gói tin gửi lên Kiosk
            Serial.print(F("Gói kết quả gửi Kiosk (16 Bytes Hex): "));
            for (size_t i = 0; i < bytesSerialized; i++) {
                if (heightPacketBuffer[i] < 0x10) Serial.print('0');
                Serial.print(heightPacketBuffer[i], HEX);
                Serial.print(' ');
            }
            Serial.println();

            // Performance & Memory
            Serial.printf("[HIỆU NĂNG] Thuật toán tính toán: %u µs (0.%.2d ms) | Tần số: %.1f Hz\n",
                          computeTimeUs, computeTimeUs / 10, currentFps);
            Serial.printf("[BỘ NHỚ] RAM trống (Free Heap): %u Bytes (%.1f KB) | Min Free: %u Bytes\n",
                          ESP.getFreeHeap(), ESP.getFreeHeap() / 1024.0f, ESP.getMinFreeHeap());
            Serial.println(F("==========================================================================\n"));
        }
        // 4. Khi đang đo hoặc đang giữ yên (In tiến trình mỗi 4 frames ~330ms để theo dõi tiến trình mượt)
        else if (payload.state == HEIGHT_STATE_MEASURING || payload.state == HEIGHT_STATE_HOLD_STILL) {
            if (tickCounter % 4 == 0) {
                const char* stStr = (payload.state == HEIGHT_STATE_HOLD_STILL) ? "HOLD_STILL (Đứng yên)" : "MEASURING (Đang đo)";
                Serial.printf("[TIẾN TRÌNH] %s | Tức thời: %.1f cm | Đã ổn định: %u%% | Dải đầu: %u zones | Compute: %u µs | RAM: %.1f KB\n",
                              stStr, payload.instantHeightMm / 10.0f, payload.progress, payload.headZoneCount,
                              computeTimeUs, ESP.getFreeHeap() / 1024.0f);
            }
        }
        // 5. Khi ở trạng thái rảnh IDLE (Sàn trống - In heartbeat mỗi 45 frames ~3s)
        else if (payload.state == HEIGHT_STATE_IDLE) {
            if (tickCounter % 45 == 0) {
                Serial.printf("[IDLE] Sàn trống | Mốc trần: %u mm | Bệ cân: %u mm | Compute: %u µs | Rate: %.1f Hz | RAM: %.1f KB\n",
                              heightEngine.getConfig().expectedFloorMm, heightEngine.getConfig().platformHeightMm,
                              computeTimeUs, currentFps, ESP.getFreeHeap() / 1024.0f);
            }
        }

        lastLoggedState = payload.state;
#endif
    }

    // Tần số lấy mẫu 15 Hz (~66ms cho mỗi chu kỳ đo)
    delay(66);
}

#endif // MOCK_MODE_ONLY
