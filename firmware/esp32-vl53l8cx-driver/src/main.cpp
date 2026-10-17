/**
 * @file main.cpp
 * @brief Firmware main entrypoint cho vi điều khiển ESP32 - ToF Height Measurement Module (VL53L8CX).
 *
 * Chức năng:
 * - Khởi tạo cổng USB Serial ở tốc độ 460800 baud.
 * - Khởi tạo Driver VL53L8CX (SPI 10MHz hoặc I2C Fast Mode Plus 8x8 @ 15-30Hz).
 * - Khởi tạo HeightEngine tính toán chiều cao 8 bước trực tiếp trên ESP32.
 * - Lắng nghe lệnh điều khiển từ Kiosk (PING, CONFIG, RESET, DEBUG).
 * - Vòng lặp loop() đọc frame, tính chiều cao và stream gói nhị phân 16 Bytes (Height Packet) xuống Kiosk.
 */

#ifndef MOCK_MODE_ONLY

#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include "VL53L8CXDriver.h"
#include "HeightEngine.h"

// Instance Driver & Height Engine toàn cục
static VL53L8CXDriver driver;
static HeightEngine   heightEngine;

// Bộ đệm chứa gói tin nhị phân 16 bytes (Height Packet)
static uint8_t heightPacketBuffer[HEIGHT_PACKET_SIZE];

// Cờ hỗ trợ stream thô 204B khi Kiosk yêu cầu chế độ Heatmap Test Bench
static bool enableDebugRawStream = false;
static uint8_t rawFrameBuffer[VL53L8CX_PACKET_SIZE];

// ============================================================================
// HÀM XỬ LÝ LỆNH TỪ KIOSK TRUYỀN XUỐNG
// ============================================================================

static void handleKioskCommands() {
    if (Serial.available() < 4) return;

    if (Serial.peek() != HEIGHT_MAGIC_BYTE_0) {
        Serial.read();
        return;
    }

    uint8_t header[2];
    header[0] = Serial.read();
    if (Serial.available() == 0) return;
    header[1] = Serial.read();

    if (header[0] != HEIGHT_MAGIC_BYTE_0 || header[1] != HEIGHT_MAGIC_BYTE_1) {
        return;
    }

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
    Serial.begin(460800);
    while (!Serial && millis() < 3000);

    Serial.println(F("[ToF Height Module VL53L8CX] Khoi tao Firmware ESP32 Height Engine..."));

    bool mockMode = false;
#ifdef ENABLE_MOCK_DATA
    mockMode = true;
    Serial.println(F("[ToF Height Module VL53L8CX] Chay che do GIA LAP (MOCK DATA MODE)."));
#endif

    bool useSpi = true;
#ifdef VL53L8CX_USE_I2C
    useSpi = false;
    Serial.println(F("[ToF Height Module VL53L8CX] Cau hinh Bus I2C (SDA 21, SCL 22)."));
#else
    Serial.println(F("[ToF Height Module VL53L8CX] Cau hinh Bus SPI 10MHz (SCK 18, MISO 19, MOSI 23, CS 5)."));
#endif

    // Khởi tạo Driver phần cứng VL53L8CX
    if (!driver.init(mockMode, useSpi)) {
        Serial.println(F("[ToF Height Module VL53L8CX] LOI: Khong the khoi tao cam bien VL53L8CX!"));
        while (1) {
            delay(1000);
        }
    }

    // Khởi tạo Height Engine với cấu hình mặc định (Trần 2220mm, Bệ 0mm)
    HeightEngineConfig defaultCfg;
    defaultCfg.expectedFloorMm = VL53L8CX_BASE_HEIGHT_MM;
    defaultCfg.platformHeightMm = 0;
    defaultCfg.gainScale = 1.0f;
    defaultCfg.offsetMm = 0.0f;
    defaultCfg.minPersonMm = 900;
    heightEngine.setConfig(defaultCfg);

    driver.startRanging();
    Serial.println(F("[ToF Height Module VL53L8CX] Module San Sang! Dang tinh toan chieu cao 8 buoc @ 15Hz..."));
}

// ============================================================================
// CẤU HÌNH LOG KỸ THUẬT (PERFORMANCE & MEMORY MONITORING)
// ============================================================================
#define ENABLE_TECH_LOG

// Bật cờ này khi cắm vào Kiosk Android để stream byte nhị phân 16 bytes thô
// #define STREAM_BINARY_TO_KIOSK

static uint32_t frameCountForFps = 0;
static uint32_t lastFpsCalcTime = 0;
static float    currentFps = 15.0f;
static uint8_t  lastLoggedState = 0xFF;

void loop() {
    handleKioskCommands();

    VL53L8CXFrame frame;
    if (driver.readFrame(frame)) {
        uint32_t startComputeUs = micros();
        HeightPacketPayload payload = heightEngine.push(frame);
        uint32_t computeTimeUs = micros() - startComputeUs;

        frameCountForFps++;
        uint32_t nowMs = millis();
        if (nowMs - lastFpsCalcTime >= 1000) {
            currentFps = (float)frameCountForFps * 1000.0f / (float)(nowMs - lastFpsCalcTime);
            frameCountForFps = 0;
            lastFpsCalcTime = nowMs;
        }

        size_t bytesSerialized = HeightEngine::serializePacket(payload, heightPacketBuffer, sizeof(heightPacketBuffer));

#ifdef STREAM_BINARY_TO_KIOSK
        if (bytesSerialized == HEIGHT_PACKET_SIZE) {
            Serial.write(heightPacketBuffer, bytesSerialized);
        }
#endif

#ifdef ENABLE_TECH_LOG
        static uint32_t tickCounter = 0;
        tickCounter++;

        if (payload.eventCode == HEIGHT_EVENT_PERSON_PRESENT) {
            Serial.println(F("\n>>> [EVENT] Phát hiện người bước lên bàn cân! Đang phân tích..."));
        }

        if (payload.eventCode == HEIGHT_EVENT_PERSON_LEFT) {
            Serial.println(F("\n>>> [EVENT] Người đã rời khỏi bàn cân -> Reset về trạng thái Chờ (IDLE)."));
        }

        if (payload.state == HEIGHT_STATE_LOCKED && lastLoggedState != HEIGHT_STATE_LOCKED) {
            Serial.println(F("\n=========================================================================="));
            Serial.printf(">>> [LOCKED] ĐÃ CHỐT KHÓA CHIỀU CAO THÀNH CÔNG: %.1f cm (Độ tin cậy: %u%%) <<<\n",
                          payload.lockedHeightMm / 10.0f, payload.confidence);
            
            Serial.print(F("Gói kết quả gửi Kiosk (16 Bytes Hex): "));
            for (size_t i = 0; i < bytesSerialized; i++) {
                if (heightPacketBuffer[i] < 0x10) Serial.print('0');
                Serial.print(heightPacketBuffer[i], HEX);
                Serial.print(' ');
            }
            Serial.println();

            Serial.printf("[HIỆU NĂNG] Thuật toán tính toán: %u µs (0.%.2d ms) | Tần số: %.1f Hz\n",
                          computeTimeUs, computeTimeUs / 10, currentFps);
            Serial.printf("[BỘ NHỚ] RAM trống (Free Heap): %u Bytes (%.1f KB) | Min Free: %u Bytes\n",
                          ESP.getFreeHeap(), ESP.getFreeHeap() / 1024.0f, ESP.getMinFreeHeap());
            Serial.println(F("==========================================================================\n"));
        }
        else if (payload.state == HEIGHT_STATE_MEASURING || payload.state == HEIGHT_STATE_HOLD_STILL) {
            if (tickCounter % 4 == 0) {
                const char* stStr = (payload.state == HEIGHT_STATE_HOLD_STILL) ? "HOLD_STILL (Đứng yên)" : "MEASURING (Đang đo)";
                Serial.printf("[TIẾN TRÌNH] %s | Tức thời: %.1f cm | Đã ổn định: %u%% | Dải đầu: %u zones | Compute: %u µs | RAM: %.1f KB\n",
                              stStr, payload.instantHeightMm / 10.0f, payload.progress, payload.headZoneCount,
                              computeTimeUs, ESP.getFreeHeap() / 1024.0f);
            }
        }
        else if (payload.state == HEIGHT_STATE_IDLE) {
            if (tickCounter % 45 == 0) {
                const char* busStr = driver.isSpiBus() ? "SPI 10MHz" : "I2C 1MHz";
                Serial.printf("[IDLE] Sàn trống | Bus: %s | Mốc trần: %u mm | Bệ cân: %u mm | Compute: %u µs | Rate: %.1f Hz | RAM: %.1f KB\n",
                              busStr, heightEngine.getConfig().expectedFloorMm, heightEngine.getConfig().platformHeightMm,
                              computeTimeUs, currentFps, ESP.getFreeHeap() / 1024.0f);
            }
        }

        lastLoggedState = payload.state;
#endif
    }

    delay(66);
}

#endif // MOCK_MODE_ONLY
